import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, like, desc } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	jobs,
	quotes,
	customers,
	products,
	services,
	JOB_STATUSES,
} from '@griffiths-crm/shared/db/schema';

// Validation schemas
const searchQuerySchema = z.object({
	status: z.enum(JOB_STATUSES).optional(),
	search: z.string().optional(),
});

const updateStatusSchema = z.object({
	status: z.enum(JOB_STATUSES),
});

const updateNotesSchema = z.object({
	notes: z.string().optional(),
});

// Status transition rules
const STATUS_TRANSITIONS: Record<string, string[]> = {
	pending: ['materials_ordered'],
	materials_ordered: ['in_production'],
	in_production: ['ready_for_install'],
	ready_for_install: ['installed'],
	installed: ['completed'],
	completed: [], // Terminal state
};

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

	// Get customer if exists
	let customer = null;
	if (quote.customerId) {
		[customer] = await db
			.select()
			.from(customers)
			.where(eq(customers.id, quote.customerId))
			.limit(1);
	}

	// Get product if exists
	let product = null;
	if (quote.productId) {
		[product] = await db
			.select()
			.from(products)
			.where(eq(products.id, quote.productId))
			.limit(1);
	}

	// Get service if exists
	let service = null;
	if (quote.serviceId) {
		[service] = await db
			.select()
			.from(services)
			.where(eq(services.id, quote.serviceId))
			.limit(1);
	}

	return {
		...job,
		quote: {
			id: quote.id,
			quoteNumber: quote.quoteNumber,
			total: quote.total,
			customer: customer
				? { id: customer.id, firstName: customer.firstName, lastName: customer.lastName }
				: null,
			product: product ? { id: product.id, name: product.name } : null,
			service: service ? { id: service.id, name: service.name } : null,
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
		const { status, search } = c.req.valid('query');

		// Build query conditions
		const conditions = [eq(jobs.tenantId, tenantId)];

		if (status) {
			conditions.push(eq(jobs.status, status));
		}

		if (search) {
			conditions.push(like(jobs.jobNumber, `%${search}%`));
		}

		// Get jobs
		const jobsList = await db
			.select()
			.from(jobs)
			.where(and(...conditions))
			.orderBy(desc(jobs.createdAt));

		// Get quote summaries for each job
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
						serviceName: null,
						total: '0',
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

				let serviceName = null;
				if (quote.serviceId) {
					const [service] = await db
						.select({ name: services.name })
						.from(services)
						.where(eq(services.id, quote.serviceId))
						.limit(1);
					if (service) {
						serviceName = service.name;
					}
				}

				return {
					...job,
					customerFirstName,
					customerLastName,
					serviceName,
					total: quote.total,
				};
			})
		);

		return c.json({ jobs: jobsWithSummaries });
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

		// Validate status transition
		const allowedTransitions = STATUS_TRANSITIONS[job.status] || [];
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
	});

// Export the helper function for use in quotes router
export { generateJobNumber };
