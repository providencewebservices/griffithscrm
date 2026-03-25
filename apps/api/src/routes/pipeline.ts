import { customers, jobPaymentScheduleItems, jobs, quotes } from '@griffiths-crm/shared/db/schema';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../lib/auth';
import { requireAuth, requireTenant } from '../middleware/auth';
import { computeDepositStatus } from './jobs';

// Column configuration for quote pipeline
const QUOTE_COLUMNS = [
	{
		id: 'drafting',
		label: 'Drafting',
		statuses: ['draft'],
		color: 'bg-gray-400',
	},
	{
		id: 'ready',
		label: 'Ready',
		statuses: ['ready'],
		color: 'bg-cyan-400',
	},
	{
		id: 'presented',
		label: 'Presented',
		statuses: ['presented'],
		color: 'bg-purple-400',
	},
	{
		id: 'accepted',
		label: 'Accepted',
		statuses: ['accepted'],
		color: 'bg-green-500',
	},
] as const;

// Column configuration for job pipeline
const JOB_COLUMNS = [
	{
		id: 'pending',
		label: 'Pending',
		statuses: ['pending'],
		color: 'bg-gray-400',
	},
	{
		id: 'in_progress',
		label: 'In Progress',
		statuses: ['materials_ordered', 'in_production'],
		color: 'bg-blue-400',
	},
	{
		id: 'ready_to_install',
		label: 'Ready to Install',
		statuses: ['ready_for_install'],
		color: 'bg-cyan-400',
	},
	{
		id: 'installed',
		label: 'Installed',
		statuses: ['installed'],
		color: 'bg-purple-400',
	},
	{
		id: 'completed',
		label: 'Completed',
		statuses: ['completed'],
		color: 'bg-green-500',
	},
] as const;

const CARDS_PER_COLUMN = 5;

type QuoteColumn = (typeof QUOTE_COLUMNS)[number];
type JobColumn = (typeof JOB_COLUMNS)[number];

