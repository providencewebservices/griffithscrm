import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, or, like, isNull, isNotNull, desc, asc, count, sql } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	products,
	productCategories,
	productOptions,
	optionChoices,
	suppliers,
} from '@griffiths-crm/shared/db/schema';

// Validation schemas
const createSchema = z.object({
	sku: z.string().min(1, 'SKU is required'),
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional(),
	categoryId: z.string().optional().nullable(),
	supplierId: z.string().optional().nullable(),
	imageUrl: z.string().optional().nullable(),
	isActive: z.boolean().optional().default(true),
});

const updateSchema = z.object({
	sku: z.string().min(1, 'SKU is required').optional(),
	name: z.string().min(1, 'Name is required').optional(),
	description: z.string().optional().nullable(),
	categoryId: z.string().optional().nullable(),
	supplierId: z.string().optional().nullable(),
	imageUrl: z.string().optional().nullable(),
	isActive: z.boolean().optional(),
});

const listQuerySchema = z.object({
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	categoryId: z.string().optional(),
	search: z.string().optional(),
	isActive: z.enum(['true', 'false', 'all']).optional().default('true'),
	includeArchived: z.enum(['true', 'false']).optional().default('false'),
});

// Helper function to get product with all relations
async function getProductWithRelations(productId: string, tenantId: string) {
	// Get product with category and supplier
	const [product] = await db
		.select({
			id: products.id,
			tenantId: products.tenantId,
			categoryId: products.categoryId,
			supplierId: products.supplierId,
			sku: products.sku,
			name: products.name,
			description: products.description,
			imageUrl: products.imageUrl,
			basePrice: products.basePrice,
			isActive: products.isActive,
			archivedAt: products.archivedAt,
			createdAt: products.createdAt,
			updatedAt: products.updatedAt,
			categoryName: productCategories.name,
			supplierBusinessName: suppliers.businessName,
			supplierTradingName: suppliers.tradingName,
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.leftJoin(suppliers, eq(suppliers.id, products.supplierId))
		.where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
		.limit(1);

	if (!product) return null;

	// Get options with choices
	const options = await db
		.select()
		.from(productOptions)
		.where(eq(productOptions.productId, productId))
		.orderBy(asc(productOptions.sortOrder), asc(productOptions.name));

	const optionsWithChoices = await Promise.all(
		options.map(async (option) => {
			const choices = await db
				.select()
				.from(optionChoices)
				.where(eq(optionChoices.optionId, option.id))
				.orderBy(asc(optionChoices.sortOrder), asc(optionChoices.name));

			return {
				...option,
				choices,
			};
		})
	);

	return {
		...product,
		category: product.categoryId
			? { id: product.categoryId, name: product.categoryName }
			: null,
		supplierName: product.supplierTradingName || product.supplierBusinessName || null,
		options: optionsWithChoices,
	};
}

// Create products routes
const productsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List products with filtering and pagination
	.get('/', zValidator('query', listQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { page, limit, categoryId, search, isActive, includeArchived } = c.req.valid('query');

		// Build conditions
		const conditions: ReturnType<typeof eq>[] = [eq(products.tenantId, tenantId)];

		// Filter by archived status
		if (includeArchived !== 'true') {
			conditions.push(isNull(products.archivedAt));
		}

		// Filter by active status
		if (isActive === 'true') {
			conditions.push(eq(products.isActive, true));
		} else if (isActive === 'false') {
			conditions.push(eq(products.isActive, false));
		}

		// Filter by category
		if (categoryId) {
			conditions.push(eq(products.categoryId, categoryId));
		}

		// Search filter
		if (search && search.trim()) {
			const searchTerm = `%${search.trim().toLowerCase()}%`;
			conditions.push(
				or(
					sql`LOWER(${products.name}) LIKE ${searchTerm}`,
					sql`LOWER(${products.sku}) LIKE ${searchTerm}`
				)!
			);
		}

		// Get total count
		const [totalResult] = await db
			.select({ count: count() })
			.from(products)
			.where(and(...conditions));
		const total = Number(totalResult.count);

		// Get paginated products with category name, supplier, and option count
		const offset = (page - 1) * limit;
		const productList = await db
			.select({
				id: products.id,
				sku: products.sku,
				name: products.name,
				description: products.description,
				imageUrl: products.imageUrl,
				basePrice: products.basePrice,
				isActive: products.isActive,
				archivedAt: products.archivedAt,
				categoryId: products.categoryId,
				categoryName: productCategories.name,
				supplierId: products.supplierId,
				supplierBusinessName: suppliers.businessName,
				supplierTradingName: suppliers.tradingName,
				createdAt: products.createdAt,
				updatedAt: products.updatedAt,
			})
			.from(products)
			.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
			.leftJoin(suppliers, eq(suppliers.id, products.supplierId))
			.where(and(...conditions))
			.orderBy(desc(products.createdAt))
			.limit(limit)
			.offset(offset);

		// Get option counts for each product
		const productIds = productList.map((p) => p.id);
		const optionCounts =
			productIds.length > 0
				? await db
						.select({
							productId: productOptions.productId,
							count: count(),
						})
						.from(productOptions)
						.where(sql`${productOptions.productId} IN ${productIds}`)
						.groupBy(productOptions.productId)
				: [];

		const optionCountMap = new Map(optionCounts.map((oc) => [oc.productId, Number(oc.count)]));

		const productsWithMeta = productList.map((p) => ({
			...p,
			category: p.categoryId ? { id: p.categoryId, name: p.categoryName } : null,
			supplierName: p.supplierTradingName || p.supplierBusinessName || null,
			optionCount: optionCountMap.get(p.id) || 0,
		}));

		return c.json({
			products: productsWithMeta,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	})

	// Get single product with all relations
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('id');

		const product = await getProductWithRelations(productId, tenantId);

		if (!product) {
			return c.json({ error: 'Product not found' }, 404);
		}

		return c.json({ product });
	})

	// Create new product
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Check for duplicate SKU
		const [existingSku] = await db
			.select()
			.from(products)
			.where(and(eq(products.tenantId, tenantId), eq(products.sku, data.sku)))
			.limit(1);

		if (existingSku) {
			return c.json({ error: 'A product with this SKU already exists' }, 400);
		}

		// Verify category belongs to tenant if provided
		if (data.categoryId) {
			const [category] = await db
				.select()
				.from(productCategories)
				.where(
					and(
						eq(productCategories.id, data.categoryId),
						eq(productCategories.tenantId, tenantId)
					)
				)
				.limit(1);

			if (!category) {
				return c.json({ error: 'Category not found' }, 400);
			}
		}

		const [created] = await db
			.insert(products)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				sku: data.sku,
				name: data.name,
				description: data.description || null,
				categoryId: data.categoryId || null,
				supplierId: data.supplierId || null,
				imageUrl: data.imageUrl || null,
				isActive: data.isActive ?? true,
			})
			.returning();

		// Return with full relations
		const product = await getProductWithRelations(created.id, tenantId);
		return c.json({ product }, 201);
	})

	// Update product
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('id');
		const data = c.req.valid('json');

		// Verify product belongs to tenant
		const [existing] = await db
			.select()
			.from(products)
			.where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Product not found' }, 404);
		}

		// Check for duplicate SKU if changing
		if (data.sku && data.sku !== existing.sku) {
			const [existingSku] = await db
				.select()
				.from(products)
				.where(
					and(
						eq(products.tenantId, tenantId),
						eq(products.sku, data.sku),
						sql`${products.id} != ${productId}`
					)
				)
				.limit(1);

			if (existingSku) {
				return c.json({ error: 'A product with this SKU already exists' }, 400);
			}
		}

		// Verify category belongs to tenant if changing
		if (data.categoryId) {
			const [category] = await db
				.select()
				.from(productCategories)
				.where(
					and(
						eq(productCategories.id, data.categoryId),
						eq(productCategories.tenantId, tenantId)
					)
				)
				.limit(1);

			if (!category) {
				return c.json({ error: 'Category not found' }, 400);
			}
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.sku !== undefined) updateData.sku = data.sku;
		if (data.name !== undefined) updateData.name = data.name;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
		if (data.supplierId !== undefined) updateData.supplierId = data.supplierId;
		if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
		if (data.isActive !== undefined) updateData.isActive = data.isActive;

		await db.update(products).set(updateData).where(eq(products.id, productId));

		// Return with full relations
		const product = await getProductWithRelations(productId, tenantId);
		return c.json({ product });
	})

	// Archive product
	.post('/:id/archive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('id');

		const [existing] = await db
			.select()
			.from(products)
			.where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Product not found' }, 404);
		}

		if (existing.archivedAt) {
			return c.json({ error: 'Product is already archived' }, 400);
		}

		await db
			.update(products)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(eq(products.id, productId));

		const product = await getProductWithRelations(productId, tenantId);
		return c.json({ product });
	})

	// Unarchive product
	.post('/:id/unarchive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('id');

		const [existing] = await db
			.select()
			.from(products)
			.where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Product not found' }, 404);
		}

		if (!existing.archivedAt) {
			return c.json({ error: 'Product is not archived' }, 400);
		}

		await db
			.update(products)
			.set({ archivedAt: null, updatedAt: new Date() })
			.where(eq(products.id, productId));

		const product = await getProductWithRelations(productId, tenantId);
		return c.json({ product });
	})

	// Delete product (permanently)
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('id');

		const [existing] = await db
			.select()
			.from(products)
			.where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Product not found' }, 404);
		}

		// Only allow deleting archived products
		if (!existing.archivedAt) {
			return c.json({ error: 'Product must be archived before it can be deleted' }, 400);
		}

		// Delete will cascade to options and choices
		await db.delete(products).where(eq(products.id, productId));

		return c.json({ success: true });
	})

	// Duplicate product (creates a copy)
	.post('/:id/duplicate', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('id');

		const [existing] = await db
			.select()
			.from(products)
			.where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Product not found' }, 404);
		}

		// Generate unique SKU
		let newSku = `${existing.sku}-copy`;
		let counter = 1;
		while (true) {
			const [existingSku] = await db
				.select()
				.from(products)
				.where(and(eq(products.tenantId, tenantId), eq(products.sku, newSku)))
				.limit(1);

			if (!existingSku) break;
			newSku = `${existing.sku}-copy-${counter}`;
			counter++;
		}

		// Create new product
		const newProductId = crypto.randomUUID();
		await db.insert(products).values({
			id: newProductId,
			tenantId,
			sku: newSku,
			name: `${existing.name} (Copy)`,
			description: existing.description,
			categoryId: existing.categoryId,
			supplierId: existing.supplierId,
			basePrice: existing.basePrice,
			isActive: false, // New copies start inactive
		});

		// Copy options
		const existingOptions = await db
			.select()
			.from(productOptions)
			.where(eq(productOptions.productId, productId));

		for (const option of existingOptions) {
			const newOptionId = crypto.randomUUID();
			await db.insert(productOptions).values({
				id: newOptionId,
				productId: newProductId,
				name: option.name,
				type: option.type,
				isRequired: option.isRequired,
				sortOrder: option.sortOrder,
			});

			// Copy choices for this option
			const existingChoices = await db
				.select()
				.from(optionChoices)
				.where(eq(optionChoices.optionId, option.id));

			for (const choice of existingChoices) {
				await db.insert(optionChoices).values({
					id: crypto.randomUUID(),
					optionId: newOptionId,
					name: choice.name,
					priceAdjustment: choice.priceAdjustment,
					imageUrl: choice.imageUrl,
					sortOrder: choice.sortOrder,
				});
			}
		}

		const product = await getProductWithRelations(newProductId, tenantId);
		return c.json({ product }, 201);
	});

export { productsRoutes };
