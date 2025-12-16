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
	COMPONENT_TYPES,
} from '@griffiths-crm/shared/db/schema';

// Validation schemas
const createSchema = z.object({
	componentType: z.enum(COMPONENT_TYPES),
	name: z.string().optional().nullable(),
	quantity: z.number().int().min(1).optional().default(1),
});

const updateSchema = z.object({
	componentType: z.enum(COMPONENT_TYPES).optional(),
	name: z.string().optional().nullable(),
	quantity: z.number().int().min(1).optional(),
	sortOrder: z.number().int().min(0).optional(),
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

// Create product components routes
const productComponentsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List components for a product
	.get('/products/:productId/components', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('productId');

		// Verify product belongs to tenant
		const product = await verifyProductOwnership(productId, tenantId);
		if (!product) {
			return c.json({ error: 'Product not found' }, 404);
		}

		const components = await db
			.select()
			.from(productComponents)
			.where(eq(productComponents.productId, productId))
			.orderBy(asc(productComponents.sortOrder), asc(productComponents.createdAt));

		return c.json({ components });
	})

	// Create new component for a product
	.post('/products/:productId/components', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const productId = c.req.param('productId');
		const data = c.req.valid('json');

		// Verify product belongs to tenant
		const product = await verifyProductOwnership(productId, tenantId);
		if (!product) {
			return c.json({ error: 'Product not found' }, 404);
		}

		// Check if this component type already exists for this product
		const [existing] = await db
			.select()
			.from(productComponents)
			.where(
				and(
					eq(productComponents.productId, productId),
					eq(productComponents.componentType, data.componentType)
				)
			)
			.limit(1);

		if (existing) {
			return c.json(
				{ error: `A ${data.componentType} component already exists for this product` },
				400
			);
		}

		// Get max sortOrder
		const existingComponents = await db
			.select({ sortOrder: productComponents.sortOrder })
			.from(productComponents)
			.where(eq(productComponents.productId, productId))
			.orderBy(asc(productComponents.sortOrder));

		const maxSortOrder =
			existingComponents.length > 0
				? Math.max(...existingComponents.map((e) => e.sortOrder))
				: -1;

		const [created] = await db
			.insert(productComponents)
			.values({
				id: crypto.randomUUID(),
				productId,
				componentType: data.componentType,
				name: data.name || null,
				quantity: data.quantity ?? 1,
				sortOrder: maxSortOrder + 1,
			})
			.returning();

		return c.json({ component: created }, 201);
	})

	// Update component
	.put('/product-components/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const componentId = c.req.param('id');
		const data = c.req.valid('json');

		// Get component and verify ownership
		const [component] = await db
			.select()
			.from(productComponents)
			.where(eq(productComponents.id, componentId))
			.limit(1);

		if (!component) {
			return c.json({ error: 'Component not found' }, 404);
		}

		// Verify product belongs to tenant
		const product = await verifyProductOwnership(component.productId, tenantId);
		if (!product) {
			return c.json({ error: 'Component not found' }, 404);
		}

		// If changing component type, check for duplicates
		if (data.componentType && data.componentType !== component.componentType) {
			const [existing] = await db
				.select()
				.from(productComponents)
				.where(
					and(
						eq(productComponents.productId, component.productId),
						eq(productComponents.componentType, data.componentType)
					)
				)
				.limit(1);

			if (existing) {
				return c.json(
					{ error: `A ${data.componentType} component already exists for this product` },
					400
				);
			}
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.componentType !== undefined) updateData.componentType = data.componentType;
		if (data.name !== undefined) updateData.name = data.name;
		if (data.quantity !== undefined) updateData.quantity = data.quantity;
		if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

		const [updated] = await db
			.update(productComponents)
			.set(updateData)
			.where(eq(productComponents.id, componentId))
			.returning();

		return c.json({ component: updated });
	})

	// Delete component
	.delete('/product-components/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const componentId = c.req.param('id');

		// Get component and verify ownership
		const [component] = await db
			.select()
			.from(productComponents)
			.where(eq(productComponents.id, componentId))
			.limit(1);

		if (!component) {
			return c.json({ error: 'Component not found' }, 404);
		}

		// Verify product belongs to tenant
		const product = await verifyProductOwnership(component.productId, tenantId);
		if (!product) {
			return c.json({ error: 'Component not found' }, 404);
		}

		// Check if any dimension combos use this component
		const [usedInCombo] = await db
			.select()
			.from(dimensionComboValues)
			.where(eq(dimensionComboValues.productComponentId, componentId))
			.limit(1);

		if (usedInCombo) {
			return c.json(
				{
					error:
						'Cannot delete component that is used in dimension combos. Delete the dimension combos first.',
				},
				400
			);
		}

		await db.delete(productComponents).where(eq(productComponents.id, componentId));

		return c.json({ success: true });
	});

export { productComponentsRoutes };
