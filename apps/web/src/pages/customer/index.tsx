import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	useDashboardQuery,
	formatTimeAgo,
	type QuoteStatus,
	type JobStatus,
} from '@/hooks/use-dashboard';
import {
	formatQuoteStatus,
	getQuoteStatusVariant,
} from '@/hooks/use-quotes';
import {
	formatJobStatus,
	getJobStatusVariant,
} from '@/hooks/use-jobs';
import {
	Plus,
	UserPlus,
	AlertTriangle,
	Clock,
	Wrench,
	FileText,
	Briefcase,
} from 'lucide-react';

// Status colors for pipeline bars
const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
	draft: 'bg-gray-400',
	review: 'bg-blue-400',
	ready: 'bg-cyan-400',
	presented: 'bg-purple-400',
	accepted: 'bg-green-500',
	rejected: 'bg-red-400',
	expired: 'bg-gray-300',
};

const JOB_STATUS_COLORS: Record<JobStatus, string> = {
	pending: 'bg-gray-400',
	materials_ordered: 'bg-blue-400',
	in_production: 'bg-yellow-400',
	ready_for_install: 'bg-cyan-400',
	installed: 'bg-purple-400',
	completed: 'bg-green-500',
};

// Format currency
function formatCurrency(value: string) {
	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'GBP',
	}).format(parseFloat(value));
}

