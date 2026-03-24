import crypto from 'node:crypto';
import {
	brochureProducts,
	brochures,
	contactInfo,
	customerContactInfo,
	customers,
	productCategories,
	products,
	users,
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, count, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { requireAuth, requireTenant } from '../middleware/auth';

// Validation schemas
const createSchema = z.object({
	customerId: z.string().min(1, 'Customer is required'),
	message: z.string().optional(),
	expiresAt: z.string().optional(),
	products: z.array(
		z.object({
			productId: z.string().min(1),
			sortOrder: z.number().int().min(0),
		}),
	),
});

const updateSchema = z.object({
	message: z.string().optional(),
	expiresAt: z.string().optional(),
	products: z
		.array(
			z.object({
				productId: z.string().min(1),
				sortOrder: z.number().int().min(0),
			}),
		)
		.optional(),
});

const listQuerySchema = z.object({
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	search: z.string().optional(),
	status: z.enum(['active', 'expired', 'archived', 'all']).optional().default('all'),
});

const brochuresRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List brochures
	.get('/', zValidator('query', listQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { page, limit, search, status } = c.req.valid('query');

		const conditions: ReturnType<typeof eq>[] = [eq(brochures.tenantId, tenantId)];

		// Status filter
		if (status === 'active') {
			conditions.push(isNull(brochures.archivedAt));
			conditions.push(sql`${brochures.expiresAt} > NOW()`);
		} else if (status === 'expired') {
			conditions.push(isNull(brochures.archivedAt));
			conditions.push(sql`${brochures.expiresAt} <= NOW()`);
		} else if (status === 'archived') {
			conditions.push(isNotNull(brochures.archivedAt));
		} else {
			// 'all' — exclude archived by default
			conditions.push(isNull(brochures.archivedAt));
		}

		// Search by customer name
		if (search?.trim()) {
			const searchTerm = `%${search.trim().toLowerCase()}%`;
			conditions.push(
				sql`LOWER(CONCAT(COALESCE(${customers.firstName}, ''), ' ', COALESCE(${customers.lastName}, ''))) LIKE ${searchTerm}`,
			);
		}

		// Get total count
		const [totalResult] = await db
			.select({ count: count() })
			.from(brochures)
			.leftJoin(customers, eq(brochures.customerId, customers.id))
			.where(and(...conditions));
		const total = Number(totalResult.count);

		// Get paginated brochures
		const offset = (page - 1) * limit;

		// Product count subquery
		const productCountSq = db
			.select({
				brochureId: brochureProducts.brochureId,
				count: count().as('product_count'),
			})
			.from(brochureProducts)
			.groupBy(brochureProducts.brochureId)
			.as('product_counts');

		const brochureList = await db
			.select({
				id: brochures.id,
				tenantId: brochures.tenantId,
				customerId: brochures.customerId,
				message: brochures.message,
				expiresAt: brochures.expiresAt,
				readyToDiscussAt: brochures.readyToDiscussAt,
				archivedAt: brochures.archivedAt,
				emailSentAt: brochures.emailSentAt,
				emailSentCount: brochures.emailSentCount,
				createdAt: brochures.createdAt,
				updatedAt: brochures.updatedAt,
				customerFirstName: customers.firstName,
				customerLastName: customers.lastName,
				productCount: productCountSq.count,
			})
			.from(brochures)
			.leftJoin(customers, eq(brochures.customerId, customers.id))
			.leftJoin(productCountSq, eq(productCountSq.brochureId, brochures.id))
			.where(and(...conditions))
			.orderBy(desc(brochures.createdAt))
			.limit(limit)
			.offset(offset);

		const brochuresWithMeta = brochureList.map((b) => ({
			...b,
			customerName: [b.customerFirstName, b.customerLastName].filter(Boolean).join(' ') || null,
			productCount: Number(b.productCount || 0),
		}));

		return c.json({
			brochures: brochuresWithMeta,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	})

	// Get brochure detail
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const brochureId = c.req.param('id');

		const [brochure] = await db
			.select({
				id: brochures.id,
				tenantId: brochures.tenantId,
				customerId: brochures.customerId,
				createdById: brochures.createdById,
				createdByName: users.name,
				message: brochures.message,
				accessToken: brochures.accessToken,
				expiresAt: brochures.expiresAt,
				readyToDiscussAt: brochures.readyToDiscussAt,
				archivedAt: brochures.archivedAt,
				emailSentAt: brochures.emailSentAt,
				emailSentCount: brochures.emailSentCount,
				createdAt: brochures.createdAt,
				updatedAt: brochures.updatedAt,
				customerFirstName: customers.firstName,
				customerLastName: customers.lastName,
			})
			.from(brochures)
			.leftJoin(customers, eq(brochures.customerId, customers.id))
			.leftJoin(users, eq(brochures.createdById, users.id))
			.where(and(eq(brochures.id, brochureId), eq(brochures.tenantId, tenantId)))
			.limit(1);

		if (!brochure) {
			return c.json({ error: 'Brochure not found' }, 404);
		}

		// Get products
		const brochureProductList = await db
			.select({
				id: brochureProducts.id,
				productId: brochureProducts.productId,
				sortOrder: brochureProducts.sortOrder,
				isInterested: brochureProducts.isInterested,
				interestedAt: brochureProducts.interestedAt,
				productName: products.name,
				productSku: products.sku,
				productImageUrl: products.imageUrl,
				productDescription: products.description,
				productCategoryName: productCategories.name,
			})
			.from(brochureProducts)
			.leftJoin(products, eq(products.id, brochureProducts.productId))
			.leftJoin(productCategories, eq(products.categoryId, productCategories.id))
			.where(eq(brochureProducts.brochureId, brochureId))
			.orderBy(brochureProducts.sortOrder);

		// Get customer email
		let customerEmail: string | null = null;
		if (brochure.customerId) {
			const primaryEmail = await db
				.select({ value: contactInfo.value })
				.from(customerContactInfo)
				.innerJoin(contactInfo, eq(contactInfo.id, customerContactInfo.contactInfoId))
				.where(
					and(
						eq(customerContactInfo.customerId, brochure.customerId),
						eq(contactInfo.type, 'email'),
						eq(contactInfo.isPrimary, true),
					),
				)
				.limit(1);

			customerEmail = primaryEmail[0]?.value || null;
		}

		return c.json({
			brochure: {
				...brochure,
				customerName:
					[brochure.customerFirstName, brochure.customerLastName].filter(Boolean).join(' ') || null,
				customerEmail,
				products: brochureProductList,
			},
		});
	})

	// Create brochure
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		const id = crypto.randomUUID();
		const accessToken = crypto.randomBytes(32).toString('hex');
		const expiresAt = data.expiresAt
			? new Date(data.expiresAt)
			: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

		// Archive any existing active brochure for this customer+tenant
		await db
			.update(brochures)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(
				and(
					eq(brochures.tenantId, tenantId),
					eq(brochures.customerId, data.customerId),
					isNull(brochures.archivedAt),
				),
			);

		// Insert brochure
		const [created] = await db
			.insert(brochures)
			.values({
				id,
				tenantId,
				customerId: data.customerId,
				createdById: currentUser.id,
				message: data.message || null,
				accessToken,
				expiresAt,
			})
			.returning();

		// Insert brochure products
		if (data.products.length > 0) {
			await db.insert(brochureProducts).values(
				data.products.map((p) => ({
					id: crypto.randomUUID(),
					brochureId: id,
					productId: p.productId,
					sortOrder: p.sortOrder,
				})),
			);
		}

		return c.json({ brochure: { ...created, accessToken } }, 201);
	})

	// Update brochure
	.patch('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const brochureId = c.req.param('id');
		const data = c.req.valid('json');

		// Verify tenant ownership
		const [existing] = await db
			.select()
			.from(brochures)
			.where(and(eq(brochures.id, brochureId), eq(brochures.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Brochure not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.message !== undefined) updateData.message = data.message;
		if (data.expiresAt !== undefined) updateData.expiresAt = new Date(data.expiresAt);

		await db.update(brochures).set(updateData).where(eq(brochures.id, brochureId));

		// Replace products if provided
		if (data.products !== undefined) {
			await db.delete(brochureProducts).where(eq(brochureProducts.brochureId, brochureId));

			if (data.products.length > 0) {
				await db.insert(brochureProducts).values(
					data.products.map((p) => ({
						id: crypto.randomUUID(),
						brochureId,
						productId: p.productId,
						sortOrder: p.sortOrder,
					})),
				);
			}
		}

		const [updated] = await db
			.select()
			.from(brochures)
			.where(eq(brochures.id, brochureId))
			.limit(1);

		return c.json({ brochure: updated });
	})

	// Archive brochure (soft delete)
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const brochureId = c.req.param('id');

		const [existing] = await db
			.select()
			.from(brochures)
			.where(and(eq(brochures.id, brochureId), eq(brochures.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Brochure not found' }, 404);
		}

		await db
			.update(brochures)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(eq(brochures.id, brochureId));

		return c.json({ success: true });
	});

export { brochuresRoutes };
