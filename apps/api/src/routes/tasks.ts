import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, sql, desc, isNull, ilike, or, lt, gte, lte, inArray } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	tasks,
	users,
	jobs,
	quotePackages,
	customers,
	TASK_STATUSES,
	TASK_PRIORITIES,
	TASK_ENTITY_TYPES,
} from '@griffiths-crm/shared/db/schema';

// Validation schemas
const createTaskSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	priority: z.enum(TASK_PRIORITIES).optional().default('normal'),
	assigneeId: z.string().optional(),
	dueDate: z.string().datetime().optional(),
	entityType: z.enum(TASK_ENTITY_TYPES).optional(),
	entityId: z.string().optional(),
	worksheetId: z.string().optional(),
});

const updateTaskSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().optional().nullable(),
	priority: z.enum(TASK_PRIORITIES).optional(),
	assigneeId: z.string().optional().nullable(),
	dueDate: z.string().datetime().optional().nullable(),
	entityType: z.enum(TASK_ENTITY_TYPES).optional().nullable(),
	entityId: z.string().optional().nullable(),
	worksheetId: z.string().optional().nullable(),
	sortOrder: z.number().int().optional(),
});

const updateStatusSchema = z.object({
	status: z.enum(TASK_STATUSES),
});

const listQuerySchema = z.object({
	status: z.string().optional(),
	assigneeId: z.string().optional(),
	entityType: z.string().optional(),
	entityId: z.string().optional(),
	worksheetId: z.string().optional(),
	search: z.string().optional(),
	page: z.string().optional(),
});

