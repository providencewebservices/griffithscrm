import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, like, desc, asc, sql, or, count, exists } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { generatePresignedUploadUrl, isS3Configured } from '../lib/s3';
import {
	jobs,
	quotes,
	customers,
	products,
	quoteComponents,
	quoteLettering,
	quoteSundries,
	quoteLineItems,
	jobPaymentScheduleItems,
	jobAttachments,
	memorialWorksheets,
	memorialSites,
	quotePackages,
	JOB_STATUSES,
	JOB_ATTACHMENT_CATEGORIES,
	ACCOUNT_STATUSES,
	REVIEW_OUTCOMES,
} from '@griffiths-crm/shared/db/schema';

// Validation schemas
const searchQuerySchema = z.object({
	status: z.enum(JOB_STATUSES).optional(),
	search: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateStatusSchema = z.object({
	status: z.enum(JOB_STATUSES),
});

const updateNotesSchema = z.object({
	notes: z.string().optional(),
});

// Payment schedule validation schemas
const createPaymentScheduleItemSchema = z.object({
	description: z.string().min(1),
	amount: z.string().or(z.number()).transform((val) => String(val)),
	dueDate: z.string().datetime().nullable().optional(),
	notes: z.string().optional(),
});

const updatePaymentScheduleItemSchema = z.object({
	description: z.string().min(1).optional(),
	amount: z.string().or(z.number()).transform((val) => String(val)).optional(),
	dueDate: z.string().datetime().nullable().optional(),
	paidAmount: z.string().or(z.number()).transform((val) => String(val)).optional(),
	paidAt: z.string().datetime().nullable().optional(),
	paymentMethod: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
});

// Attachment validation schemas
const ALLOWED_ATTACHMENT_CONTENT_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'application/pdf',
] as const;

const presignAttachmentSchema = z.object({
	filename: z.string().min(1),
	contentType: z.enum(ALLOWED_ATTACHMENT_CONTENT_TYPES, {
		errorMap: () => ({
			message: `Content type must be one of: ${ALLOWED_ATTACHMENT_CONTENT_TYPES.join(', ')}`,
		}),
	}),
	category: z.enum(JOB_ATTACHMENT_CATEGORIES),
});

const confirmAttachmentSchema = z.object({
	s3Key: z.string().min(1),
	filename: z.string().min(1),
	contentType: z.string().min(1),
	category: z.enum(JOB_ATTACHMENT_CATEGORIES),
	size: z.number().optional(),
	notes: z.string().optional(),
});

// Type-aware status sequences
const STATUS_SEQUENCES: Record<string, string[]> = {
	new_memorial: ['pending', 'materials_ordered', 'in_production', 'ready_for_install', 'installed', 'completed'],
	additional_inscription: ['pending', 'in_production', 'ready_for_install', 'installed', 'completed'],
	refurbishment: ['pending', 'in_production', 'ready_for_install', 'installed', 'completed'],
	ashes: ['pending', 'ready_for_install', 'installed', 'completed'],
	sundry_only: ['pending', 'ready_for_install', 'completed'],
};

// Default full sequence for backward compatibility
const DEFAULT_SEQUENCE = STATUS_SEQUENCES['new_memorial'];

// Get allowed next statuses for a given current status and quote type
function getAllowedTransitions(currentStatus: string, quoteType?: string): string[] {
	const sequence = quoteType && STATUS_SEQUENCES[quoteType] ? STATUS_SEQUENCES[quoteType] : DEFAULT_SEQUENCE;
	const currentIndex = sequence.indexOf(currentStatus);
	if (currentIndex === -1 || currentIndex >= sequence.length - 1) return [];
	return [sequence[currentIndex + 1]];
}

// Helper function to get job with quote summary
async function getJobWithQuoteSummary(jobId: string, tenantId: string) {
	// Get job
	const [job] = await db
		.select()
		.from(jobs)
		.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
		.limit(1);

	if (!job) return null;

	// Get quote with customer, product, and service info
	const [quote] = await db
		.select()
		.from(quotes)
		.where(eq(quotes.id, job.quoteId))
		.limit(1);

	if (!quote) return null;

	// Get all quote details in parallel
	const [customer, product, components, lettering, sundries, lineItems] =
		await Promise.all([
			// Customer
			quote.customerId
				? db
						.select()
						.from(customers)
						.where(eq(customers.id, quote.customerId))
						.limit(1)
						.then((r) => r[0] || null)
				: Promise.resolve(null),
			// Product
			quote.productId
				? db
						.select()
						.from(products)
						.where(eq(products.id, quote.productId))
						.limit(1)
						.then((r) => r[0] || null)
				: Promise.resolve(null),
			// Components
			db.select().from(quoteComponents).where(eq(quoteComponents.quoteId, quote.id)),
			// Lettering
			db.select().from(quoteLettering).where(eq(quoteLettering.quoteId, quote.id)),
			// Sundries
			db.select().from(quoteSundries).where(eq(quoteSundries.quoteId, quote.id)),
			// Line Items
			db.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, quote.id)),
		]);

	return {
		...job,
		quote: {
			id: quote.id,
			quoteNumber: quote.quoteNumber,
			quoteType: quote.quoteType,
			existingMemorialDescription: quote.existingMemorialDescription,
			relatedJobId: quote.relatedJobId,
			total: quote.total,
			proposedInscription: quote.proposedInscription,
			flowerHoles: quote.flowerHoles,
			customer: customer
				? { id: customer.id, firstName: customer.firstName, lastName: customer.lastName }
				: null,
			product: product ? { id: product.id, name: product.name } : null,
			// Include full details for job execution (no pricing - that's on quote page)
			components: components.map((c) => ({
				id: c.id,
				componentType: c.componentType,
				materialName: c.materialName,
				finishName: c.finishName,
				height: c.height,
				width: c.width,
				depth: c.depth,
				quantity: c.quantity,
			})),
			lettering: lettering.map((l) => ({
				id: l.id,
				text: l.text,
				letterCount: l.letterCount,
				techniqueName: l.techniqueName,
				colorName: l.colorName,
			})),
			sundries: sundries.map((s) => ({
				id: s.id,
				sundryName: s.sundryName,
				quantity: s.quantity,
			})),
			lineItems: lineItems.map((li) => ({
				id: li.id,
				description: li.description,
				price: li.price,
				vatExempt: li.vatExempt,
			})),
		},
	};
}

