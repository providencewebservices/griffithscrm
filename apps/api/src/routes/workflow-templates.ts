import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, asc, count } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { workflowTemplates, workflowSteps, WORKFLOW_STEP_CATEGORIES } from '@griffiths-crm/shared/db/schema';
import { seedDefaultWorkflowTemplates } from '../lib/workflow-seed';

// Validation schemas
const createTemplateSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	quoteType: z.string().min(1, 'Quote type is required'),
	productionMethod: z.string().nullable().optional().default(null),
});

const updateTemplateSchema = z.object({
	name: z.string().min(1).optional(),
	isActive: z.boolean().optional(),
});

const createStepSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().nullable().optional().default(null),
	sortOrder: z.number().int().min(0),
	category: z.enum(WORKFLOW_STEP_CATEGORIES),
	defaultAssigneeId: z.string().nullable().optional().default(null),
	requiresDate: z.boolean().optional().default(false),
	dateFieldLabel: z.string().nullable().optional().default(null),
});

const updateStepSchema = z.object({
	name: z.string().min(1).optional(),
	description: z.string().nullable().optional(),
	category: z.enum(WORKFLOW_STEP_CATEGORIES).optional(),
	defaultAssigneeId: z.string().nullable().optional(),
	requiresDate: z.boolean().optional(),
	dateFieldLabel: z.string().nullable().optional(),
});

const reorderStepsSchema = z.object({
	steps: z.array(z.object({
		id: z.string().min(1),
		sortOrder: z.number().int().min(0),
	})),
});

const workflowTemplatesRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List all templates for tenant (with step count)
	.get('/', async (c) => {
		const tenantId = c.get('user').tenantId!;

		const templates = await db
			.select()
			.from(workflowTemplates)
			.where(eq(workflowTemplates.tenantId, tenantId))
			.orderBy(asc(workflowTemplates.quoteType), asc(workflowTemplates.name));

		const templateIds = templates.map((t) => t.id);

		const stepCounts = templateIds.length > 0
			? await db
				.select({
					templateId: workflowSteps.templateId,
					stepCount: count(),
				})
				.from(workflowSteps)
				.where(eq(workflowSteps.tenantId, tenantId))
				.groupBy(workflowSteps.templateId)
			: [];

		const countMap = new Map(stepCounts.map((sc) => [sc.templateId, Number(sc.stepCount)]));

		const templatesWithCounts = templates.map((t) => ({
			...t,
			stepCount: countMap.get(t.id) || 0,
		}));

		return c.json({ workflowTemplates: templatesWithCounts });
	})

	// Get single template with steps
	.get('/:id', async (c) => {
		const tenantId = c.get('user').tenantId!;
		const id = c.req.param('id');

		const [template] = await db
			.select()
			.from(workflowTemplates)
			.where(and(eq(workflowTemplates.id, id), eq(workflowTemplates.tenantId, tenantId)))
			.limit(1);

		if (!template) {
			return c.json({ error: 'Workflow template not found' }, 404);
		}

		const steps = await db
			.select()
			.from(workflowSteps)
			.where(eq(workflowSteps.templateId, id))
			.orderBy(asc(workflowSteps.sortOrder));

		return c.json({ workflowTemplate: { ...template, steps } });
	})

	// Seed default templates (before /:id routes to avoid param matching)
	.post('/seed', async (c) => {
		const tenantId = c.get('user').tenantId!;
		const result = await seedDefaultWorkflowTemplates(tenantId);
		return c.json(result);
	})

	// Create a new template
	.post('/', zValidator('json', createTemplateSchema), async (c) => {
		const tenantId = c.get('user').tenantId!;
		const data = c.req.valid('json');

		const [created] = await db
			.insert(workflowTemplates)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				name: data.name,
				quoteType: data.quoteType,
				productionMethod: data.productionMethod,
			})
			.returning();

		return c.json({ workflowTemplate: { ...created, stepCount: 0, steps: [] } }, 201);
	})

	// Update template metadata
	.put('/:id', zValidator('json', updateTemplateSchema), async (c) => {
		const tenantId = c.get('user').tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		const [existing] = await db
			.select()
			.from(workflowTemplates)
			.where(and(eq(workflowTemplates.id, id), eq(workflowTemplates.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Workflow template not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.isActive !== undefined) updateData.isActive = data.isActive;

		const [updated] = await db
			.update(workflowTemplates)
			.set(updateData)
			.where(eq(workflowTemplates.id, id))
			.returning();

		return c.json({ workflowTemplate: updated });
	})

	// Add a step to a template
	.post('/:id/steps', zValidator('json', createStepSchema), async (c) => {
		const tenantId = c.get('user').tenantId!;
		const templateId = c.req.param('id');
		const data = c.req.valid('json');

		const [template] = await db
			.select()
			.from(workflowTemplates)
			.where(and(eq(workflowTemplates.id, templateId), eq(workflowTemplates.tenantId, tenantId)))
			.limit(1);

		if (!template) {
			return c.json({ error: 'Workflow template not found' }, 404);
		}

		const [created] = await db
			.insert(workflowSteps)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				templateId,
				name: data.name,
				description: data.description,
				sortOrder: data.sortOrder,
				category: data.category,
				defaultAssigneeId: data.defaultAssigneeId,
				requiresDate: data.requiresDate,
				dateFieldLabel: data.dateFieldLabel,
			})
			.returning();

		return c.json({ workflowStep: created }, 201);
	})

	// Reorder steps (must be before /:id/steps/:stepId to avoid "reorder" matching as stepId)
	.put('/:id/steps/reorder', zValidator('json', reorderStepsSchema), async (c) => {
		const tenantId = c.get('user').tenantId!;
		const templateId = c.req.param('id');
		const { steps } = c.req.valid('json');

		// Verify template belongs to tenant
		const [template] = await db
			.select()
			.from(workflowTemplates)
			.where(and(eq(workflowTemplates.id, templateId), eq(workflowTemplates.tenantId, tenantId)))
			.limit(1);

		if (!template) {
			return c.json({ error: 'Workflow template not found' }, 404);
		}

		for (const step of steps) {
			await db
				.update(workflowSteps)
				.set({ sortOrder: step.sortOrder, updatedAt: new Date() })
				.where(and(eq(workflowSteps.id, step.id), eq(workflowSteps.templateId, templateId)));
		}

		// Return updated steps
		const updatedSteps = await db
			.select()
			.from(workflowSteps)
			.where(eq(workflowSteps.templateId, templateId))
			.orderBy(asc(workflowSteps.sortOrder));

		return c.json({ workflowSteps: updatedSteps });
	})

	// Update a step
	.put('/:id/steps/:stepId', zValidator('json', updateStepSchema), async (c) => {
		const tenantId = c.get('user').tenantId!;
		const templateId = c.req.param('id');
		const stepId = c.req.param('stepId');

		const [existing] = await db
			.select()
			.from(workflowSteps)
			.where(and(
				eq(workflowSteps.id, stepId),
				eq(workflowSteps.templateId, templateId),
				eq(workflowSteps.tenantId, tenantId),
			))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Workflow step not found' }, 404);
		}

		const data = c.req.valid('json');
		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.category !== undefined) updateData.category = data.category;
		if (data.defaultAssigneeId !== undefined) updateData.defaultAssigneeId = data.defaultAssigneeId;
		if (data.requiresDate !== undefined) updateData.requiresDate = data.requiresDate;
		if (data.dateFieldLabel !== undefined) updateData.dateFieldLabel = data.dateFieldLabel;

		const [updated] = await db
			.update(workflowSteps)
			.set(updateData)
			.where(eq(workflowSteps.id, stepId))
			.returning();

		return c.json({ workflowStep: updated });
	})

	// Delete a step
	.delete('/:id/steps/:stepId', async (c) => {
		const tenantId = c.get('user').tenantId!;
		const templateId = c.req.param('id');
		const stepId = c.req.param('stepId');

		const [existing] = await db
			.select()
			.from(workflowSteps)
			.where(and(
				eq(workflowSteps.id, stepId),
				eq(workflowSteps.templateId, templateId),
				eq(workflowSteps.tenantId, tenantId),
			))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Workflow step not found' }, 404);
		}

		await db.delete(workflowSteps).where(eq(workflowSteps.id, stepId));

		return c.json({ success: true });
	});

export { workflowTemplatesRoutes };
