import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { lineItemPresets } from '@griffiths-crm/shared/db/schema';

// Validation schemas
const createSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	defaultPrice: z.number().min(0, 'Price must be non-negative'),
	vatExempt: z.boolean().optional().default(false),
	visibleToCustomer: z.boolean().optional().default(true),
	isActive: z.boolean().optional().default(true),
});

const updateSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	defaultPrice: z.number().min(0, 'Price must be non-negative').optional(),
	vatExempt: z.boolean().optional(),
	visibleToCustomer: z.boolean().optional(),
	isActive: z.boolean().optional(),
});

// Create line item presets routes
const lineItemPresetsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List all presets for tenant
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const items = await db
			.select()
			.from(lineItemPresets)
			.where(eq(lineItemPresets.tenantId, tenantId))
			.orderBy(asc(lineItemPresets.sortOrder), asc(lineItemPresets.name));

		return c.json({ presets: items });
	})

	// Create new preset
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Get max sortOrder for this tenant
		const existing = await db
			.select({ sortOrder: lineItemPresets.sortOrder })
			.from(lineItemPresets)
			.where(eq(lineItemPresets.tenantId, tenantId))
			.orderBy(asc(lineItemPresets.sortOrder));

		const maxSortOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.sortOrder)) : -1;

		const [created] = await db
			.insert(lineItemPresets)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				name: data.name,
				defaultPrice: String(data.defaultPrice),
				vatExempt: data.vatExempt ?? false,
				visibleToCustomer: data.visibleToCustomer ?? true,
				isActive: data.isActive ?? true,
				sortOrder: maxSortOrder + 1,
			})
			.returning();

		return c.json({ preset: created }, 201);
	})

	// Update preset
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		// Verify preset belongs to tenant
		const [existing] = await db
			.select()
			.from(lineItemPresets)
			.where(and(eq(lineItemPresets.id, id), eq(lineItemPresets.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Line item preset not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.defaultPrice !== undefined) updateData.defaultPrice = String(data.defaultPrice);
		if (data.vatExempt !== undefined) updateData.vatExempt = data.vatExempt;
		if (data.visibleToCustomer !== undefined) updateData.visibleToCustomer = data.visibleToCustomer;
		if (data.isActive !== undefined) updateData.isActive = data.isActive;

		const [updated] = await db
			.update(lineItemPresets)
			.set(updateData)
			.where(eq(lineItemPresets.id, id))
			.returning();

		return c.json({ preset: updated });
	})

	// Delete preset
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Verify preset belongs to tenant
		const [existing] = await db
			.select()
			.from(lineItemPresets)
			.where(and(eq(lineItemPresets.id, id), eq(lineItemPresets.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Line item preset not found' }, 404);
		}

		await db.delete(lineItemPresets).where(eq(lineItemPresets.id, id));

		return c.json({ success: true });
	});

export { lineItemPresetsRoutes };
