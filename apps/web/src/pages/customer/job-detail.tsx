import {
	ArrowLeft,
	CheckCircle2,
	ClipboardList,
	CreditCard,
	FileImage,
	FileText,
	ListChecks,
	Loader2,
	Paperclip,
	Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	JobFilesTab,
	JobFormsTab,
	JobOverviewTab,
	JobPaymentsTab,
	JobProofTab,
	JobWorkflowTab,
	JobWorksheetTab,
} from '@/components/jobs';
import { STATUS_COLORS, STATUS_ICONS, formatDate } from '@/components/jobs/types';
import { Badge } from '@/components/ui/badge';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	formatDepositStatus,
	formatJobStatus,
	getDepositStatusColor,
	getJobStatusSequence,
	getNextJobStatus,
	getNextStatusButtonLabel,
	type JobStatus,
	useAttachmentsQuery,
	useDeleteJobMutation,
	useJobQuery,
	usePaymentScheduleQuery,
	useUpdateJobStatusMutation,
} from '@/hooks/use-jobs';
import { useJobFormsQuery } from '@/hooks/use-job-forms';
import { type ProofStatus, useJobProofsQuery } from '@/hooks/use-job-proofs';
import { useJobWorkflowTasksQuery } from '@/hooks/use-job-workflow-tasks';
import { useMemorialWorksheetQuery } from '@/hooks/use-memorial-worksheet';
import {
	getQuoteTypeVariant,
	QUOTE_TYPE_LABELS,
	type QuoteType,
} from '@/hooks/use-quotes';
import { useTasksQuery } from '@/hooks/use-tasks';

function getProofStatusBadge(status: ProofStatus) {
	const config: Record<
		ProofStatus,
		{
			label: string;
			variant: 'secondary' | 'default' | 'destructive' | 'outline';
			className?: string;
		}
	> = {
		draft: { label: 'Draft', variant: 'secondary' },
		sent_to_customer: { label: 'Sent to Customer', variant: 'default', className: 'bg-blue-500' },
		approved: { label: 'Approved', variant: 'default', className: 'bg-green-500' },
		revision_requested: {
			label: 'Revision Requested',
			variant: 'default',
			className: 'bg-orange-500',
		},
		superseded: { label: 'Superseded', variant: 'secondary', className: 'opacity-60' },
	};
	const c = config[status];
	return (
		<Badge variant={c.variant} className={c.className}>
			{c.label}
		</Badge>
	);
}

