import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	useJobQuery,
	useUpdateJobStatusMutation,
	useUpdateJobNotesMutation,
	useDeleteJobMutation,
	formatJobStatus,
	getJobStatusVariant,
	getNextJobStatus,
	getNextStatusButtonLabel,
	type JobStatus,
} from '@/hooks/use-jobs';
import {
	ArrowLeft,
	Package,
	Factory,
	Truck,
	CheckCircle2,
	Trash2,
	ExternalLink,
	Loader2,
	Save,
} from 'lucide-react';

// Status icons mapping
const STATUS_ICONS: Record<JobStatus, React.ElementType> = {
	pending: Package,
	materials_ordered: Package,
	in_production: Factory,
	ready_for_install: Truck,
	installed: CheckCircle2,
	completed: CheckCircle2,
};

export function JobDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [notes, setNotes] = useState<string>('');
	const [notesInitialized, setNotesInitialized] = useState(false);

	const { data: job, isLoading, error } = useJobQuery(id);
	const updateStatusMutation = useUpdateJobStatusMutation();
	const updateNotesMutation = useUpdateJobNotesMutation();
	const deleteMutation = useDeleteJobMutation();

	// Initialize notes when job loads
	if (job && !notesInitialized) {
		setNotes(job.notes || '');
		setNotesInitialized(true);
	}

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

	const handleStatusChange = async (newStatus: JobStatus) => {
		if (!id) return;
		setMutationError(null);
		try {
			await updateStatusMutation.mutateAsync({ id, status: newStatus });
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to update status');
		}
	};

	const handleSaveNotes = async () => {
		if (!id) return;
		setMutationError(null);
		try {
			await updateNotesMutation.mutateAsync({ id, notes: notes || undefined });
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to save notes');
		}
	};

	const handleDelete = async () => {
		if (!id) return;
		try {
			await deleteMutation.mutateAsync(id);
			setDeleteDialogOpen(false);
			navigate('/app/jobs');
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to delete job');
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Job Details</h2>
				</div>
				<div className="text-muted-foreground">Loading job...</div>
			</div>
		);
	}

	if (error || !job) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Job Details</h2>
				</div>
				<div className="text-destructive">
					{error ? `Error loading job: ${error.message}` : 'Job not found'}
				</div>
				<Link to="/app/jobs">
					<Button variant="outline" className="mt-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Jobs
					</Button>
				</Link>
			</div>
		);
	}

	const nextStatus = getNextJobStatus(job.status);
	const nextStatusLabel = getNextStatusButtonLabel(job.status);
	const canDelete = job.status === 'pending';
	const hasNotesChanged = notes !== (job.notes || '');

	// Get the icon for next status
	const NextStatusIcon = nextStatus ? STATUS_ICONS[nextStatus] : null;

	return (
		<div>
			{/* Breadcrumb */}
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/jobs">Jobs</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{job.jobNumber}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Link to="/app/jobs">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<div className="flex items-center gap-3">
							<h2 className="text-2xl font-bold">{job.jobNumber}</h2>
							<Badge variant={getJobStatusVariant(job.status)}>
								{formatJobStatus(job.status)}
							</Badge>
						</div>
						<p className="text-muted-foreground mt-1">
							Created {formatDate(job.createdAt)}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{nextStatus && nextStatusLabel && (
						<Button
							onClick={() => handleStatusChange(nextStatus)}
							disabled={updateStatusMutation.isPending}
						>
							{updateStatusMutation.isPending ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : NextStatusIcon ? (
								<NextStatusIcon className="h-4 w-4 mr-2" />
							) : null}
							{nextStatusLabel}
						</Button>
					)}
					{canDelete && (
						<Button
							variant="destructive"
							onClick={() => setDeleteDialogOpen(true)}
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Delete
						</Button>
					)}
				</div>
			</div>

			{mutationError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{mutationError}
				</div>
			)}

			{/* Status Workflow */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Workflow Progress</CardTitle>
					<CardDescription>Track the job through each stage</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						{(['pending', 'materials_ordered', 'in_production', 'ready_for_install', 'installed', 'completed'] as JobStatus[]).map((status, index, arr) => {
							const StatusIcon = STATUS_ICONS[status];
							const isActive = status === job.status;
							const isPast = arr.indexOf(job.status) > index;
							const isFuture = arr.indexOf(job.status) < index;

							return (
								<div key={status} className="flex items-center">
									<div className="flex flex-col items-center">
										<div
											className={`w-10 h-10 rounded-full flex items-center justify-center ${
												isActive
													? 'bg-primary text-primary-foreground'
													: isPast
														? 'bg-green-500 text-white'
														: 'bg-muted text-muted-foreground'
											}`}
										>
											<StatusIcon className="h-5 w-5" />
										</div>
										<span
											className={`text-xs mt-2 text-center max-w-[80px] ${
												isActive ? 'font-medium' : isFuture ? 'text-muted-foreground' : ''
											}`}
										>
											{formatJobStatus(status)}
										</span>
									</div>
									{index < arr.length - 1 && (
										<div
											className={`h-0.5 w-8 mx-2 ${
												isPast ? 'bg-green-500' : 'bg-muted'
											}`}
										/>
									)}
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Quote Summary Card */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle>Quote Summary</CardTitle>
									<CardDescription>
										Quote {job.quote.quoteNumber}
									</CardDescription>
								</div>
								<Link to={`/app/quotes/${job.quote.id}`}>
									<Button variant="outline" size="sm">
										<ExternalLink className="h-4 w-4 mr-2" />
										View Full Quote
									</Button>
								</Link>
							</div>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-4">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Customer</p>
								<p>
									{job.quote.customer
										? `${job.quote.customer.firstName} ${job.quote.customer.lastName}`
										: 'Walk-in Customer'}
								</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Service</p>
								<p>{job.quote.service?.name || 'No service'}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Product</p>
								<p>{job.quote.product?.name || 'No product'}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total</p>
								<p className="text-lg font-semibold">{formatCurrency(job.quote.total)}</p>
							</div>
						</CardContent>
					</Card>

					{/* Notes Card */}
					<Card>
						<CardHeader>
							<CardTitle>Job Notes</CardTitle>
							<CardDescription>
								Add notes about this job
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<Textarea
								placeholder="Add notes about materials, special instructions, or progress updates..."
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={5}
							/>
							<div className="flex justify-end">
								<Button
									onClick={handleSaveNotes}
									disabled={!hasNotesChanged || updateNotesMutation.isPending}
								>
									{updateNotesMutation.isPending ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											Saving...
										</>
									) : (
										<>
											<Save className="h-4 w-4 mr-2" />
											Save Notes
										</>
									)}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Status Card */}
					<Card>
						<CardHeader>
							<CardTitle>Status</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center gap-3">
								<Badge variant={getJobStatusVariant(job.status)} className="text-sm px-3 py-1">
									{formatJobStatus(job.status)}
								</Badge>
							</div>
							{nextStatusLabel && (
								<p className="text-sm text-muted-foreground">
									Next step: {nextStatusLabel}
								</p>
							)}
							{job.status === 'completed' && (
								<p className="text-sm text-green-600 font-medium">
									This job has been completed.
								</p>
							)}
						</CardContent>
					</Card>

					{/* Details Card */}
					<Card>
						<CardHeader>
							<CardTitle>Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Created</p>
								<p>{formatDate(job.createdAt)}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Updated</p>
								<p>{formatDate(job.updatedAt)}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Job ID</p>
								<p className="font-mono text-xs">{job.id}</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Delete Confirmation Dialog */}
			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDelete}
				title="Delete Job"
				description={`Are you sure you want to delete job "${job.jobNumber}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
