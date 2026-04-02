import crypto from 'node:crypto';
import {
	ENQUIRY_SOURCES,
	inquiries,
	inquiryProducts,
	inquirySundries,
	products,
	sundries,
	tenants,
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { db } from '../lib/auth';

const externalInquiriesRoutes = new Hono();

// Open CORS for external consumption (any origin)
externalInquiriesRoutes.use('*', cors({ origin: '*' }));

// Tenant slug resolution middleware
externalInquiriesRoutes.use('/:slug/*', async (c, next) => {
	const slug = c.req.param('slug');

	const [tenant] = await db
		.select({ id: tenants.id })
		.from(tenants)
		.where(eq(tenants.slug, slug))
		.limit(1);

	if (!tenant) {
		return c.json({ error: 'Not found' }, 404);
	}

	c.set('externalTenantId', tenant.id);
	await next();
});

const submitInquirySchema = z.object({
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	email: z.string().optional(),
	phone: z.string().optional(),
	message: z.string().optional(),
	source: z.enum(ENQUIRY_SOURCES).optional().default('website'),
	products: z
		.array(
			z.object({
				productId: z.string().min(1),
			}),
		)
		.optional()
		.default([]),
	sundries: z
		.array(
			z.object({
				sundryId: z.string().min(1),
			}),
		)
		.optional()
		.default([]),
});

// POST /:slug/inquiries — Submit inquiry from website (public, no auth)
externalInquiriesRoutes.post(
	'/:slug/inquiries',
	zValidator('json', submitInquirySchema),
	async (c) => {
		const tenantId = c.get('externalTenantId');
		const data = c.req.valid('json');

		// Validate product IDs belong to tenant and are active
		if (data.products.length > 0) {
			const productIds = data.products.map((p) => p.productId);
			for (const productId of productIds) {
				const [product] = await db
					.select({ id: products.id })
					.from(products)
					.where(
						and(
							eq(products.id, productId),
							eq(products.tenantId, tenantId),
							eq(products.isActive, true),
							isNull(products.archivedAt),
						),
					)
					.limit(1);

				if (!product) {
					return c.json({ error: `Product ${productId} not found` }, 400);
				}
			}
		}

		// Validate sundry IDs belong to tenant and are active
		if (data.sundries.length > 0) {
			const sundryIds = data.sundries.map((s) => s.sundryId);
			for (const sundryId of sundryIds) {
				const [sundry] = await db
					.select({ id: sundries.id })
					.from(sundries)
					.where(
						and(
							eq(sundries.id, sundryId),
							eq(sundries.tenantId, tenantId),
							eq(sundries.isActive, true),
						),
					)
					.limit(1);

				if (!sundry) {
					return c.json({ error: `Sundry ${sundryId} not found` }, 400);
				}
			}
		}

		const id = crypto.randomUUID();

		await db.insert(inquiries).values({
			id,
			tenantId,
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email || null,
			phone: data.phone || null,
			message: data.message || null,
			source: data.source,
			status: 'new',
		});

		if (data.products.length > 0) {
			await db.insert(inquiryProducts).values(
				data.products.map((p) => ({
					id: crypto.randomUUID(),
					inquiryId: id,
					productId: p.productId,
				})),
			);
		}

		if (data.sundries.length > 0) {
			await db.insert(inquirySundries).values(
				data.sundries.map((s) => ({
					id: crypto.randomUUID(),
					inquiryId: id,
					sundryId: s.sundryId,
				})),
			);
		}

		return c.json({ id, success: true }, 201);
	},
);

export { externalInquiriesRoutes };
