import { letteringCosts, letteringTechniques } from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, asc, count, countDistinct, eq, inArray, max, min } from 'drizzle-orm';
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

// Create lettering techniques routes
const letteringTechniquesRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List all techniques for tenant (with cost count)
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const techniques = await db
			.select()
			.from(letteringTechniques)
			.where(eq(letteringTechniques.tenantId, tenantId))
			.orderBy(asc(letteringTechniques.sortOrder), asc(letteringTechniques.name));

		// Get cost summary per technique (count, price range, color count)
		const techniqueIds = techniques.map((t) => t.id);
		const costSummaries =
			techniqueIds.length > 0
				? await db
						.select({
							techniqueId: letteringCosts.techniqueId,
							count: count(),
							priceMin: min(letteringCosts.pricePerLetter),
							priceMax: max(letteringCosts.pricePerLetter),
							colorCount: countDistinct(letteringCosts.colorId),
						})
						.from(letteringCosts)
						.where(inArray(letteringCosts.techniqueId, techniqueIds))
						.groupBy(letteringCosts.techniqueId)
				: [];

		const summaryMap = new Map(
			costSummaries.map((cs) => [
				cs.techniqueId,
				{
					costCount: Number(cs.count),
					priceMin: cs.priceMin,
					priceMax: cs.priceMax,
					colorCount: Number(cs.colorCount),
				},
			]),
		);

		const techniquesWithCounts = techniques.map((t) => ({
			...t,
			costCount: summaryMap.get(t.id)?.costCount || 0,
			priceMin: summaryMap.get(t.id)?.priceMin ?? null,
			priceMax: summaryMap.get(t.id)?.priceMax ?? null,
			colorCount: summaryMap.get(t.id)?.colorCount || 0,
		}));

		return c.json({ letteringTechniques: techniquesWithCounts });
	})

	// Get single technique with costs
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [technique] = await db
			.select()
			.from(letteringTechniques)
			.where(and(eq(letteringTechniques.id, id), eq(letteringTechniques.tenantId, tenantId)))
			.limit(1);

		if (!technique) {
			return c.json({ error: 'Lettering technique not found' }, 404);
		}

		// Get associated costs
		const costs = await db
			.select()
			.from(letteringCosts)
			.where(eq(letteringCosts.techniqueId, id))
			.orderBy(asc(letteringCosts.appliesTo));

		return c.json({
			letteringTechnique: {
				...technique,
				costs,
			},
		});
	})

	// Create new technique
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Get max sortOrder for this tenant
		const existing = await db
			.select({ sortOrder: letteringTechniques.sortOrder })
			.from(letteringTechniques)
			.where(eq(letteringTechniques.tenantId, tenantId))
			.orderBy(asc(letteringTechniques.sortOrder));

		const maxSortOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.sortOrder)) : -1;

		const [created] = await db
			.insert(letteringTechniques)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				name: data.name,
				isActive: data.isActive ?? true,
				sortOrder: maxSortOrder + 1,
			})
			.returning();

		return c.json({ letteringTechnique: { ...created, costCount: 0 } }, 201);
	})

	// Update technique
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		// Verify technique belongs to tenant
		const [existing] = await db
			.select()
			.from(letteringTechniques)
			.where(and(eq(letteringTechniques.id, id), eq(letteringTechniques.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Lettering technique not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.isActive !== undefined) updateData.isActive = data.isActive;

		const [updated] = await db
			.update(letteringTechniques)
			.set(updateData)
			.where(eq(letteringTechniques.id, id))
			.returning();

		return c.json({ letteringTechnique: updated });
	})

	// Delete technique
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Verify technique belongs to tenant
		const [existing] = await db
			.select()
			.from(letteringTechniques)
			.where(and(eq(letteringTechniques.id, id), eq(letteringTechniques.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Lettering technique not found' }, 404);
		}

		await db.delete(letteringTechniques).where(eq(letteringTechniques.id, id));

		return c.json({ success: true });
	});

export { letteringTechniquesRoutes };
