import { sundries, suppliers } from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { requireAuth, requireTenant } from '../middleware/auth';

// Validation schemas
const createSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional(),
	price: z.number().min(0, 'Price must be non-negative'),
	supplierId: z.string().nullable().optional(),
	imageUrl: z.string().url().optional().nullable(),
	isActive: z.boolean().optional().default(true),
});

const updateSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	description: z.string().optional().nullable(),
	price: z.number().min(0, 'Price must be non-negative').optional(),
	supplierId: z.string().nullable().optional(),
	imageUrl: z.string().url().optional().nullable(),
	isActive: z.boolean().optional(),
});

// Create sundries routes
const sundriesRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List all sundries for tenant
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const items = await db
			.select({
				id: sundries.id,
				tenantId: sundries.tenantId,
				supplierId: sundries.supplierId,
				name: sundries.name,
				description: sundries.description,
				price: sundries.price,
				imageUrl: sundries.imageUrl,
				isActive: sundries.isActive,
				sortOrder: sundries.sortOrder,
				createdAt: sundries.createdAt,
				updatedAt: sundries.updatedAt,
				supplierName: suppliers.businessName,
			})
			.from(sundries)
			.leftJoin(suppliers, eq(sundries.supplierId, suppliers.id))
			.where(eq(sundries.tenantId, tenantId))
			.orderBy(asc(sundries.sortOrder), asc(sundries.name));

		return c.json({ sundries: items });
	})

	// Get single sundry by id
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [item] = await db
			.select({
				id: sundries.id,
				tenantId: sundries.tenantId,
				supplierId: sundries.supplierId,
				name: sundries.name,
				description: sundries.description,
				price: sundries.price,
				imageUrl: sundries.imageUrl,
				isActive: sundries.isActive,
				sortOrder: sundries.sortOrder,
				createdAt: sundries.createdAt,
				updatedAt: sundries.updatedAt,
				supplierName: suppliers.businessName,
			})
			.from(sundries)
			.leftJoin(suppliers, eq(sundries.supplierId, suppliers.id))
			.where(and(eq(sundries.id, id), eq(sundries.tenantId, tenantId)))
			.limit(1);

		if (!item) {
			return c.json({ error: 'Sundry not found' }, 404);
		}

		return c.json({ sundry: item });
	})

	// Create new sundry
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Get max sortOrder for this tenant
		const existing = await db
			.select({ sortOrder: sundries.sortOrder })
			.from(sundries)
			.where(eq(sundries.tenantId, tenantId))
			.orderBy(asc(sundries.sortOrder));

		const maxSortOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.sortOrder)) : -1;

		const [created] = await db
			.insert(sundries)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				name: data.name,
				description: data.description || null,
				price: String(data.price),
				supplierId: data.supplierId || null,
				imageUrl: data.imageUrl || null,
				isActive: data.isActive ?? true,
				sortOrder: maxSortOrder + 1,
			})
			.returning();

		return c.json({ sundry: created }, 201);
	})

	// Update sundry
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		// Verify sundry belongs to tenant
		const [existing] = await db
			.select()
			.from(sundries)
			.where(and(eq(sundries.id, id), eq(sundries.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Sundry not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.price !== undefined) updateData.price = String(data.price);
		if (data.supplierId !== undefined) updateData.supplierId = data.supplierId;
		if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
		if (data.isActive !== undefined) updateData.isActive = data.isActive;

		const [updated] = await db
			.update(sundries)
			.set(updateData)
			.where(eq(sundries.id, id))
			.returning();

		return c.json({ sundry: updated });
	})

	// Delete sundry
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Verify sundry belongs to tenant
		const [existing] = await db
			.select()
			.from(sundries)
			.where(and(eq(sundries.id, id), eq(sundries.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Sundry not found' }, 404);
		}

		await db.delete(sundries).where(eq(sundries.id, id));

		return c.json({ success: true });
	});

export { sundriesRoutes };
