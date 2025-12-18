import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from '@/hooks/use-jobs';
import { Search } from 'lucide-react';

const ALL_STATUS_VALUE = '_all';

export function JobsPage() {
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');

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

			{/* Jobs table */}
			{!isLoading && jobs && jobs.length > 0 && (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Job #</TableHead>
								<TableHead>Customer</TableHead>
								<TableHead>Service</TableHead>
								<TableHead className="text-right">Total</TableHead>
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
									<TableCell>
										{job.customerFirstName && job.customerLastName
											? `${job.customerFirstName} ${job.customerLastName}`
											: 'Walk-in'}
									</TableCell>
									<TableCell>{job.serviceName || '-'}</TableCell>
									<TableCell className="text-right">
										{formatCurrency(job.total)}
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
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
