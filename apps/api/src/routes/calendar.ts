import {
	calendarEvents,
	calendarSettings,
	customers,
	jobs,
	quotes,
	RECURRENCE_PATTERNS,
	timeOffRequests,
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, eq, gte, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { isManagerRole, requireAuth, requireTenant } from '../middleware/auth';

// Event types for aggregation
const EVENT_SOURCE_TYPES = [
	'quote_valid_until',
	'job_installation',
	'job_deadline',
	'custom',
	'time_off',
] as const;

// Validation schemas
const getEventsQuerySchema = z.object({
	start: z.string().datetime(),
	end: z.string().datetime(),
	types: z.string().optional(), // Comma-separated list of event types
});

const createEventSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	description: z.string().optional(),
	startAt: z.string().datetime(),
	endAt: z.string().datetime().optional(),
	isAllDay: z.boolean().optional().default(false),
	linkedQuoteId: z.string().optional(),
	linkedJobId: z.string().optional(),
	linkedCustomerId: z.string().optional(),
	recurrencePattern: z.enum(RECURRENCE_PATTERNS).optional().default('none'),
	recurrenceEndDate: z.string().datetime().optional(),
});

const updateEventSchema = z.object({
	title: z.string().min(1, 'Title is required').optional(),
	description: z.string().optional().nullable(),
	startAt: z.string().datetime().optional(),
	endAt: z.string().datetime().optional().nullable(),
	isAllDay: z.boolean().optional(),
	linkedQuoteId: z.string().optional().nullable(),
	linkedJobId: z.string().optional().nullable(),
	linkedCustomerId: z.string().optional().nullable(),
	recurrencePattern: z.enum(RECURRENCE_PATTERNS).optional(),
	recurrenceEndDate: z.string().datetime().optional().nullable(),
});

const rescheduleSchema = z.object({
	startAt: z.string().datetime(),
	endAt: z.string().datetime().optional(),
});

const updateSettingsSchema = z.object({
	quoteValidUntilColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.optional(),
	jobInstallationColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.optional(),
	jobDeadlineColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.optional(),
	customEventColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.optional(),
	timeOffApprovedColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.optional(),
	timeOffPendingColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.optional(),
});

// Helper to expand recurring events
function expandRecurringEvents(
	event: {
		id: string;
		startAt: Date;
		endAt: Date | null;
		recurrencePattern: string;
		recurrenceEndDate: Date | null;
		[key: string]: unknown;
	},
	rangeStart: Date,
	rangeEnd: Date,
) {
	if (event.recurrencePattern === 'none') {
		return [event];
	}

	const instances = [];
	const currentDate = new Date(event.startAt);
	const endDate = event.recurrenceEndDate ? new Date(event.recurrenceEndDate) : rangeEnd;

	const duration = event.endAt ? event.endAt.getTime() - event.startAt.getTime() : 0;

	while (currentDate <= endDate && currentDate <= rangeEnd) {
		if (currentDate >= rangeStart) {
			instances.push({
				...event,
				id: `${event.id}-${currentDate.toISOString()}`,
				recurrenceParentId: event.id,
				startAt: new Date(currentDate),
				endAt: event.endAt ? new Date(currentDate.getTime() + duration) : null,
			});
		}

		// Advance to next occurrence
		switch (event.recurrencePattern) {
			case 'daily':
				currentDate.setDate(currentDate.getDate() + 1);
				break;
			case 'weekly':
				currentDate.setDate(currentDate.getDate() + 7);
				break;
			case 'monthly':
				currentDate.setMonth(currentDate.getMonth() + 1);
				break;
			default:
				return instances;
		}
	}

	return instances;
}

// Normalized event type for API response
type CalendarEvent = {
	id: string;
	sourceType: (typeof EVENT_SOURCE_TYPES)[number];
	sourceId: string;
	title: string;
	description: string | null;
	start: string;
	end: string | null;
	allDay: boolean;
	editable: boolean;
	color?: string;
	linkedCustomerId?: string | null;
	linkedQuoteId?: string | null;
	linkedJobId?: string | null;
	recurrencePattern?: string;
	recurrenceParentId?: string;
	// For time-off
	userId?: string;
	userName?: string;
	status?: string;
};

