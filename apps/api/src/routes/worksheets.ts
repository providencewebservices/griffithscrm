import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, sql, desc, isNull, ilike, or, inArray } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	worksheets,
	tasks,
	users,
	WORKSHEET_STATUSES,
} from '@griffiths-crm/shared/db/schema';

// Validation schemas
const createWorksheetSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	assigneeId: z.string().optional(),
	date: z.string().datetime().optional(),
	notes: z.string().optional(),
});

const updateWorksheetSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().optional().nullable(),
	assigneeId: z.string().optional().nullable(),
	date: z.string().datetime().optional().nullable(),
	notes: z.string().optional().nullable(),
});

const updateStatusSchema = z.object({
	status: z.enum(WORKSHEET_STATUSES),
});

const addTasksSchema = z.object({
	taskIds: z.array(z.string()).min(1),
});

const reorderSchema = z.object({
	taskIds: z.array(z.string()),
});

const listQuerySchema = z.object({
	status: z.string().optional(),
	assigneeId: z.string().optional(),
	date: z.string().optional(),
	search: z.string().optional(),
	page: z.string().optional(),
});

export const worksheetsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List worksheets
	.get('/', zValidator('query', listQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const query = c.req.valid('query');

		const conditions = [
			eq(worksheets.tenantId, tenantId),
			isNull(worksheets.archivedAt),
		];

		if (query.status) conditions.push(eq(worksheets.status, query.status));
		if (query.assigneeId) conditions.push(eq(worksheets.assigneeId, query.assigneeId));
		if (query.search) {
			conditions.push(
				or(
					ilike(worksheets.title, `%${query.search}%`),
					ilike(worksheets.description, `%${query.search}%`)
				)!
			);
		}

		const page = parseInt(query.page || '1');
		const limit = 50;
		const offset = (page - 1) * limit;

		const results = await db
			.select({
				id: worksheets.id,
				title: worksheets.title,
				description: worksheets.description,
				status: worksheets.status,
				assigneeId: worksheets.assigneeId,
				createdById: worksheets.createdById,
				date: worksheets.date,
				notes: worksheets.notes,
				createdAt: worksheets.createdAt,
				updatedAt: worksheets.updatedAt,
				assigneeName: users.name,
			})
			.from(worksheets)
			.leftJoin(users, eq(worksheets.assigneeId, users.id))
			.where(and(...conditions))
			.orderBy(desc(worksheets.createdAt))
			.limit(limit)
			.offset(offset);

		// Get task counts for each worksheet
		const worksheetIds = results.map((w) => w.id);
		let taskCounts: { worksheetId: string; total: number; done: number }[] = [];

		if (worksheetIds.length > 0) {
			taskCounts = await db
				.select({
					worksheetId: tasks.worksheetId,
					total: sql<number>`count(*)::int`,
					done: sql<number>`count(*) FILTER (WHERE ${tasks.status} = 'done')::int`,
				})
				.from(tasks)
				.where(
					and(
						inArray(tasks.worksheetId, worksheetIds),
						isNull(tasks.archivedAt)
					)
				)
				.groupBy(tasks.worksheetId) as { worksheetId: string; total: number; done: number }[];
		}

		const countMap = new Map(taskCounts.map((tc) => [tc.worksheetId, tc]));

		const enriched = results.map((w) => ({
			...w,
			taskCount: countMap.get(w.id)?.total || 0,
			taskDoneCount: countMap.get(w.id)?.done || 0,
		}));

		return c.json({ worksheets: enriched });
	})

	// Create worksheet
	.post('/', zValidator('json', createWorksheetSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		const [created] = await db
			.insert(worksheets)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				title: data.title,
				description: data.description || null,
				assigneeId: data.assigneeId || null,
				createdById: currentUser.id,
				date: data.date ? new Date(data.date) : null,
				notes: data.notes || null,
			})
			.returning();

		return c.json({ worksheet: created }, 201);
	})

	// Get single worksheet with tasks
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [worksheet] = await db
			.select({
				id: worksheets.id,
				tenantId: worksheets.tenantId,
				title: worksheets.title,
				description: worksheets.description,
				status: worksheets.status,
				assigneeId: worksheets.assigneeId,
				createdById: worksheets.createdById,
				date: worksheets.date,
				notes: worksheets.notes,
				archivedAt: worksheets.archivedAt,
				createdAt: worksheets.createdAt,
				updatedAt: worksheets.updatedAt,
				assigneeName: users.name,
			})
			.from(worksheets)
			.leftJoin(users, eq(worksheets.assigneeId, users.id))
			.where(and(eq(worksheets.id, id), eq(worksheets.tenantId, tenantId)))
			.limit(1);

		if (!worksheet) {
			return c.json({ error: 'Worksheet not found' }, 404);
		}

		// Get tasks for this worksheet
		const worksheetTasks = await db
			.select({
				id: tasks.id,
				title: tasks.title,
				description: tasks.description,
				status: tasks.status,
				priority: tasks.priority,
				assigneeId: tasks.assigneeId,
				dueDate: tasks.dueDate,
				entityType: tasks.entityType,
				entityId: tasks.entityId,
				sortOrder: tasks.sortOrder,
				completedAt: tasks.completedAt,
				createdAt: tasks.createdAt,
			})
			.from(tasks)
			.where(
				and(
					eq(tasks.worksheetId, id),
					isNull(tasks.archivedAt)
				)
			)
			.orderBy(tasks.sortOrder, tasks.createdAt);

		return c.json({ worksheet, tasks: worksheetTasks });
	})

	// Update worksheet
	.put('/:id', zValidator('json', updateWorksheetSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		const [existing] = await db
			.select()
			.from(worksheets)
			.where(and(eq(worksheets.id, id), eq(worksheets.tenantId, tenantId), isNull(worksheets.archivedAt)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Worksheet not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.title !== undefined) updateData.title = data.title;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
		if (data.date !== undefined) updateData.date = data.date ? new Date(data.date) : null;
		if (data.notes !== undefined) updateData.notes = data.notes;

		const [updated] = await db
			.update(worksheets)
			.set(updateData)
			.where(eq(worksheets.id, id))
			.returning();

		return c.json({ worksheet: updated });
	})

	// Update worksheet status
	.put('/:id/status', zValidator('json', updateStatusSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const { status } = c.req.valid('json');

		const [existing] = await db
			.select()
			.from(worksheets)
			.where(and(eq(worksheets.id, id), eq(worksheets.tenantId, tenantId), isNull(worksheets.archivedAt)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Worksheet not found' }, 404);
		}

		const [updated] = await db
			.update(worksheets)
			.set({ status, updatedAt: new Date() })
			.where(eq(worksheets.id, id))
			.returning();

		return c.json({ worksheet: updated });
	})

	// Archive worksheet (tasks become standalone)
	.post('/:id/archive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [existing] = await db
			.select()
			.from(worksheets)
			.where(and(eq(worksheets.id, id), eq(worksheets.tenantId, tenantId), isNull(worksheets.archivedAt)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Worksheet not found' }, 404);
		}

		// Detach tasks from worksheet
		await db
			.update(tasks)
			.set({ worksheetId: null, updatedAt: new Date() })
			.where(eq(tasks.worksheetId, id));

		// Archive worksheet
		await db
			.update(worksheets)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(eq(worksheets.id, id));

		return c.json({ success: true });
	})

	// Add tasks to worksheet
	.post('/:id/tasks', zValidator('json', addTasksSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const { taskIds } = c.req.valid('json');

		// Verify worksheet exists
		const [worksheet] = await db
			.select()
			.from(worksheets)
			.where(and(eq(worksheets.id, id), eq(worksheets.tenantId, tenantId), isNull(worksheets.archivedAt)))
			.limit(1);

		if (!worksheet) {
			return c.json({ error: 'Worksheet not found' }, 404);
		}

		// Get current max sort order
		const [maxSort] = await db
			.select({ max: sql<number>`COALESCE(MAX(${tasks.sortOrder}), -1)::int` })
			.from(tasks)
			.where(eq(tasks.worksheetId, id));

		let nextSort = (maxSort?.max ?? -1) + 1;

		// Update each task to belong to this worksheet
		for (const taskId of taskIds) {
			await db
				.update(tasks)
				.set({
					worksheetId: id,
					sortOrder: nextSort++,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(tasks.id, taskId),
						eq(tasks.tenantId, tenantId),
						isNull(tasks.archivedAt)
					)
				);
		}

		return c.json({ success: true });
	})

	// Remove task from worksheet
	.delete('/:id/tasks/:taskId', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const taskId = c.req.param('taskId');

		await db
			.update(tasks)
			.set({ worksheetId: null, sortOrder: 0, updatedAt: new Date() })
			.where(
				and(
					eq(tasks.id, taskId),
					eq(tasks.worksheetId, id),
					eq(tasks.tenantId, tenantId)
				)
			);

		return c.json({ success: true });
	})

	// Reorder tasks in worksheet
	.put('/:id/reorder', zValidator('json', reorderSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const { taskIds } = c.req.valid('json');

		// Update sort order for each task
		for (let i = 0; i < taskIds.length; i++) {
			await db
				.update(tasks)
				.set({ sortOrder: i, updatedAt: new Date() })
				.where(
					and(
						eq(tasks.id, taskIds[i]),
						eq(tasks.worksheetId, id),
						eq(tasks.tenantId, tenantId)
					)
				);
		}

		return c.json({ success: true });
	});