// Helper function to generate job number
async function generateJobNumber(tenantId: string): Promise<string> {
	// Get the highest job number for this tenant
	const [lastJob] = await db
		.select({ jobNumber: jobs.jobNumber })
		.from(jobs)
		.where(eq(jobs.tenantId, tenantId))
		.orderBy(desc(jobs.createdAt))
		.limit(1);

	let nextNumber = 1;
	if (lastJob?.jobNumber) {
		const match = lastJob.jobNumber.match(/J-(\d+)/);
		if (match) {
			nextNumber = parseInt(match[1], 10) + 1;
		}
	}

	return `J-${String(nextNumber).padStart(5, '0')}`;
}

// Create jobs routes
export const jobsRouter = new Hono()
	// Apply auth and tenant middleware to all job routes
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List jobs with search and status filter
	.get('/', zValidator('query', searchQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { status, search, page, limit } = c.req.valid('query');

		// Build query conditions
		const conditions = [eq(jobs.tenantId, tenantId)];

		if (status) {
			conditions.push(eq(jobs.status, status));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			// Search by job number OR customer name (via quotes → customers)
			conditions.push(
				or(
					like(jobs.jobNumber, searchPattern),
					exists(
						db
							.select({ one: sql`1` })
							.from(quotes)
							.innerJoin(customers, eq(quotes.customerId, customers.id))
							.where(
								and(
									eq(quotes.id, jobs.quoteId),
									or(
										like(customers.firstName, searchPattern),
										like(customers.lastName, searchPattern),
										like(sql`${customers.firstName} || ' ' || ${customers.lastName}`, searchPattern)
									)
								)
							)
					)
				)!
			);
		}

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(jobs)
			.where(and(...conditions));

		const totalPages = Math.ceil(total / limit);

		// Get paginated jobs
		const jobsList = await db
			.select()
			.from(jobs)
			.where(and(...conditions))
			.orderBy(desc(jobs.createdAt))
			.limit(limit)
			.offset((page - 1) * limit);

		// Get quote summaries and payment status for each job
		const jobsWithSummaries = await Promise.all(
			jobsList.map(async (job) => {
				const [quote] = await db
					.select()
					.from(quotes)
					.where(eq(quotes.id, job.quoteId))
					.limit(1);

				if (!quote) {
					return {
						...job,
						customerFirstName: null,
						customerLastName: null,
						total: '0',
						paymentSummary: null,
					};
				}

				let customerFirstName = null;
				let customerLastName = null;
				if (quote.customerId) {
					const [customer] = await db
						.select({ firstName: customers.firstName, lastName: customers.lastName })
						.from(customers)
						.where(eq(customers.id, quote.customerId))
						.limit(1);
					if (customer) {
						customerFirstName = customer.firstName;
						customerLastName = customer.lastName;
					}
				}

				// Get payment schedule summary
				const paymentItems = await db
					.select()
					.from(jobPaymentScheduleItems)
					.where(eq(jobPaymentScheduleItems.jobId, job.id));

				let paymentSummary = null;
				if (paymentItems.length > 0) {
					const totalAmount = paymentItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);
					const paidAmount = paymentItems.reduce((sum, item) => sum + parseFloat(item.paidAmount), 0);
					const hasOverdue = paymentItems.some(
						(item) =>
							item.dueDate &&
							new Date(item.dueDate) < new Date() &&
							parseFloat(item.paidAmount) < parseFloat(item.amount)
					);
					paymentSummary = {
						totalAmount: totalAmount.toFixed(2),
						paidAmount: paidAmount.toFixed(2),
						outstandingAmount: (totalAmount - paidAmount).toFixed(2),
						hasOverdue,
					};
				}

				return {
					...job,
					customerFirstName,
					customerLastName,
					total: quote.total,
					paymentSummary,
				};
			})
		);

		return c.json({
			jobs: jobsWithSummaries,
			pagination: { page, limit, total, totalPages },
		});
	})

	// Get single job with quote summary
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const job = await getJobWithQuoteSummary(id, tenantId);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		return c.json({ job });
	})

	// Update job status
	.put('/:id/status', zValidator('json', updateStatusSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const { status: newStatus } = c.req.valid('json');

		// Get current job
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		// Look up quote type for type-aware transition validation
		const [jobQuote] = await db
			.select({ quoteType: quotes.quoteType })
			.from(quotes)
			.where(eq(quotes.id, job.quoteId))
			.limit(1);

		const quoteType = jobQuote?.quoteType;

		// Validate status transition using type-aware sequences
		const allowedTransitions = getAllowedTransitions(job.status, quoteType);
		if (!allowedTransitions.includes(newStatus)) {
			return c.json(
				{
					error: `Cannot transition from '${job.status}' to '${newStatus}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
				},
				400
			);
		}

		// Update job status
		const [updatedJob] = await db
			.update(jobs)
			.set({
				status: newStatus,
				updatedAt: new Date(),
			})
			.where(eq(jobs.id, id))
			.returning();

		const jobWithSummary = await getJobWithQuoteSummary(id, tenantId);
		return c.json({ job: jobWithSummary });
	})

	// Update job notes
	.put('/:id/notes', zValidator('json', updateNotesSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const { notes } = c.req.valid('json');

		// Get current job
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		// Update job notes
		await db
			.update(jobs)
			.set({
				notes: notes || null,
				updatedAt: new Date(),
			})
			.where(eq(jobs.id, id));

		const jobWithSummary = await getJobWithQuoteSummary(id, tenantId);
		return c.json({ job: jobWithSummary });
	})

	// Update job dates
	.put(
		'/:id/dates',
		zValidator(
			'json',
			z.object({
				proposedDeliveryDate: z.string().datetime().nullable().optional(),
				refixingDate: z.string().datetime().nullable().optional(),
				jobStartDate: z.string().datetime().nullable().optional(),
				ashesDate: z.string().datetime().nullable().optional(),
				installationDate: z.string().datetime().nullable().optional(),
			})
		),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const id = c.req.param('id');
			const data = c.req.valid('json');

			// Verify job exists and belongs to tenant
			const [job] = await db
				.select()
				.from(jobs)
				.where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)))
				.limit(1);

			if (!job) {
				return c.json({ error: 'Job not found' }, 404);
			}

			const updateData: Record<string, unknown> = { updatedAt: new Date() };

			if (data.proposedDeliveryDate !== undefined)
				updateData.proposedDeliveryDate = data.proposedDeliveryDate
					? new Date(data.proposedDeliveryDate)
					: null;
			if (data.refixingDate !== undefined)
				updateData.refixingDate = data.refixingDate ? new Date(data.refixingDate) : null;
			if (data.jobStartDate !== undefined)
				updateData.jobStartDate = data.jobStartDate ? new Date(data.jobStartDate) : null;
			if (data.ashesDate !== undefined)
				updateData.ashesDate = data.ashesDate ? new Date(data.ashesDate) : null;
			if (data.installationDate !== undefined)
				updateData.installationDate = data.installationDate
					? new Date(data.installationDate)
					: null;

			await db.update(jobs).set(updateData).where(eq(jobs.id, id));

			const jobWithSummary = await getJobWithQuoteSummary(id, tenantId);
			return c.json({ job: jobWithSummary });
		}
	)

	// ============================================
	// INVOICING ROUTES
	// ============================================

	// Mark job as invoiced
	.put(
		'/:id/invoice',
		zValidator(
			'json',
			z.object({
				invoiceNumber: z.string().optional(),
			})
		),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const id = c.req.param('id');
			const { invoiceNumber } = c.req.valid('json');

			const [job] = await db
				.select()
				.from(jobs)
				.where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)))
				.limit(1);

			if (!job) {
				return c.json({ error: 'Job not found' }, 404);
			}

			await db
				.update(jobs)
				.set({
					invoicedAt: new Date(),
					invoiceNumber: invoiceNumber || null,
					accountStatus: 'invoiced',
					updatedAt: new Date(),
				})
				.where(eq(jobs.id, id));

			const jobWithSummary = await getJobWithQuoteSummary(id, tenantId);
			return c.json({ job: jobWithSummary });
		}
	)

	// Manual override of account status
	.put(
		'/:id/account-status',
		zValidator(
			'json',
			z.object({
				accountStatus: z.enum(ACCOUNT_STATUSES),
			})
		),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const id = c.req.param('id');
			const { accountStatus } = c.req.valid('json');

			const [job] = await db
				.select()
				.from(jobs)
				.where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)))
				.limit(1);

			if (!job) {
				return c.json({ error: 'Job not found' }, 404);
			}

			await db
				.update(jobs)
				.set({
					accountStatus,
					updatedAt: new Date(),
				})
				.where(eq(jobs.id, id));

			const jobWithSummary = await getJobWithQuoteSummary(id, tenantId);
			return c.json({ job: jobWithSummary });
		}
	)

	// Recalculate account status from payment schedule
	.post('/:id/recalculate-account-status', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		// Derive status from payment schedule
		const paymentItems = await db
			.select()
			.from(jobPaymentScheduleItems)
			.where(eq(jobPaymentScheduleItems.jobId, id));

		let accountStatus: string;

		if (!job.invoicedAt) {
			accountStatus = 'not_invoiced';
		} else {
			const totalDue = paymentItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);
			const totalPaid = paymentItems.reduce((sum, item) => sum + parseFloat(item.paidAmount), 0);

			if (totalPaid >= totalDue && totalDue > 0) {
				accountStatus = 'paid';
			} else if (
				paymentItems.some(
					(item) =>
						item.dueDate &&
						new Date(item.dueDate) < new Date() &&
						parseFloat(item.paidAmount) < parseFloat(item.amount)
				)
			) {
				accountStatus = 'overdue';
			} else if (totalPaid > 0) {
				accountStatus = 'partially_paid';
			} else {
				accountStatus = 'invoiced';
			}
		}

		await db
			.update(jobs)
			.set({
				accountStatus,
				updatedAt: new Date(),
			})
			.where(eq(jobs.id, id));

		const jobWithSummary = await getJobWithQuoteSummary(id, tenantId);
		return c.json({ job: jobWithSummary });
	})

	// ============================================
	// POST-SALES REVIEW ROUTES
	// ============================================

	// Submit post-sales review
	.put(
		'/:id/review',
		zValidator(
			'json',
			z.object({
				reviewOutcome: z.enum(REVIEW_OUTCOMES),
				reviewNotes: z.string().optional(),
			})
		),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const id = c.req.param('id');
			const { reviewOutcome, reviewNotes } = c.req.valid('json');

			const [job] = await db
				.select()
				.from(jobs)
				.where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)))
				.limit(1);

			if (!job) {
				return c.json({ error: 'Job not found' }, 404);
			}

			await db
				.update(jobs)
				.set({
					reviewOutcome,
					reviewNotes: reviewNotes || null,
					reviewCompletedAt: new Date(),
					reviewCompletedBy: currentUser.id,
					updatedAt: new Date(),
				})
				.where(eq(jobs.id, id));

			const jobWithSummary = await getJobWithQuoteSummary(id, tenantId);
			return c.json({ job: jobWithSummary });
		}
	)

	// Delete job (only if pending)
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Get current job
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		if (job.status !== 'pending') {
			return c.json({ error: 'Can only delete jobs in pending status' }, 400);
		}

		await db.delete(jobs).where(eq(jobs.id, id));

		return c.json({ success: true });
	})

	// ============================================
	// PAYMENT SCHEDULE ROUTES
	// ============================================

	// Get payment schedule for a job
	.get('/:id/payment-schedule', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const jobId = c.req.param('id');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		// Get payment schedule items
		const items = await db
			.select()
			.from(jobPaymentScheduleItems)
			.where(eq(jobPaymentScheduleItems.jobId, jobId))
			.orderBy(asc(jobPaymentScheduleItems.sortOrder), asc(jobPaymentScheduleItems.createdAt));

		// Calculate totals
		const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
		const paidAmount = items.reduce((sum, item) => sum + parseFloat(item.paidAmount), 0);
		const hasOverdue = items.some(
			(item) =>
				item.dueDate &&
				new Date(item.dueDate) < new Date() &&
				parseFloat(item.paidAmount) < parseFloat(item.amount)
		);

		return c.json({
			paymentSchedule: items,
			summary: {
				totalAmount: totalAmount.toFixed(2),
				paidAmount: paidAmount.toFixed(2),
				outstandingAmount: (totalAmount - paidAmount).toFixed(2),
				hasOverdue,
			},
		});
	})

	// Add new payment schedule item
	.post('/:id/payment-schedule', zValidator('json', createPaymentScheduleItemSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const jobId = c.req.param('id');
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
			.select({ maxOrder: sql<number>`COALESCE(MAX(${jobPaymentScheduleItems.sortOrder}), -1)` })
			.from(jobPaymentScheduleItems)
			.where(eq(jobPaymentScheduleItems.jobId, jobId));

		const newItem = {
			id: crypto.randomUUID(),
			tenantId,
			jobId,
			description: data.description,
			amount: data.amount,
			dueDate: data.dueDate ? new Date(data.dueDate) : null,
			paidAmount: '0',
			sortOrder: (maxSort?.maxOrder ?? -1) + 1,
			notes: data.notes || null,
		};

		const [created] = await db.insert(jobPaymentScheduleItems).values(newItem).returning();

		return c.json({ paymentScheduleItem: created }, 201);
	})

	// Update payment schedule item
	.put(
		'/:id/payment-schedule/:itemId',
		zValidator('json', updatePaymentScheduleItemSchema),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const jobId = c.req.param('id');
			const itemId = c.req.param('itemId');
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

			// Verify item exists and belongs to job
			const [existingItem] = await db
				.select()
				.from(jobPaymentScheduleItems)
				.where(
					and(
						eq(jobPaymentScheduleItems.id, itemId),
						eq(jobPaymentScheduleItems.jobId, jobId)
					)
				)
				.limit(1);

			if (!existingItem) {
				return c.json({ error: 'Payment schedule item not found' }, 404);
			}

			// Build update object
			const updateData: Record<string, unknown> = { updatedAt: new Date() };

			if (data.description !== undefined) updateData.description = data.description;
			if (data.amount !== undefined) updateData.amount = data.amount;
			if (data.dueDate !== undefined)
				updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
			if (data.paidAmount !== undefined) updateData.paidAmount = data.paidAmount;
			if (data.paidAt !== undefined)
				updateData.paidAt = data.paidAt ? new Date(data.paidAt) : null;
			if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
			if (data.notes !== undefined) updateData.notes = data.notes;

			const [updated] = await db
				.update(jobPaymentScheduleItems)
				.set(updateData)
				.where(eq(jobPaymentScheduleItems.id, itemId))
				.returning();

			return c.json({ paymentScheduleItem: updated });
		}
	)

	// Delete payment schedule item
	.delete('/:id/payment-schedule/:itemId', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const jobId = c.req.param('id');
		const itemId = c.req.param('itemId');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		// Verify item exists and belongs to job
		const [existingItem] = await db
			.select()
			.from(jobPaymentScheduleItems)
			.where(
				and(eq(jobPaymentScheduleItems.id, itemId), eq(jobPaymentScheduleItems.jobId, jobId))
			)
			.limit(1);

		if (!existingItem) {
			return c.json({ error: 'Payment schedule item not found' }, 404);
		}

		await db.delete(jobPaymentScheduleItems).where(eq(jobPaymentScheduleItems.id, itemId));

		return c.json({ success: true });
	})

	// ============================================
	// MEMORIAL WORKSHEET ROUTES
	// ============================================

	// Get worksheet for a job
	.get('/:id/worksheet', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const jobId = c.req.param('id');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		const [worksheet] = await db
			.select()
			.from(memorialWorksheets)
			.where(eq(memorialWorksheets.jobId, jobId))
			.limit(1);

		if (!worksheet) {
			return c.json({ error: 'Worksheet not found' }, 404);
		}

		return c.json({ worksheet: { ...worksheet, jobNumber: job.jobNumber } });
	})

	// Create worksheet for a job (auto-populate from quote/package data)
	.post('/:id/worksheet', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const jobId = c.req.param('id');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		// Check if worksheet already exists
		const [existing] = await db
			.select()
			.from(memorialWorksheets)
			.where(eq(memorialWorksheets.jobId, jobId))
			.limit(1);

		if (existing) {
			return c.json({ error: 'Worksheet already exists for this job' }, 409);
		}

		// Get quote for auto-population
		const [quote] = await db
			.select()
			.from(quotes)
			.where(eq(quotes.id, job.quoteId))
			.limit(1);

		let deceasedName = '';
		let cemeteryChurchyard = '';
		let location = '';
		let existingDescription = '';
		let inscription = '';

		if (quote) {
			deceasedName = quote.deceasedNames || '';
			existingDescription = quote.existingMemorialDescription || '';
			inscription = quote.proposedInscription || '';

			// Try to get memorial site name
			const siteId = quote.memorialSiteId;
			if (siteId) {
				const [site] = await db
					.select({ name: memorialSites.name })
					.from(memorialSites)
					.where(eq(memorialSites.id, siteId))
					.limit(1);
				if (site) {
					cemeteryChurchyard = site.name;
				}
			}

			// Try to get location and other fields from package if available
			if (quote.packageId) {
				const [pkg] = await db
					.select()
					.from(quotePackages)
					.where(eq(quotePackages.id, quote.packageId))
					.limit(1);

				if (pkg) {
					location = pkg.memorialLocation || '';
					if (!existingDescription && pkg.existingMemorialDescription) {
						existingDescription = pkg.existingMemorialDescription;
					}
					if (!inscription && pkg.proposedInscription) {
						inscription = pkg.proposedInscription;
					}
					// If no site from quote, try package
					if (!cemeteryChurchyard && pkg.memorialSiteId) {
						const [site] = await db
							.select({ name: memorialSites.name })
							.from(memorialSites)
							.where(eq(memorialSites.id, pkg.memorialSiteId))
							.limit(1);
						if (site) {
							cemeteryChurchyard = site.name;
						}
					}
				}
			}
		}

		const newWorksheet = {
			id: crypto.randomUUID(),
			tenantId,
			jobId,
			date: new Date(),
			deceasedName,
			cemeteryChurchyard,
			location,
			existingDescription,
			requirements: '',
			inscription,
		};

		const [created] = await db.insert(memorialWorksheets).values(newWorksheet).returning();

		return c.json({ worksheet: { ...created, jobNumber: job.jobNumber } }, 201);
	})

	// Update worksheet
	.put(
		'/:id/worksheet',
		zValidator(
			'json',
			z.object({
				date: z.string().optional(),
				deceasedName: z.string().optional(),
				cemeteryChurchyard: z.string().optional(),
				location: z.string().optional(),
				existingDescription: z.string().optional(),
				requirements: z.string().optional(),
				inscription: z.string().optional(),
			})
		),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const jobId = c.req.param('id');
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
				.from(memorialWorksheets)
				.where(eq(memorialWorksheets.jobId, jobId))
				.limit(1);

			if (!existing) {
				return c.json({ error: 'Worksheet not found' }, 404);
			}

			const updateData: Record<string, unknown> = { updatedAt: new Date() };

			if (data.date !== undefined) updateData.date = new Date(data.date);
			if (data.deceasedName !== undefined) updateData.deceasedName = data.deceasedName;
			if (data.cemeteryChurchyard !== undefined)
				updateData.cemeteryChurchyard = data.cemeteryChurchyard;
			if (data.location !== undefined) updateData.location = data.location;
			if (data.existingDescription !== undefined)
				updateData.existingDescription = data.existingDescription;
			if (data.requirements !== undefined) updateData.requirements = data.requirements;
			if (data.inscription !== undefined) updateData.inscription = data.inscription;

			const [updated] = await db
				.update(memorialWorksheets)
				.set(updateData)
				.where(eq(memorialWorksheets.id, existing.id))
				.returning();

			return c.json({ worksheet: { ...updated, jobNumber: job.jobNumber } });
		}
	)

	// ============================================
	// ATTACHMENT ROUTES
	// ============================================

	// Get presigned URL for attachment upload
	.post('/:id/attachments/presign', zValidator('json', presignAttachmentSchema), async (c) => {
		// Check if S3 is configured
		if (!isS3Configured()) {
			return c.json(
				{ error: 'File storage is not configured.' },
				503
			);
		}

		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const jobId = c.req.param('id');
		const { filename, contentType, category } = c.req.valid('json');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		try {
			// Include attachment ID in path for uniqueness
			const attachmentId = crypto.randomUUID();
			const { uploadUrl, publicUrl, key } = await generatePresignedUploadUrl({
				tenantId,
				category: 'jobs',
				entityId: `${jobId}/${category}/${attachmentId}`,
				filename,
				contentType,
			});

			return c.json({
				uploadUrl,
				publicUrl,
				key,
				attachmentId,
			});
		} catch (error) {
			console.error('Error generating presigned URL:', error);
			return c.json({ error: 'Failed to generate upload URL' }, 500);
		}
	})

	// Confirm attachment upload and save metadata
	.post('/:id/attachments', zValidator('json', confirmAttachmentSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const jobId = c.req.param('id');
		const { s3Key, filename, contentType, category, size, notes } = c.req.valid('json');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		// Verify s3Key belongs to this tenant and job
		if (!s3Key.startsWith(`${tenantId}/jobs/${jobId}/`)) {
			return c.json({ error: 'Invalid S3 key' }, 400);
		}

		// Create attachment record
		const attachment = {
			id: crypto.randomUUID(),
			tenantId,
			jobId,
			category,
			filename,
			s3Key,
			contentType,
			size: size || null,
			notes: notes || null,
			uploadedBy: currentUser.id,
		};

		const [created] = await db.insert(jobAttachments).values(attachment).returning();

		return c.json({ attachment: created }, 201);
	})

	// List attachments for a job
	.get('/:id/attachments', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const jobId = c.req.param('id');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		// Get attachments
		const attachments = await db
			.select()
			.from(jobAttachments)
			.where(eq(jobAttachments.jobId, jobId))
			.orderBy(desc(jobAttachments.createdAt));

		// Generate public URLs for each attachment
		const s3Endpoint = process.env.S3_ENDPOINT || '';
		const s3Bucket = process.env.S3_BUCKET || '';
		const s3Region = process.env.S3_REGION || 'us-east-1';

		const attachmentsWithUrls = attachments.map((attachment) => {
			let publicUrl: string;
			if (s3Endpoint) {
				// LocalStack: path-style URL
				publicUrl = `${s3Endpoint}/${s3Bucket}/${attachment.s3Key}`;
			} else {
				// AWS: virtual-hosted style URL
				publicUrl = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${attachment.s3Key}`;
			}
			return { ...attachment, publicUrl };
		});

		return c.json({ attachments: attachmentsWithUrls });
	})

	// Delete attachment
	.delete('/:id/attachments/:attachmentId', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const jobId = c.req.param('id');
		const attachmentId = c.req.param('attachmentId');

		// Verify job exists and belongs to tenant
		const [job] = await db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, jobId), eq(jobs.tenantId, tenantId)))
			.limit(1);

		if (!job) {
			return c.json({ error: 'Job not found' }, 404);
		}

		// Verify attachment exists and belongs to job
		const [existingAttachment] = await db
			.select()
			.from(jobAttachments)
			.where(
				and(
					eq(jobAttachments.id, attachmentId),
					eq(jobAttachments.jobId, jobId)
				)
			)
			.limit(1);

		if (!existingAttachment) {
			return c.json({ error: 'Attachment not found' }, 404);
		}

		// Delete from database (S3 file orphaned - acceptable for MVP)
		await db.delete(jobAttachments).where(eq(jobAttachments.id, attachmentId));

		return c.json({ success: true });
	});

// Export the helper function for use in quotes router
export { generateJobNumber };
