import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
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
	getJobStatusClassName,
	formatAccountStatus,
	getAccountStatusColor,
	JOB_STATUSES,
	type JobStatus,
	type JobListItem,
} from '@/hooks/use-jobs';
import { Search, AlertCircle, List, LayoutGrid, User, Calendar, PoundSterling, ChevronLeft, ChevronRight } from 'lucide-react';

type DisplayMode = 'table' | 'cards';

const ALL_STATUS_VALUE = '_all';

function PaymentStatusDisplay({
	job,
	formatCurrency,
}: {
	job: JobListItem;
	formatCurrency: (value: string | number) => string;
}) {
	if (!job.paymentSummary) return <span className="text-muted-foreground">-</span>;
	const { paidAmount, totalAmount, hasOverdue } = job.paymentSummary;
	const paidNum = parseFloat(paidAmount);
	const totalNum = parseFloat(totalAmount);
	const isPaid = paidNum >= totalNum;

	return (
		<div className="flex items-center gap-1.5">
			{isPaid ? (
				<Badge variant="default" className="bg-green-600">
					Paid
				</Badge>
			) : (
				<>
					<span className="text-sm text-muted-foreground">
						{formatCurrency(paidNum)} of {formatCurrency(totalNum)}
					</span>
					{hasOverdue && (
						<Badge variant="destructive" className="h-5 text-xs px-1.5">
							<AlertCircle className="h-3 w-3 mr-0.5" />
							Late
						</Badge>
					)}
				</>
			)}
		</div>
	);
}

export function JobsPage() {
	const [searchParams] = useSearchParams();
	const initialStatus = searchParams.get('status') as JobStatus | null;

	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<JobStatus | ''>(
		initialStatus && JOB_STATUSES.includes(initialStatus) ? initialStatus : ''
	);
	const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);

	// Debounce search
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const searchTimeout = useMemo(() => {
		let timeout: ReturnType<typeof setTimeout>;
		return (value: string) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => setDebouncedSearch(value), 300);
		};
	}, []);

	// Reset page when filters change
	useEffect(() => {
		setPage(1);
	}, [debouncedSearch, statusFilter]);

	const { data, isLoading, error } = useJobsQuery({
		status: statusFilter || undefined,
		search: debouncedSearch || undefined,
		page,
		limit,
	});

	const jobs = data?.jobs;
	const pagination = data?.pagination;

	const formatCurrency = (value: string | number) => {
		const numValue = typeof value === 'string' ? parseFloat(value) : value;
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
		}).format(numValue);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h2 className="text-2xl font-bold">Jobs</h2>
				<p className="text-muted-foreground">
					Manage jobs from accepted quotes
					{pagination ? ` (${pagination.total} total)` : ''}
				</p>
			</div>

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
				<div className="flex flex-col sm:flex-row gap-4 flex-1">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by job number or customer..."
							className="pl-9"
							onChange={(e) => {
								setSearch(e.target.value);
								searchTimeout(e.target.value);
							}}
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
				</div>
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
					{debouncedSearch || statusFilter ? (
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
									<TableHead>Account</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Created</TableHead>
									<TableHead className="w-[100px]"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{jobs.map((job) => (
									<TableRow key={job.id}>
										<TableCell className="font-medium">
											{job.jobNumber}
										</TableCell>
										<TableCell className={job.customerFirstName && job.customerLastName ? 'font-display' : ''}>
											{job.customerFirstName && job.customerLastName
												? `${job.customerFirstName} ${job.customerLastName}`
												: 'Walk-in'}
										</TableCell>
										<TableCell className="text-right">
											{formatCurrency(job.total)}
										</TableCell>
										<TableCell>
											<PaymentStatusDisplay job={job} formatCurrency={formatCurrency} />
										</TableCell>
										<TableCell>
											<Badge variant="outline" className={getAccountStatusColor(job.accountStatus)}>
												{formatAccountStatus(job.accountStatus)}
											</Badge>
										</TableCell>
										<TableCell>
											<Badge
												variant={getJobStatusVariant(job.status)}
												className={getJobStatusClassName(job.status)}
											>
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
								))}
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
							/>
						))}
					</div>
				)
			)}

			{/* Pagination */}
			{pagination && jobs && jobs.length > 0 && (
				<div className="flex items-center justify-between mt-4">
					<div className="text-sm text-muted-foreground">
						Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
						{Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
						{pagination.total} jobs
					</div>
					<div className="flex items-center gap-2">
						<Select
							value={String(limit)}
							onValueChange={(val) => {
								setLimit(Number(val));
								setPage(1);
							}}
						>
							<SelectTrigger className="w-20 h-8">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="10">10</SelectItem>
								<SelectItem value="20">20</SelectItem>
								<SelectItem value="50">50</SelectItem>
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={pagination.page <= 1}
						>
							<ChevronLeft className="h-4 w-4" />
							Previous
						</Button>
						<span className="text-sm">
							Page {pagination.page} of {pagination.totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => p + 1)}
							disabled={pagination.page >= pagination.totalPages}
						>
							Next
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

interface JobCardProps {
	job: JobListItem;
	formatCurrency: (value: string | number) => string;
	formatDate: (dateString: string) => string;
}

function JobCard({ job, formatCurrency, formatDate }: JobCardProps) {
	const customerName = job.customerFirstName && job.customerLastName
		? `${job.customerFirstName} ${job.customerLastName}`
		: 'Walk-in';

	return (
		<Link to={`/app/jobs/${job.id}`} className="block">
			<Card className="hover:shadow-md transition-shadow">
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between">
						<div className="space-y-1">
							<CardTitle className="text-base font-semibold">{job.jobNumber}</CardTitle>
							<div className="flex items-center gap-1.5 text-base font-medium">
								<User className="h-3.5 w-3.5 text-muted-foreground" />
								<span className={customerName !== 'Walk-in' ? 'font-display' : 'text-muted-foreground'}>
									{customerName}
								</span>
							</div>
						</div>
						<Badge
							variant={getJobStatusVariant(job.status)}
							className={getJobStatusClassName(job.status)}
						>
							{formatJobStatus(job.status)}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-sm">
							<PoundSterling className="h-3.5 w-3.5 text-muted-foreground" />
							<span className="font-medium">{formatCurrency(job.total)}</span>
						</div>
						<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
							<Calendar className="h-3.5 w-3.5" />
							<span>{formatDate(job.createdAt)}</span>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<PaymentStatusDisplay job={job} formatCurrency={formatCurrency} />
						<Badge variant="outline" className={`text-xs ${getAccountStatusColor(job.accountStatus)}`}>
							{formatAccountStatus(job.accountStatus)}
						</Badge>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