// Create calendar routes
const calendarRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// Get aggregated events from all sources
	.get('/events', zValidator('query', getEventsQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { start, end, types } = c.req.valid('query');

		const startDate = new Date(start);
		const endDate = new Date(end);
		const requestedTypes = types
			? (types.split(',') as (typeof EVENT_SOURCE_TYPES)[number][])
			: [...EVENT_SOURCE_TYPES];

		const events: CalendarEvent[] = [];

		// Get tenant's calendar settings for colors
		const [settings] = await db
			.select()
			.from(calendarSettings)
			.where(eq(calendarSettings.tenantId, tenantId))
			.limit(1);

		const colors = settings || {
			quoteValidUntilColor: '#3B82F6',
			jobInstallationColor: '#10B981',
			jobDeadlineColor: '#F59E0B',
			customEventColor: '#8B5CF6',
			timeOffApprovedColor: '#6B7280',
			timeOffPendingColor: '#EF4444',
		};

		// 1. Quote valid-until dates
		if (requestedTypes.includes('quote_valid_until')) {
			const quoteResults = await db
				.select({
					id: quotes.id,
					quoteNumber: quotes.quoteNumber,
					validUntil: quotes.validUntil,
					status: quotes.status,
					customerId: quotes.customerId,
				})
				.from(quotes)
				.where(
					and(
						eq(quotes.tenantId, tenantId),
						isNotNull(quotes.validUntil),
						gte(quotes.validUntil, startDate),
						lte(quotes.validUntil, endDate),
						inArray(quotes.status, ['draft', 'ready', 'presented']),
					),
				);

			events.push(
				...quoteResults.map((q) => ({
					id: `quote-validuntil-${q.id}`,
					sourceType: 'quote_valid_until' as const,
					sourceId: q.id,
					title: `Quote ${q.quoteNumber} expires`,
					description: null,
					start: q.validUntil?.toISOString(),
					end: null,
					allDay: true,
					editable: true,
					color: colors.quoteValidUntilColor,
					linkedQuoteId: q.id,
					linkedCustomerId: q.customerId,
				})),
			);
		}

		// 2. Job installation dates
		if (requestedTypes.includes('job_installation')) {
			const jobInstallResults = await db
				.select({
					id: jobs.id,
					jobNumber: jobs.jobNumber,
					installationDate: jobs.installationDate,
					status: jobs.status,
					quoteId: jobs.quoteId,
				})
				.from(jobs)
				.where(
					and(
						eq(jobs.tenantId, tenantId),
						isNotNull(jobs.installationDate),
						gte(jobs.installationDate, startDate),
						lte(jobs.installationDate, endDate),
					),
				);

			events.push(
				...jobInstallResults.map((j) => ({
					id: `job-install-${j.id}`,
					sourceType: 'job_installation' as const,
					sourceId: j.id,
					title: `Installation: ${j.jobNumber}`,
					description: null,
					start: j.installationDate?.toISOString(),
					end: null,
					allDay: true,
					editable: true,
					color: colors.jobInstallationColor,
					linkedJobId: j.id,
					linkedQuoteId: j.quoteId,
				})),
			);
		}

		// 3. Job deadlines
		if (requestedTypes.includes('job_deadline')) {
			const jobDeadlineResults = await db
				.select({
					id: jobs.id,
					jobNumber: jobs.jobNumber,
					deadline: jobs.deadline,
					status: jobs.status,
					quoteId: jobs.quoteId,
				})
				.from(jobs)
				.where(
					and(
						eq(jobs.tenantId, tenantId),
						isNotNull(jobs.deadline),
						gte(jobs.deadline, startDate),
						lte(jobs.deadline, endDate),
					),
				);

			events.push(
				...jobDeadlineResults.map((j) => ({
					id: `job-deadline-${j.id}`,
					sourceType: 'job_deadline' as const,
					sourceId: j.id,
					title: `Deadline: ${j.jobNumber}`,
					description: null,
					start: j.deadline?.toISOString(),
					end: null,
					allDay: true,
					editable: true,
					color: colors.jobDeadlineColor,
					linkedJobId: j.id,
					linkedQuoteId: j.quoteId,
				})),
			);
		}

		// 4. Custom calendar events
		if (requestedTypes.includes('custom')) {
			const customResults = await db
				.select()
				.from(calendarEvents)
				.where(
					and(
						eq(calendarEvents.tenantId, tenantId),
						isNull(calendarEvents.archivedAt),
						or(
							// Non-recurring events in range
							and(
								eq(calendarEvents.recurrencePattern, 'none'),
								gte(calendarEvents.startAt, startDate),
								lte(calendarEvents.startAt, endDate),
							),
							// Recurring events that might have instances in range
							and(
								or(
									eq(calendarEvents.recurrencePattern, 'daily'),
									eq(calendarEvents.recurrencePattern, 'weekly'),
									eq(calendarEvents.recurrencePattern, 'monthly'),
								),
								lte(calendarEvents.startAt, endDate),
								or(
									isNull(calendarEvents.recurrenceEndDate),
									gte(calendarEvents.recurrenceEndDate, startDate),
								),
							),
						),
					),
				);

			for (const event of customResults) {
				const expanded = expandRecurringEvents(
					{
						...event,
						startAt: event.startAt,
						endAt: event.endAt,
						recurrencePattern: event.recurrencePattern,
						recurrenceEndDate: event.recurrenceEndDate,
					},
					startDate,
					endDate,
				);

				events.push(
					...expanded.map((e) => ({
						id: String(e.id),
						sourceType: 'custom' as const,
						sourceId: event.id,
						title: event.title,
						description: event.description,
						start: e.startAt.toISOString(),
						end: e.endAt?.toISOString() || null,
						allDay: event.isAllDay,
						editable: true,
						color: colors.customEventColor,
						linkedCustomerId: event.linkedCustomerId,
						linkedQuoteId: event.linkedQuoteId,
						linkedJobId: event.linkedJobId,
						recurrencePattern: event.recurrencePattern,
						recurrenceParentId:
							typeof e.recurrenceParentId === 'string' ? e.recurrenceParentId : undefined,
					})),
				);
			}
		}

		// 5. Time-off requests
		if (requestedTypes.includes('time_off')) {
			const isManager = isManagerRole(currentUser.role);

			// Build conditions for time-off visibility
			const timeOffConditions = [
				eq(timeOffRequests.tenantId, tenantId),
				gte(timeOffRequests.endDate, startDate),
				lte(timeOffRequests.startDate, endDate),
			];

			// Non-managers can only see approved requests + their own pending
			if (!isManager) {
				timeOffConditions.push(
					or(
						eq(timeOffRequests.status, 'approved'),
						and(eq(timeOffRequests.status, 'pending'), eq(timeOffRequests.userId, currentUser.id)),
					)!,
				);
			}

			const timeOffResults = await db
				.select()
				.from(timeOffRequests)
				.where(and(...timeOffConditions));

			// Get user names for time-off display
			const userIds = [...new Set(timeOffResults.map((t) => t.userId))];
			const _users =
				userIds.length > 0
					? await db
							.select({ id: customers.id, firstName: customers.firstName })
							.from(customers)
							.where(inArray(customers.id, userIds))
					: [];

			// For now, just use "Time Off" - we'd need to join with users table for names
			events.push(
				...timeOffResults.map((t) => ({
					id: `timeoff-${t.id}`,
					sourceType: 'time_off' as const,
					sourceId: t.id,
					title: `Time Off${t.reason ? `: ${t.reason}` : ''}`,
					description: t.reason,
					start: t.startDate.toISOString(),
					end: t.endDate.toISOString(),
					allDay: true,
					editable: t.status === 'pending' && t.userId === currentUser.id,
					color: t.status === 'approved' ? colors.timeOffApprovedColor : colors.timeOffPendingColor,
					userId: t.userId,
					status: t.status,
				})),
			);
		}

		return c.json({ events });
	})

	// Create custom event
	.post('/events', zValidator('json', createEventSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Validate linked entities if provided
		if (data.linkedQuoteId) {
			const [quote] = await db
				.select()
				.from(quotes)
				.where(and(eq(quotes.id, data.linkedQuoteId), eq(quotes.tenantId, tenantId)))
				.limit(1);
			if (!quote) {
				return c.json({ error: 'Quote not found' }, 404);
			}
		}

		if (data.linkedJobId) {
			const [job] = await db
				.select()
				.from(jobs)
				.where(and(eq(jobs.id, data.linkedJobId), eq(jobs.tenantId, tenantId)))
				.limit(1);
			if (!job) {
				return c.json({ error: 'Job not found' }, 404);
			}
		}

		if (data.linkedCustomerId) {
			const [customer] = await db
				.select()
				.from(customers)
				.where(and(eq(customers.id, data.linkedCustomerId), eq(customers.tenantId, tenantId)))
				.limit(1);
			if (!customer) {
				return c.json({ error: 'Customer not found' }, 404);
			}
		}

		const [created] = await db
			.insert(calendarEvents)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				createdById: currentUser.id,
				title: data.title,
				description: data.description || null,
				startAt: new Date(data.startAt),
				endAt: data.endAt ? new Date(data.endAt) : null,
				isAllDay: data.isAllDay ?? false,
				eventType: 'custom',
				linkedQuoteId: data.linkedQuoteId || null,
				linkedJobId: data.linkedJobId || null,
				linkedCustomerId: data.linkedCustomerId || null,
				recurrencePattern: data.recurrencePattern || 'none',
				recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
			})
			.returning();

		return c.json({ event: created }, 201);
	})

	// Update custom event
	.put('/events/:id', zValidator('json', updateEventSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		// Verify event belongs to tenant
		const [existing] = await db
			.select()
			.from(calendarEvents)
			.where(
				and(
					eq(calendarEvents.id, id),
					eq(calendarEvents.tenantId, tenantId),
					isNull(calendarEvents.archivedAt),
				),
			)
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Event not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.title !== undefined) updateData.title = data.title;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.startAt !== undefined) updateData.startAt = new Date(data.startAt);
		if (data.endAt !== undefined) updateData.endAt = data.endAt ? new Date(data.endAt) : null;
		if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay;
		if (data.linkedQuoteId !== undefined) updateData.linkedQuoteId = data.linkedQuoteId;
		if (data.linkedJobId !== undefined) updateData.linkedJobId = data.linkedJobId;
		if (data.linkedCustomerId !== undefined) updateData.linkedCustomerId = data.linkedCustomerId;
		if (data.recurrencePattern !== undefined) updateData.recurrencePattern = data.recurrencePattern;
		if (data.recurrenceEndDate !== undefined)
			updateData.recurrenceEndDate = data.recurrenceEndDate
				? new Date(data.recurrenceEndDate)
				: null;

		const [updated] = await db
			.update(calendarEvents)
			.set(updateData)
			.where(eq(calendarEvents.id, id))
			.returning();

		return c.json({ event: updated });
	})

	// Reschedule event (drag & drop) - syncs to source record
	.put('/events/:id/reschedule', zValidator('json', rescheduleSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const { startAt, endAt } = c.req.valid('json');

		const newStart = new Date(startAt);
		const newEnd = endAt ? new Date(endAt) : null;

		// Handle different event sources
		if (id.startsWith('quote-validuntil-')) {
			const quoteId = id.replace('quote-validuntil-', '');
			const [quote] = await db
				.select()
				.from(quotes)
				.where(and(eq(quotes.id, quoteId), eq(quotes.tenantId, tenantId)))
				.limit(1);

			if (!quote) {
				return c.json({ error: 'Quote not found' }, 404);
			}

			await db
				.update(quotes)
				.set({ validUntil: newStart, updatedAt: new Date() })
				.where(eq(quotes.id, quoteId));

			return c.json({ success: true, sourceType: 'quote', sourceId: quoteId });
		}

		if (id.startsWith('job-install-')) {
			const jobId = id.replace('job-install-', '');
			const [job] = await db
				.select()
				.from(jobs)
				.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
				.limit(1);

			if (!job) {
				return c.json({ error: 'Job not found' }, 404);
			}

			await db
				.update(jobs)
				.set({ installationDate: newStart, updatedAt: new Date() })
				.where(eq(jobs.id, jobId));

			return c.json({ success: true, sourceType: 'job', sourceId: jobId });
		}

		if (id.startsWith('job-deadline-')) {
			const jobId = id.replace('job-deadline-', '');
			const [job] = await db
				.select()
				.from(jobs)
				.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
				.limit(1);

			if (!job) {
				return c.json({ error: 'Job not found' }, 404);
			}

			await db
				.update(jobs)
				.set({ deadline: newStart, updatedAt: new Date() })
				.where(eq(jobs.id, jobId));

			return c.json({ success: true, sourceType: 'job', sourceId: jobId });
		}

		// Custom event - might have recurrence instance suffix
		const baseId =
			id.includes('-') && id.match(/^\w+-\d{4}-\d{2}-\d{2}/)
				? id
						.split('-')
						.slice(0, -3)
						.join('-') // Remove date suffix from recurring instance
				: id;

		const [event] = await db
			.select()
			.from(calendarEvents)
			.where(
				and(
					eq(calendarEvents.id, baseId),
					eq(calendarEvents.tenantId, tenantId),
					isNull(calendarEvents.archivedAt),
				),
			)
			.limit(1);

		if (!event) {
			return c.json({ error: 'Event not found' }, 404);
		}

		await db
			.update(calendarEvents)
			.set({ startAt: newStart, endAt: newEnd, updatedAt: new Date() })
			.where(eq(calendarEvents.id, baseId));

		return c.json({ success: true, sourceType: 'custom', sourceId: baseId });
	})

	// Delete custom event
	.delete('/events/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Verify event belongs to tenant
		const [existing] = await db
			.select()
			.from(calendarEvents)
			.where(
				and(
					eq(calendarEvents.id, id),
					eq(calendarEvents.tenantId, tenantId),
					isNull(calendarEvents.archivedAt),
				),
			)
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Event not found' }, 404);
		}

		// Soft delete
		await db
			.update(calendarEvents)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(eq(calendarEvents.id, id));

		return c.json({ success: true });
	})

	// Get calendar settings
	.get('/settings', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const [settings] = await db
			.select()
			.from(calendarSettings)
			.where(eq(calendarSettings.tenantId, tenantId))
			.limit(1);

		// Return defaults if no settings exist
		const result = settings || {
			quoteValidUntilColor: '#3B82F6',
			jobInstallationColor: '#10B981',
			jobDeadlineColor: '#F59E0B',
			customEventColor: '#8B5CF6',
			timeOffApprovedColor: '#6B7280',
			timeOffPendingColor: '#EF4444',
		};

		return c.json({ settings: result });
	})

	// Update calendar settings
	.put('/settings', zValidator('json', updateSettingsSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Check if settings exist
		const [existing] = await db
			.select()
			.from(calendarSettings)
			.where(eq(calendarSettings.tenantId, tenantId))
			.limit(1);

		if (existing) {
			// Update existing settings
			const updateData: Record<string, unknown> = { updatedAt: new Date() };
			if (data.quoteValidUntilColor !== undefined)
				updateData.quoteValidUntilColor = data.quoteValidUntilColor;
			if (data.jobInstallationColor !== undefined)
				updateData.jobInstallationColor = data.jobInstallationColor;
			if (data.jobDeadlineColor !== undefined) updateData.jobDeadlineColor = data.jobDeadlineColor;
			if (data.customEventColor !== undefined) updateData.customEventColor = data.customEventColor;
			if (data.timeOffApprovedColor !== undefined)
				updateData.timeOffApprovedColor = data.timeOffApprovedColor;
			if (data.timeOffPendingColor !== undefined)
				updateData.timeOffPendingColor = data.timeOffPendingColor;

			const [updated] = await db
				.update(calendarSettings)
				.set(updateData)
				.where(eq(calendarSettings.id, existing.id))
				.returning();

			return c.json({ settings: updated });
		} else {
			// Create new settings
			const [created] = await db
				.insert(calendarSettings)
				.values({
					id: crypto.randomUUID(),
					tenantId,
					quoteValidUntilColor: data.quoteValidUntilColor || '#3B82F6',
					jobInstallationColor: data.jobInstallationColor || '#10B981',
					jobDeadlineColor: data.jobDeadlineColor || '#F59E0B',
					customEventColor: data.customEventColor || '#8B5CF6',
					timeOffApprovedColor: data.timeOffApprovedColor || '#6B7280',
					timeOffPendingColor: data.timeOffPendingColor || '#EF4444',
				})
				.returning();

			return c.json({ settings: created }, 201);
		}
	});

export { calendarRoutes };
