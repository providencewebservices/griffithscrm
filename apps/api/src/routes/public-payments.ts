import {
	addresses,
	contactInfo,
	customerAddresses,
	customerContactInfo,
	customers,
	jobPaymentScheduleItems,
	jobs,
	paymentAttempts,
	quotes,
	takepaymentsSettings,
	tenants,
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { decrypt } from '../lib/encryption';
import { verifyPaymentToken } from '../lib/payment-token';
import {
	computeRequestHash,
	verifyCallbackHash,
	verifyResponseHash,
} from '../lib/takepayments-hash';

const TAKEPAYMENTS_FORM_URL =
	'https://mms.tponlinepayments2.com/Pages/PublicPages/PaymentForm.aspx';

const validateTokenSchema = z.object({
	token: z.string().min(1),
});

const initiateFromTokenSchema = z.object({
	token: z.string().min(1),
});

function formatTransactionDateTime(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} +00:00`;
}

const publicPaymentsRoutes = new Hono()

	// Server-to-server result from TakePayments
	.post('/server-result', async (c) => {
		try {
			const body = (await c.req.parseBody()) as Record<string, string>;
			const orderId = body.OrderID;

			if (!orderId) {
				return c.text('StatusCode=30&Message=Missing OrderID');
			}

			// Look up payment attempt
			const [attempt] = await db
				.select()
				.from(paymentAttempts)
				.where(eq(paymentAttempts.orderId, orderId))
				.limit(1);

			if (!attempt) {
				return c.text('StatusCode=30&Message=Unknown OrderID');
			}

			// Idempotency check
			if (attempt.status !== 'pending') {
				return c.text('StatusCode=0&Message=Already processed');
			}

			// Load tenant settings
			const [settings] = await db
				.select()
				.from(takepaymentsSettings)
				.where(eq(takepaymentsSettings.tenantId, attempt.tenantId))
				.limit(1);

			if (!settings) {
				return c.text('StatusCode=30&Message=Payment configuration not found');
			}

			const password = decrypt(settings.gatewayPasswordEncrypted);
			const preSharedKey = decrypt(settings.preSharedKeyEncrypted);

			// Verify response hash
			const receivedHash = body.HashDigest || '';
			const hashVerified = verifyResponseHash(
				{ ...body, MerchantID: settings.merchantId },
				password,
				preSharedKey,
				settings.hashMethod as 'SHA1' | 'HMACSHA1',
				receivedHash,
			);

			if (!hashVerified) {
				await db
					.update(paymentAttempts)
					.set({
						hashVerified: false,
						status: 'error',
						rawResponse: body,
						serverResultReceivedAt: new Date(),
					})
					.where(eq(paymentAttempts.id, attempt.id));

				return c.text('StatusCode=30&Message=Hash verification failed');
			}

			// Validate amount matches
			const receivedAmount = parseInt(body.Amount || '0', 10);
			if (receivedAmount !== attempt.amount) {
				await db
					.update(paymentAttempts)
					.set({
						hashVerified: true,
						status: 'error',
						message: 'Amount mismatch',
						rawResponse: body,
						serverResultReceivedAt: new Date(),
					})
					.where(eq(paymentAttempts.id, attempt.id));

				return c.text('StatusCode=30&Message=Amount mismatch');
			}

			const statusCode = parseInt(body.StatusCode || '-1', 10);
			const isSuccess = statusCode === 0;

			// Handle duplicate transaction (StatusCode 20)
			let finalStatus: 'success' | 'failed' | 'error' = 'failed';
			if (isSuccess) {
				finalStatus = 'success';
			} else if (statusCode === 20) {
				// Duplicate — check PreviousStatusCode
				const prevStatus = parseInt(body.PreviousStatusCode || '-1', 10);
				if (prevStatus === 0) finalStatus = 'success';
			}

			// Update payment attempt
			await db
				.update(paymentAttempts)
				.set({
					statusCode,
					message: body.Message || null,
					crossReference: body.CrossReference || null,
					cardLastFour: body.CardNumberLastFour || null,
					cardType: body.CardType || null,
					threeDSecureResult: body.ThreeDSecureAuthenticationCheckResult || null,
					rawResponse: body,
					hashVerified: true,
					status: finalStatus,
					serverResultReceivedAt: new Date(),
				})
				.where(eq(paymentAttempts.id, attempt.id));

			// If payment successful, update the milestone
			if (finalStatus === 'success') {
				// Load milestone to get the amount
				const [milestone] = await db
					.select()
					.from(jobPaymentScheduleItems)
					.where(eq(jobPaymentScheduleItems.id, attempt.milestoneId))
					.limit(1);

				if (milestone) {
					await db
						.update(jobPaymentScheduleItems)
						.set({
							paidAmount: milestone.amount,
							paidAt: new Date(),
							paymentMethod: 'card',
							takepaymentsCrossReference: body.CrossReference || null,
							takepaymentsStatusCode: statusCode,
							cardLastFour: body.CardNumberLastFour || null,
							updatedAt: new Date(),
						})
						.where(eq(jobPaymentScheduleItems.id, attempt.milestoneId));
				}
			}

			return c.text(
				'StatusCode=0&Message=Payment response received and processed on merchant server',
			);
		} catch (err) {
			console.error('Server result processing error:', err);
			return c.text('StatusCode=30&Message=Internal server error');
		}
	})

	// Customer browser redirect after payment
	.get('/callback', async (c) => {
		const appUrl = process.env.APP_URL || 'http://localhost:5173';

		try {
			const hashDigest = c.req.query('HashDigest') || '';
			const orderId = c.req.query('OrderID') || '';
			const crossReference = c.req.query('CrossReference') || '';
			const merchantId = c.req.query('MerchantID') || '';

			if (!orderId) {
				return c.redirect(`${appUrl}/payment/failure`);
			}

			// Look up payment attempt
			const [attempt] = await db
				.select()
				.from(paymentAttempts)
				.where(eq(paymentAttempts.orderId, orderId))
				.limit(1);

			if (!attempt) {
				return c.redirect(`${appUrl}/payment/failure?orderId=${orderId}`);
			}

			// Load tenant settings to verify callback hash
			const [settings] = await db
				.select()
				.from(takepaymentsSettings)
				.where(eq(takepaymentsSettings.tenantId, attempt.tenantId))
				.limit(1);

			if (settings && hashDigest) {
				const password = decrypt(settings.gatewayPasswordEncrypted);
				const preSharedKey = decrypt(settings.preSharedKeyEncrypted);

				verifyCallbackHash(
					{ MerchantID: merchantId, CrossReference: crossReference, OrderID: orderId },
					password,
					preSharedKey,
					settings.hashMethod as 'SHA1' | 'HMACSHA1',
					hashDigest,
				);
			}

			// Update callback received timestamp
			await db
				.update(paymentAttempts)
				.set({ callbackReceivedAt: new Date() })
				.where(eq(paymentAttempts.id, attempt.id));

			// Redirect based on attempt status (already set by server-result)
			if (attempt.status === 'success') {
				return c.redirect(`${appUrl}/payment/success?orderId=${orderId}`);
			} else {
				return c.redirect(`${appUrl}/payment/failure?orderId=${orderId}`);
			}
		} catch (err) {
			console.error('Callback processing error:', err);
			return c.redirect(`${appUrl}/payment/failure`);
		}
	})

	// Validate payment link token
	.post('/validate-token', zValidator('json', validateTokenSchema), async (c) => {
		const { token } = c.req.valid('json');
		const payload = verifyPaymentToken(token);

		if (!payload) {
			return c.json({ error: 'Invalid or expired payment link' }, 400);
		}

		// Load milestone + job + customer name + tenant name
		const [milestone] = await db
			.select()
			.from(jobPaymentScheduleItems)
			.where(eq(jobPaymentScheduleItems.id, payload.milestoneId))
			.limit(1);

		if (!milestone) {
			return c.json({ error: 'Payment milestone not found' }, 404);
		}

		// Check if already paid
		if (parseFloat(milestone.paidAmount) >= parseFloat(milestone.amount)) {
			return c.json({ error: 'This payment has already been completed' }, 400);
		}

		const [job] = await db.select().from(jobs).where(eq(jobs.id, milestone.jobId)).limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		const [quote] = await db.select().from(quotes).where(eq(quotes.id, job.quoteId)).limit(1);

		let customerName = '';
		if (quote?.customerId) {
			const [customer] = await db
				.select()
				.from(customers)
				.where(eq(customers.id, quote.customerId))
				.limit(1);

			if (customer) {
				customerName = `${customer.firstName} ${customer.lastName}`;
			}
		}

		const [tenant] = await db
			.select()
			.from(tenants)
			.where(eq(tenants.id, payload.tenantId))
			.limit(1);

		return c.json({
			milestone: {
				id: milestone.id,
				description: milestone.description,
				amount: milestone.amount,
			},
			job: { jobNumber: job.jobNumber },
			customerName,
			tenantName: tenant?.name ?? '',
		});
	})

	// Initiate payment from public token
	.post('/initiate-from-token', zValidator('json', initiateFromTokenSchema), async (c) => {
		const { token } = c.req.valid('json');
		const payload = verifyPaymentToken(token);

		if (!payload) {
			return c.json({ error: 'Invalid or expired payment link' }, 400);
		}

		const { milestoneId, tenantId } = payload;

		// Load TakePayments settings
		const [settings] = await db
			.select()
			.from(takepaymentsSettings)
			.where(
				and(eq(takepaymentsSettings.tenantId, tenantId), eq(takepaymentsSettings.isActive, true)),
			)
			.limit(1);

		if (!settings) {
			return c.json({ error: 'Online payments are not available' }, 400);
		}

		// Load milestone
		const [milestone] = await db
			.select()
			.from(jobPaymentScheduleItems)
			.where(
				and(
					eq(jobPaymentScheduleItems.id, milestoneId),
					eq(jobPaymentScheduleItems.tenantId, tenantId),
				),
			)
			.limit(1);

		if (!milestone) {
			return c.json({ error: 'Payment milestone not found' }, 404);
		}

		if (parseFloat(milestone.paidAmount) >= parseFloat(milestone.amount)) {
			return c.json({ error: 'This payment has already been completed' }, 400);
		}

		// Load job
		const [job] = await db.select().from(jobs).where(eq(jobs.id, milestone.jobId)).limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		// Load customer details
		const [quote] = await db.select().from(quotes).where(eq(quotes.id, job.quoteId)).limit(1);

		let customerName = '';
		let primaryAddress: typeof addresses.$inferSelect | null = null;
		let email = '';
		let phone = '';

		if (quote?.customerId) {
			const [customer] = await db
				.select()
				.from(customers)
				.where(eq(customers.id, quote.customerId))
				.limit(1);

			if (customer) {
				customerName = `${customer.firstName} ${customer.lastName}`;

				// Load address
				const addressRows = await db
					.select({ address: addresses })
					.from(customerAddresses)
					.innerJoin(addresses, eq(addresses.id, customerAddresses.addressId))
					.where(eq(customerAddresses.customerId, customer.id))
					.limit(1);

				primaryAddress = addressRows[0]?.address ?? null;

				// Load contact info
				const contactRows = await db
					.select({ contact: contactInfo })
					.from(customerContactInfo)
					.innerJoin(contactInfo, eq(contactInfo.id, customerContactInfo.contactInfoId))
					.where(eq(customerContactInfo.customerId, customer.id));

				email = contactRows.find((r) => r.contact.type === 'email')?.contact.value ?? '';
				phone =
					contactRows.find((r) => r.contact.type === 'phone' || r.contact.type === 'mobile')
						?.contact.value ?? '';
			}
		}

		const password = decrypt(settings.gatewayPasswordEncrypted);
		const preSharedKey = decrypt(settings.preSharedKeyEncrypted);

		const amountPence = Math.round(parseFloat(milestone.amount) * 100);
		const orderId = `JOB-${job.jobNumber}-MS-${milestoneId.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;
		const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

		const formFields: Record<string, string> = {
			MerchantID: settings.merchantId,
			Amount: String(amountPence),
			CurrencyCode: '826',
			EchoAVSCheckResult: 'true',
			EchoCV2CheckResult: 'true',
			EchoThreeDSecureAuthenticationCheckResult: 'true',
			EchoCardType: 'true',
			EchoCardNumberFirstSix: '',
			EchoCardNumberLastFour: 'true',
			EchoCardExpiryDate: '',
			EchoDonationAmount: '',
			AVSOverridePolicy: '',
			CV2OverridePolicy: '',
			ThreeDSecureOverridePolicy: '',
			OrderID: orderId,
			TransactionType: 'SALE',
			TransactionDateTime: formatTransactionDateTime(),
			CallbackURL: `${apiBaseUrl}/api/public/payments/callback`,
			OrderDescription: `${job.jobNumber} - ${milestone.description}`,
			CustomerName: customerName,
			Address1: primaryAddress
				? [primaryAddress.streetNumber, primaryAddress.route].filter(Boolean).join(' ')
				: '',
			Address2: '',
			Address3: '',
			Address4: '',
			City: primaryAddress?.locality ?? '',
			State: primaryAddress?.administrativeAreaLevel2 ?? '',
			PostCode: primaryAddress?.postalCode ?? '',
			CountryCode: '826',
			EmailAddress: email,
			PhoneNumber: phone,
			DateOfBirth: '',
			EmailAddressEditable: '',
			PhoneNumberEditable: '',
			DateOfBirthEditable: '',
			CV2Mandatory: 'true',
			Address1Mandatory: 'true',
			CityMandatory: 'true',
			PostCodeMandatory: 'true',
			StateMandatory: '',
			CountryMandatory: 'true',
			ResultDeliveryMethod: 'SERVER',
			ServerResultURL: `${apiBaseUrl}/api/public/payments/server-result`,
			PaymentFormDisplaysResult: 'false',
			PrimaryAccountName: '',
			PrimaryAccountNumber: '',
			PrimaryAccountDateOfBirth: '',
			PrimaryAccountPostCode: '',
		};

		const hashDigest = computeRequestHash(
			formFields,
			password,
			preSharedKey,
			settings.hashMethod as 'SHA1' | 'HMACSHA1',
		);

		// Create payment attempt record
		await db.insert(paymentAttempts).values({
			id: crypto.randomUUID(),
			tenantId,
			milestoneId,
			jobId: job.id,
			orderId,
			amount: amountPence,
			status: 'pending',
		});

		return c.json({
			formAction: TAKEPAYMENTS_FORM_URL,
			formFields: {
				...formFields,
				HashDigest: hashDigest,
			},
		});
	})

	// Get payment status by orderId (for success/failure pages)
	.get('/status', async (c) => {
		const orderId = c.req.query('orderId');

		if (!orderId) {
			return c.json({ error: 'Missing orderId' }, 400);
		}

		const [attempt] = await db
			.select()
			.from(paymentAttempts)
			.where(eq(paymentAttempts.orderId, orderId))
			.limit(1);

		if (!attempt) {
			return c.json({ error: 'Payment not found' }, 404);
		}

		// Load job for reference
		const [job] = await db.select().from(jobs).where(eq(jobs.id, attempt.jobId)).limit(1);

		return c.json({
			status: attempt.status,
			message: attempt.message,
			amount: attempt.amount,
			cardLastFour: attempt.cardLastFour,
			cardType: attempt.cardType,
			jobNumber: job?.jobNumber ?? null,
		});
	});

export { publicPaymentsRoutes };
