import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, or, isNull, isNotNull, asc, desc, count, sql } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import Papa from 'papaparse';
import {
	supplierProducts,
	supplierCollections,
	supplierCategories,
	suppliers,
	products,
} from '@griffiths-crm/shared/db/schema';

const createSchema = z.object({
	supplierId: z.string().min(1, 'Supplier is required'),
	collectionId: z.string().min(1, 'Collection is required'),
	categoryId: z.string().optional().nullable(),
	sku: z.string().optional().nullable(),
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional().nullable(),
	imageUrl: z.string().optional().nullable(),
	supplierCost: z.string().optional().nullable(),
	height: z.string().optional().nullable(),
	width: z.string().optional().nullable(),
	depth: z.string().optional().nullable(),
	weight: z.string().optional().nullable(),
	material: z.string().optional().nullable(),
});

const updateSchema = z.object({
	categoryId: z.string().optional().nullable(),
	sku: z.string().optional().nullable(),
	name: z.string().min(1, 'Name is required').optional(),
	description: z.string().optional().nullable(),
	imageUrl: z.string().optional().nullable(),
	supplierCost: z.string().optional().nullable(),
	height: z.string().optional().nullable(),
	width: z.string().optional().nullable(),
	depth: z.string().optional().nullable(),
	weight: z.string().optional().nullable(),
	material: z.string().optional().nullable(),
});

const listQuerySchema = z.object({
	supplierId: z.string().optional(),
	collectionId: z.string().optional(),
	categoryId: z.string().optional(),
	q: z.string().optional(),
	archivedOnly: z.enum(['true', 'false']).optional().default('false'),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(50),
});

const importToCatalogSchema = z.object({
	sku: z.string().min(1, 'SKU is required'),
	name: z.string().optional(),
	description: z.string().optional().nullable(),
	categoryId: z.string().optional().nullable(),
	basePrice: z.string().optional().nullable(),
	imageUrl: z.string().optional().nullable(),
});

const supplierProductsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List supplier products with filtering
	.get('/', zValidator('query', listQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { supplierId, collectionId, categoryId, q, archivedOnly, page, limit } =
			c.req.valid('query');

		const conditions: ReturnType<typeof eq>[] = [eq(supplierProducts.tenantId, tenantId)];

		if (supplierId) conditions.push(eq(supplierProducts.supplierId, supplierId));
		if (collectionId) conditions.push(eq(supplierProducts.collectionId, collectionId));
		if (categoryId) conditions.push(eq(supplierProducts.categoryId, categoryId));

		if (archivedOnly === 'true') {
			conditions.push(isNotNull(supplierProducts.archivedAt));
		} else {
			conditions.push(isNull(supplierProducts.archivedAt));
		}

		if (q && q.trim()) {
			const searchTerm = `%${q.trim().toLowerCase()}%`;
			conditions.push(
				or(
					sql`LOWER(${supplierProducts.name}) LIKE ${searchTerm}`,
					sql`LOWER(${supplierProducts.sku}) LIKE ${searchTerm}`,
					sql`LOWER(${supplierProducts.material}) LIKE ${searchTerm}`
				)!
			);
		}

		// Get total count
		const [totalResult] = await db
			.select({ count: count() })
			.from(supplierProducts)
			.where(and(...conditions));
		const total = Number(totalResult.count);

		const offset = (page - 1) * limit;
		const productList = await db
			.select({
				id: supplierProducts.id,
				tenantId: supplierProducts.tenantId,
				supplierId: supplierProducts.supplierId,
				collectionId: supplierProducts.collectionId,
				categoryId: supplierProducts.categoryId,
				sku: supplierProducts.sku,
				name: supplierProducts.name,
				description: supplierProducts.description,
				imageUrl: supplierProducts.imageUrl,
				supplierCost: supplierProducts.supplierCost,
				height: supplierProducts.height,
				width: supplierProducts.width,
				depth: supplierProducts.depth,
				weight: supplierProducts.weight,
				material: supplierProducts.material,
				isActive: supplierProducts.isActive,
				archivedAt: supplierProducts.archivedAt,
				createdAt: supplierProducts.createdAt,
				updatedAt: supplierProducts.updatedAt,
				supplierBusinessName: suppliers.businessName,
				supplierTradingName: suppliers.tradingName,
				collectionName: supplierCollections.name,
				categoryName: supplierCategories.name,
			})
			.from(supplierProducts)
			.leftJoin(suppliers, eq(suppliers.id, supplierProducts.supplierId))
			.leftJoin(supplierCollections, eq(supplierCollections.id, supplierProducts.collectionId))
			.leftJoin(supplierCategories, eq(supplierCategories.id, supplierProducts.categoryId))
			.where(and(...conditions))
			.orderBy(asc(supplierProducts.name))
			.limit(limit)
			.offset(offset);

		const productsWithMeta = productList.map((p) => ({
			...p,
			supplierName: p.supplierTradingName || p.supplierBusinessName || null,
		}));

		return c.json({
			products: productsWithMeta,
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
		});
	})

	// CSV template download
	.get('/csv-template', async (c) => {
		const csv = 'name,sku,description,supplier_cost,height,width,depth,weight,material,category\n';
		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': 'attachment; filename="supplier-products-template.csv"',
			},
		});
	})

	// Get single supplier product
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('id');

		const [product] = await db
			.select({
				id: supplierProducts.id,
				tenantId: supplierProducts.tenantId,
				supplierId: supplierProducts.supplierId,
				collectionId: supplierProducts.collectionId,
				categoryId: supplierProducts.categoryId,
				sku: supplierProducts.sku,
				name: supplierProducts.name,
				description: supplierProducts.description,
				imageUrl: supplierProducts.imageUrl,
				supplierCost: supplierProducts.supplierCost,
				height: supplierProducts.height,
				width: supplierProducts.width,
				depth: supplierProducts.depth,
				weight: supplierProducts.weight,
				material: supplierProducts.material,
				isActive: supplierProducts.isActive,
				archivedAt: supplierProducts.archivedAt,
				createdAt: supplierProducts.createdAt,
				updatedAt: supplierProducts.updatedAt,
				supplierBusinessName: suppliers.businessName,
				supplierTradingName: suppliers.tradingName,
				collectionName: supplierCollections.name,
				categoryName: supplierCategories.name,
			})
			.from(supplierProducts)
			.leftJoin(suppliers, eq(suppliers.id, supplierProducts.supplierId))
			.leftJoin(supplierCollections, eq(supplierCollections.id, supplierProducts.collectionId))
			.leftJoin(supplierCategories, eq(supplierCategories.id, supplierProducts.categoryId))
			.where(and(eq(supplierProducts.id, productId), eq(supplierProducts.tenantId, tenantId)))
			.limit(1);

		if (!product) {
			return c.json({ error: 'Product not found' }, 404);
		}

		return c.json({
			product: {
				...product,
				supplierName: product.supplierTradingName || product.supplierBusinessName || null,
			},
		});
	})

	// Create supplier product
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Verify supplier belongs to tenant
		const [supplier] = await db
			.select()
			.from(suppliers)
			.where(and(eq(suppliers.id, data.supplierId), eq(suppliers.tenantId, tenantId)))
			.limit(1);

		if (!supplier) {
			return c.json({ error: 'Supplier not found' }, 400);
		}

		// Verify collection belongs to tenant
		const [collection] = await db
			.select()
			.from(supplierCollections)
			.where(
				and(
					eq(supplierCollections.id, data.collectionId),
					eq(supplierCollections.tenantId, tenantId)
				)
			)
			.limit(1);

		if (!collection) {
			return c.json({ error: 'Collection not found' }, 400);
		}

		const [created] = await db
			.insert(supplierProducts)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				supplierId: data.supplierId,
				collectionId: data.collectionId,
				categoryId: data.categoryId || null,
				sku: data.sku || null,
				name: data.name,
				description: data.description || null,
				imageUrl: data.imageUrl || null,
				supplierCost: data.supplierCost || null,
				height: data.height || null,
				width: data.width || null,
				depth: data.depth || null,
				weight: data.weight || null,
				material: data.material || null,
			})
			.returning();

		return c.json({ product: created }, 201);
	})

	// Update supplier product
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('id');
		const data = c.req.valid('json');

		const [existing] = await db
			.select()
			.from(supplierProducts)
			.where(and(eq(supplierProducts.id, productId), eq(supplierProducts.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Product not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
		if (data.sku !== undefined) updateData.sku = data.sku;
		if (data.name !== undefined) updateData.name = data.name;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
		if (data.supplierCost !== undefined) updateData.supplierCost = data.supplierCost;
		if (data.height !== undefined) updateData.height = data.height;
		if (data.width !== undefined) updateData.width = data.width;
		if (data.depth !== undefined) updateData.depth = data.depth;
		if (data.weight !== undefined) updateData.weight = data.weight;
		if (data.material !== undefined) updateData.material = data.material;

		const [updated] = await db
			.update(supplierProducts)
			.set(updateData)
			.where(eq(supplierProducts.id, productId))
			.returning();

		return c.json({ product: updated });
	})

	// Archive supplier product
	.post('/:id/archive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('id');

		const [existing] = await db
			.select()
			.from(supplierProducts)
			.where(and(eq(supplierProducts.id, productId), eq(supplierProducts.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Product not found' }, 404);
		}

		if (existing.archivedAt) {
			return c.json({ error: 'Product is already archived' }, 400);
		}

		const [updated] = await db
			.update(supplierProducts)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(eq(supplierProducts.id, productId))
			.returning();

		return c.json({ product: updated });
	})

	// Unarchive supplier product
	.post('/:id/unarchive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('id');

		const [existing] = await db
			.select()
			.from(supplierProducts)
			.where(and(eq(supplierProducts.id, productId), eq(supplierProducts.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Product not found' }, 404);
		}

		if (!existing.archivedAt) {
			return c.json({ error: 'Product is not archived' }, 400);
		}

		const [updated] = await db
			.update(supplierProducts)
			.set({ archivedAt: null, updatedAt: new Date() })
			.where(eq(supplierProducts.id, productId))
			.returning();

		return c.json({ product: updated });
	})

	// Delete supplier product (must be archived)
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('id');

		const [existing] = await db
			.select()
			.from(supplierProducts)
			.where(and(eq(supplierProducts.id, productId), eq(supplierProducts.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Product not found' }, 404);
		}

		if (!existing.archivedAt) {
			return c.json({ error: 'Product must be archived before it can be deleted' }, 400);
		}

		await db.delete(supplierProducts).where(eq(supplierProducts.id, productId));

		return c.json({ success: true });
	})

	// Import to tenant catalog
	.post('/:id/import-to-catalog', zValidator('json', importToCatalogSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const supplierProductId = c.req.param('id');
		const data = c.req.valid('json');

		// Verify supplier product exists and belongs to tenant
		const [supplierProduct] = await db
			.select()
			.from(supplierProducts)
			.where(
				and(
					eq(supplierProducts.id, supplierProductId),
					eq(supplierProducts.tenantId, tenantId)
				)
			)
			.limit(1);

		if (!supplierProduct) {
			return c.json({ error: 'Supplier product not found' }, 404);
		}

		// Check for duplicate SKU in tenant catalog
		const [existingSku] = await db
			.select()
			.from(products)
			.where(and(eq(products.tenantId, tenantId), eq(products.sku, data.sku)))
			.limit(1);

		if (existingSku) {
			return c.json({ error: 'A product with this SKU already exists in your catalog' }, 400);
		}

		const [created] = await db
			.insert(products)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				supplierId: supplierProduct.supplierId,
				supplierProductId: supplierProductId,
				sku: data.sku,
				name: data.name || supplierProduct.name,
				description: data.description !== undefined ? data.description : supplierProduct.description,
				categoryId: data.categoryId || null,
				basePrice: data.basePrice || null,
				imageUrl: data.imageUrl !== undefined ? data.imageUrl : supplierProduct.imageUrl,
				isActive: true,
			})
			.returning();

		return c.json({ product: created }, 201);
	})

	// CSV bulk import
	.post('/import-csv', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const body = await c.req.parseBody();
		const file = body['file'];
		const supplierId = body['supplierId'] as string;
		const collectionId = body['collectionId'] as string;
		const defaultCategoryId = (body['categoryId'] as string) || null;

		if (!file || !(file instanceof File)) {
			return c.json({ error: 'CSV file is required' }, 400);
		}

		if (!supplierId || !collectionId) {
			return c.json({ error: 'supplierId and collectionId are required' }, 400);
		}

		// Verify supplier and collection belong to tenant
		const [supplier] = await db
			.select()
			.from(suppliers)
			.where(and(eq(suppliers.id, supplierId), eq(suppliers.tenantId, tenantId)))
			.limit(1);

		if (!supplier) {
			return c.json({ error: 'Supplier not found' }, 400);
		}

		const [collection] = await db
			.select()
			.from(supplierCollections)
			.where(
				and(eq(supplierCollections.id, collectionId), eq(supplierCollections.tenantId, tenantId))
			)
			.limit(1);

		if (!collection) {
			return c.json({ error: 'Collection not found' }, 400);
		}

		const csvText = await file.text();
		const parsed = Papa.parse<Record<string, string>>(csvText, {
			header: true,
			skipEmptyLines: true,
			transformHeader: (header: string) => header.trim().toLowerCase(),
		});

		if (parsed.errors.length > 0 && parsed.data.length === 0) {
			return c.json({ error: 'Failed to parse CSV', details: parsed.errors }, 400);
		}

		// Load existing categories for this collection for matching
		const existingCategories = await db
			.select()
			.from(supplierCategories)
			.where(
				and(
					eq(supplierCategories.collectionId, collectionId),
					eq(supplierCategories.tenantId, tenantId)
				)
			);

		const categoryMap = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]));

		let imported = 0;
		const errors: { row: number; message: string }[] = [];

		for (let i = 0; i < parsed.data.length; i++) {
			const row = parsed.data[i];
			const rowNum = i + 2; // +2 for header row and 1-indexed

			const name = row.name?.trim();
			if (!name) {
				errors.push({ row: rowNum, message: 'Name is required' });
				continue;
			}

			// Resolve category
			let categoryId = defaultCategoryId;
			const categoryName = row.category?.trim();
			if (categoryName) {
				const existingCatId = categoryMap.get(categoryName.toLowerCase());
				if (existingCatId) {
					categoryId = existingCatId;
				} else {
					// Create new category
					const newCatId = crypto.randomUUID();
					await db.insert(supplierCategories).values({
						id: newCatId,
						tenantId,
						collectionId,
						name: categoryName,
					});
					categoryMap.set(categoryName.toLowerCase(), newCatId);
					categoryId = newCatId;
				}
			}

			try {
				await db.insert(supplierProducts).values({
					id: crypto.randomUUID(),
					tenantId,
					supplierId,
					collectionId,
					categoryId,
					sku: row.sku?.trim() || null,
					name,
					description: row.description?.trim() || null,
					supplierCost: row.supplier_cost?.trim() || null,
					height: row.height?.trim() || null,
					width: row.width?.trim() || null,
					depth: row.depth?.trim() || null,
					weight: row.weight?.trim() || null,
					material: row.material?.trim() || null,
				});
				imported++;
			} catch (err) {
				errors.push({
					row: rowNum,
					message: err instanceof Error ? err.message : 'Failed to insert',
				});
			}
		}

		return c.json({ imported, errors });
	});

export { supplierProductsRoutes };
