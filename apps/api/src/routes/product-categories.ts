import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, asc, count } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { productCategories, products } from '@griffiths-crm/shared/db/schema';

// Validation schemas
const createSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional(),
	imageUrl: z.string().optional().nullable(),
});

const updateSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	description: z.string().optional().nullable(),
	imageUrl: z.string().optional().nullable(),
});

// Create product categories routes
const productCategoriesRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List all categories for tenant (with product count)
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const categories = await db
			.select({
				id: productCategories.id,
				name: productCategories.name,
				description: productCategories.description,
				imageUrl: productCategories.imageUrl,
				sortOrder: productCategories.sortOrder,
				createdAt: productCategories.createdAt,
				updatedAt: productCategories.updatedAt,
			})
			.from(productCategories)
			.where(eq(productCategories.tenantId, tenantId))
			.orderBy(asc(productCategories.sortOrder), asc(productCategories.name));

		// Get product counts per category
		const productCounts = await db
			.select({
				categoryId: products.categoryId,
				count: count(),
			})
			.from(products)
			.where(eq(products.tenantId, tenantId))
			.groupBy(products.categoryId);

		const countMap = new Map(productCounts.map((pc) => [pc.categoryId, Number(pc.count)]));

		const categoriesWithCounts = categories.map((cat) => ({
			...cat,
			productCount: countMap.get(cat.id) || 0,
		}));

		return c.json({ categories: categoriesWithCounts });
	})

	// Get single category with products
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [category] = await db
			.select({
				id: productCategories.id,
				name: productCategories.name,
				description: productCategories.description,
				imageUrl: productCategories.imageUrl,
				sortOrder: productCategories.sortOrder,
				createdAt: productCategories.createdAt,
				updatedAt: productCategories.updatedAt,
			})
			.from(productCategories)
			.where(and(eq(productCategories.id, id), eq(productCategories.tenantId, tenantId)))
			.limit(1);

		if (!category) {
			return c.json({ error: 'Category not found' }, 404);
		}

		// Get products in this category
		const categoryProducts = await db
			.select()
			.from(products)
			.where(and(eq(products.categoryId, id), eq(products.tenantId, tenantId)))
			.orderBy(asc(products.name));

		return c.json({
			category: {
				...category,
				products: categoryProducts,
			},
		});
	})

	// Create new category
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Get max sortOrder for this tenant
		const existing = await db
			.select({ sortOrder: productCategories.sortOrder })
			.from(productCategories)
			.where(eq(productCategories.tenantId, tenantId))
			.orderBy(asc(productCategories.sortOrder));

		const maxSortOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.sortOrder)) : -1;

		const [created] = await db
			.insert(productCategories)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				name: data.name,
				description: data.description || null,
				imageUrl: data.imageUrl || null,
				sortOrder: maxSortOrder + 1,
			})
			.returning();

		return c.json({ category: { ...created, productCount: 0 } }, 201);
	})

	// Update category
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		// Verify category belongs to tenant
		const [existing] = await db
			.select()
			.from(productCategories)
			.where(and(eq(productCategories.id, id), eq(productCategories.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Category not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;

		const [updated] = await db
			.update(productCategories)
			.set(updateData)
			.where(eq(productCategories.id, id))
			.returning();

		return c.json({ category: updated });
	})

	// Delete category
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Verify category belongs to tenant
		const [existing] = await db
			.select()
			.from(productCategories)
			.where(and(eq(productCategories.id, id), eq(productCategories.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Category not found' }, 404);
		}

		// Check if category has products
		const [productCount] = await db
			.select({ count: count() })
			.from(products)
			.where(eq(products.categoryId, id));

		if (Number(productCount.count) > 0) {
			return c.json(
				{ error: 'Cannot delete category with products. Move or delete products first.' },
				400
			);
		}

		await db.delete(productCategories).where(eq(productCategories.id, id));

		return c.json({ success: true });
	});

export { productCategoriesRoutes };
