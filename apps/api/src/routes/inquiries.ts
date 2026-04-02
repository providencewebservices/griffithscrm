import crypto from 'node:crypto';
import {
	brochures,
	customers,
	ENQUIRY_SOURCES,
	INQUIRY_STATUSES,
	inquiries,
	inquiryProducts,
	inquirySundries,
	productCategories,
	products,
	quotePackages,
	sundries,
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { requireAuth, requireTenant } from '../middleware/auth';

// Validation schemas
const createSchema = z.object({
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	email: z.string().optional(),
	phone: z.string().optional(),
	message: z.string().optional(),
	source: z.enum(ENQUIRY_SOURCES),
	customerId: z.string().optional(),
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

const updateSchema = z.object({
	firstName: z.string().min(1).optional(),
	lastName: z.string().min(1).optional(),
	email: z.string().nullable().optional(),
	phone: z.string().nullable().optional(),
	message: z.string().nullable().optional(),
	source: z.enum(ENQUIRY_SOURCES).optional(),
	status: z.enum(INQUIRY_STATUSES).optional(),
	products: z
		.array(
			z.object({
				productId: z.string().min(1),
			}),
		)
		.optional(),
	sundries: z
		.array(
			z.object({
				sundryId: z.string().min(1),
			}),
		)
		.optional(),
});

const listQuerySchema = z.object({
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	search: z.string().optional(),
	status: z
		.enum([...INQUIRY_STATUSES, 'all'])
		.optional()
		.default('all'),
	customerId: z.string().optional(),
});

const linkCustomerSchema = z.object({
	customerId: z.string().min(1, 'Customer ID is required'),
});

export const inquiriesRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List inquiries
	.get('/', zValidator('query', listQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { page, limit, search, status, customerId } = c.req.valid('query');

		const conditions: ReturnType<typeof eq>[] = [eq(inquiries.tenantId, tenantId)];

		// Exclude archived unless explicitly filtering for them
		conditions.push(isNull(inquiries.archivedAt));

		// Status filter
		if (status !== 'all') {
			conditions.push(eq(inquiries.status, status));
		}

		// Customer filter
		if (customerId) {
			conditions.push(eq(inquiries.customerId, customerId));
		}

		// Search by name or email
		if (search?.trim()) {
			const searchTerm = `%${search.trim().toLowerCase()}%`;
			conditions.push(
				sql`(LOWER(CONCAT(${inquiries.firstName}, ' ', ${inquiries.lastName})) LIKE ${searchTerm} OR LOWER(COALESCE(${inquiries.email}, '')) LIKE ${searchTerm})`,
			);
		}

		// Get total count
		const [totalResult] = await db
			.select({ count: count() })
			.from(inquiries)
			.where(and(...conditions));
		const total = Number(totalResult.count);

		// Product and sundry count subqueries
		const productCountSq = db
			.select({
				inquiryId: inquiryProducts.inquiryId,
				count: count().as('product_count'),
			})
			.from(inquiryProducts)
			.groupBy(inquiryProducts.inquiryId)
			.as('product_counts');

		const sundryCountSq = db
			.select({
				inquiryId: inquirySundries.inquiryId,
				count: count().as('sundry_count'),
			})
			.from(inquirySundries)
			.groupBy(inquirySundries.inquiryId)
			.as('sundry_counts');

		// Get paginated inquiries
		const offset = (page - 1) * limit;
		const inquiryList = await db
			.select({
				id: inquiries.id,
				tenantId: inquiries.tenantId,
				customerId: inquiries.customerId,
				firstName: inquiries.firstName,
				lastName: inquiries.lastName,
				email: inquiries.email,
				phone: inquiries.phone,
				source: inquiries.source,
				status: inquiries.status,
				archivedAt: inquiries.archivedAt,
				createdAt: inquiries.createdAt,
				updatedAt: inquiries.updatedAt,
				customerFirstName: customers.firstName,
				customerLastName: customers.lastName,
				productCount: productCountSq.count,
				sundryCount: sundryCountSq.count,
			})
			.from(inquiries)
			.leftJoin(customers, eq(inquiries.customerId, customers.id))
			.leftJoin(productCountSq, eq(productCountSq.inquiryId, inquiries.id))
			.leftJoin(sundryCountSq, eq(sundryCountSq.inquiryId, inquiries.id))
			.where(and(...conditions))
			.orderBy(desc(inquiries.createdAt))
			.limit(limit)
			.offset(offset);

		const items = inquiryList.map((i) => ({
			...i,
			customerName: i.customerFirstName
				? [i.customerFirstName, i.customerLastName].filter(Boolean).join(' ')
				: null,
			productCount: Number(i.productCount || 0),
			sundryCount: Number(i.sundryCount || 0),
			selectionCount: Number(i.productCount || 0) + Number(i.sundryCount || 0),
		}));

		return c.json({
			items,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	})

	// Get inquiry detail
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const inquiryId = c.req.param('id');

		const [inquiry] = await db
			.select({
				id: inquiries.id,
				tenantId: inquiries.tenantId,
				customerId: inquiries.customerId,
				firstName: inquiries.firstName,
				lastName: inquiries.lastName,
				email: inquiries.email,
				phone: inquiries.phone,
				message: inquiries.message,
				source: inquiries.source,
				status: inquiries.status,
				archivedAt: inquiries.archivedAt,
				createdAt: inquiries.createdAt,
				updatedAt: inquiries.updatedAt,
				customerFirstName: customers.firstName,
				customerLastName: customers.lastName,
			})
			.from(inquiries)
			.leftJoin(customers, eq(inquiries.customerId, customers.id))
			.where(and(eq(inquiries.id, inquiryId), eq(inquiries.tenantId, tenantId)))
			.limit(1);

		if (!inquiry) {
			return c.json({ error: 'Inquiry not found' }, 404);
		}

		// Get products
		const inquiryProductList = await db
			.select({
				id: inquiryProducts.id,
				productId: inquiryProducts.productId,
				productName: products.name,
				productSku: products.sku,
				productImageUrl: products.imageUrl,
				productCategoryName: productCategories.name,
			})
			.from(inquiryProducts)
			.leftJoin(products, eq(products.id, inquiryProducts.productId))
			.leftJoin(productCategories, eq(products.categoryId, productCategories.id))
			.where(eq(inquiryProducts.inquiryId, inquiryId));

		const inquirySundryList = await db
			.select({
				id: inquirySundries.id,
				sundryId: inquirySundries.sundryId,
				sundryName: sundries.name,
				sundryDescription: sundries.description,
				sundryImageUrl: sundries.imageUrl,
			})
			.from(inquirySundries)
			.leftJoin(sundries, eq(sundries.id, inquirySundries.sundryId))
			.where(eq(inquirySundries.inquiryId, inquiryId));

		// Get linked brochures
		const linkedBrochures = await db
			.select({
				id: brochures.id,
				createdAt: brochures.createdAt,
				archivedAt: brochures.archivedAt,
			})
			.from(brochures)
			.where(eq(brochures.inquiryId, inquiryId))
			.orderBy(desc(brochures.createdAt));

		// Get linked quote packages
		const linkedQuotePackages = await db
			.select({
				id: quotePackages.id,
				packageNumber: quotePackages.packageNumber,
				status: quotePackages.status,
				createdAt: quotePackages.createdAt,
			})
			.from(quotePackages)
			.where(eq(quotePackages.inquiryId, inquiryId))
			.orderBy(desc(quotePackages.createdAt));

		return c.json({
			inquiry: {
				...inquiry,
				customerName: inquiry.customerFirstName
					? [inquiry.customerFirstName, inquiry.customerLastName].filter(Boolean).join(' ')
					: null,
				products: inquiryProductList,
				sundries: inquirySundryList,
				linkedBrochures,
				linkedQuotePackages,
			},
		});
	})

	// Create inquiry
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		const id = crypto.randomUUID();

		const [created] = await db
			.insert(inquiries)
			.values({
				id,
				tenantId,
				customerId: data.customerId || null,
				firstName: data.firstName,
				lastName: data.lastName,
				email: data.email || null,
				phone: data.phone || null,
				message: data.message || null,
				source: data.source,
				status: 'new',
			})
			.returning();

		// Insert inquiry products
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

		return c.json({ inquiry: created }, 201);
	})

	// Update inquiry
	.patch('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const inquiryId = c.req.param('id');
		const data = c.req.valid('json');

		// Verify tenant ownership
		const [existing] = await db
			.select()
			.from(inquiries)
			.where(and(eq(inquiries.id, inquiryId), eq(inquiries.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Inquiry not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.firstName !== undefined) updateData.firstName = data.firstName;
		if (data.lastName !== undefined) updateData.lastName = data.lastName;
		if (data.email !== undefined) updateData.email = data.email;
		if (data.phone !== undefined) updateData.phone = data.phone;
		if (data.message !== undefined) updateData.message = data.message;
		if (data.source !== undefined) updateData.source = data.source;
		if (data.status !== undefined) updateData.status = data.status;

		await db.update(inquiries).set(updateData).where(eq(inquiries.id, inquiryId));

		// Replace products if provided
		if (data.products !== undefined) {
			await db.delete(inquiryProducts).where(eq(inquiryProducts.inquiryId, inquiryId));

			if (data.products.length > 0) {
				await db.insert(inquiryProducts).values(
					data.products.map((p) => ({
						id: crypto.randomUUID(),
						inquiryId,
						productId: p.productId,
					})),
				);
			}
		}

		if (data.sundries !== undefined) {
			await db.delete(inquirySundries).where(eq(inquirySundries.inquiryId, inquiryId));

			if (data.sundries.length > 0) {
				await db.insert(inquirySundries).values(
					data.sundries.map((s) => ({
						id: crypto.randomUUID(),
						inquiryId,
						sundryId: s.sundryId,
					})),
				);
			}
		}

		const [updated] = await db.select().from(inquiries).where(eq(inquiries.id, inquiryId)).limit(1);

		return c.json({ inquiry: updated });
	})

	// Archive inquiry (soft delete)
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const inquiryId = c.req.param('id');

		const [existing] = await db
			.select()
			.from(inquiries)
			.where(and(eq(inquiries.id, inquiryId), eq(inquiries.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Inquiry not found' }, 404);
		}

		await db
			.update(inquiries)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(eq(inquiries.id, inquiryId));

		return c.json({ success: true });
	})

	// Link customer to inquiry
	.post('/:id/link-customer', zValidator('json', linkCustomerSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const inquiryId = c.req.param('id');
		const { customerId } = c.req.valid('json');

		// Verify inquiry exists and belongs to tenant
		const [existing] = await db
			.select()
			.from(inquiries)
			.where(and(eq(inquiries.id, inquiryId), eq(inquiries.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Inquiry not found' }, 404);
		}

		// Verify customer exists and belongs to tenant
		const [customer] = await db
			.select({ id: customers.id })
			.from(customers)
			.where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
			.limit(1);

		if (!customer) {
			return c.json({ error: 'Customer not found' }, 404);
		}

		await db
			.update(inquiries)
			.set({ customerId, updatedAt: new Date() })
			.where(eq(inquiries.id, inquiryId));

		return c.json({ success: true });
	})

	// Unlink customer from inquiry
	.post('/:id/unlink-customer', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const inquiryId = c.req.param('id');

		const [existing] = await db
			.select()
			.from(inquiries)
			.where(and(eq(inquiries.id, inquiryId), eq(inquiries.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Inquiry not found' }, 404);
		}

		await db
			.update(inquiries)
			.set({ customerId: null, updatedAt: new Date() })
			.where(eq(inquiries.id, inquiryId));

		return c.json({ success: true });
	});
