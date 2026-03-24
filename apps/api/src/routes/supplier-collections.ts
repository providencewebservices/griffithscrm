import {
	supplierCategories,
	supplierCollections,
	suppliers,
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, asc, count, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { requireAuth, requireTenant } from '../middleware/auth';

const createSchema = z.object({
	supplierId: z.string().min(1, 'Supplier is required'),
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
	supplierId: z.string().min(1, 'supplierId is required'),
	archivedOnly: z.enum(['true', 'false']).optional().default('false'),
});

const supplierCollectionsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List collections for a supplier
	.get('/', zValidator('query', listQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { supplierId, archivedOnly } = c.req.valid('query');

		const conditions = [
			eq(supplierCollections.tenantId, tenantId),
			eq(supplierCollections.supplierId, supplierId),
		];

		if (archivedOnly === 'true') {
			conditions.push(isNotNull(supplierCollections.archivedAt));
		} else {
			conditions.push(isNull(supplierCollections.archivedAt));
		}

		const collections = await db
			.select({
				id: supplierCollections.id,
				tenantId: supplierCollections.tenantId,
				supplierId: supplierCollections.supplierId,
				name: supplierCollections.name,
				description: supplierCollections.description,
				imageUrl: supplierCollections.imageUrl,
				sortOrder: supplierCollections.sortOrder,
				isActive: supplierCollections.isActive,
				archivedAt: supplierCollections.archivedAt,
				createdAt: supplierCollections.createdAt,
				updatedAt: supplierCollections.updatedAt,
			})
			.from(supplierCollections)
			.where(and(...conditions))
			.orderBy(asc(supplierCollections.sortOrder), asc(supplierCollections.name));

		// Get category counts
		const collectionIds = collections.map((c) => c.id);
		const categoryCounts =
			collectionIds.length > 0
				? await db
						.select({
							collectionId: supplierCategories.collectionId,
							count: count(),
						})
						.from(supplierCategories)
						.where(sql`${supplierCategories.collectionId} IN ${collectionIds}`)
						.groupBy(supplierCategories.collectionId)
				: [];

		const countMap = new Map(categoryCounts.map((cc) => [cc.collectionId, Number(cc.count)]));

		const collectionsWithCounts = collections.map((c) => ({
			...c,
			categoryCount: countMap.get(c.id) || 0,
		}));

		return c.json({ collections: collectionsWithCounts });
	})

	// Get single collection with categories
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const collectionId = c.req.param('id');

		const [collection] = await db
			.select()
			.from(supplierCollections)
			.where(
				and(eq(supplierCollections.id, collectionId), eq(supplierCollections.tenantId, tenantId)),
			)
			.limit(1);

		if (!collection) {
			return c.json({ error: 'Collection not found' }, 404);
		}

		const categories = await db
			.select()
			.from(supplierCategories)
			.where(eq(supplierCategories.collectionId, collectionId))
			.orderBy(asc(supplierCategories.sortOrder), asc(supplierCategories.name));

		// Get supplier name
		const [supplier] = await db
			.select({ businessName: suppliers.businessName, tradingName: suppliers.tradingName })
			.from(suppliers)
			.where(eq(suppliers.id, collection.supplierId))
			.limit(1);

		return c.json({
			collection: {
				...collection,
				supplierName: supplier?.tradingName || supplier?.businessName || null,
				categories,
			},
		});
	})

	// Create collection
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

		const [created] = await db
			.insert(supplierCollections)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				supplierId: data.supplierId,
				name: data.name,
				description: data.description || null,
				imageUrl: data.imageUrl || null,
			})
			.returning();

		return c.json({ collection: { ...created, categoryCount: 0 } }, 201);
	})

	// Update collection
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const collectionId = c.req.param('id');
		const data = c.req.valid('json');

		const [existing] = await db
			.select()
			.from(supplierCollections)
			.where(
				and(eq(supplierCollections.id, collectionId), eq(supplierCollections.tenantId, tenantId)),
			)
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Collection not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
		if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

		const [updated] = await db
			.update(supplierCollections)
			.set(updateData)
			.where(eq(supplierCollections.id, collectionId))
			.returning();

		return c.json({ collection: updated });
	})

	// Archive collection
	.post('/:id/archive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const collectionId = c.req.param('id');

		const [existing] = await db
			.select()
			.from(supplierCollections)
			.where(
				and(eq(supplierCollections.id, collectionId), eq(supplierCollections.tenantId, tenantId)),
			)
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Collection not found' }, 404);
		}

		if (existing.archivedAt) {
			return c.json({ error: 'Collection is already archived' }, 400);
		}

		const [updated] = await db
			.update(supplierCollections)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(eq(supplierCollections.id, collectionId))
			.returning();

		return c.json({ collection: updated });
	})

	// Unarchive collection
	.post('/:id/unarchive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const collectionId = c.req.param('id');

		const [existing] = await db
			.select()
			.from(supplierCollections)
			.where(
				and(eq(supplierCollections.id, collectionId), eq(supplierCollections.tenantId, tenantId)),
			)
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Collection not found' }, 404);
		}

		if (!existing.archivedAt) {
			return c.json({ error: 'Collection is not archived' }, 400);
		}

		const [updated] = await db
			.update(supplierCollections)
			.set({ archivedAt: null, updatedAt: new Date() })
			.where(eq(supplierCollections.id, collectionId))
			.returning();

		return c.json({ collection: updated });
	})

	// Delete collection (must be archived)
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const collectionId = c.req.param('id');

		const [existing] = await db
			.select()
			.from(supplierCollections)
			.where(
				and(eq(supplierCollections.id, collectionId), eq(supplierCollections.tenantId, tenantId)),
			)
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Collection not found' }, 404);
		}

		if (!existing.archivedAt) {
			return c.json({ error: 'Collection must be archived before it can be deleted' }, 400);
		}

		await db.delete(supplierCollections).where(eq(supplierCollections.id, collectionId));

		return c.json({ success: true });
	});

export { supplierCollectionsRoutes };