// Create pipeline routes
export const pipelineRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// Get pipeline data
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		// Process quote columns
		const quoteColumns = await Promise.all(
			QUOTE_COLUMNS.map(async (column) => {
				// Get count and total value for this column
				const [stats] = await db
					.select({
						count: sql<number>`count(*)::int`,
						totalValue: sql<string>`COALESCE(SUM(${quotes.total}::numeric), 0)::text`,
					})
					.from(quotes)
					.where(
						and(
							eq(quotes.tenantId, tenantId),
							inArray(quotes.status, column.statuses as unknown as string[]),
						),
					);

				// Get limited items for display
				const items = await db
					.select({
						id: quotes.packageId,
						quoteNumber: quotes.quoteNumber,
						status: quotes.status,
						total: quotes.total,
						customerId: quotes.customerId,
						updatedAt: quotes.updatedAt,
					})
					.from(quotes)
					.where(
						and(
							eq(quotes.tenantId, tenantId),
							inArray(quotes.status, column.statuses as unknown as string[]),
						),
					)
					.orderBy(desc(quotes.updatedAt))
					.limit(CARDS_PER_COLUMN);

				// Enrich with customer names
				const enrichedItems = await Promise.all(
					items.map(async (quote) => {
						let customerName = 'Walk-in';
						if (quote.customerId) {
							const [customer] = await db
								.select({
									firstName: customers.firstName,
									lastName: customers.lastName,
								})
								.from(customers)
								.where(eq(customers.id, quote.customerId))
								.limit(1);
							if (customer) {
								customerName = `${customer.firstName} ${customer.lastName}`;
							}
						}

						return {
							id: quote.id,
							quoteNumber: quote.quoteNumber,
							customerName,
							total: quote.total,
							status: quote.status,
							updatedAt: quote.updatedAt,
						};
					}),
				);

				return {
					id: column.id,
					label: column.label,
					statuses: column.statuses,
					color: column.color,
					count: stats?.count || 0,
					totalValue: stats?.totalValue || '0',
					items: enrichedItems,
				};
			}),
		);

		// Process job columns
		const jobColumns = await Promise.all(
			JOB_COLUMNS.map(async (column) => {
				// Get count for this column
				const [stats] = await db
					.select({
						count: sql<number>`count(*)::int`,
					})
					.from(jobs)
					.where(
						and(
							eq(jobs.tenantId, tenantId),
							inArray(jobs.status, column.statuses as unknown as string[]),
						),
					);

				// Get limited items for display
				const items = await db
					.select({
						id: jobs.id,
						jobNumber: jobs.jobNumber,
						status: jobs.status,
						quoteId: jobs.quoteId,
						accountStatus: jobs.accountStatus,
						updatedAt: jobs.updatedAt,
					})
					.from(jobs)
					.where(
						and(
							eq(jobs.tenantId, tenantId),
							inArray(jobs.status, column.statuses as unknown as string[]),
						),
					)
					.orderBy(desc(jobs.updatedAt))
					.limit(CARDS_PER_COLUMN);

				// Enrich with customer names, totals, and payment status
				const enrichedItems = await Promise.all(
					items.map(async (job) => {
						// Get quote info
						const [quote] = await db
							.select({
								total: quotes.total,
								customerId: quotes.customerId,
							})
							.from(quotes)
							.where(eq(quotes.id, job.quoteId))
							.limit(1);

						let customerName = 'Walk-in';
						if (quote?.customerId) {
							const [customer] = await db
								.select({
									firstName: customers.firstName,
									lastName: customers.lastName,
								})
								.from(customers)
								.where(eq(customers.id, quote.customerId))
								.limit(1);
							if (customer) {
								customerName = `${customer.firstName} ${customer.lastName}`;
							}
						}

						// Get payment status
						const paymentItems = await db
							.select({
								description: jobPaymentScheduleItems.description,
								amount: jobPaymentScheduleItems.amount,
								paidAmount: jobPaymentScheduleItems.paidAmount,
								sortOrder: jobPaymentScheduleItems.sortOrder,
							})
							.from(jobPaymentScheduleItems)
							.where(eq(jobPaymentScheduleItems.jobId, job.id));

						const totalAmount = paymentItems.reduce(
							(sum, item) => sum + parseFloat(item.amount),
							0,
						);
						const paidAmount = paymentItems.reduce(
							(sum, item) => sum + parseFloat(item.paidAmount),
							0,
						);

						let paymentStatus = 'No Payment Due';
						if (totalAmount > 0) {
							if (paidAmount >= totalAmount) {
								paymentStatus = 'Paid';
							} else if (paidAmount > 0) {
								paymentStatus = 'Partial Payment';
							} else {
								paymentStatus = 'Awaiting Deposit';
							}
						}

						const depositStatus = computeDepositStatus(paymentItems);

						return {
							id: job.id,
							jobNumber: job.jobNumber,
							customerName,
							total: quote?.total || '0',
							status: job.status,
							paymentStatus,
							depositStatus,
							accountStatus: job.accountStatus,
							updatedAt: job.updatedAt,
						};
					}),
				);

				// Calculate total value for job column (sum of quote totals)
				const _totalValue = enrichedItems.reduce((sum, item) => sum + parseFloat(item.total), 0);

				// For accurate total, we need to query all jobs in this column
				const [totalStats] = await db
					.select({
						totalValue: sql<string>`COALESCE(SUM(${quotes.total}::numeric), 0)::text`,
					})
					.from(jobs)
					.innerJoin(quotes, eq(jobs.quoteId, quotes.id))
					.where(
						and(
							eq(jobs.tenantId, tenantId),
							inArray(jobs.status, column.statuses as unknown as string[]),
						),
					);

				return {
					id: column.id,
					label: column.label,
					statuses: column.statuses,
					color: column.color,
					count: stats?.count || 0,
					totalValue: totalStats?.totalValue || '0',
					items: enrichedItems,
				};
			}),
		);

		return c.json({
			quotes: {
				columns: quoteColumns,
			},
			jobs: {
				columns: jobColumns,
			},
		});
	});