export const tasksRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List tasks
	.get('/', zValidator('query', listQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const query = c.req.valid('query');

		const conditions = [
			eq(tasks.tenantId, tenantId),
			isNull(tasks.archivedAt),
		];

		if (query.status) {
			const statuses = query.status.split(',');
			if (statuses.length === 1) {
				conditions.push(eq(tasks.status, statuses[0]));
			} else {
				conditions.push(inArray(tasks.status, statuses));
			}
		}
		if (query.assigneeId) conditions.push(eq(tasks.assigneeId, query.assigneeId));
		if (query.entityType) conditions.push(eq(tasks.entityType, query.entityType));
		if (query.entityId) conditions.push(eq(tasks.entityId, query.entityId));
		if (query.worksheetId) conditions.push(eq(tasks.worksheetId, query.worksheetId));
		if (query.search) {
			conditions.push(
				or(
					ilike(tasks.title, `%${query.search}%`),
					ilike(tasks.description, `%${query.search}%`)
				)!
			);
		}

		const page = parseInt(query.page || '1');
		const limit = 50;
		const offset = (page - 1) * limit;

		const results = await db
			.select({
				id: tasks.id,
				title: tasks.title,
				description: tasks.description,
				status: tasks.status,
				priority: tasks.priority,
				assigneeId: tasks.assigneeId,
				createdById: tasks.createdById,
				dueDate: tasks.dueDate,
				entityType: tasks.entityType,
				entityId: tasks.entityId,
				worksheetId: tasks.worksheetId,
				sortOrder: tasks.sortOrder,
				completedAt: tasks.completedAt,
				createdAt: tasks.createdAt,
				updatedAt: tasks.updatedAt,
				assigneeName: users.name,
				entityName: sql<string | null>`CASE
					WHEN ${tasks.entityType} = 'job' THEN ${jobs.jobNumber}
					WHEN ${tasks.entityType} = 'quote' THEN ${quotePackages.packageNumber}
					WHEN ${tasks.entityType} = 'customer' THEN CONCAT(${customers.firstName}, ' ', ${customers.lastName})
					ELSE NULL
				END`.as('entity_name'),
			})
			.from(tasks)
			.leftJoin(users, eq(tasks.assigneeId, users.id))
			.leftJoin(jobs, and(eq(tasks.entityType, 'job'), eq(tasks.entityId, jobs.id)))
			.leftJoin(quotePackages, and(eq(tasks.entityType, 'quote'), eq(tasks.entityId, quotePackages.id)))
			.leftJoin(customers, and(eq(tasks.entityType, 'customer'), eq(tasks.entityId, customers.id)))
			.where(and(...conditions))
			.orderBy(
				sql`CASE ${tasks.priority} WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 END`,
				desc(tasks.createdAt)
			)
			.limit(limit)
			.offset(offset);

		return c.json({ tasks: results });
	})

	// My task summary (for dashboard)
	.get('/my/summary', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const todayEnd = new Date(todayStart);
		todayEnd.setDate(todayEnd.getDate() + 1);

		// Open count (todo + in_progress)
		const [openResult] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(tasks)
			.where(
				and(
					eq(tasks.tenantId, tenantId),
					eq(tasks.assigneeId, currentUser.id),
					isNull(tasks.archivedAt),
					inArray(tasks.status, ['todo', 'in_progress'])
				)
			);

		// Overdue count
		const [overdueResult] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(tasks)
			.where(
				and(
					eq(tasks.tenantId, tenantId),
					eq(tasks.assigneeId, currentUser.id),
					isNull(tasks.archivedAt),
					inArray(tasks.status, ['todo', 'in_progress']),
					lt(tasks.dueDate, now)
				)
			);

		// Due today count
		const [dueTodayResult] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(tasks)
			.where(
				and(
					eq(tasks.tenantId, tenantId),
					eq(tasks.assigneeId, currentUser.id),
					isNull(tasks.archivedAt),
					inArray(tasks.status, ['todo', 'in_progress']),
					gte(tasks.dueDate, todayStart),
					lt(tasks.dueDate, todayEnd)
				)
			);

		// Get overdue + due today tasks for widget (max 5)
		const urgentTasks = await db
			.select({
				id: tasks.id,
				title: tasks.title,
				status: tasks.status,
				priority: tasks.priority,
				dueDate: tasks.dueDate,
				entityType: tasks.entityType,
				entityId: tasks.entityId,
			})
			.from(tasks)
			.where(
				and(
					eq(tasks.tenantId, tenantId),
					eq(tasks.assigneeId, currentUser.id),
					isNull(tasks.archivedAt),
					inArray(tasks.status, ['todo', 'in_progress']),
					sql`${tasks.dueDate} IS NOT NULL`,
					lte(tasks.dueDate, todayEnd)
				)
			)
			.orderBy(tasks.dueDate)
			.limit(5);

		return c.json({
			myOpenCount: openResult?.count || 0,
			myOverdueCount: overdueResult?.count || 0,
			myDueTodayCount: dueTodayResult?.count || 0,
			urgentTasks,
		});
	})

	// Get single task
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [task] = await db
			.select({
				id: tasks.id,
				tenantId: tasks.tenantId,
				title: tasks.title,
				description: tasks.description,
				status: tasks.status,
				priority: tasks.priority,
				assigneeId: tasks.assigneeId,
				createdById: tasks.createdById,
				dueDate: tasks.dueDate,
				entityType: tasks.entityType,
				entityId: tasks.entityId,
				worksheetId: tasks.worksheetId,
				sortOrder: tasks.sortOrder,
				completedAt: tasks.completedAt,
				completedById: tasks.completedById,
				archivedAt: tasks.archivedAt,
				createdAt: tasks.createdAt,
				updatedAt: tasks.updatedAt,
				assigneeName: users.name,
				entityName: sql<string | null>`CASE
					WHEN ${tasks.entityType} = 'job' THEN ${jobs.jobNumber}
					WHEN ${tasks.entityType} = 'quote' THEN ${quotePackages.packageNumber}
					WHEN ${tasks.entityType} = 'customer' THEN CONCAT(${customers.firstName}, ' ', ${customers.lastName})
					ELSE NULL
				END`.as('entity_name'),
			})
			.from(tasks)
			.leftJoin(users, eq(tasks.assigneeId, users.id))
			.leftJoin(jobs, and(eq(tasks.entityType, 'job'), eq(tasks.entityId, jobs.id)))
			.leftJoin(quotePackages, and(eq(tasks.entityType, 'quote'), eq(tasks.entityId, quotePackages.id)))
			.leftJoin(customers, and(eq(tasks.entityType, 'customer'), eq(tasks.entityId, customers.id)))
			.where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)))
			.limit(1);

		if (!task) {
			return c.json({ error: 'Task not found' }, 404);
		}

		return c.json({ task });
	})

	// Create task
	.post('/', zValidator('json', createTaskSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		const [created] = await db
			.insert(tasks)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				title: data.title,
				description: data.description || null,
				priority: data.priority || 'normal',
				assigneeId: data.assigneeId || null,
				createdById: currentUser.id,
				dueDate: data.dueDate ? new Date(data.dueDate) : null,
				entityType: data.entityType || null,
				entityId: data.entityId || null,
				worksheetId: data.worksheetId || null,
			})
			.returning();

		return c.json({ task: created }, 201);
	})

	// Update task
	.put('/:id', zValidator('json', updateTaskSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		const [existing] = await db
			.select()
			.from(tasks)
			.where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId), isNull(tasks.archivedAt)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Task not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.title !== undefined) updateData.title = data.title;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.priority !== undefined) updateData.priority = data.priority;
		if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
		if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
		if (data.entityType !== undefined) updateData.entityType = data.entityType;
		if (data.entityId !== undefined) updateData.entityId = data.entityId;
		if (data.worksheetId !== undefined) updateData.worksheetId = data.worksheetId;
		if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

		const [updated] = await db
			.update(tasks)
			.set(updateData)
			.where(eq(tasks.id, id))
			.returning();

		return c.json({ task: updated });
	})

	// Update task status
	.put('/:id/status', zValidator('json', updateStatusSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const { status } = c.req.valid('json');

		const [existing] = await db
			.select()
			.from(tasks)
			.where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId), isNull(tasks.archivedAt)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Task not found' }, 404);
		}

		const updateData: Record<string, unknown> = {
			status,
			updatedAt: new Date(),
		};

		// Auto-manage completed fields
		if (status === 'done') {
			updateData.completedAt = new Date();
			updateData.completedById = currentUser.id;
		} else {
			// Reopening: clear completed fields
			updateData.completedAt = null;
			updateData.completedById = null;
		}

		const [updated] = await db
			.update(tasks)
			.set(updateData)
			.where(eq(tasks.id, id))
			.returning();

		return c.json({ task: updated });
	})

	// Archive task
	.post('/:id/archive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [existing] = await db
			.select()
			.from(tasks)
			.where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId), isNull(tasks.archivedAt)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Task not found' }, 404);
		}

		await db
			.update(tasks)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(eq(tasks.id, id));

		return c.json({ success: true });
	});
