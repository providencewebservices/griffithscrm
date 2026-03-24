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
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { decrypt } from '../lib/encryption';
import { createPaymentToken } from '../lib/payment-token';
import { computeRequestHash } from '../lib/takepayments-hash';
import { requireAuth, requireTenant } from '../middleware/auth';

const TAKEPAYMENTS_FORM_URL =
	'https://mms.tponlinepayments2.com/Pages/PublicPages/PaymentForm.aspx';

const initiateSchema = z.object({
	milestoneId: z.string().min(1),
});

const generateLinkSchema = z.object({
	milestoneId: z.string().min(1),
});

function formatTransactionDateTime(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} +00:00`;
}

async function loadMilestoneWithDetails(milestoneId: string, tenantId: string) {
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

	if (!milestone) return null;

	// Check if already fully paid
	const paidAmount = parseFloat(milestone.paidAmount);
	const amount = parseFloat(milestone.amount);
	if (paidAmount >= amount) return null;

	// Load job
	const [job] = await db.select().from(jobs).where(eq(jobs.id, milestone.jobId)).limit(1);

	if (!job) return null;

	// Load quote for customer
	const [quote] = await db.select().from(quotes).where(eq(quotes.id, job.quoteId)).limit(1);

	if (!quote || !quote.customerId) return null;

	// Load customer
	const [customer] = await db
		.select()
		.from(customers)
		.where(eq(customers.id, quote.customerId))
		.limit(1);

	if (!customer) return null;

	// Load primary address
	const addressRows = await db
		.select({ address: addresses })
		.from(customerAddresses)
		.innerJoin(addresses, eq(addresses.id, customerAddresses.addressId))
		.where(eq(customerAddresses.customerId, customer.id))
		.limit(1);

	const primaryAddress = addressRows[0]?.address ?? null;

	// Load contact info (email + phone)
	const contactRows = await db
		.select({ contact: contactInfo })
		.from(customerContactInfo)
		.innerJoin(contactInfo, eq(contactInfo.id, customerContactInfo.contactInfoId))
		.where(eq(customerContactInfo.customerId, customer.id));

	const email = contactRows.find((r) => r.contact.type === 'email')?.contact.value ?? '';
	const phone =
		contactRows.find((r) => r.contact.type === 'phone' || r.contact.type === 'mobile')?.contact
			.value ?? '';

	return { milestone, job, quote, customer, primaryAddress, email, phone };
}

function buildFormFields(params: {
	merchantId: string;
	amount: number;
	orderId: string;
	customerName: string;
	address: typeof addresses.$inferSelect | null;
	email: string;
	phone: string;
	description: string;
}): Record<string, string> {
	const { merchantId, amount, orderId, customerName, address, email, phone, description } = params;
	const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

	return {
		MerchantID: merchantId,
		Amount: String(amount),
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
		OrderDescription: description,
		CustomerName: customerName,
		Address1: address ? [address.streetNumber, address.route].filter(Boolean).join(' ') : '',
		Address2: '',
		Address3: '',
		Address4: '',
		City: address?.locality ?? '',
		State: address?.administrativeAreaLevel2 ?? '',
		PostCode: address?.postalCode ?? '',
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
}

const paymentsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// Initiate payment — generate form data for TakePayments hosted form
	.post('/initiate', zValidator('json', initiateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { milestoneId } = c.req.valid('json');

		// Load TakePayments settings
		const [settings] = await db
			.select()
			.from(takepaymentsSettings)
			.where(
				and(eq(takepaymentsSettings.tenantId, tenantId), eq(takepaymentsSettings.isActive, true)),
			)
			.limit(1);

		if (!settings) {
			return c.json(
				{ error: 'TakePayments is not configured. Please set up payment settings first.' },
				400,
			);
		}

		const details = await loadMilestoneWithDetails(milestoneId, tenantId);
		if (!details) {
			return c.json({ error: 'Milestone not found or already paid' }, 404);
		}

		const { milestone, job, customer } = details;
		const password = decrypt(settings.gatewayPasswordEncrypted);
		const preSharedKey = decrypt(settings.preSharedKeyEncrypted);

		const amountPence = Math.round(parseFloat(milestone.amount) * 100);
		const orderId = `JOB-${job.jobNumber}-MS-${milestoneId.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;

		const formFields = buildFormFields({
			merchantId: settings.merchantId,
			amount: amountPence,
			orderId,
			customerName: `${customer.firstName} ${customer.lastName}`,
			address: details.primaryAddress,
			email: details.email,
			phone: details.phone,
			description: `${job.jobNumber} - ${milestone.description}`,
		});

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

	// Generate shareable payment link
	.post('/generate-link', zValidator('json', generateLinkSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { milestoneId } = c.req.valid('json');

		// Verify milestone
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
			return c.json({ error: 'Milestone not found' }, 404);
		}

		const paidAmount = parseFloat(milestone.paidAmount);
		const amount = parseFloat(milestone.amount);
		if (paidAmount >= amount) {
			return c.json({ error: 'Milestone is already paid' }, 400);
		}

		const token = createPaymentToken(milestoneId, tenantId, milestone.amount);
		const appUrl = process.env.APP_URL || 'http://localhost:5173';

		return c.json({ paymentUrl: `${appUrl}/pay/${token}` });
	});

export { paymentsRoutes };
