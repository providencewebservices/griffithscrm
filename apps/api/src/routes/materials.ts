import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { materials, materialSections } from '@griffiths-crm/shared/db/schema';

// Validation schemas
const createSchema = z.object({
	sectionId: z.string().min(1, 'Section ID is required'),
	name: z.string().min(1, 'Name is required'),
	imageUrl: z.string().nullable().optional(),
	supplierCost: z.number().min(0).default(0),
	isActive: z.boolean().optional().default(true),
});

const updateSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	imageUrl: z.string().nullable().optional(),
	supplierCost: z.number().min(0).optional(),
	isActive: z.boolean().optional(),
});

// Create materials routes
const materialsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List all materials for tenant
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const allMaterials = await db
			.select()
			.from(materials)
			.where(eq(materials.tenantId, tenantId))
			.orderBy(asc(materials.sortOrder), asc(materials.name));

		return c.json({ materials: allMaterials });
	})

	// Get single material
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [material] = await db
			.select()
			.from(materials)
			.where(and(eq(materials.id, id), eq(materials.tenantId, tenantId)))
			.limit(1);

		if (!material) {
			return c.json({ error: 'Material not found' }, 404);
		}

		return c.json({ material });
	})

	// Create new material
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Verify section belongs to tenant
		const [section] = await db
			.select()
			.from(materialSections)
			.where(and(eq(materialSections.id, data.sectionId), eq(materialSections.tenantId, tenantId)))
			.limit(1);

		if (!section) {
			return c.json({ error: 'Material section not found' }, 404);
		}

		// Get max sortOrder for this section
		const existing = await db
			.select({ sortOrder: materials.sortOrder })
			.from(materials)
			.where(eq(materials.sectionId, data.sectionId))
			.orderBy(asc(materials.sortOrder));

		const maxSortOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.sortOrder)) : -1;

		const [created] = await db
			.insert(materials)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				sectionId: data.sectionId,
				name: data.name,
				imageUrl: data.imageUrl || null,
				supplierCost: String(data.supplierCost),
				isActive: data.isActive ?? true,
				sortOrder: maxSortOrder + 1,
			})
			.returning();

		return c.json({ material: created }, 201);
	})

	// Update material
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		// Verify material belongs to tenant
		const [existing] = await db
			.select()
			.from(materials)
			.where(and(eq(materials.id, id), eq(materials.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Material not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
		if (data.supplierCost !== undefined) updateData.supplierCost = String(data.supplierCost);
		if (data.isActive !== undefined) updateData.isActive = data.isActive;

		const [updated] = await db
			.update(materials)
			.set(updateData)
			.where(eq(materials.id, id))
			.returning();

		return c.json({ material: updated });
	})

	// Delete material
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Verify material belongs to tenant
		const [existing] = await db
			.select()
			.from(materials)
			.where(and(eq(materials.id, id), eq(materials.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Material not found' }, 404);
		}

		await db.delete(materials).where(eq(materials.id, id));

		return c.json({ success: true });
	});

export { materialsRoutes };
