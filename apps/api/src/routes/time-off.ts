import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, or, desc } from 'drizzle-orm';
import {
	requireAuth,
	requireTenant,
	requireManager,
	isManagerRole,
} from '../middleware/auth';
import { db } from '../lib/auth';
import { timeOffRequests, users, TIME_OFF_STATUSES } from '@griffiths-crm/shared/db/schema';

// Validation schemas
const createTimeOffSchema = z.object({
	startDate: z.string().datetime(),
	endDate: z.string().datetime(),
	reason: z.string().optional(),
});

const updateTimeOffSchema = z.object({
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
	reason: z.string().optional().nullable(),
});

const reviewTimeOffSchema = z.object({
	notes: z.string().optional(),
});

// Create time-off routes
const timeOffRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List time-off requests
	// - Can filter by userId query param
	// - Regular users see: their own requests + all approved requests
	// - Managers see: all requests
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const isManager = isManagerRole(currentUser.role);
		const filterUserId = c.req.query('userId');

		let requests;

		if (filterUserId) {
			// Filtering by specific user
			const isOwnProfile = filterUserId === currentUser.id;

			if (isManager || isOwnProfile) {
				// Managers can see all requests for any user
				// Users can see all their own requests
				requests = await db
					.select({
						request: timeOffRequests,
						userName: users.name,
						reviewerName: users.name,
					})
					.from(timeOffRequests)
					.leftJoin(users, eq(timeOffRequests.userId, users.id))
					.where(
						and(
							eq(timeOffRequests.tenantId, tenantId),
							eq(timeOffRequests.userId, filterUserId)
						)
					)
					.orderBy(desc(timeOffRequests.createdAt));
			} else {
				// Non-managers viewing someone else's profile only see approved
				requests = await db
					.select({
						request: timeOffRequests,
						userName: users.name,
						reviewerName: users.name,
					})
					.from(timeOffRequests)
					.leftJoin(users, eq(timeOffRequests.userId, users.id))
					.where(
						and(
							eq(timeOffRequests.tenantId, tenantId),
							eq(timeOffRequests.userId, filterUserId),
							eq(timeOffRequests.status, 'approved')
						)
					)
					.orderBy(desc(timeOffRequests.createdAt));
			}
		} else if (isManager) {
			// Managers see all requests
			requests = await db
				.select({
					request: timeOffRequests,
					userName: users.name,
					reviewerName: users.name,
				})
				.from(timeOffRequests)
				.leftJoin(users, eq(timeOffRequests.userId, users.id))
				.where(eq(timeOffRequests.tenantId, tenantId))
				.orderBy(desc(timeOffRequests.createdAt));
		} else {
			// Regular users see their own + approved
			requests = await db
				.select({
					request: timeOffRequests,
					userName: users.name,
					reviewerName: users.name,
				})
				.from(timeOffRequests)
				.leftJoin(users, eq(timeOffRequests.userId, users.id))
				.where(
					and(
						eq(timeOffRequests.tenantId, tenantId),
						or(
							eq(timeOffRequests.userId, currentUser.id),
							eq(timeOffRequests.status, 'approved')
						)
					)
				)
				.orderBy(desc(timeOffRequests.createdAt));
		}

		// Get reviewer names for requests that have been reviewed
		const reviewedIds = requests
			.filter((r) => r.request.reviewedById)
			.map((r) => r.request.reviewedById!);

		const reviewers =
			reviewedIds.length > 0
				? await db
						.select({ id: users.id, name: users.name })
						.from(users)
						.where(
							or(...reviewedIds.map((id) => eq(users.id, id)))
						)
				: [];

		const reviewerMap = new Map(reviewers.map((r) => [r.id, r.name]));

		const result = requests.map((r) => ({
			...r.request,
			userName: r.userName,
			reviewerName: r.request.reviewedById
				? reviewerMap.get(r.request.reviewedById) || null
				: null,
			isOwn: r.request.userId === currentUser.id,
		}));

		return c.json({ requests: result });
	})

	// Get single time-off request
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const isManager = isManagerRole(currentUser.role);

		const [request] = await db
			.select({
				request: timeOffRequests,
				userName: users.name,
			})
			.from(timeOffRequests)
			.leftJoin(users, eq(timeOffRequests.userId, users.id))
			.where(
				and(
					eq(timeOffRequests.id, id),
					eq(timeOffRequests.tenantId, tenantId)
				)
			)
			.limit(1);

		if (!request) {
			return c.json({ error: 'Time-off request not found' }, 404);
		}

		// Check visibility
		const canView =
			isManager ||
			request.request.userId === currentUser.id ||
			request.request.status === 'approved';

		if (!canView) {
			return c.json({ error: 'Time-off request not found' }, 404);
		}

		// Get reviewer name if reviewed
		let reviewerName = null;
		if (request.request.reviewedById) {
			const [reviewer] = await db
				.select({ name: users.name })
				.from(users)
				.where(eq(users.id, request.request.reviewedById))
				.limit(1);
			reviewerName = reviewer?.name || null;
		}

		return c.json({
			request: {
				...request.request,
				userName: request.userName,
				reviewerName,
				isOwn: request.request.userId === currentUser.id,
			},
		});
	})

	// Create time-off request
	.post('/', zValidator('json', createTimeOffSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		const startDate = new Date(data.startDate);
		const endDate = new Date(data.endDate);

		// Validate dates
		if (endDate < startDate) {
			return c.json({ error: 'End date must be after start date' }, 400);
		}

		const [created] = await db
			.insert(timeOffRequests)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				userId: currentUser.id,
				startDate,
				endDate,
				reason: data.reason || null,
				status: 'pending',
			})
			.returning();

		return c.json({ request: created }, 201);
	})

	// Update own pending time-off request
	.put('/:id', zValidator('json', updateTimeOffSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		// Find the request
		const [existing] = await db
			.select()
			.from(timeOffRequests)
			.where(
				and(
					eq(timeOffRequests.id, id),
					eq(timeOffRequests.tenantId, tenantId)
				)
			)
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Time-off request not found' }, 404);
		}

		// Only owner can update, and only if pending
		if (existing.userId !== currentUser.id) {
			return c.json({ error: 'Not authorized to update this request' }, 403);
		}

		if (existing.status !== 'pending') {
			return c.json(
				{ error: 'Can only update pending requests' },
				400
			);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };

		if (data.startDate !== undefined) {
			updateData.startDate = new Date(data.startDate);
		}
		if (data.endDate !== undefined) {
			updateData.endDate = new Date(data.endDate);
		}
		if (data.reason !== undefined) {
			updateData.reason = data.reason;
		}

		// Validate dates if both are being updated
		const newStart = data.startDate
			? new Date(data.startDate)
			: existing.startDate;
		const newEnd = data.endDate ? new Date(data.endDate) : existing.endDate;

		if (newEnd < newStart) {
			return c.json({ error: 'End date must be after start date' }, 400);
		}

		const [updated] = await db
			.update(timeOffRequests)
			.set(updateData)
			.where(eq(timeOffRequests.id, id))
			.returning();

		return c.json({ request: updated });
	})

	// Delete own pending time-off request
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Find the request
		const [existing] = await db
			.select()
			.from(timeOffRequests)
			.where(
				and(
					eq(timeOffRequests.id, id),
					eq(timeOffRequests.tenantId, tenantId)
				)
			)
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Time-off request not found' }, 404);
		}

		// Only owner can delete, and only if pending
		if (existing.userId !== currentUser.id) {
			return c.json({ error: 'Not authorized to delete this request' }, 403);
		}

		if (existing.status !== 'pending') {
			return c.json(
				{ error: 'Can only delete pending requests' },
				400
			);
		}

		await db.delete(timeOffRequests).where(eq(timeOffRequests.id, id));

		return c.json({ success: true });
	})

	// Approve time-off request (managers only)
	.post(
		'/:id/approve',
		requireManager,
		zValidator('json', reviewTimeOffSchema),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const id = c.req.param('id');
			const data = c.req.valid('json');

			// Find the request
			const [existing] = await db
				.select()
				.from(timeOffRequests)
				.where(
					and(
						eq(timeOffRequests.id, id),
						eq(timeOffRequests.tenantId, tenantId)
					)
				)
				.limit(1);

			if (!existing) {
				return c.json({ error: 'Time-off request not found' }, 404);
			}

			if (existing.status !== 'pending') {
				return c.json(
					{ error: 'Can only approve pending requests' },
					400
				);
			}

			const [updated] = await db
				.update(timeOffRequests)
				.set({
					status: 'approved',
					reviewedById: currentUser.id,
					reviewedAt: new Date(),
					reviewNotes: data.notes || null,
					updatedAt: new Date(),
				})
				.where(eq(timeOffRequests.id, id))
				.returning();

			return c.json({ request: updated });
		}
	)

	// Reject time-off request (managers only)
	.post(
		'/:id/reject',
		requireManager,
		zValidator('json', reviewTimeOffSchema),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const id = c.req.param('id');
			const data = c.req.valid('json');

			// Find the request
			const [existing] = await db
				.select()
				.from(timeOffRequests)
				.where(
					and(
						eq(timeOffRequests.id, id),
						eq(timeOffRequests.tenantId, tenantId)
					)
				)
				.limit(1);

			if (!existing) {
				return c.json({ error: 'Time-off request not found' }, 404);
			}

			if (existing.status !== 'pending') {
				return c.json(
					{ error: 'Can only reject pending requests' },
					400
				);
			}

			const [updated] = await db
				.update(timeOffRequests)
				.set({
					status: 'rejected',
					reviewedById: currentUser.id,
					reviewedAt: new Date(),
					reviewNotes: data.notes || null,
					updatedAt: new Date(),
				})
				.where(eq(timeOffRequests.id, id))
				.returning();

			return c.json({ request: updated });
		}
	);

export { timeOffRoutes };
