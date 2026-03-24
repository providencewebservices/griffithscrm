import {
	jobs,
	jobWorkflowTasks,
	quotes,
	users,
	WORKFLOW_STEP_CATEGORIES,
	WORKFLOW_TASK_STATUSES,
	workflowSteps,
	workflowTemplates,
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { seedDefaultWorkflowTemplates } from '../lib/workflow-seed';
import { requireAuth, requireTenant } from '../middleware/auth';

// Validation schemas
const createTaskSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().nullable().optional().default(null),
	category: z.enum(WORKFLOW_STEP_CATEGORIES),
	assigneeId: z.string().nullable().optional().default(null),
	dueDate: z.string().nullable().optional().default(null),
});

const updateTaskSchema = z.object({
	status: z.enum(WORKFLOW_TASK_STATUSES).optional(),
	assigneeId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	taskDate: z.string().nullable().optional(),
	dueDate: z.string().nullable().optional(),
});

const jobWorkflowTasksRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List all workflow tasks for a job
	.get('/:jobId/workflow-tasks', async (c) => {
		const tenantId = c.get('user').tenantId!;
		const jobId = c.req.param('jobId');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		const tasks = await db
			.select({
				id: jobWorkflowTasks.id,
				tenantId: jobWorkflowTasks.tenantId,
				jobId: jobWorkflowTasks.jobId,
				workflowStepId: jobWorkflowTasks.workflowStepId,
				name: jobWorkflowTasks.name,
				description: jobWorkflowTasks.description,
				sortOrder: jobWorkflowTasks.sortOrder,
				status: jobWorkflowTasks.status,
				assigneeId: jobWorkflowTasks.assigneeId,
				assigneeName: users.name,
				category: jobWorkflowTasks.category,
				dueDate: jobWorkflowTasks.dueDate,
				completedAt: jobWorkflowTasks.completedAt,
				completedBy: jobWorkflowTasks.completedBy,
				taskDate: jobWorkflowTasks.taskDate,
				notes: jobWorkflowTasks.notes,
				createdAt: jobWorkflowTasks.createdAt,
				updatedAt: jobWorkflowTasks.updatedAt,
			})
			.from(jobWorkflowTasks)
			.leftJoin(users, eq(jobWorkflowTasks.assigneeId, users.id))
			.where(eq(jobWorkflowTasks.jobId, jobId))
			.orderBy(asc(jobWorkflowTasks.sortOrder));

		return c.json({ workflowTasks: tasks });
	})

	// Generate workflow tasks from template
	.post('/:jobId/workflow-tasks/generate', async (c) => {
		const tenantId = c.get('user').tenantId!;
		const jobId = c.req.param('jobId');

		// Verify job exists and belongs to tenant, fetch quoteType from related quote
		const [job] = await db
			.select({
				id: jobs.id,
				productionMethod: jobs.productionMethod,
				quoteType: quotes.quoteType,
			})
			.from(jobs)
			.innerJoin(quotes, eq(jobs.quoteId, quotes.id))
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		// Check job has zero workflow tasks
		const [taskCount] = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(jobWorkflowTasks)
			.where(eq(jobWorkflowTasks.jobId, jobId));

		if (Number(taskCount.count) > 0) {
			return c.json({ error: 'Job already has workflow tasks' }, 400);
		}

		// Ensure default templates exist
		await seedDefaultWorkflowTemplates(tenantId);

		// Find matching template
		const templateCondition = job.productionMethod
			? eq(workflowTemplates.productionMethod, job.productionMethod)
			: isNull(workflowTemplates.productionMethod);

		const [template] = await db
			.select()
			.from(workflowTemplates)
			.where(
				and(
					eq(workflowTemplates.tenantId, tenantId),
					eq(workflowTemplates.quoteType, job.quoteType),
					templateCondition,
					eq(workflowTemplates.isActive, true),
				),
			)
			.limit(1);

		if (!template) {
			return c.json({ error: 'No matching workflow template found' }, 404);
		}

		// Get template steps
		const steps = await db
			.select()
			.from(workflowSteps)
			.where(eq(workflowSteps.templateId, template.id))
			.orderBy(asc(workflowSteps.sortOrder));

		if (steps.length === 0) {
			return c.json({ error: 'Template has no steps' }, 400);
		}

		// Create workflow tasks from steps
		const newTasks = steps.map((step) => ({
			id: crypto.randomUUID(),
			tenantId,
			jobId,
			workflowStepId: step.id,
			name: step.name,
			description: step.description,
			sortOrder: step.sortOrder,
			status: 'pending' as const,
			assigneeId: step.defaultAssigneeId,
			category: step.category,
		}));

		await db.insert(jobWorkflowTasks).values(newTasks);

		// Return created tasks with assignee info
		const tasks = await db
			.select({
				id: jobWorkflowTasks.id,
				tenantId: jobWorkflowTasks.tenantId,
				jobId: jobWorkflowTasks.jobId,
				workflowStepId: jobWorkflowTasks.workflowStepId,
				name: jobWorkflowTasks.name,
				description: jobWorkflowTasks.description,
				sortOrder: jobWorkflowTasks.sortOrder,
				status: jobWorkflowTasks.status,
				assigneeId: jobWorkflowTasks.assigneeId,
				assigneeName: users.name,
				category: jobWorkflowTasks.category,
				dueDate: jobWorkflowTasks.dueDate,
				completedAt: jobWorkflowTasks.completedAt,
				completedBy: jobWorkflowTasks.completedBy,
				taskDate: jobWorkflowTasks.taskDate,
				notes: jobWorkflowTasks.notes,
				createdAt: jobWorkflowTasks.createdAt,
				updatedAt: jobWorkflowTasks.updatedAt,
			})
			.from(jobWorkflowTasks)
			.leftJoin(users, eq(jobWorkflowTasks.assigneeId, users.id))
			.where(eq(jobWorkflowTasks.jobId, jobId))
			.orderBy(asc(jobWorkflowTasks.sortOrder));

		return c.json({ workflowTasks: tasks }, 201);
	})

	// Add an ad-hoc task
	.post('/:jobId/workflow-tasks', zValidator('json', createTaskSchema), async (c) => {
		const tenantId = c.get('user').tenantId!;
		const jobId = c.req.param('jobId');
		const data = c.req.valid('json');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		// Get max sort order
		const [maxSort] = await db
			.select({ maxOrder: sql<number>`COALESCE(MAX(${jobWorkflowTasks.sortOrder}), -1)` })
			.from(jobWorkflowTasks)
			.where(eq(jobWorkflowTasks.jobId, jobId));

		const newTask = {
			id: crypto.randomUUID(),
			tenantId,
			jobId,
			workflowStepId: null,
			name: data.name,
			description: data.description,
			sortOrder: (maxSort?.maxOrder ?? -1) + 1,
			status: 'pending' as const,
			assigneeId: data.assigneeId,
			category: data.category,
			dueDate: data.dueDate ? new Date(data.dueDate) : null,
		};

		const [created] = await db.insert(jobWorkflowTasks).values(newTask).returning();

		return c.json({ workflowTask: created }, 201);
	})

	// Complete a task
	.put('/:jobId/workflow-tasks/:taskId/complete', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const jobId = c.req.param('jobId');
		const taskId = c.req.param('taskId');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		const [existing] = await db
			.select()
			.from(jobWorkflowTasks)
			.where(and(eq(jobWorkflowTasks.id, taskId), eq(jobWorkflowTasks.jobId, jobId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Workflow task not found' }, 404);
		}

		const [updated] = await db
			.update(jobWorkflowTasks)
			.set({
				status: 'completed',
				completedAt: new Date(),
				completedBy: currentUser.id,
				updatedAt: new Date(),
			})
			.where(eq(jobWorkflowTasks.id, taskId))
			.returning();

		return c.json({ workflowTask: updated });
	})

	// Skip a task
	.put('/:jobId/workflow-tasks/:taskId/skip', async (c) => {
		const tenantId = c.get('user').tenantId!;
		const jobId = c.req.param('jobId');
		const taskId = c.req.param('taskId');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		const [existing] = await db
			.select()
			.from(jobWorkflowTasks)
			.where(and(eq(jobWorkflowTasks.id, taskId), eq(jobWorkflowTasks.jobId, jobId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Workflow task not found' }, 404);
		}

		const [updated] = await db
			.update(jobWorkflowTasks)
			.set({
				status: 'skipped',
				updatedAt: new Date(),
			})
			.where(eq(jobWorkflowTasks.id, taskId))
			.returning();

		return c.json({ workflowTask: updated });
	})

	// Update task fields
	.put('/:jobId/workflow-tasks/:taskId', zValidator('json', updateTaskSchema), async (c) => {
		const tenantId = c.get('user').tenantId!;
		const jobId = c.req.param('jobId');
		const taskId = c.req.param('taskId');
		const data = c.req.valid('json');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		const [existing] = await db
			.select()
			.from(jobWorkflowTasks)
			.where(and(eq(jobWorkflowTasks.id, taskId), eq(jobWorkflowTasks.jobId, jobId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Workflow task not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.status !== undefined) updateData.status = data.status;
		if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
		if (data.notes !== undefined) updateData.notes = data.notes;
		if (data.taskDate !== undefined)
			updateData.taskDate = data.taskDate ? new Date(data.taskDate) : null;
		if (data.dueDate !== undefined)
			updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;

		const [updated] = await db
			.update(jobWorkflowTasks)
			.set(updateData)
			.where(eq(jobWorkflowTasks.id, taskId))
			.returning();

		return c.json({ workflowTask: updated });
	})

	// Delete a task (ad-hoc only)
	.delete('/:jobId/workflow-tasks/:taskId', async (c) => {
		const tenantId = c.get('user').tenantId!;
		const jobId = c.req.param('jobId');
		const taskId = c.req.param('taskId');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		const [existing] = await db
			.select()
			.from(jobWorkflowTasks)
			.where(and(eq(jobWorkflowTasks.id, taskId), eq(jobWorkflowTasks.jobId, jobId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Workflow task not found' }, 404);
		}

		if (existing.workflowStepId !== null) {
			return c.json({ error: 'Template tasks can only be skipped, not deleted.' }, 400);
		}

		await db.delete(jobWorkflowTasks).where(eq(jobWorkflowTasks.id, taskId));

		return c.json({ success: true });
	});

export { jobWorkflowTasksRoutes };
