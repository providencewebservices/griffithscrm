import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, asc, sql } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	jobs,
	jobWorkflowTasks,
	users,
	WORKFLOW_TASK_STATUSES,
	WORKFLOW_STEP_CATEGORIES,
} from '@griffiths-crm/shared/db/schema';

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
		if (data.taskDate !== undefined) updateData.taskDate = data.taskDate ? new Date(data.taskDate) : null;
		if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;

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