export function JobDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState('overview');

	const { data: job, isLoading, error } = useJobQuery(id);
	const updateStatusMutation = useUpdateJobStatusMutation();
	const deleteMutation = useDeleteJobMutation();

	// Lightweight queries for summary strip + tab badges (cached / shared with tab components)
	const { data: paymentData } = usePaymentScheduleQuery(id);
	const { data: jobTasks } = useTasksQuery({ entityType: 'job', entityId: id });
	const { data: workflowTasks } = useJobWorkflowTasksQuery(id);
	const { data: jobForms } = useJobFormsQuery(id);
	const { data: jobProofs } = useJobProofsQuery(id);
	const { data: attachments } = useAttachmentsQuery(id);
	const { data: worksheet } = useMemorialWorksheetQuery(id);

	const handleStatusChange = async (newStatus: JobStatus) => {
		if (!id) return;
		setMutationError(null);
		try {
			await updateStatusMutation.mutateAsync({ id, status: newStatus });
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to update status');
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

	const quoteType = job.quote.quoteType as QuoteType;
	const statusSequence = getJobStatusSequence(quoteType);
	const nextStatus = getNextJobStatus(job.status, quoteType);
	const nextStatusLabel = getNextStatusButtonLabel(job.status, quoteType);
	const canDelete = job.status === 'pending';
	const NextStatusIcon = nextStatus ? STATUS_ICONS[nextStatus] : null;

	// Summary strip counts
	const tasksDone = jobTasks?.filter((t) => t.status === 'done').length ?? 0;
	const tasksTotal = jobTasks?.length ?? 0;
	const workflowCompleted = workflowTasks?.filter((t) => t.status === 'completed').length ?? 0;
	const workflowTotal = workflowTasks?.length ?? 0;
	const currentProof = jobProofs?.find((p) => p.status !== 'superseded');

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

			{/* Header with compact inline status */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Link to="/app/jobs">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<div className="flex items-center gap-2">
							<h2 className="text-2xl font-bold">{job.jobNumber}</h2>
							<Badge variant={getQuoteTypeVariant(quoteType)}>{QUOTE_TYPE_LABELS[quoteType]}</Badge>
						</div>
						<p className="text-sm text-muted-foreground">Created {formatDate(job.createdAt)}</p>
						{/* Compact inline status */}
						<div className="flex items-center gap-3 mt-2">
							<div className="flex items-center gap-2">
								<div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[job.status].bg}`} />
								<span className="font-medium">{formatJobStatus(job.status)}</span>
							</div>
							<div className="flex items-center gap-1.5">
								{statusSequence.map((status, index) => {
									const currentIndex = statusSequence.indexOf(job.status);
									const isFilled = currentIndex === -1 ? false : index <= currentIndex;
									return (
										<div
											key={status}
											className={`w-4 h-1 rounded-full ${isFilled ? 'bg-green-500' : 'bg-muted'}`}
										/>
									);
								})}
							</div>
							<span className="text-xs text-muted-foreground">
								Step {Math.max(statusSequence.indexOf(job.status) + 1, 1)} of{' '}
								{statusSequence.length}
							</span>
						</div>
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
						<Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
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

			{/* At-a-Glance Summary Strip */}
			<div className="flex flex-wrap items-center gap-4 py-3 px-4 bg-muted/50 rounded-lg mb-4">
				{/* Payment Summary */}
				<div className="flex items-center gap-1.5 text-sm">
					<CreditCard className="h-4 w-4 text-muted-foreground" />
					{paymentData?.summary ? (
						Number.parseFloat(paymentData.summary.outstandingAmount) <= 0 ? (
							<span className="text-green-600 font-medium">Fully Paid</span>
						) : (
							<span className={paymentData.summary.hasOverdue ? 'text-red-600 font-medium' : ''}>
								{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
									Number.parseFloat(paymentData.summary.paidAmount),
								)}{' '}
								/{' '}
								{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
									Number.parseFloat(paymentData.summary.totalAmount),
								)}
								{paymentData.summary.hasOverdue && ' (overdue)'}
							</span>
						)
					) : (
						<span className="text-muted-foreground">No payments</span>
					)}
				</div>
				<div className="w-px h-4 bg-border" />
				{/* Deposit Status */}
				<div className="flex items-center gap-1.5 text-sm">
					<Badge variant="outline" className={getDepositStatusColor(job.depositStatus)}>
						{formatDepositStatus(job.depositStatus)}
					</Badge>
				</div>
				<div className="w-px h-4 bg-border" />
				{/* Tasks */}
				<div className="flex items-center gap-1.5 text-sm">
					<CheckCircle2 className="h-4 w-4 text-muted-foreground" />
					<span>
						Tasks: {tasksDone}/{tasksTotal}
					</span>
				</div>
				{/* Worksheet - hide for sundry_only */}
				{quoteType !== 'sundry_only' && (
					<>
						<div className="w-px h-4 bg-border" />
						<div className="flex items-center gap-1.5 text-sm">
							<ClipboardList className="h-4 w-4 text-muted-foreground" />
							<span>{worksheet ? 'Worksheet created' : 'No worksheet'}</span>
						</div>
					</>
				)}
				<div className="w-px h-4 bg-border" />
				{/* Files */}
				<div className="flex items-center gap-1.5 text-sm">
					<Paperclip className="h-4 w-4 text-muted-foreground" />
					<span>Files: {attachments?.length ?? 0}</span>
				</div>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="workflow" className="flex items-center gap-2">
						<ListChecks className="h-4 w-4" />
						Workflow
						{workflowTotal > 0 && (
							<Badge variant="secondary" className="h-5 text-xs px-1.5">
								{workflowCompleted}/{workflowTotal}
							</Badge>
						)}
					</TabsTrigger>
					<TabsTrigger value="forms" className="flex items-center gap-2">
						<FileText className="h-4 w-4" />
						Forms & Fees
						{jobForms && jobForms.length > 0 && (
							<Badge variant="secondary" className="h-5 text-xs px-1.5">
								{jobForms.filter((f) => ['approved', 'received'].includes(f.status)).length}/
								{jobForms.length}
							</Badge>
						)}
					</TabsTrigger>
					{quoteType === 'new_memorial' && (
						<TabsTrigger value="proof" className="flex items-center gap-2">
							<FileImage className="h-4 w-4" />
							Proof
							{currentProof && getProofStatusBadge(currentProof.status as ProofStatus)}
						</TabsTrigger>
					)}
					<TabsTrigger value="payments" className="flex items-center gap-2">
						<CreditCard className="h-4 w-4" />
						Payments
						{paymentData?.summary?.hasOverdue && (
							<Badge variant="destructive" className="h-5 text-xs px-1.5">
								Late
							</Badge>
						)}
					</TabsTrigger>
					{quoteType !== 'sundry_only' && (
						<TabsTrigger value="worksheet" className="flex items-center gap-2">
							<ClipboardList className="h-4 w-4" />
							Worksheet
						</TabsTrigger>
					)}
					<TabsTrigger value="files" className="flex items-center gap-2">
						<Paperclip className="h-4 w-4" />
						Files
						{attachments && attachments.length > 0 && (
							<Badge variant="secondary" className="h-5 text-xs px-1.5">
								{attachments.length}
							</Badge>
						)}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-6">
					<JobOverviewTab jobId={id!} job={job} onSwitchTab={setActiveTab} />
				</TabsContent>

				<TabsContent value="workflow" className="mt-6">
					<JobWorkflowTab jobId={id!} />
				</TabsContent>

				<TabsContent value="forms" className="mt-6">
					<JobFormsTab jobId={id!} />
				</TabsContent>

				{quoteType === 'new_memorial' && (
					<TabsContent value="proof" className="mt-6">
						<JobProofTab jobId={id!} />
					</TabsContent>
				)}

				<TabsContent value="payments" className="mt-6">
					<JobPaymentsTab jobId={id!} />
				</TabsContent>

				{quoteType !== 'sundry_only' && (
					<TabsContent value="worksheet" className="mt-6">
						<JobWorksheetTab jobId={id!} jobNumber={job.jobNumber} />
					</TabsContent>
				)}

				<TabsContent value="files" className="mt-6">
					<JobFilesTab jobId={id!} />
				</TabsContent>
			</Tabs>

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
