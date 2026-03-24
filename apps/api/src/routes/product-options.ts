import {
	FLOWER_HOLE_CHOICES,
	optionChoices,
	productOptions,
	products,
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { requireAuth, requireTenant } from '../middleware/auth';

const OPTION_TYPES = ['dimension', 'stone_color', 'flower_holes', 'custom'] as const;

// Validation schemas
const createSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	type: z.enum(OPTION_TYPES),
	isRequired: z.boolean().optional().default(true),
});

const updateSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	type: z.enum(OPTION_TYPES).optional(),
	isRequired: z.boolean().optional(),
	sortOrder: z.number().min(0).optional(),
});

// Helper to verify product belongs to tenant
async function verifyProductOwnership(productId: string, tenantId: string) {
	const [product] = await db
		.select()
		.from(products)
		.where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
		.limit(1);
	return product;
}

// Helper to get option with choices
async function getOptionWithChoices(optionId: string) {
	const [option] = await db
		.select()
		.from(productOptions)
		.where(eq(productOptions.id, optionId))
		.limit(1);

	if (!option) return null;

	const choices = await db
		.select()
		.from(optionChoices)
		.where(eq(optionChoices.optionId, optionId))
		.orderBy(asc(optionChoices.sortOrder), asc(optionChoices.name));

	return { ...option, choices };
}

// Create product options routes
const productOptionsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List options for a product
	.get('/products/:productId/options', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('productId');

		// Verify product belongs to tenant
		const product = await verifyProductOwnership(productId, tenantId);
		if (!product) {
			return c.json({ error: 'Product not found' }, 404);
		}

		const options = await db
			.select()
			.from(productOptions)
			.where(eq(productOptions.productId, productId))
			.orderBy(asc(productOptions.sortOrder), asc(productOptions.name));

		// Get choices for each option
		const optionsWithChoices = await Promise.all(
			options.map(async (option) => {
				const choices = await db
					.select()
					.from(optionChoices)
					.where(eq(optionChoices.optionId, option.id))
					.orderBy(asc(optionChoices.sortOrder), asc(optionChoices.name));
				return { ...option, choices };
			}),
		);

		return c.json({ options: optionsWithChoices });
	})

	// Create new option for a product
	.post('/products/:productId/options', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('productId');
		const data = c.req.valid('json');

		// Verify product belongs to tenant
		const product = await verifyProductOwnership(productId, tenantId);
		if (!product) {
			return c.json({ error: 'Product not found' }, 404);
		}

		// Get max sortOrder
		const existing = await db
			.select({ sortOrder: productOptions.sortOrder })
			.from(productOptions)
			.where(eq(productOptions.productId, productId))
			.orderBy(asc(productOptions.sortOrder));

		const maxSortOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.sortOrder)) : -1;

		const [created] = await db
			.insert(productOptions)
			.values({
				id: crypto.randomUUID(),
				productId,
				name: data.name,
				type: data.type,
				isRequired: data.isRequired ?? true,
				sortOrder: maxSortOrder + 1,
			})
			.returning();

		// Auto-populate choices for flower_holes type
		let choices: (typeof optionChoices.$inferSelect)[] = [];
		if (data.type === 'flower_holes') {
			const choiceValues = FLOWER_HOLE_CHOICES.map((name, index) => ({
				id: crypto.randomUUID(),
				optionId: created.id,
				name,
				priceAdjustment: '0',
				sortOrder: index,
			}));
			choices = await db.insert(optionChoices).values(choiceValues).returning();
		}

		return c.json({ option: { ...created, choices } }, 201);
	})

	// Update option
	.put('/product-options/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const optionId = c.req.param('id');
		const data = c.req.valid('json');

		// Get option and verify ownership
		const [option] = await db
			.select()
			.from(productOptions)
			.where(eq(productOptions.id, optionId))
			.limit(1);

		if (!option) {
			return c.json({ error: 'Option not found' }, 404);
		}

		// Verify product belongs to tenant
		const product = await verifyProductOwnership(option.productId, tenantId);
		if (!product) {
			return c.json({ error: 'Option not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.type !== undefined) updateData.type = data.type;
		if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
		if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

		await db.update(productOptions).set(updateData).where(eq(productOptions.id, optionId));

		const updated = await getOptionWithChoices(optionId);
		return c.json({ option: updated });
	})

	// Delete option
	.delete('/product-options/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const optionId = c.req.param('id');

		// Get option and verify ownership
		const [option] = await db
			.select()
			.from(productOptions)
			.where(eq(productOptions.id, optionId))
			.limit(1);

		if (!option) {
			return c.json({ error: 'Option not found' }, 404);
		}

		// Verify product belongs to tenant
		const product = await verifyProductOwnership(option.productId, tenantId);
		if (!product) {
			return c.json({ error: 'Option not found' }, 404);
		}

		// Delete will cascade to choices
		await db.delete(productOptions).where(eq(productOptions.id, optionId));

		return c.json({ success: true });
	});

export { productOptionsRoutes };
