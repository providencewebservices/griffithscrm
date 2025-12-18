import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../lib/auth';
import {
	quotes,
	quoteComponents,
	quoteLettering,
	quoteSundries,
	quoteServices,
	customers,
	products,
	tenants,
} from '@griffiths-crm/shared/db/schema';

// Validation schemas
const submitFeedbackSchema = z.object({
	decision: z.enum(['accepted', 'rejected']),
	feedback: z.string().optional(),
});

const saveNotesSchema = z.object({
	notes: z.string(),
});

const publicQuotesRoutes = new Hono()
	// Get quote by access token (public - no auth required)
	.get('/view/:token', async (c) => {
		const token = c.req.param('token');

		// Find quote by token
		const [quote] = await db
			.select()
			.from(quotes)
			.where(eq(quotes.accessToken, token))
			.limit(1);

		if (!quote) {
			return c.json({ error: 'Quote not found or link is invalid' }, 404);
		}

		// Check if quote has expired based on validUntil
		if (quote.validUntil && new Date(quote.validUntil) < new Date()) {
			return c.json({ error: 'This quote has expired', expired: true }, 410);
		}

		// Get quote line items and related data (customer-visible only)
		const [components, lettering, sundryItems, serviceItems] = await Promise.all([
			db.select().from(quoteComponents).where(eq(quoteComponents.quoteId, quote.id)),
			db.select().from(quoteLettering).where(eq(quoteLettering.quoteId, quote.id)),
			db.select().from(quoteSundries).where(eq(quoteSundries.quoteId, quote.id)),
			db.select().from(quoteServices).where(eq(quoteServices.quoteId, quote.id)),
		]);

		// Get tenant info for branding
		const [tenant] = await db
			.select()
			.from(tenants)
			.where(eq(tenants.id, quote.tenantId))
			.limit(1);

		// Get product name if set
		let product = null;
		if (quote.productId) {
			const [productResult] = await db
				.select({ name: products.name })
				.from(products)
				.where(eq(products.id, quote.productId))
				.limit(1);
			product = productResult || null;
		}

		// Get customer name
		let customer = null;
		if (quote.customerId) {
			const [customerResult] = await db
				.select({ firstName: customers.firstName, lastName: customers.lastName })
				.from(customers)
				.where(eq(customers.id, quote.customerId))
				.limit(1);
			customer = customerResult || null;
		}

		// Return customer-safe data (NO internal notes, supplier costs, multipliers, etc.)
		return c.json({
			quote: {
				id: quote.id,
				quoteNumber: quote.quoteNumber,
				status: quote.status,
				subtotal: quote.subtotal,
				vatAmount: quote.vatAmount,
				total: quote.total,
				vatRate: quote.vatRate,
				notes: quote.notes, // Customer-visible notes only
				flowerHoles: quote.flowerHoles,
				proposedInscription: quote.proposedInscription,
				validUntil: quote.validUntil,
				createdAt: quote.createdAt,
				// Customer's previous feedback/decision if any
				customerFeedback: quote.customerFeedback,
				customerDecision: quote.customerDecision,
				customerDecisionAt: quote.customerDecisionAt,
			},
			customer,
			product,
			tenant: tenant ? { name: tenant.name } : null,
			// Line items with customer-visible fields only (NO supplier costs, multipliers, fixed amounts)
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
			})),
			sundries: sundryItems.map((s) => ({
				quantity: s.quantity,
				unitPrice: s.unitPrice,
				lineTotal: s.lineTotal,
				sundryName: s.sundryName,
			})),
			services: serviceItems.map((s) => ({
				quantity: s.quantity,
				unitPrice: s.unitPrice,
				lineTotal: s.lineTotal,
				serviceName: s.serviceName,
			})),
		});
	})

	// Submit customer decision and feedback
	.post('/view/:token/respond', zValidator('json', submitFeedbackSchema), async (c) => {
		const token = c.req.param('token');
		const { decision, feedback } = c.req.valid('json');

		// Find quote
		const [quote] = await db
			.select()
			.from(quotes)
			.where(eq(quotes.accessToken, token))
			.limit(1);

		if (!quote) {
			return c.json({ error: 'Quote not found or link is invalid' }, 404);
		}

		// Check expiry
		if (quote.validUntil && new Date(quote.validUntil) < new Date()) {
			return c.json({ error: 'This quote has expired' }, 410);
		}

		// Only allow response if quote is in 'presented' status
		if (quote.status !== 'presented') {
			return c.json({ error: 'This quote cannot be responded to in its current state' }, 400);
		}

		// Check if already responded
		if (quote.customerDecision) {
			return c.json({ error: 'You have already responded to this quote' }, 400);
		}

		const now = new Date();

		// Update quote with customer's decision
		await db
			.update(quotes)
			.set({
				customerDecision: decision,
				customerDecisionAt: now,
				customerFeedback: feedback || null,
				customerFeedbackAt: feedback ? now : null,
				status: decision, // Update status to 'accepted' or 'rejected'
				updatedAt: now,
			})
			.where(eq(quotes.id, quote.id));

		return c.json({
			success: true,
			message:
				decision === 'accepted'
					? 'Thank you for accepting this quote!'
					: 'Thank you for your feedback.',
		});
	})

	// Save customer notes without making a decision
	.post('/view/:token/notes', zValidator('json', saveNotesSchema), async (c) => {
		const token = c.req.param('token');
		const { notes } = c.req.valid('json');

		// Find quote
		const [quote] = await db
			.select()
			.from(quotes)
			.where(eq(quotes.accessToken, token))
			.limit(1);

		if (!quote) {
			return c.json({ error: 'Quote not found or link is invalid' }, 404);
		}

		// Check expiry
		if (quote.validUntil && new Date(quote.validUntil) < new Date()) {
			return c.json({ error: 'This quote has expired' }, 410);
		}

		// Only allow notes if quote is in 'presented' status (not yet decided)
		if (quote.status !== 'presented') {
			return c.json({ error: 'Notes cannot be added to this quote in its current state' }, 400);
		}

		const now = new Date();

		// Update quote with customer's notes
		await db
			.update(quotes)
			.set({
				customerFeedback: notes || null,
				customerFeedbackAt: notes ? now : null,
				updatedAt: now,
			})
			.where(eq(quotes.id, quote.id));

		return c.json({
			success: true,
			message: 'Your notes have been saved.',
		});
	});

export { publicQuotesRoutes };
