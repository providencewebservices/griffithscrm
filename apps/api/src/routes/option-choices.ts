import { optionChoices, productOptions, products } from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { requireAuth, requireTenant } from '../middleware/auth';

// Validation schemas
const createSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	priceAdjustment: z.number().optional().default(0),
});

const updateSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	priceAdjustment: z.number().optional(),
	imageUrl: z.string().optional().nullable(),
	sortOrder: z.number().min(0).optional(),
});

// Helper to verify option belongs to tenant's product
async function verifyOptionOwnership(optionId: string, tenantId: string) {
	const [option] = await db
		.select({
			option: productOptions,
			product: products,
		})
		.from(productOptions)
		.innerJoin(products, eq(products.id, productOptions.productId))
		.where(and(eq(productOptions.id, optionId), eq(products.tenantId, tenantId)))
		.limit(1);

	return option;
}

// Create option choices routes
const optionChoicesRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List choices for an option
	.get('/product-options/:optionId/choices', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const optionId = c.req.param('optionId');

		// Verify option belongs to tenant
		const ownership = await verifyOptionOwnership(optionId, tenantId);
		if (!ownership) {
			return c.json({ error: 'Option not found' }, 404);
		}

		const choices = await db
			.select()
			.from(optionChoices)
			.where(eq(optionChoices.optionId, optionId))
			.orderBy(asc(optionChoices.sortOrder), asc(optionChoices.name));

		return c.json({ choices });
	})

	// Create new choice for an option
	.post('/product-options/:optionId/choices', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const optionId = c.req.param('optionId');
		const data = c.req.valid('json');

		// Verify option belongs to tenant
		const ownership = await verifyOptionOwnership(optionId, tenantId);
		if (!ownership) {
			return c.json({ error: 'Option not found' }, 404);
		}

		// Get max sortOrder
		const existing = await db
			.select({ sortOrder: optionChoices.sortOrder })
			.from(optionChoices)
			.where(eq(optionChoices.optionId, optionId))
			.orderBy(asc(optionChoices.sortOrder));

		const maxSortOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.sortOrder)) : -1;

		const [created] = await db
			.insert(optionChoices)
			.values({
				id: crypto.randomUUID(),
				optionId,
				name: data.name,
				priceAdjustment: String(data.priceAdjustment || 0),
				sortOrder: maxSortOrder + 1,
			})
			.returning();

		return c.json({ choice: created }, 201);
	})

	// Update choice
	.put('/option-choices/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const choiceId = c.req.param('id');
		const data = c.req.valid('json');

		// Get choice
		const [choice] = await db
			.select()
			.from(optionChoices)
			.where(eq(optionChoices.id, choiceId))
			.limit(1);

		if (!choice) {
			return c.json({ error: 'Choice not found' }, 404);
		}

		// Verify option belongs to tenant
		const ownership = await verifyOptionOwnership(choice.optionId, tenantId);
		if (!ownership) {
			return c.json({ error: 'Choice not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.priceAdjustment !== undefined) {
			updateData.priceAdjustment = String(data.priceAdjustment);
		}
		if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
		if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

		const [updated] = await db
			.update(optionChoices)
			.set(updateData)
			.where(eq(optionChoices.id, choiceId))
			.returning();

		return c.json({ choice: updated });
	})

	// Delete choice
	.delete('/option-choices/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const choiceId = c.req.param('id');

		// Get choice
		const [choice] = await db
			.select()
			.from(optionChoices)
			.where(eq(optionChoices.id, choiceId))
			.limit(1);

		if (!choice) {
			return c.json({ error: 'Choice not found' }, 404);
		}

		// Verify option belongs to tenant
		const ownership = await verifyOptionOwnership(choice.optionId, tenantId);
		if (!ownership) {
			return c.json({ error: 'Choice not found' }, 404);
		}

		await db.delete(optionChoices).where(eq(optionChoices.id, choiceId));

		return c.json({ success: true });
	});

export { optionChoicesRoutes };
