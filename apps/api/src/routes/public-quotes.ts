import crypto from 'node:crypto';
import {
	customers,
	jobPaymentScheduleItems,
	jobs,
	products,
	quoteComponents,
	quoteLettering,
	quoteLineItems,
	quotePackages,
	quoteSundries,
	quotes,
	tenantPricingSettings,
	tenants,
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { generateJobNumber } from './jobs';

// Validation schemas
const respondSchema = z.object({
	decision: z.enum(['accepted', 'rejected']),
	acceptedOptionId: z.string().optional(), // Required if decision is 'accepted'
	feedback: z.string().optional(),
});

const saveNotesSchema = z.object({
	notes: z.string(),
});

const publicQuotesRoutes = new Hono()
	// Get package by access token (public - no auth required)
	.get('/view/:token', async (c) => {
		const token = c.req.param('token');

		// Find package by token
		const [pkg] = await db
			.select()
			.from(quotePackages)
			.where(eq(quotePackages.accessToken, token))
			.limit(1);

		if (!pkg) {
			return c.json({ error: 'Quote not found or link is invalid' }, 404);
		}

		// Check if quote has expired based on validUntil
		if (pkg.validUntil && new Date(pkg.validUntil) < new Date()) {
			return c.json({ error: 'This quote has expired', expired: true }, 410);
		}

		// Get all options for this package
		const optionRows = await db
			.select()
			.from(quotes)
			.where(eq(quotes.packageId, pkg.id))
			.orderBy(asc(quotes.optionOrder));

		// Enrich each option with line items
		const options = await Promise.all(
			optionRows.map(async (opt) => {
				const [components, lettering, sundryItems, lineItems] = await Promise.all([
					db
						.select()
						.from(quoteComponents)
						.where(eq(quoteComponents.quoteId, opt.id))
						.orderBy(asc(quoteComponents.sortOrder)),
					db
						.select()
						.from(quoteLettering)
						.where(eq(quoteLettering.quoteId, opt.id))
						.orderBy(asc(quoteLettering.sortOrder)),
					db
						.select()
						.from(quoteSundries)
						.where(eq(quoteSundries.quoteId, opt.id))
						.orderBy(asc(quoteSundries.sortOrder)),
					db
						.select()
						.from(quoteLineItems)
						.where(eq(quoteLineItems.quoteId, opt.id))
						.orderBy(asc(quoteLineItems.sortOrder)),
				]);

				// Get product name if set
				let product = null;
				if (opt.productId) {
					const [productResult] = await db
						.select({ name: products.name })
						.from(products)
						.where(eq(products.id, opt.productId))
						.limit(1);
					product = productResult || null;
				}

				return {
					id: opt.id,
					quoteNumber: opt.quoteNumber,
					optionLabel: opt.optionLabel,
					optionOrder: opt.optionOrder,
					product,
					flowerHoles: opt.flowerHoles,
					subtotal: opt.subtotal,
					vatAmount: opt.vatAmount,
					total: opt.total,
					vatRate: opt.vatRate,
					// Line items with customer-visible fields only (NO supplier costs, multipliers)
					components: components.map((comp) => ({
						componentType: comp.componentType,
						height: comp.height,
						width: comp.width,
						depth: comp.depth,
						quantity: comp.quantity,
						unitPrice: comp.unitPrice,
						lineTotal: comp.lineTotal,
						materialName: comp.materialName,
						finishName: comp.finishName,
					})),
					lettering: lettering.map((lett) => ({
						text: lett.text,
						letterCount: lett.letterCount,
						unitPrice: lett.unitPrice,
						lineTotal: lett.lineTotal,
						techniqueName: lett.techniqueName,
						colorName: lett.colorName,
						fontId: lett.fontId,
						fontName: lett.fontName,
						fontS3Key: lett.fontS3Key,
					})),
					sundries: sundryItems.map((s) => ({
						quantity: s.quantity,
						unitPrice: s.unitPrice,
						lineTotal: s.lineTotal,
						sundryName: s.sundryName,
					})),
					// Only show line items marked as visible to customer
					lineItems: lineItems
						.filter((li) => li.visibleToCustomer)
						.map((li) => ({
							description: li.description,
							price: li.priceVisibleToCustomer ? li.price : null,
							vatExempt: li.vatExempt,
							priceHidden: !li.priceVisibleToCustomer,
						})),
				};
			}),
		);

		// Get tenant info for branding
		const [tenant] = await db.select().from(tenants).where(eq(tenants.id, pkg.tenantId)).limit(1);

		// Get customer name
		let customer = null;
		if (pkg.customerId) {
			const [customerResult] = await db
				.select({ firstName: customers.firstName, lastName: customers.lastName })
				.from(customers)
				.where(eq(customers.id, pkg.customerId))
				.limit(1);
			customer = customerResult || null;
		}

		// Return customer-safe data (NO internal notes, supplier costs, etc.)
		return c.json({
			package: {
				id: pkg.id,
				status: pkg.status,
				quoteType: pkg.quoteType,
				notes: pkg.notes, // Customer-visible notes only
				proposedInscription: pkg.proposedInscription,
				validUntil: pkg.validUntil,
				createdAt: pkg.createdAt,
				// Customer's previous feedback/decision if any
				customerFeedback: pkg.customerFeedback,
				acceptedOptionId: pkg.acceptedOptionId,
				customerDecisionAt: pkg.customerDecisionAt,
			},
			options,
			customer,
			tenant: tenant ? { id: tenant.id, name: tenant.name, hasLogo: !!tenant.logoUrl } : null,
		});
	})

	// Submit customer decision and feedback
	.post('/view/:token/respond', zValidator('json', respondSchema), async (c) => {
		const token = c.req.param('token');
		const { decision, acceptedOptionId, feedback } = c.req.valid('json');

		// Find package
		const [pkg] = await db
			.select()
			.from(quotePackages)
			.where(eq(quotePackages.accessToken, token))
			.limit(1);

		if (!pkg) {
			return c.json({ error: 'Quote not found or link is invalid' }, 404);
		}

		// Check expiry
		if (pkg.validUntil && new Date(pkg.validUntil) < new Date()) {
			return c.json({ error: 'This quote has expired' }, 410);
		}

		// Only allow response if package is in 'presented' status
		if (pkg.status !== 'presented') {
			return c.json({ error: 'This quote cannot be responded to in its current state' }, 400);
		}

		// Check if already responded
		if (pkg.acceptedOptionId || pkg.status === 'accepted' || pkg.status === 'rejected') {
			return c.json({ error: 'You have already responded to this quote' }, 400);
		}

		// If accepting, require an option ID
		if (decision === 'accepted' && !acceptedOptionId) {
			return c.json({ error: 'Please select an option to accept' }, 400);
		}

		// Verify the accepted option exists in this package
		let acceptedOption = null;
		if (decision === 'accepted') {
			const [opt] = await db.select().from(quotes).where(eq(quotes.id, acceptedOptionId!)).limit(1);

			if (!opt || opt.packageId !== pkg.id) {
				return c.json({ error: 'Invalid option selected' }, 400);
			}
			acceptedOption = opt;
		}

		const now = new Date();

		// Update package with customer's decision
		await db
			.update(quotePackages)
			.set({
				status: decision,
				acceptedOptionId: decision === 'accepted' ? acceptedOptionId : null,
				customerDecisionAt: now,
				customerFeedback: feedback || null,
				customerFeedbackAt: feedback ? now : null,
				updatedAt: now,
			})
			.where(eq(quotePackages.id, pkg.id));

		// Update all options status to match
		await db
			.update(quotes)
			.set({ status: decision, updatedAt: now })
			.where(eq(quotes.packageId, pkg.id));

		// If accepted, create a job from the accepted option
		if (decision === 'accepted' && acceptedOption) {
			const tenantId = pkg.tenantId;
			const jobNumber = await generateJobNumber(tenantId);
			const jobId = crypto.randomUUID();

			await db.insert(jobs).values({
				id: jobId,
				tenantId,
				quoteId: acceptedOptionId!, // Link to the specific accepted option
				jobNumber,
				status: 'pending',
			});

			// Get tenant's deposit percentage setting
			let depositPercent = 50; // Default 50%
			const [pricingSettingsRow] = await db
				.select()
				.from(tenantPricingSettings)
				.where(eq(tenantPricingSettings.tenantId, tenantId))
				.limit(1);

			if (pricingSettingsRow?.defaultDepositPercent) {
				depositPercent = parseFloat(pricingSettingsRow.defaultDepositPercent);
			}

			// Calculate deposit and balance amounts
			const total = parseFloat(acceptedOption.total);
			const depositAmount = (total * depositPercent) / 100;
			const balanceAmount = total - depositAmount;

			// Create payment schedule items
			await db.insert(jobPaymentScheduleItems).values({
				id: crypto.randomUUID(),
				tenantId,
				jobId,
				description: 'Deposit',
				amount: depositAmount.toFixed(2),
				dueDate: now,
				paidAmount: '0',
				sortOrder: 0,
			});

			await db.insert(jobPaymentScheduleItems).values({
				id: crypto.randomUUID(),
				tenantId,
				jobId,
				description: 'Balance',
				amount: balanceAmount.toFixed(2),
				dueDate: null,
				paidAmount: '0',
				sortOrder: 1,
			});
		}

		return c.json({
			success: true,
			message:
				decision === 'accepted'
					? 'Thank you for accepting this quote! We will be in touch shortly.'
					: 'Thank you for your feedback.',
		});
	})

	// Save customer notes without making a decision
	.post('/view/:token/notes', zValidator('json', saveNotesSchema), async (c) => {
		const token = c.req.param('token');
		const { notes } = c.req.valid('json');

		// Find package
		const [pkg] = await db
			.select()
			.from(quotePackages)
			.where(eq(quotePackages.accessToken, token))
			.limit(1);

		if (!pkg) {
			return c.json({ error: 'Quote not found or link is invalid' }, 404);
		}

		// Check expiry
		if (pkg.validUntil && new Date(pkg.validUntil) < new Date()) {
			return c.json({ error: 'This quote has expired' }, 410);
		}

		// Only allow notes if package is in 'presented' status (not yet decided)
		if (pkg.status !== 'presented') {
			return c.json({ error: 'Notes cannot be added to this quote in its current state' }, 400);
		}

		const now = new Date();

		// Update package with customer's notes
		await db
			.update(quotePackages)
			.set({
				customerFeedback: notes || null,
				customerFeedbackAt: notes ? now : null,
				updatedAt: now,
			})
			.where(eq(quotePackages.id, pkg.id));

		return c.json({
			success: true,
			message: 'Your notes have been saved.',
		});
	});

export { publicQuotesRoutes };
