import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	products,
	productComponents,
	dimensionCombos,
	dimensionComboValues,
} from '@griffiths-crm/shared/db/schema';

// Validation schemas
const dimensionValueSchema = z.object({
	productComponentId: z.string().min(1),
	dimension1: z.number(),
	dimension2: z.number(),
	dimension3: z.number(),
});

const createSchema = z.object({
	name: z.string().optional().nullable(),
	priceAdjustment: z.number().optional().default(0),
	values: z.array(dimensionValueSchema).min(1, 'At least one dimension value is required'),
});

const updateSchema = z.object({
	name: z.string().optional().nullable(),
	priceAdjustment: z.number().optional(),
	isActive: z.boolean().optional(),
	sortOrder: z.number().int().min(0).optional(),
	values: z.array(dimensionValueSchema).optional(),
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

// Helper to get combo with values
async function getComboWithValues(comboId: string) {
	const [combo] = await db
		.select()
		.from(dimensionCombos)
		.where(eq(dimensionCombos.id, comboId))
		.limit(1);

	if (!combo) return null;

	const values = await db
		.select({
			id: dimensionComboValues.id,
			comboId: dimensionComboValues.comboId,
			productComponentId: dimensionComboValues.productComponentId,
			dimension1: dimensionComboValues.dimension1,
			dimension2: dimensionComboValues.dimension2,
			dimension3: dimensionComboValues.dimension3,
			createdAt: dimensionComboValues.createdAt,
			updatedAt: dimensionComboValues.updatedAt,
			// Include component info
			componentType: productComponents.componentType,
			componentName: productComponents.name,
			componentQuantity: productComponents.quantity,
		})
		.from(dimensionComboValues)
		.innerJoin(productComponents, eq(productComponents.id, dimensionComboValues.productComponentId))
		.where(eq(dimensionComboValues.comboId, comboId))
		.orderBy(asc(productComponents.sortOrder));

	return { ...combo, values };
}

// Create dimension combos routes
const dimensionCombosRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List dimension combos for a product
	.get('/products/:productId/dimension-combos', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('productId');

		// Verify product belongs to tenant
		const product = await verifyProductOwnership(productId, tenantId);
		if (!product) {
			return c.json({ error: 'Product not found' }, 404);
		}

		const combos = await db
			.select()
			.from(dimensionCombos)
			.where(eq(dimensionCombos.productId, productId))
			.orderBy(asc(dimensionCombos.sortOrder), asc(dimensionCombos.createdAt));

		// Get values for each combo
		const combosWithValues = await Promise.all(
			combos.map(async (combo) => {
				const values = await db
					.select({
						id: dimensionComboValues.id,
						comboId: dimensionComboValues.comboId,
						productComponentId: dimensionComboValues.productComponentId,
						dimension1: dimensionComboValues.dimension1,
						dimension2: dimensionComboValues.dimension2,
						dimension3: dimensionComboValues.dimension3,
						createdAt: dimensionComboValues.createdAt,
						updatedAt: dimensionComboValues.updatedAt,
						componentType: productComponents.componentType,
						componentName: productComponents.name,
						componentQuantity: productComponents.quantity,
					})
					.from(dimensionComboValues)
					.innerJoin(
						productComponents,
						eq(productComponents.id, dimensionComboValues.productComponentId)
					)
					.where(eq(dimensionComboValues.comboId, combo.id))
					.orderBy(asc(productComponents.sortOrder));

				return { ...combo, values };
			})
		);

		return c.json({ combos: combosWithValues });
	})

	// Get single dimension combo
	.get('/dimension-combos/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const comboId = c.req.param('id');

		const combo = await getComboWithValues(comboId);
		if (!combo) {
			return c.json({ error: 'Dimension combo not found' }, 404);
		}

		// Verify product belongs to tenant
		const product = await verifyProductOwnership(combo.productId, tenantId);
		if (!product) {
			return c.json({ error: 'Dimension combo not found' }, 404);
		}

		return c.json({ combo });
	})

	// Create new dimension combo for a product
	.post('/products/:productId/dimension-combos', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('productId');
		const data = c.req.valid('json');

		// Verify product belongs to tenant
		const product = await verifyProductOwnership(productId, tenantId);
		if (!product) {
			return c.json({ error: 'Product not found' }, 404);
		}

		// Get product components to validate values
		const components = await db
			.select()
			.from(productComponents)
			.where(eq(productComponents.productId, productId));

		if (components.length === 0) {
			return c.json({ error: 'Product has no components. Add components first.' }, 400);
		}

		// Validate that all provided component IDs belong to this product
		const componentIds = new Set(components.map((c) => c.id));
		for (const value of data.values) {
			if (!componentIds.has(value.productComponentId)) {
				return c.json(
					{ error: `Invalid component ID: ${value.productComponentId}` },
					400
				);
			}
		}

		// Validate that values are provided for all components
		const providedComponentIds = new Set(data.values.map((v) => v.productComponentId));
		for (const component of components) {
			if (!providedComponentIds.has(component.id)) {
				return c.json(
					{
						error: `Missing dimensions for component: ${component.name || component.componentType}`,
					},
					400
				);
			}
		}

		// Get max sortOrder
		const existingCombos = await db
			.select({ sortOrder: dimensionCombos.sortOrder })
			.from(dimensionCombos)
			.where(eq(dimensionCombos.productId, productId))
			.orderBy(asc(dimensionCombos.sortOrder));

		const maxSortOrder =
			existingCombos.length > 0 ? Math.max(...existingCombos.map((e) => e.sortOrder)) : -1;

		// Create combo
		const comboId = crypto.randomUUID();
		const [created] = await db
			.insert(dimensionCombos)
			.values({
				id: comboId,
				productId,
				name: data.name || null,
				priceAdjustment: String(data.priceAdjustment ?? 0),
				sortOrder: maxSortOrder + 1,
			})
			.returning();

		// Create values
		const valueRecords = data.values.map((value) => ({
			id: crypto.randomUUID(),
			comboId,
			productComponentId: value.productComponentId,
			dimension1: String(value.dimension1),
			dimension2: String(value.dimension2),
			dimension3: String(value.dimension3),
		}));

		await db.insert(dimensionComboValues).values(valueRecords);

		// Return with full values
		const combo = await getComboWithValues(comboId);
		return c.json({ combo }, 201);
	})

	// Update dimension combo
	.put('/dimension-combos/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const comboId = c.req.param('id');
		const data = c.req.valid('json');

		// Get combo and verify ownership
		const [existing] = await db
			.select()
			.from(dimensionCombos)
			.where(eq(dimensionCombos.id, comboId))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Dimension combo not found' }, 404);
		}

		// Verify product belongs to tenant
		const product = await verifyProductOwnership(existing.productId, tenantId);
		if (!product) {
			return c.json({ error: 'Dimension combo not found' }, 404);
		}

		// Update combo
		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.priceAdjustment !== undefined)
			updateData.priceAdjustment = String(data.priceAdjustment);
		if (data.isActive !== undefined) updateData.isActive = data.isActive;
		if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

		await db.update(dimensionCombos).set(updateData).where(eq(dimensionCombos.id, comboId));

		// Update values if provided
		if (data.values) {
			// Get product components to validate values
			const components = await db
				.select()
				.from(productComponents)
				.where(eq(productComponents.productId, existing.productId));

			const componentIds = new Set(components.map((c) => c.id));
			for (const value of data.values) {
				if (!componentIds.has(value.productComponentId)) {
					return c.json(
						{ error: `Invalid component ID: ${value.productComponentId}` },
						400
					);
				}
			}

			// Delete existing values and insert new ones
			await db.delete(dimensionComboValues).where(eq(dimensionComboValues.comboId, comboId));

			const valueRecords = data.values.map((value) => ({
				id: crypto.randomUUID(),
				comboId,
				productComponentId: value.productComponentId,
				dimension1: String(value.dimension1),
				dimension2: String(value.dimension2),
				dimension3: String(value.dimension3),
			}));

			await db.insert(dimensionComboValues).values(valueRecords);
		}

		const combo = await getComboWithValues(comboId);
		return c.json({ combo });
	})

	// Delete dimension combo
	.delete('/dimension-combos/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const comboId = c.req.param('id');

		// Get combo and verify ownership
		const [existing] = await db
			.select()
			.from(dimensionCombos)
			.where(eq(dimensionCombos.id, comboId))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Dimension combo not found' }, 404);
		}

		// Verify product belongs to tenant
		const product = await verifyProductOwnership(existing.productId, tenantId);
		if (!product) {
			return c.json({ error: 'Dimension combo not found' }, 404);
		}

		// Delete will cascade to values
		await db.delete(dimensionCombos).where(eq(dimensionCombos.id, comboId));

		return c.json({ success: true });
	});

export { dimensionCombosRoutes };
