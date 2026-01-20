import { Hono } from 'hono';
import { eq, and, sql, desc, lt, gte, lte } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	quotes,
	jobs,
	customers,
	jobPaymentScheduleItems,
	QUOTE_STATUSES,
	JOB_STATUSES,
} from '@griffiths-crm/shared/db/schema';

// Create dashboard routes
export const dashboardRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// Get dashboard stats
	.get('/stats', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		// Calculate date thresholds
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const fourteenDaysAgo = new Date();
		fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

		const sevenDaysFromNow = new Date();
		sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

		const fourteenDaysFromNow = new Date();
		fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

		// Get quote counts by status
		const quoteCounts = await db
			.select({
				status: quotes.status,
				count: sql<number>`count(*)::int`,
			})
			.from(quotes)
			.where(eq(quotes.tenantId, tenantId))
			.groupBy(quotes.status);

		// Build quote status map with all statuses
		const quotesByStatus: Record<string, number> = {};
		for (const status of QUOTE_STATUSES) {
			quotesByStatus[status] = 0;
		}
		for (const row of quoteCounts) {
			quotesByStatus[row.status] = row.count;
		}

		// Get quotes awaiting decision (presented > 7 days ago, no customer decision)
		const [awaitingDecisionResult] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(quotes)
			.where(
				and(
					eq(quotes.tenantId, tenantId),
					eq(quotes.status, 'presented'),
					lt(quotes.updatedAt, sevenDaysAgo),
					sql`${quotes.customerDecision} IS NULL`
				)
			);
		const awaitingDecision = awaitingDecisionResult?.count || 0;

		// Get job counts by status
		const jobCounts = await db
			.select({
				status: jobs.status,
				count: sql<number>`count(*)::int`,
			})
			.from(jobs)
			.where(eq(jobs.tenantId, tenantId))
			.groupBy(jobs.status);

		// Build job status map with all statuses
		const jobsByStatus: Record<string, number> = {};
		for (const status of JOB_STATUSES) {
			jobsByStatus[status] = 0;
		}
		for (const row of jobCounts) {
			jobsByStatus[row.status] = row.count;
		}

		// Get stalled jobs (not updated in 14 days, not completed)
		const [stalledResult] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(jobs)
			.where(
				and(
					eq(jobs.tenantId, tenantId),
					lt(jobs.updatedAt, fourteenDaysAgo),
					sql`${jobs.status} != 'completed'`
				)
			);
		const stalledJobs = stalledResult?.count || 0;

		// Get overdue payment stats
		const now = new Date();
		const overduePayments = await db
			.select({
				count: sql<number>`count(DISTINCT ${jobPaymentScheduleItems.jobId})::int`,
				totalOutstanding: sql<string>`COALESCE(SUM(${jobPaymentScheduleItems.amount}::numeric - ${jobPaymentScheduleItems.paidAmount}::numeric), 0)::text`,
			})
			.from(jobPaymentScheduleItems)
			.where(
				and(
					eq(jobPaymentScheduleItems.tenantId, tenantId),
					sql`${jobPaymentScheduleItems.dueDate} IS NOT NULL`,
					lt(jobPaymentScheduleItems.dueDate, now),
					sql`${jobPaymentScheduleItems.paidAmount}::numeric < ${jobPaymentScheduleItems.amount}::numeric`
				)
			);

		const overdueCount = overduePayments[0]?.count || 0;
		const overdueAmount = overduePayments[0]?.totalOutstanding || '0';

		// Get upcoming installations (next 7 days, not yet installed/completed)
		const [upcomingInstallationsResult] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(jobs)
			.where(
				and(
					eq(jobs.tenantId, tenantId),
					sql`${jobs.installationDate} IS NOT NULL`,
					gte(jobs.installationDate, now),
					lte(jobs.installationDate, sevenDaysFromNow),
					sql`${jobs.status} NOT IN ('installed', 'completed')`
				)
			);
		const upcomingInstallations = upcomingInstallationsResult?.count || 0;

		// Get expiring quotes (validUntil in next 14 days, ready/presented, no decision)
		const [expiringQuotesResult] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(quotes)
			.where(
				and(
					eq(quotes.tenantId, tenantId),
					sql`${quotes.validUntil} IS NOT NULL`,
					gte(quotes.validUntil, now),
					lte(quotes.validUntil, fourteenDaysFromNow),
					sql`${quotes.status} IN ('ready', 'presented')`,
					sql`${quotes.customerDecision} IS NULL`
				)
			);
		const expiringQuotes = expiringQuotesResult?.count || 0;

		// Get recent quotes (last 5)
		const recentQuotesData = await db
			.select({
				id: quotes.id,
				quoteNumber: quotes.quoteNumber,
				status: quotes.status,
				total: quotes.total,
				customerId: quotes.customerId,
				createdAt: quotes.createdAt,
				updatedAt: quotes.updatedAt,
			})
			.from(quotes)
			.where(eq(quotes.tenantId, tenantId))
			.orderBy(desc(quotes.updatedAt))
			.limit(5);

		// Enrich recent quotes with customer and service names
		const recentQuotes = await Promise.all(
			recentQuotesData.map(async (quote) => {
				let customerName = 'Walk-in';
				if (quote.customerId) {
					const [customer] = await db
						.select({ firstName: customers.firstName, lastName: customers.lastName })
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
					status: quote.status,
					total: quote.total,
					customerName,
					updatedAt: quote.updatedAt,
				};
			})
		);

		// Get recent jobs (last 5) with payment summary
		const recentJobsData = await db
			.select({
				id: jobs.id,
				jobNumber: jobs.jobNumber,
				status: jobs.status,
				quoteId: jobs.quoteId,
				createdAt: jobs.createdAt,
				updatedAt: jobs.updatedAt,
			})
			.from(jobs)
			.where(eq(jobs.tenantId, tenantId))
			.orderBy(desc(jobs.updatedAt))
			.limit(5);

		// Enrich recent jobs with customer name, total, and payment status
		const recentJobs = await Promise.all(
			recentJobsData.map(async (job) => {
				// Get quote info for customer and total
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
						.select({ firstName: customers.firstName, lastName: customers.lastName })
						.from(customers)
						.where(eq(customers.id, quote.customerId))
						.limit(1);
					if (customer) {
						customerName = `${customer.firstName} ${customer.lastName}`;
					}
				}

				// Get payment summary
				const paymentItems = await db
					.select({
						amount: jobPaymentScheduleItems.amount,
						paidAmount: jobPaymentScheduleItems.paidAmount,
					})
					.from(jobPaymentScheduleItems)
					.where(eq(jobPaymentScheduleItems.jobId, job.id));

				const totalAmount = paymentItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);
				const paidAmount = paymentItems.reduce((sum, item) => sum + parseFloat(item.paidAmount), 0);

				return {
					id: job.id,
					jobNumber: job.jobNumber,
					status: job.status,
					total: quote?.total || '0',
					customerName,
					paidAmount: paidAmount.toFixed(2),
					totalPaymentAmount: totalAmount.toFixed(2),
					updatedAt: job.updatedAt,
				};
			})
		);

		return c.json({
			quotes: {
				byStatus: quotesByStatus,
				awaitingDecision,
				expiringSoon: expiringQuotes,
			},
			jobs: {
				byStatus: jobsByStatus,
				stalled: stalledJobs,
				upcomingInstallations,
			},
			payments: {
				overdueCount,
				overdueAmount,
			},
			recent: {
				quotes: recentQuotes,
				jobs: recentJobs,
			},
		});
	});
