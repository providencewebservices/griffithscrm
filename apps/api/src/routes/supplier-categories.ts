import {
	supplierCategories,
	supplierCollections,
	supplierProducts,
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { requireAuth, requireTenant } from '../middleware/auth';

const createSchema = z.object({
	collectionId: z.string().min(1, 'Collection is required'),
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional().nullable(),
	imageUrl: z.string().optional().nullable(),
});

const updateSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	description: z.string().optional().nullable(),
	imageUrl: z.string().optional().nullable(),
	sortOrder: z.number().optional(),
});

const listQuerySchema = z.object({
	collectionId: z.string().min(1, 'collectionId is required'),
});

const supplierCategoriesRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List categories for a collection
	.get('/', zValidator('query', listQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { collectionId } = c.req.valid('query');

		const categories = await db
			.select()
			.from(supplierCategories)
			.where(
				and(
					eq(supplierCategories.tenantId, tenantId),
					eq(supplierCategories.collectionId, collectionId),
				),
			)
			.orderBy(asc(supplierCategories.sortOrder), asc(supplierCategories.name));

		// Get product counts
		const categoryIds = categories.map((c) => c.id);
		const productCounts =
			categoryIds.length > 0
				? await db
						.select({
							categoryId: supplierProducts.categoryId,
							count: count(),
						})
						.from(supplierProducts)
						.where(sql`${supplierProducts.categoryId} IN ${categoryIds}`)
						.groupBy(supplierProducts.categoryId)
				: [];

		const countMap = new Map(productCounts.map((pc) => [pc.categoryId, Number(pc.count)]));

		const categoriesWithCounts = categories.map((cat) => ({
			...cat,
			productCount: countMap.get(cat.id) || 0,
		}));

		return c.json({ categories: categoriesWithCounts });
	})

	// Get single category
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const categoryId = c.req.param('id');

		const [category] = await db
			.select()
			.from(supplierCategories)
			.where(and(eq(supplierCategories.id, categoryId), eq(supplierCategories.tenantId, tenantId)))
			.limit(1);

		if (!category) {
			return c.json({ error: 'Category not found' }, 404);
		}

		return c.json({ category });
	})

	// Create category
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Verify collection belongs to tenant
		const [collection] = await db
			.select()
			.from(supplierCollections)
			.where(
				and(
					eq(supplierCollections.id, data.collectionId),
					eq(supplierCollections.tenantId, tenantId),
				),
			)
			.limit(1);

		if (!collection) {
			return c.json({ error: 'Collection not found' }, 400);
		}

		const [created] = await db
			.insert(supplierCategories)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				collectionId: data.collectionId,
				name: data.name,
				description: data.description || null,
				imageUrl: data.imageUrl || null,
			})
			.returning();

		return c.json({ category: { ...created, productCount: 0 } }, 201);
	})

	// Update category
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const categoryId = c.req.param('id');
		const data = c.req.valid('json');

		const [existing] = await db
			.select()
			.from(supplierCategories)
			.where(and(eq(supplierCategories.id, categoryId), eq(supplierCategories.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Category not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
		if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

		const [updated] = await db
			.update(supplierCategories)
			.set(updateData)
			.where(eq(supplierCategories.id, categoryId))
			.returning();

		return c.json({ category: updated });
	})

	// Delete category
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const categoryId = c.req.param('id');

		const [existing] = await db
			.select()
			.from(supplierCategories)
			.where(and(eq(supplierCategories.id, categoryId), eq(supplierCategories.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Category not found' }, 404);
		}

		await db.delete(supplierCategories).where(eq(supplierCategories.id, categoryId));

		return c.json({ success: true });
	});

export { supplierCategoriesRoutes };
