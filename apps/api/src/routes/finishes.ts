import { finishes, quoteComponents } from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, asc, count, eq, inArray, isNotNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { requireAuth, requireTenant } from '../middleware/auth';

// Validation schemas
const createSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	isActive: z.boolean().optional().default(true),
});

const updateSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	isActive: z.boolean().optional(),
});

// Create finishes routes
const finishesRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List all finishes for tenant
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const allFinishes = await db
			.select()
			.from(finishes)
			.where(eq(finishes.tenantId, tenantId))
			.orderBy(asc(finishes.sortOrder), asc(finishes.name));

		const finishIds = allFinishes.map((f) => f.id);
		const usageCounts =
			finishIds.length > 0
				? await db
						.select({
							finishId: quoteComponents.finishId,
							count: count(),
						})
						.from(quoteComponents)
						.where(
							and(
								isNotNull(quoteComponents.finishId),
								inArray(quoteComponents.finishId, finishIds),
							),
						)
						.groupBy(quoteComponents.finishId)
				: [];

		const countMap = new Map(usageCounts.map((uc) => [uc.finishId, Number(uc.count)]));

		const finishesWithCounts = allFinishes.map((f) => ({
			...f,
			usageCount: countMap.get(f.id) ?? 0,
		}));

		return c.json({ finishes: finishesWithCounts });
	})

	// Get single finish
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [finish] = await db
			.select()
			.from(finishes)
			.where(and(eq(finishes.id, id), eq(finishes.tenantId, tenantId)))
			.limit(1);

		if (!finish) {
			return c.json({ error: 'Finish not found' }, 404);
		}

		return c.json({ finish });
	})

	// Create new finish
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Get max sortOrder for this tenant
		const existing = await db
			.select({ sortOrder: finishes.sortOrder })
			.from(finishes)
			.where(eq(finishes.tenantId, tenantId))
			.orderBy(asc(finishes.sortOrder));

		const maxSortOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.sortOrder)) : -1;

		const [created] = await db
			.insert(finishes)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				name: data.name,
				isActive: data.isActive ?? true,
				sortOrder: maxSortOrder + 1,
			})
			.returning();

		return c.json({ finish: created }, 201);
	})

	// Update finish
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		// Verify finish belongs to tenant
		const [existing] = await db
			.select()
			.from(finishes)
			.where(and(eq(finishes.id, id), eq(finishes.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Finish not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.isActive !== undefined) updateData.isActive = data.isActive;

		const [updated] = await db
			.update(finishes)
			.set(updateData)
			.where(eq(finishes.id, id))
			.returning();

		return c.json({ finish: updated });
	})

	// Delete finish
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Verify finish belongs to tenant
		const [existing] = await db
			.select()
			.from(finishes)
			.where(and(eq(finishes.id, id), eq(finishes.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Finish not found' }, 404);
		}

		await db.delete(finishes).where(eq(finishes.id, id));

		return c.json({ success: true });
	});

export { finishesRoutes };