export function CustomerDashboard() {
	const { data: stats, isLoading, error } = useDashboardQuery();

	if (isLoading) {
		return (
			<div className="space-y-6">
				<DashboardHeader />
				<div className="grid gap-4 md:grid-cols-3">
					{[1, 2, 3].map((i) => (
						<Card key={i} className="animate-pulse">
							<CardContent className="p-6">
								<div className="h-16 bg-muted rounded" />
							</CardContent>
						</Card>
					))}
				</div>
				<div className="grid gap-6 md:grid-cols-2">
					{[1, 2].map((i) => (
						<Card key={i} className="animate-pulse">
							<CardContent className="p-6">
								<div className="h-48 bg-muted rounded" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<DashboardHeader />
				<Card>
					<CardContent className="p-6">
						<p className="text-destructive">
							Error loading dashboard: {error.message}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!stats) {
		return null;
	}

	// Calculate max counts for pipeline bars
	const maxQuoteCount = Math.max(...Object.values(stats.quotes.byStatus), 1);
	const maxJobCount = Math.max(...Object.values(stats.jobs.byStatus), 1);

	// Check if there are any attention items
	const hasAttentionItems =
		stats.payments.overdueCount > 0 ||
		stats.quotes.awaitingDecision > 0 ||
		stats.jobs.stalled > 0;

	return (
		<div className="space-y-6">
			<DashboardHeader />

			{/* Needs Attention Section */}
			{hasAttentionItems && (
				<div className="grid gap-4 md:grid-cols-3">
					{stats.payments.overdueCount > 0 && (
						<Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
							<CardContent className="p-4">
								<div className="flex items-start gap-3">
									<div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900">
										<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="font-medium text-amber-900 dark:text-amber-100">
											{stats.payments.overdueCount} Overdue Payment
											{stats.payments.overdueCount !== 1 ? 's' : ''}
										</p>
										<p className="text-sm text-amber-700 dark:text-amber-300">
											{formatCurrency(stats.payments.overdueAmount)} outstanding
										</p>
									</div>
									<Link to="/app/jobs?filter=overdue">
										<Button variant="outline" size="sm" className="shrink-0">
											View
										</Button>
									</Link>
								</div>
							</CardContent>
						</Card>
					)}

					{stats.quotes.awaitingDecision > 0 && (
						<Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
							<CardContent className="p-4">
								<div className="flex items-start gap-3">
									<div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
										<Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="font-medium text-blue-900 dark:text-blue-100">
											{stats.quotes.awaitingDecision} Quote
											{stats.quotes.awaitingDecision !== 1 ? 's' : ''} Awaiting
											Decision
										</p>
										<p className="text-sm text-blue-700 dark:text-blue-300">
											Presented &gt; 7 days ago
										</p>
									</div>
									<Link to="/app/quotes?status=presented">
										<Button variant="outline" size="sm" className="shrink-0">
											View
										</Button>
									</Link>
								</div>
							</CardContent>
						</Card>
					)}

					{stats.jobs.stalled > 0 && (
						<Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
							<CardContent className="p-4">
								<div className="flex items-start gap-3">
									<div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900">
										<Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="font-medium text-orange-900 dark:text-orange-100">
											{stats.jobs.stalled} Stalled Job
											{stats.jobs.stalled !== 1 ? 's' : ''}
										</p>
										<p className="text-sm text-orange-700 dark:text-orange-300">
											No updates in 14+ days
										</p>
									</div>
									<Link to="/app/jobs?filter=stalled">
										<Button variant="outline" size="sm" className="shrink-0">
											View
										</Button>
									</Link>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			)}

			{/* All Caught Up Message */}
			{!hasAttentionItems && (
				<Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
					<CardContent className="p-4 text-center">
						<p className="text-green-700 dark:text-green-300">
							All caught up! No overdue payments, stale quotes, or stalled
							jobs.
						</p>
					</CardContent>
				</Card>
			)}

			{/* Pipeline Section */}
			<div className="grid gap-6 md:grid-cols-2">
				{/* Quote Pipeline */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg font-display font-bold flex items-center gap-2">
								<FileText className="h-5 w-5" />
								Quote Pipeline
							</CardTitle>
							<Link to="/app/quotes">
								<Button variant="ghost" size="sm">
									View All
								</Button>
							</Link>
						</div>
					</CardHeader>
					<CardContent className="space-y-2">
						{(Object.keys(QUOTE_STATUS_COLORS) as QuoteStatus[]).map(
							(status) => {
								const count = stats.quotes.byStatus[status] || 0;
								const percentage = (count / maxQuoteCount) * 100;
								return (
									<Link
										key={status}
										to={`/app/quotes?status=${status}`}
										className="block hover:bg-muted/50 rounded-md p-1 -mx-1 transition-colors"
									>
										<div className="flex items-center gap-3">
											<span className="w-24 text-sm text-muted-foreground">
												{formatQuoteStatus(status)}
											</span>
											<div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
												<div
													className={`h-full ${QUOTE_STATUS_COLORS[status]} transition-all`}
													style={{ width: `${percentage}%` }}
												/>
											</div>
											<span className="w-8 text-sm font-medium text-right">
												{count}
											</span>
										</div>
									</Link>
								);
							}
						)}
					</CardContent>
				</Card>

				{/* Job Pipeline */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg font-display font-bold flex items-center gap-2">
								<Briefcase className="h-5 w-5" />
								Job Pipeline
							</CardTitle>
							<Link to="/app/jobs">
								<Button variant="ghost" size="sm">
									View All
								</Button>
							</Link>
						</div>
					</CardHeader>
					<CardContent className="space-y-2">
						{(Object.keys(JOB_STATUS_COLORS) as JobStatus[]).map((status) => {
							const count = stats.jobs.byStatus[status] || 0;
							const percentage = (count / maxJobCount) * 100;
							return (
								<Link
									key={status}
									to={`/app/jobs?status=${status}`}
									className="block hover:bg-muted/50 rounded-md p-1 -mx-1 transition-colors"
								>
									<div className="flex items-center gap-3">
										<span className="w-28 text-sm text-muted-foreground">
											{formatJobStatus(status)}
										</span>
										<div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
											<div
												className={`h-full ${JOB_STATUS_COLORS[status]} transition-all`}
												style={{ width: `${percentage}%` }}
											/>
										</div>
										<span className="w-8 text-sm font-medium text-right">
											{count}
										</span>
									</div>
								</Link>
							);
						})}
					</CardContent>
				</Card>
			</div>

			{/* Recent Activity Section */}
			<div className="grid gap-6 md:grid-cols-2">
				{/* Recent Quotes */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg font-display font-bold">Recent Quotes</CardTitle>
							<Link to="/app/quotes">
								<Button variant="ghost" size="sm">
									View All
								</Button>
							</Link>
						</div>
					</CardHeader>
					<CardContent>
						{stats.recent.quotes.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">
								No quotes yet
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Quote</TableHead>
										<TableHead>Customer</TableHead>
										<TableHead>Total</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">Updated</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{stats.recent.quotes.map((quote) => (
										<TableRow key={quote.id}>
											<TableCell>
												<Link
													to={`/app/quotes/${quote.id}`}
													className="font-medium hover:underline"
												>
													{quote.quoteNumber}
												</Link>
											</TableCell>
											<TableCell className="truncate max-w-[120px] font-display">
												{quote.customerName}
											</TableCell>
											<TableCell>{formatCurrency(quote.total)}</TableCell>
											<TableCell>
												<Badge
													variant={getQuoteStatusVariant(
														quote.status as QuoteStatus
													)}
												>
													{formatQuoteStatus(quote.status as QuoteStatus)}
												</Badge>
											</TableCell>
											<TableCell className="text-right text-muted-foreground text-sm">
												{formatTimeAgo(quote.updatedAt)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>

				{/* Recent Jobs */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg font-display font-bold">Recent Jobs</CardTitle>
							<Link to="/app/jobs">
								<Button variant="ghost" size="sm">
									View All
								</Button>
							</Link>
						</div>
					</CardHeader>
					<CardContent>
						{stats.recent.jobs.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">
								No jobs yet
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Job</TableHead>
										<TableHead>Customer</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Payment</TableHead>
										<TableHead className="text-right">Updated</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{stats.recent.jobs.map((job) => {
										const paid = parseFloat(job.paidAmount);
										const total = parseFloat(job.totalPaymentAmount);
										const isPaid = total > 0 && paid >= total;
										const hasPayments = total > 0;

										return (
											<TableRow key={job.id}>
												<TableCell>
													<Link
														to={`/app/jobs/${job.id}`}
														className="font-medium hover:underline"
													>
														{job.jobNumber}
													</Link>
												</TableCell>
												<TableCell className="truncate max-w-[120px] font-display">
													{job.customerName}
												</TableCell>
												<TableCell>
													<Badge
														variant={getJobStatusVariant(
															job.status as JobStatus
														)}
													>
														{formatJobStatus(job.status as JobStatus)}
													</Badge>
												</TableCell>
												<TableCell>
													{!hasPayments ? (
														<span className="text-muted-foreground text-sm">
															—
														</span>
													) : isPaid ? (
														<Badge variant="default">Paid</Badge>
													) : (
														<span className="text-sm">
															{formatCurrency(job.paidAmount)} /{' '}
															{formatCurrency(job.totalPaymentAmount)}
														</span>
													)}
												</TableCell>
												<TableCell className="text-right text-muted-foreground text-sm">
													{formatTimeAgo(job.updatedAt)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

// Dashboard Header Component
function DashboardHeader() {
	return (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="text-2xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground">
					Overview of quotes, jobs, and payments
				</p>
			</div>
			<div className="flex gap-2">
				<Link to="/app/quotes/new">
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						New Quote
					</Button>
				</Link>
				<Link to="/app/customers/new">
					<Button variant="outline">
						<UserPlus className="h-4 w-4 mr-2" />
						New Customer
					</Button>
				</Link>
			</div>
		</div>
	);
}
