import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { letteringColors } from '@griffiths-crm/shared/db/schema';

// Validation schemas
const createSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	isActive: z.boolean().optional().default(true),
});

const updateSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	isActive: z.boolean().optional(),
});

// Create lettering colors routes
const letteringColorsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List all colors for tenant
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const colors = await db
			.select()
			.from(letteringColors)
			.where(eq(letteringColors.tenantId, tenantId))
			.orderBy(asc(letteringColors.sortOrder), asc(letteringColors.name));

		return c.json({ letteringColors: colors });
	})

	// Create new color
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Get max sortOrder for this tenant
		const existing = await db
			.select({ sortOrder: letteringColors.sortOrder })
			.from(letteringColors)
			.where(eq(letteringColors.tenantId, tenantId))
			.orderBy(asc(letteringColors.sortOrder));

		const maxSortOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.sortOrder)) : -1;

		const [created] = await db
			.insert(letteringColors)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				name: data.name,
				isActive: data.isActive ?? true,
				sortOrder: maxSortOrder + 1,
			})
			.returning();

		return c.json({ letteringColor: created }, 201);
	})

	// Update color
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		// Verify color belongs to tenant
		const [existing] = await db
			.select()
			.from(letteringColors)
			.where(and(eq(letteringColors.id, id), eq(letteringColors.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Lettering color not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.isActive !== undefined) updateData.isActive = data.isActive;

		const [updated] = await db
			.update(letteringColors)
			.set(updateData)
			.where(eq(letteringColors.id, id))
			.returning();

		return c.json({ letteringColor: updated });
	})

	// Delete color
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Verify color belongs to tenant
		const [existing] = await db
			.select()
			.from(letteringColors)
			.where(and(eq(letteringColors.id, id), eq(letteringColors.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Lettering color not found' }, 404);
		}

		await db.delete(letteringColors).where(eq(letteringColors.id, id));

		return c.json({ success: true });
	});

export { letteringColorsRoutes };
