import {
	LETTERING_COST_APPLIES_TO,
	letteringColors,
	letteringCosts,
	letteringTechniques,
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { requireAuth, requireTenant } from '../middleware/auth';

// Validation schemas
const createSchema = z.object({
	techniqueId: z.string().min(1, 'Technique ID is required'),
	colorId: z.string().nullable().optional(), // Optional - null means default/base price
	appliesTo: z.enum(LETTERING_COST_APPLIES_TO),
	freeLetters: z.number().int().min(0, 'Free letters must be non-negative'),
	pricePerLetter: z.number().min(0, 'Price per letter must be non-negative'),
});

const updateSchema = z.object({
	colorId: z.string().nullable().optional(),
	appliesTo: z.enum(LETTERING_COST_APPLIES_TO).optional(),
	freeLetters: z.number().int().min(0, 'Free letters must be non-negative').optional(),
	pricePerLetter: z.number().min(0, 'Price per letter must be non-negative').optional(),
});

// Helper to verify technique belongs to tenant
async function verifyTechniqueOwnership(techniqueId: string, tenantId: string) {
	const [technique] = await db
		.select()
		.from(letteringTechniques)
		.where(and(eq(letteringTechniques.id, techniqueId), eq(letteringTechniques.tenantId, tenantId)))
		.limit(1);
	return technique;
}

// Helper to verify color belongs to tenant
async function verifyColorOwnership(colorId: string, tenantId: string) {
	const [color] = await db
		.select()
		.from(letteringColors)
		.where(and(eq(letteringColors.id, colorId), eq(letteringColors.tenantId, tenantId)))
		.limit(1);
	return color;
}

// Create lettering costs routes
const letteringCostsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// Create new cost rule
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Verify technique belongs to tenant
		const technique = await verifyTechniqueOwnership(data.techniqueId, tenantId);
		if (!technique) {
			return c.json({ error: 'Lettering technique not found' }, 404);
		}

		// Verify color belongs to tenant if provided
		if (data.colorId) {
			const color = await verifyColorOwnership(data.colorId, tenantId);
			if (!color) {
				return c.json({ error: 'Lettering color not found' }, 404);
			}
		}

		const [created] = await db
			.insert(letteringCosts)
			.values({
				id: crypto.randomUUID(),
				techniqueId: data.techniqueId,
				colorId: data.colorId || null,
				appliesTo: data.appliesTo,
				freeLetters: data.freeLetters,
				pricePerLetter: String(data.pricePerLetter),
			})
			.returning();

		return c.json({ letteringCost: created }, 201);
	})

	// Update cost rule
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		// Get cost and verify ownership via technique
		const [cost] = await db.select().from(letteringCosts).where(eq(letteringCosts.id, id)).limit(1);

		if (!cost) {
			return c.json({ error: 'Lettering cost not found' }, 404);
		}

		// Verify technique belongs to tenant
		const technique = await verifyTechniqueOwnership(cost.techniqueId, tenantId);
		if (!technique) {
			return c.json({ error: 'Lettering cost not found' }, 404);
		}

		// Verify color belongs to tenant if provided
		if (data.colorId) {
			const color = await verifyColorOwnership(data.colorId, tenantId);
			if (!color) {
				return c.json({ error: 'Lettering color not found' }, 404);
			}
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.colorId !== undefined) updateData.colorId = data.colorId;
		if (data.appliesTo !== undefined) updateData.appliesTo = data.appliesTo;
		if (data.freeLetters !== undefined) updateData.freeLetters = data.freeLetters;
		if (data.pricePerLetter !== undefined) updateData.pricePerLetter = String(data.pricePerLetter);

		const [updated] = await db
			.update(letteringCosts)
			.set(updateData)
			.where(eq(letteringCosts.id, id))
			.returning();

		return c.json({ letteringCost: updated });
	})

	// Delete cost rule
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Get cost and verify ownership via technique
		const [cost] = await db.select().from(letteringCosts).where(eq(letteringCosts.id, id)).limit(1);

		if (!cost) {
			return c.json({ error: 'Lettering cost not found' }, 404);
		}

		// Verify technique belongs to tenant
		const technique = await verifyTechniqueOwnership(cost.techniqueId, tenantId);
		if (!technique) {
			return c.json({ error: 'Lettering cost not found' }, 404);
		}

		await db.delete(letteringCosts).where(eq(letteringCosts.id, id));

		return c.json({ success: true });
	});

export { letteringCostsRoutes };
