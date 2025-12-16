import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { services } from '@griffiths-crm/shared/db/schema';

const PRICING_TYPES = ['fixed', 'quoted', 'hourly'] as const;

// Validation schemas
const createSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional(),
	basePrice: z.number().min(0, 'Base price must be non-negative').optional().nullable(),
	pricingType: z.enum(PRICING_TYPES),
	isActive: z.boolean().optional().default(true),
});

const updateSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	description: z.string().optional().nullable(),
	basePrice: z.number().min(0, 'Base price must be non-negative').optional().nullable(),
	pricingType: z.enum(PRICING_TYPES).optional(),
	isActive: z.boolean().optional(),
});

// Create services routes
const servicesRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List all services for tenant
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const items = await db
			.select()
			.from(services)
			.where(eq(services.tenantId, tenantId))
			.orderBy(asc(services.sortOrder), asc(services.name));

		return c.json({ services: items });
	})

	// Create new service
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Get max sortOrder for this tenant
		const existing = await db
			.select({ sortOrder: services.sortOrder })
			.from(services)
			.where(eq(services.tenantId, tenantId))
			.orderBy(asc(services.sortOrder));

		const maxSortOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.sortOrder)) : -1;

		const [created] = await db
			.insert(services)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				name: data.name,
				description: data.description || null,
				basePrice: data.basePrice != null ? String(data.basePrice) : null,
				pricingType: data.pricingType,
				isActive: data.isActive ?? true,
				sortOrder: maxSortOrder + 1,
			})
			.returning();

		return c.json({ service: created }, 201);
	})

	// Update service
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		// Verify service belongs to tenant
		const [existing] = await db
			.select()
			.from(services)
			.where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Service not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.basePrice !== undefined) {
			updateData.basePrice = data.basePrice != null ? String(data.basePrice) : null;
		}
		if (data.pricingType !== undefined) updateData.pricingType = data.pricingType;
		if (data.isActive !== undefined) updateData.isActive = data.isActive;

		const [updated] = await db
			.update(services)
			.set(updateData)
			.where(eq(services.id, id))
			.returning();

		return c.json({ service: updated });
	})

	// Delete service
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Verify service belongs to tenant
		const [existing] = await db
			.select()
			.from(services)
			.where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Service not found' }, 404);
		}

		await db.delete(services).where(eq(services.id, id));

		return c.json({ success: true });
	});

export { servicesRoutes };
