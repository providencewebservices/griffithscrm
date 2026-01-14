import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	useJobsQuery,
	formatJobStatus,
	getJobStatusVariant,
	JOB_STATUSES,
	type JobStatus,
	type JobListItem,
} from '@/hooks/use-jobs';
import { Search, AlertCircle, List, LayoutGrid, User, Calendar, PoundSterling } from 'lucide-react';

type DisplayMode = 'table' | 'cards';

const ALL_STATUS_VALUE = '_all';

export function JobsPage() {
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');
	const [displayMode, setDisplayMode] = useState<DisplayMode>('table');

	// Debounce search
	const debouncedSearch = useMemo(() => {
		let timeout: ReturnType<typeof setTimeout>;
		return (value: string) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => setSearch(value), 300);
		};
	}, []);

	const { data: jobs, isLoading, error } = useJobsQuery({
		status: statusFilter || undefined,
		search: search || undefined,
	});

	const formatCurrency = (value: string | number) => {
		const numValue = typeof value === 'string' ? parseFloat(value) : value;
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
		}).format(numValue);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	const getPaymentStatus = (job: JobListItem) => {
		if (!job.paymentSummary) return null;
		const { paidAmount, totalAmount, hasOverdue } = job.paymentSummary;
		const paidNum = parseFloat(paidAmount);
		const totalNum = parseFloat(totalAmount);
		const isPaid = paidNum >= totalNum;
		return { paidAmount: paidNum, totalAmount: totalNum, isPaid, hasOverdue };
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
				<p className="text-muted-foreground">Manage jobs from accepted quotes</p>
			</div>

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by job number..."
						className="pl-9"
						onChange={(e) => debouncedSearch(e.target.value)}
					/>
				</div>
				<Select
					value={statusFilter || ALL_STATUS_VALUE}
					onValueChange={(v) => setStatusFilter(v === ALL_STATUS_VALUE ? '' : (v as JobStatus))}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="All statuses" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_STATUS_VALUE}>All statuses</SelectItem>
						{JOB_STATUSES.map((status) => (
							<SelectItem key={status} value={status}>
								{formatJobStatus(status)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<div className="flex items-center border rounded-md">
					<Button
						variant={displayMode === 'table' ? 'secondary' : 'ghost'}
						size="sm"
						className="rounded-r-none"
						onClick={() => setDisplayMode('table')}
					>
						<List className="h-4 w-4" />
					</Button>
					<Button
						variant={displayMode === 'cards' ? 'secondary' : 'ghost'}
						size="sm"
						className="rounded-l-none"
						onClick={() => setDisplayMode('cards')}
					>
						<LayoutGrid className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Error state */}
			{error && (
				<div className="text-destructive text-sm">{error.message}</div>
			)}

			{/* Loading state */}
			{isLoading && (
				<div className="text-muted-foreground">Loading jobs...</div>
			)}

			{/* Empty state */}
			{!isLoading && jobs?.length === 0 && (
				<div className="text-center py-12 text-muted-foreground border rounded-lg">
					{search || statusFilter ? (
						<p>No jobs found matching your filters.</p>
					) : (
						<>
							<p>No jobs yet.</p>
							<p className="text-sm mt-1">
								Jobs are automatically created when quotes are accepted.
							</p>
						</>
					)}
				</div>
			)}

			{/* Jobs list */}
			{!isLoading && jobs && jobs.length > 0 && (
				displayMode === 'table' ? (
					<div className="border rounded-lg">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Job #</TableHead>
									<TableHead>Customer</TableHead>
									<TableHead className="text-right">Total</TableHead>
									<TableHead>Payment</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Created</TableHead>
									<TableHead className="w-[100px]"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{jobs.map((job) => {
									const paymentStatus = getPaymentStatus(job);
									return (
										<TableRow key={job.id}>
											<TableCell className="font-medium">
												{job.jobNumber}
											</TableCell>
											<TableCell>
												{job.customerFirstName && job.customerLastName
													? `${job.customerFirstName} ${job.customerLastName}`
													: 'Walk-in'}
											</TableCell>
											<TableCell className="text-right">
												{formatCurrency(job.total)}
											</TableCell>
											<TableCell>
												{paymentStatus ? (
													<div className="flex items-center gap-1.5">
														{paymentStatus.isPaid ? (
															<Badge variant="default" className="bg-green-600">
																Paid
															</Badge>
														) : (
															<>
																<span className="text-sm">
																	{formatCurrency(paymentStatus.paidAmount)} of {formatCurrency(paymentStatus.totalAmount)}
																</span>
																{paymentStatus.hasOverdue && (
																	<Badge variant="destructive" className="h-5 text-xs px-1.5">
																		<AlertCircle className="h-3 w-3 mr-0.5" />
																		Late
																	</Badge>
																)}
															</>
														)}
													</div>
												) : (
													<span className="text-muted-foreground">-</span>
												)}
											</TableCell>
											<TableCell>
												<Badge variant={getJobStatusVariant(job.status)}>
													{formatJobStatus(job.status)}
												</Badge>
											</TableCell>
											<TableCell>{formatDate(job.createdAt)}</TableCell>
											<TableCell>
												<Link to={`/app/jobs/${job.id}`}>
													<Button variant="ghost" size="sm">
														View
													</Button>
												</Link>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{jobs.map((job) => (
							<JobCard
								key={job.id}
								job={job}
								formatCurrency={formatCurrency}
								formatDate={formatDate}
								getPaymentStatus={getPaymentStatus}
							/>
						))}
					</div>
				)
			)}
		</div>
	);
}

interface JobCardProps {
	job: JobListItem;
	formatCurrency: (value: string | number) => string;
	formatDate: (dateString: string) => string;
	getPaymentStatus: (job: JobListItem) => { paidAmount: number; totalAmount: number; isPaid: boolean; hasOverdue: boolean } | null;
}

function JobCard({ job, formatCurrency, formatDate, getPaymentStatus }: JobCardProps) {
	const customerName = job.customerFirstName && job.customerLastName
		? `${job.customerFirstName} ${job.customerLastName}`
		: 'Walk-in';
	const paymentStatus = getPaymentStatus(job);

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base font-semibold">{job.jobNumber}</CardTitle>
					<Badge variant={getJobStatusVariant(job.status)}>
						{formatJobStatus(job.status)}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
					<div className="flex items-center gap-2">
						<User className="h-3.5 w-3.5" />
						<span>{customerName}</span>
					</div>
					<div className="flex items-center gap-2">
						<PoundSterling className="h-3.5 w-3.5" />
						<span className="font-medium text-foreground">{formatCurrency(job.total)}</span>
					</div>
					<div className="flex items-center gap-2">
						<Calendar className="h-3.5 w-3.5" />
						<span>{formatDate(job.createdAt)}</span>
					</div>
				</div>

				{paymentStatus && (
					<div className="flex items-center gap-1.5">
						{paymentStatus.isPaid ? (
							<Badge variant="default" className="bg-green-600">
								Paid
							</Badge>
						) : (
							<>
								<span className="text-sm text-muted-foreground">
									{formatCurrency(paymentStatus.paidAmount)} of {formatCurrency(paymentStatus.totalAmount)}
								</span>
								{paymentStatus.hasOverdue && (
									<Badge variant="destructive" className="h-5 text-xs px-1.5">
										<AlertCircle className="h-3 w-3 mr-0.5" />
										Late
									</Badge>
								)}
							</>
						)}
					</div>
				)}

				<div className="pt-2">
					<Link to={`/app/jobs/${job.id}`}>
						<Button variant="outline" size="sm" className="w-full">
							View Details
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
