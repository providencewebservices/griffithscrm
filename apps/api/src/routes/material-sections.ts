import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, asc, count } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { materialSections, materials, suppliers } from '@griffiths-crm/shared/db/schema';

// Validation schemas
const createSchema = z.object({
	name: z.string().min(1, 'Name is required'),
});

const updateSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
});

// Create material sections routes
const materialSectionsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List all sections for tenant (with material count)
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const sections = await db
			.select()
			.from(materialSections)
			.where(eq(materialSections.tenantId, tenantId))
			.orderBy(asc(materialSections.sortOrder), asc(materialSections.name));

		// Get material counts per section
		const materialCounts = await db
			.select({
				sectionId: materials.sectionId,
				count: count(),
			})
			.from(materials)
			.where(eq(materials.tenantId, tenantId))
			.groupBy(materials.sectionId);

		const countMap = new Map(materialCounts.map((mc) => [mc.sectionId, Number(mc.count)]));

		// Get material name previews per section
		const materialPreviews = await db
			.select({ sectionId: materials.sectionId, name: materials.name })
			.from(materials)
			.where(eq(materials.tenantId, tenantId))
			.orderBy(asc(materials.sortOrder), asc(materials.name));

		const previewMap = new Map<string, string[]>();
		for (const m of materialPreviews) {
			const arr = previewMap.get(m.sectionId) || [];
			if (arr.length < 3) arr.push(m.name);
			previewMap.set(m.sectionId, arr);
		}

		const sectionsWithCounts = sections.map((s) => ({
			...s,
			materialCount: countMap.get(s.id) || 0,
			materialNames: previewMap.get(s.id) || [],
		}));

		return c.json({ materialSections: sectionsWithCounts });
	})

	// Get single section with materials
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [section] = await db
			.select()
			.from(materialSections)
			.where(and(eq(materialSections.id, id), eq(materialSections.tenantId, tenantId)))
			.limit(1);

		if (!section) {
			return c.json({ error: 'Material section not found' }, 404);
		}

		// Get associated materials
		const sectionMaterials = await db
			.select({
				id: materials.id,
				tenantId: materials.tenantId,
				sectionId: materials.sectionId,
				supplierId: materials.supplierId,
				name: materials.name,
				imageUrl: materials.imageUrl,
				isActive: materials.isActive,
				sortOrder: materials.sortOrder,
				createdAt: materials.createdAt,
				updatedAt: materials.updatedAt,
				supplierName: suppliers.businessName,
			})
			.from(materials)
			.leftJoin(suppliers, eq(materials.supplierId, suppliers.id))
			.where(eq(materials.sectionId, id))
			.orderBy(asc(materials.sortOrder), asc(materials.name));

		return c.json({
			materialSection: {
				...section,
				materials: sectionMaterials,
			},
		});
	})

	// Create new section
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Get max sortOrder for this tenant
		const existing = await db
			.select({ sortOrder: materialSections.sortOrder })
			.from(materialSections)
			.where(eq(materialSections.tenantId, tenantId))
			.orderBy(asc(materialSections.sortOrder));

		const maxSortOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.sortOrder)) : -1;

		const [created] = await db
			.insert(materialSections)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				name: data.name,
				sortOrder: maxSortOrder + 1,
			})
			.returning();

		return c.json({ materialSection: { ...created, materialCount: 0 } }, 201);
	})

	// Update section
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		// Verify section belongs to tenant
		const [existing] = await db
			.select()
			.from(materialSections)
			.where(and(eq(materialSections.id, id), eq(materialSections.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Material section not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;

		const [updated] = await db
			.update(materialSections)
			.set(updateData)
			.where(eq(materialSections.id, id))
			.returning();

		return c.json({ materialSection: updated });
	})

	// Delete section
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Verify section belongs to tenant
		const [existing] = await db
			.select()
			.from(materialSections)
			.where(and(eq(materialSections.id, id), eq(materialSections.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Material section not found' }, 404);
		}

		await db.delete(materialSections).where(eq(materialSections.id, id));

		return c.json({ success: true });
	});

export { materialSectionsRoutes };
