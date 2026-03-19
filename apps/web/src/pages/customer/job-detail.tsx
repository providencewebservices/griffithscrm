import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	useJobQuery,
	useUpdateJobStatusMutation,
	useUpdateJobNotesMutation,
	useDeleteJobMutation,
	usePaymentScheduleQuery,
	useUpdatePaymentScheduleItemMutation,
	useCreatePaymentScheduleItemMutation,
	useDeletePaymentScheduleItemMutation,
	useAttachmentsQuery,
	usePresignAttachmentMutation,
	useConfirmAttachmentMutation,
	useDeleteAttachmentMutation,
	useGeneratePaymentLinkMutation,
	useUpdateJobDatesMutation,
	useMarkInvoicedMutation,
	useUpdateAccountStatusMutation,
	useRecalculateAccountStatusMutation,
	formatJobStatus,
	getNextJobStatus,
	getNextStatusButtonLabel,
	getJobStatusSequence,
	formatAttachmentCategory,
	formatAccountStatus,
	getAccountStatusColor,
	ACCOUNT_STATUSES,
	type JobStatus,
	type AccountStatus,
	type PaymentScheduleItem,
	type JobAttachment,
	type JobAttachmentCategory,
} from '@/hooks/use-jobs';
import {
	QUOTE_TYPE_LABELS,
	QUOTE_TYPE_SECTION_CONFIG,
	getQuoteTypeVariant,
	type QuoteType,
} from '@/hooks/use-quotes';
import { useTasksQuery, type TaskListItem } from '@/hooks/use-tasks';
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
	ChevronDown,
	Check,
	Plus,
	AlertCircle,
	Calendar,
	CreditCard,
	Paperclip,
	FileText,
	Image,
	Upload,
	X,
	Link2,
	Printer,
	ClipboardList,
	Blocks,
	Receipt,
	RefreshCw,
	ListChecks,
	User,
	Circle,
	CircleCheck,
	CircleDashed,
	CircleMinus,
	ChevronRight,
	MoreHorizontal,
	Play,
} from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { JobTasksSection } from '@/components/tasks/job-tasks-section';
import {
	useMemorialWorksheetQuery,
	useCreateMemorialWorksheetMutation,
	useUpdateMemorialWorksheetMutation,
	type MemorialWorksheet,
} from '@/hooks/use-memorial-worksheet';
import {
	useJobWorkflowTasksQuery,
	useGenerateWorkflowMutation,
	useCompleteWorkflowTaskMutation,
	useSkipWorkflowTaskMutation,
	useUpdateWorkflowTaskMutation,
	useAddWorkflowTaskMutation,
	useDeleteWorkflowTaskMutation,
	type WorkflowTask,
	type WorkflowTaskStatus,
	type WorkflowStepCategory,
} from '@/hooks/use-job-workflow-tasks';
import { useTeamQuery } from '@/hooks/use-team';
import { WORKFLOW_STEP_CATEGORIES, FORM_STATUSES } from '@griffiths-crm/shared/db/schema';
import { Progress } from '@/components/ui/progress';
import {
	useJobFormsQuery,
	useFormSuggestionsQuery,
	useAddFormMutation,
	useUpdateFormMutation,
	useDeleteFormMutation,
	type JobForm,
	type FormStatus,
} from '@/hooks/use-job-forms';

// Status icons mapping
const STATUS_ICONS: Record<JobStatus, React.ElementType> = {
	pending: Package,
	materials_ordered: Package,
	in_production: Factory,
	ready_for_install: Truck,
	installed: CheckCircle2,
	completed: CheckCircle2,
};

// Distinct status colors for workflow visualization
const STATUS_COLORS: Record<JobStatus, { bg: string; text: string }> = {
	pending: { bg: 'bg-amber-500', text: 'text-white' },
	materials_ordered: { bg: 'bg-blue-500', text: 'text-white' },
	in_production: { bg: 'bg-purple-500', text: 'text-white' },
	ready_for_install: { bg: 'bg-cyan-500', text: 'text-white' },
	installed: { bg: 'bg-emerald-500', text: 'text-white' },
	completed: { bg: 'bg-green-600', text: 'text-white' },
};

export function JobDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [notes, setNotes] = useState<string>('');
	const [notesInitialized, setNotesInitialized] = useState(false);
	const [notesSaved, setNotesSaved] = useState(false);
	const [detailsOpen, setDetailsOpen] = useState(false);

	// Payment schedule state
	const [showAddPayment, setShowAddPayment] = useState(false);
	const [newPaymentDescription, setNewPaymentDescription] = useState('');
	const [newPaymentAmount, setNewPaymentAmount] = useState('');
	const [newPaymentDueDate, setNewPaymentDueDate] = useState('');
	const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
	const [editingDueDate, setEditingDueDate] = useState('');

	// Attachment state
	const [showUpload, setShowUpload] = useState(false);
	const [uploadCategory, setUploadCategory] = useState<JobAttachmentCategory>('artwork');
	const [uploadNotes, setUploadNotes] = useState('');
	const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'confirming'>('idle');
	const [categoryFilter, setCategoryFilter] = useState<JobAttachmentCategory | 'all'>('all');

	// Worksheet state
	const [worksheetForm, setWorksheetForm] = useState<{
		date: string;
		deceasedName: string;
		cemeteryChurchyard: string;
		location: string;
		existingDescription: string;
		requirements: string;
		inscription: string;
	} | null>(null);
	const [worksheetInitialized, setWorksheetInitialized] = useState(false);
	const [worksheetSaved, setWorksheetSaved] = useState(false);

	// Invoicing state
	const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
	const [invoiceNumber, setInvoiceNumber] = useState('');

	// Workflow task state
	const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
	const [showAddTask, setShowAddTask] = useState(false);
	const [newTaskName, setNewTaskName] = useState('');
	const [newTaskCategory, setNewTaskCategory] = useState<WorkflowStepCategory>('admin');
	const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
	const [newTaskDueDate, setNewTaskDueDate] = useState('');
	const [editingTaskNotes, setEditingTaskNotes] = useState<Record<string, string>>({});

	// Forms & Fees state
	const [newFormName, setNewFormName] = useState('');
	const [showFormSuggestions, setShowFormSuggestions] = useState(false);

	const { data: job, isLoading, error } = useJobQuery(id);
	const { data: paymentData, isLoading: paymentLoading } = usePaymentScheduleQuery(id);
	const { data: attachments, isLoading: attachmentsLoading } = useAttachmentsQuery(id);
	const { data: worksheet, isLoading: worksheetLoading } = useMemorialWorksheetQuery(id);
	const { data: jobTasks } = useTasksQuery({ entityType: 'job', entityId: id });
	const { data: workflowTasks, isLoading: workflowTasksLoading } = useJobWorkflowTasksQuery(id);
	const createWorksheetMutation = useCreateMemorialWorksheetMutation();
	const updateWorksheetMutation = useUpdateMemorialWorksheetMutation();
	const updateStatusMutation = useUpdateJobStatusMutation();
	const updateNotesMutation = useUpdateJobNotesMutation();
	const deleteMutation = useDeleteJobMutation();
	const createPaymentMutation = useCreatePaymentScheduleItemMutation();
	const updatePaymentMutation = useUpdatePaymentScheduleItemMutation();
	const deletePaymentMutation = useDeletePaymentScheduleItemMutation();
	const presignMutation = usePresignAttachmentMutation();
	const confirmMutation = useConfirmAttachmentMutation();
	const deleteAttachmentMutation = useDeleteAttachmentMutation();
	const generateLinkMutation = useGeneratePaymentLinkMutation();
	const markInvoicedMutation = useMarkInvoicedMutation();
	const updateAccountStatusMutation = useUpdateAccountStatusMutation();
	const recalculateAccountStatusMutation = useRecalculateAccountStatusMutation();
	const updateDatesMutation = useUpdateJobDatesMutation();
	const generateWorkflowMutation = useGenerateWorkflowMutation(id!);
	const completeTaskMutation = useCompleteWorkflowTaskMutation(id!);
	const skipTaskMutation = useSkipWorkflowTaskMutation(id!);
	const updateTaskMutation = useUpdateWorkflowTaskMutation(id!);
	const addTaskMutation = useAddWorkflowTaskMutation(id!);
	const deleteTaskMutation = useDeleteWorkflowTaskMutation(id!);
	const { data: teamMembers } = useTeamQuery();
	const { data: jobForms, isLoading: formsLoading } = useJobFormsQuery(id);
	const { data: formSuggestions } = useFormSuggestionsQuery();
	const addFormMutation = useAddFormMutation(id!);
	const updateFormMutation = useUpdateFormMutation(id!);
	const deleteFormMutation = useDeleteFormMutation(id!);

	// Initialize notes when job loads
	if (job && !notesInitialized) {
		setNotes(job.notes || '');
		setNotesInitialized(true);
	}

	// Initialize worksheet form when worksheet loads
	if (worksheet && !worksheetInitialized) {
		setWorksheetForm({
			date: worksheet.date ? new Date(worksheet.date).toISOString().split('T')[0] : '',
			deceasedName: worksheet.deceasedName || '',
			cemeteryChurchyard: worksheet.cemeteryChurchyard || '',
			location: worksheet.location || '',
			existingDescription: worksheet.existingDescription || '',
			requirements: worksheet.requirements || '',
			inscription: worksheet.inscription || '',
		});
		setWorksheetInitialized(true);
	}

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
		setNotesSaved(false);
		try {
			await updateNotesMutation.mutateAsync({ id, notes: notes || undefined });
			setNotesSaved(true);
			// Auto-dismiss success message after 2 seconds
			setTimeout(() => setNotesSaved(false), 2000);
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

	// Payment schedule handlers
	const handleAddPayment = async () => {
		if (!id || !newPaymentDescription || !newPaymentAmount) return;
		setMutationError(null);
		try {
			await createPaymentMutation.mutateAsync({
				jobId: id,
				input: {
					description: newPaymentDescription,
					amount: newPaymentAmount,
					dueDate: newPaymentDueDate || null,
				},
			});
			setShowAddPayment(false);
			setNewPaymentDescription('');
			setNewPaymentAmount('');
			setNewPaymentDueDate('');
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to add payment');
		}
	};

	const handleMarkAsPaid = async (item: PaymentScheduleItem) => {
		if (!id) return;
		setMutationError(null);
		try {
			await updatePaymentMutation.mutateAsync({
				jobId: id,
				itemId: item.id,
				input: {
					paidAmount: item.amount,
					paidAt: new Date().toISOString(),
					paymentMethod: 'manual',
				},
			});
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to mark as paid');
		}
	};

	const handleUpdateDueDate = async (itemId: string) => {
		if (!id) return;
		setMutationError(null);
		try {
			await updatePaymentMutation.mutateAsync({
				jobId: id,
				itemId,
				input: {
					dueDate: editingDueDate || null,
				},
			});
			setEditingPaymentId(null);
			setEditingDueDate('');
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to update due date');
		}
	};

	const handleDeletePayment = async (itemId: string) => {
		if (!id) return;
		setMutationError(null);
		try {
			await deletePaymentMutation.mutateAsync({ jobId: id, itemId });
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to delete payment');
		}
	};

	const isPaymentOverdue = (item: PaymentScheduleItem): boolean => {
		if (!item.dueDate) return false;
		const paidAmount = parseFloat(item.paidAmount);
		const amount = parseFloat(item.amount);
		if (paidAmount >= amount) return false;
		return new Date(item.dueDate) < new Date();
	};

	const isPaymentPaid = (item: PaymentScheduleItem): boolean => {
		const paidAmount = parseFloat(item.paidAmount);
		const amount = parseFloat(item.amount);
		return paidAmount >= amount;
	};

	const handleGeneratePaymentLink = async (milestoneId: string) => {
		try {
			const result = await generateLinkMutation.mutateAsync(milestoneId);
			await navigator.clipboard.writeText(result.paymentUrl);
			toast.success('Payment link copied to clipboard!');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to generate payment link');
		}
	};

	// File upload handlers
	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!id || !e.target.files || e.target.files.length === 0) return;

		const file = e.target.files[0];
		setMutationError(null);
		setUploadProgress('uploading');

		try {
			// Get presigned URL
			const presignResult = await presignMutation.mutateAsync({
				jobId: id,
				input: {
					filename: file.name,
					contentType: file.type,
					category: uploadCategory,
				},
			});

			// Upload directly to S3
			const uploadResponse = await fetch(presignResult.uploadUrl, {
				method: 'PUT',
				headers: { 'Content-Type': file.type },
				body: file,
			});

			if (!uploadResponse.ok) {
				throw new Error('Failed to upload file to storage');
			}

			// Confirm upload
			setUploadProgress('confirming');
			await confirmMutation.mutateAsync({
				jobId: id,
				input: {
					s3Key: presignResult.key,
					filename: file.name,
					contentType: file.type,
					category: uploadCategory,
					size: file.size,
					notes: uploadNotes || undefined,
				},
			});

			// Reset state
			setShowUpload(false);
			setUploadNotes('');
			setUploadProgress('idle');
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to upload file');
			setUploadProgress('idle');
		}
	};

	const handleDeleteAttachment = async (attachmentId: string) => {
		if (!id) return;
		setMutationError(null);
		try {
			await deleteAttachmentMutation.mutateAsync({ jobId: id, attachmentId });
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to delete file');
		}
	};

	// Worksheet handlers
	const handleCreateWorksheet = async () => {
		if (!id) return;
		setMutationError(null);
		try {
			const created = await createWorksheetMutation.mutateAsync(id);
			setWorksheetForm({
				date: created.date ? new Date(created.date).toISOString().split('T')[0] : '',
				deceasedName: created.deceasedName || '',
				cemeteryChurchyard: created.cemeteryChurchyard || '',
				location: created.location || '',
				existingDescription: created.existingDescription || '',
				requirements: created.requirements || '',
				inscription: created.inscription || '',
			});
			setWorksheetInitialized(true);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to create worksheet');
		}
	};

	const handleSaveWorksheet = async () => {
		if (!id || !worksheetForm) return;
		setMutationError(null);
		setWorksheetSaved(false);
		try {
			await updateWorksheetMutation.mutateAsync({
				jobId: id,
				input: worksheetForm,
			});
			setWorksheetSaved(true);
			setTimeout(() => setWorksheetSaved(false), 2000);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to save worksheet');
		}
	};

	const updateWorksheetField = (field: string, value: string) => {
		setWorksheetForm((prev) => (prev ? { ...prev, [field]: value } : null));
		setWorksheetSaved(false);
	};

	// Invoicing handlers
	const handleMarkInvoiced = async () => {
		if (!id) return;
		setMutationError(null);
		try {
			await markInvoicedMutation.mutateAsync({
				id,
				invoiceNumber: invoiceNumber || undefined,
			});
			setInvoiceDialogOpen(false);
			setInvoiceNumber('');
			toast.success('Job marked as invoiced');
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to mark as invoiced');
		}
	};

	const handleAccountStatusChange = async (newStatus: string) => {
		if (!id) return;
		setMutationError(null);
		try {
			await updateAccountStatusMutation.mutateAsync({
				id,
				accountStatus: newStatus as AccountStatus,
			});
			toast.success('Account status updated');
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to update account status');
		}
	};

	const handleRecalculateStatus = async () => {
		if (!id) return;
		setMutationError(null);
		try {
			await recalculateAccountStatusMutation.mutateAsync(id);
			toast.success('Account status recalculated');
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to recalculate status');
		}
	};

	// Date update handler
	const handleDateChange = async (field: string, value: string) => {
		if (!id) return;
		try {
			await updateDatesMutation.mutateAsync({
				id,
				dates: {
					[field]: value ? new Date(value).toISOString() : null,
				},
			});
			toast.success('Date updated');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update date');
		}
	};

	const toDateInputValue = (dateStr: string | null | undefined): string => {
		if (!dateStr) return '';
		return new Date(dateStr).toISOString().split('T')[0];
	};

	const getFileIcon = (contentType: string) => {
		if (contentType.startsWith('image/')) {
			return <Image className="h-5 w-5 text-blue-500" />;
		}
		return <FileText className="h-5 w-5 text-red-500" />;
	};

	const filteredAttachments = attachments?.filter(
		(a) => categoryFilter === 'all' || a.category === categoryFilter
	) || [];

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
	const sectionConfig = QUOTE_TYPE_SECTION_CONFIG[quoteType];
	const statusSequence = getJobStatusSequence(quoteType);
	const nextStatus = getNextJobStatus(job.status, quoteType);
	const nextStatusLabel = getNextStatusButtonLabel(job.status, quoteType);
	const canDelete = job.status === 'pending';
	const hasNotesChanged = notes !== (job.notes || '');

	// Task counts for summary strip
	const tasksDone = jobTasks?.filter((t) => t.status === 'done').length ?? 0;
	const tasksTotal = jobTasks?.length ?? 0;

	// Workflow task counts
	const workflowCompleted = workflowTasks?.filter((t) => t.status === 'completed').length ?? 0;
	const workflowTotal = workflowTasks?.length ?? 0;
	const workflowProgressPercent = workflowTotal > 0 ? Math.round((workflowCompleted / workflowTotal) * 100) : 0;

	// Memorial details heading per type
	const memorialHeadings: Record<string, string> = {
		new_memorial: 'Memorial Specifications',
		additional_inscription: 'Inscription Details',
		refurbishment: 'Refurbishment Scope',
		ashes: 'Interment Details',
		sundry_only: 'Order Items',
	};
	const memorialHeading = memorialHeadings[quoteType] || 'Memorial Details';

	// Check if specifications tab would have content
	const hasSpecifications = (sectionConfig?.showComponents && job.quote.components.length > 0) ||
		(sectionConfig?.showLettering && job.quote.lettering.length > 0) ||
		(sectionConfig?.showProposedInscription && job.quote.proposedInscription) ||
		(sectionConfig?.showSundries && job.quote.sundries.length > 0) ||
		(sectionConfig?.showFlowerHoles && job.quote.flowerHoles) ||
		(sectionConfig?.showExistingMemorial && job.quote.existingMemorialDescription) ||
		(sectionConfig?.showRelatedJob && job.quote.relatedJobId);

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
						<p className="text-sm text-muted-foreground">
							Created {formatDate(job.createdAt)}
						</p>
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
								Step {Math.max(statusSequence.indexOf(job.status) + 1, 1)} of {statusSequence.length}
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

			{/* At-a-Glance Summary Strip */}
			<div className="flex flex-wrap items-center gap-4 py-3 px-4 bg-muted/50 rounded-lg mb-4">
				{/* Payment Summary */}
				<div className="flex items-center gap-1.5 text-sm">
					<CreditCard className="h-4 w-4 text-muted-foreground" />
					{paymentData?.summary ? (
						parseFloat(paymentData.summary.outstandingAmount) <= 0 ? (
							<span className="text-green-600 font-medium">Fully Paid</span>
						) : (
							<span className={paymentData.summary.hasOverdue ? 'text-red-600 font-medium' : ''}>
								{formatCurrency(paymentData.summary.paidAmount)} / {formatCurrency(paymentData.summary.totalAmount)}
								{paymentData.summary.hasOverdue && ' (overdue)'}
							</span>
						)
					) : (
						<span className="text-muted-foreground">No payments</span>
					)}
				</div>
				<div className="w-px h-4 bg-border" />
				{/* Tasks */}
				<div className="flex items-center gap-1.5 text-sm">
					<CheckCircle2 className="h-4 w-4 text-muted-foreground" />
					<span>Tasks: {tasksDone}/{tasksTotal}</span>
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

			<Tabs defaultValue="overview" className="mt-4">
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
								{jobForms.filter((f) => ['approved', 'received'].includes(f.status)).length}/{jobForms.length}
							</Badge>
						)}
					</TabsTrigger>
					{hasSpecifications && (
						<TabsTrigger value="specifications" className="flex items-center gap-2">
							<Blocks className="h-4 w-4" />
							Specifications
						</TabsTrigger>
					)}
					<TabsTrigger value="payments" className="flex items-center gap-2">
						<CreditCard className="h-4 w-4" />
						Payments
						{paymentData?.summary?.hasOverdue && (
							<Badge variant="destructive" className="h-5 text-xs px-1.5">Late</Badge>
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
							<Badge variant="secondary" className="h-5 text-xs px-1.5">{attachments.length}</Badge>
						)}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-6">
					{/* Two-column layout: Source Quote + Job Notes */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Source Quote Card */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Source Quote</CardTitle>
								<CardDescription>
									{job.quote.quoteNumber}
								</CardDescription>
							</div>
							<Link to={`/app/quotes/${job.quote.id}`}>
								<Button variant="outline" size="sm">
									<ExternalLink className="h-4 w-4 mr-2" />
									View Quote
								</Button>
							</Link>
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						<div>
							<p className="text-sm text-muted-foreground">Customer</p>
							<p className="font-medium">
								{job.quote.customer
									? `${job.quote.customer.firstName} ${job.quote.customer.lastName}`
									: 'Walk-in Customer'}
							</p>
						</div>
						{sectionConfig?.showProductSelection && (
							<div>
								<p className="text-sm text-muted-foreground">Product</p>
								<p className="font-medium">
									{job.quote.product?.name || '—'}
								</p>
							</div>
						)}
						<div className="flex justify-between border-t pt-3">
							<span className="font-medium">Total</span>
							<span className="text-lg font-bold">{formatCurrency(job.quote.total)}</span>
						</div>
					</CardContent>
				</Card>

				{/* Job Notes Card */}
				<Card>
					<CardHeader>
						<CardTitle>Job Notes</CardTitle>
						<CardDescription>
							Internal notes and progress updates
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Textarea
							placeholder="Add notes about materials, special instructions, or progress updates..."
							value={notes}
							onChange={(e) => {
								setNotes(e.target.value);
								setNotesSaved(false);
							}}
							rows={4}
						/>
						<div className="flex items-center justify-end gap-3">
							{notesSaved && (
								<span className="text-sm text-green-600 flex items-center gap-1">
									<Check className="h-4 w-4" />
									Saved
								</span>
							)}
							<Button
								onClick={handleSaveNotes}
								disabled={!hasNotesChanged || updateNotesMutation.isPending}
								size="sm"
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

				{/* Dates Section */}
				<Card className="mt-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Calendar className="h-5 w-5" />
							Dates
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{quoteType === 'new_memorial' && (
								<>
									<div>
										<Label htmlFor="date-proposed-delivery">Proposed Delivery Date</Label>
										<Input
											id="date-proposed-delivery"
											type="date"
											value={toDateInputValue(job.proposedDeliveryDate)}
											onChange={(e) => handleDateChange('proposedDeliveryDate', e.target.value)}
											disabled={updateDatesMutation.isPending}
										/>
									</div>
									<div>
										<Label htmlFor="date-installation">Fixing Date</Label>
										<Input
											id="date-installation"
											type="date"
											value={toDateInputValue(job.installationDate)}
											onChange={(e) => handleDateChange('installationDate', e.target.value)}
											disabled={updateDatesMutation.isPending}
										/>
									</div>
								</>
							)}
							{quoteType === 'additional_inscription' && (
								<div>
									<Label htmlFor="date-refixing">Re-Fixing Date</Label>
									<Input
										id="date-refixing"
										type="date"
										value={toDateInputValue(job.refixingDate)}
										onChange={(e) => handleDateChange('refixingDate', e.target.value)}
										disabled={updateDatesMutation.isPending}
									/>
								</div>
							)}
							{quoteType === 'refurbishment' && (
								<div>
									<Label htmlFor="date-job-start">Job Start Date</Label>
									<Input
										id="date-job-start"
										type="date"
										value={toDateInputValue(job.jobStartDate)}
										onChange={(e) => handleDateChange('jobStartDate', e.target.value)}
										disabled={updateDatesMutation.isPending}
									/>
								</div>
							)}
							{quoteType === 'ashes' && (
								<div>
									<Label htmlFor="date-ashes">Date of Ashes</Label>
									<Input
										id="date-ashes"
										type="date"
										value={toDateInputValue(job.ashesDate)}
										onChange={(e) => handleDateChange('ashesDate', e.target.value)}
										disabled={updateDatesMutation.isPending}
									/>
								</div>
							)}
							{quoteType !== 'new_memorial' && (
								<div>
									<Label htmlFor="date-installation-general">Installation Date</Label>
									<Input
										id="date-installation-general"
										type="date"
										value={toDateInputValue(job.installationDate)}
										onChange={(e) => handleDateChange('installationDate', e.target.value)}
										disabled={updateDatesMutation.isPending}
									/>
								</div>
							)}
							<div>
								<Label htmlFor="date-deadline">Deadline</Label>
								<Input
									id="date-deadline"
									type="date"
									value={toDateInputValue(job.deadline)}
									disabled
									className="bg-muted"
								/>
								<p className="text-xs text-muted-foreground mt-1">Set from quote</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Invoicing Section */}
				<Card className="mt-6">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<CardTitle>Invoicing</CardTitle>
								<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getAccountStatusColor(job.accountStatus)}`}>
									{formatAccountStatus(job.accountStatus)}
								</span>
							</div>
							<div className="flex items-center gap-2">
								{!job.invoicedAt && (
									<Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
										<DialogTrigger asChild>
											<Button size="sm">
												<Receipt className="h-4 w-4 mr-2" />
												Mark as Invoiced
											</Button>
										</DialogTrigger>
										<DialogContent>
											<DialogHeader>
												<DialogTitle>Mark as Invoiced</DialogTitle>
												<DialogDescription>
													This will set the invoice date to now and update the account status to "Invoiced".
												</DialogDescription>
											</DialogHeader>
											<div className="py-4">
												<Label htmlFor="invoice-number">Invoice Number (optional)</Label>
												<Input
													id="invoice-number"
													placeholder="e.g., INV-001"
													value={invoiceNumber}
													onChange={(e) => setInvoiceNumber(e.target.value)}
												/>
											</div>
											<DialogFooter>
												<Button
													variant="outline"
													onClick={() => {
														setInvoiceDialogOpen(false);
														setInvoiceNumber('');
													}}
												>
													Cancel
												</Button>
												<Button
													onClick={handleMarkInvoiced}
													disabled={markInvoicedMutation.isPending}
												>
													{markInvoicedMutation.isPending ? (
														<Loader2 className="h-4 w-4 mr-2 animate-spin" />
													) : (
														<Receipt className="h-4 w-4 mr-2" />
													)}
													Mark as Invoiced
												</Button>
											</DialogFooter>
										</DialogContent>
									</Dialog>
								)}
								<Button
									variant="outline"
									size="sm"
									onClick={handleRecalculateStatus}
									disabled={recalculateAccountStatusMutation.isPending}
									title="Recalculate from payment schedule"
								>
									{recalculateAccountStatusMutation.isPending ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<RefreshCw className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						{job.invoicedAt && (
							<div className="flex items-center gap-6 text-sm">
								<div>
									<span className="text-muted-foreground">Invoiced: </span>
									<span className="font-medium">{formatDate(job.invoicedAt)}</span>
								</div>
								{job.invoiceNumber && (
									<div>
										<span className="text-muted-foreground">Invoice #: </span>
										<span className="font-medium">{job.invoiceNumber}</span>
									</div>
								)}
							</div>
						)}
						<div className="flex items-center gap-3">
							<Label className="text-sm text-muted-foreground whitespace-nowrap">Account Status:</Label>
							<Select
								value={job.accountStatus || 'not_invoiced'}
								onValueChange={handleAccountStatusChange}
								disabled={updateAccountStatusMutation.isPending}
							>
								<SelectTrigger className="w-48">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ACCOUNT_STATUSES.map((status) => (
										<SelectItem key={status} value={status}>
											{formatAccountStatus(status)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</CardContent>
				</Card>

				{/* Tasks Section */}
				<div className="mt-6">
					<JobTasksSection jobId={id!} tasks={jobTasks} />
				</div>

				{/* Collapsible Details Section */}
				<Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="mt-6">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
							<span className="text-sm">Details</span>
							<ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<div className="flex items-center gap-6 py-3 px-4 text-sm text-muted-foreground border-t">
							<span>Job ID: <span className="font-mono text-xs">{job.id}</span></span>
							<span>•</span>
							<span>Created: {formatDate(job.createdAt)}</span>
							<span>•</span>
							<span>Updated: {formatDate(job.updatedAt)}</span>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</TabsContent>

			{/* Workflow Tab */}
			<TabsContent value="workflow" className="mt-6">
				<div className="max-w-2xl space-y-6">
					{workflowTasksLoading ? (
						<div className="text-muted-foreground flex items-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" />
							Loading workflow...
						</div>
					) : !workflowTasks || workflowTasks.length === 0 ? (
						<Card>
							<CardContent className="pt-6">
								<div className="text-center py-8">
									<ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
									<p className="text-muted-foreground mb-4">
										No workflow tasks have been created for this job yet.
									</p>
									<Button
										onClick={() => {
											generateWorkflowMutation.mutate(undefined, {
												onSuccess: () => toast.success('Workflow generated'),
												onError: (err) => toast.error(err.message),
											});
										}}
										disabled={generateWorkflowMutation.isPending}
									>
										{generateWorkflowMutation.isPending ? (
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										) : (
											<ListChecks className="h-4 w-4 mr-2" />
										)}
										Generate Workflow
									</Button>
								</div>
							</CardContent>
						</Card>
					) : (
						<>
							{/* Progress indicator */}
							<Card>
								<CardContent className="pt-6">
									<div className="flex items-center justify-between mb-2">
										<span className="text-sm font-medium">
											{workflowCompleted} of {workflowTotal} steps complete
										</span>
										<span className="text-sm text-muted-foreground">
											{workflowProgressPercent}%
										</span>
									</div>
									<Progress value={workflowProgressPercent} />
								</CardContent>
							</Card>

							{/* Task list */}
							<Card>
								<CardHeader>
									<CardTitle>Workflow Steps</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-1">
										{workflowTasks.map((task, index) => {
											const isCompleted = task.status === 'completed';
											const isSkipped = task.status === 'skipped';
											const isInProgress = task.status === 'in_progress';
											const isPending = task.status === 'pending';
											const isExpanded = expandedTaskId === task.id;
											const isAdHoc = !task.workflowStepId;
											const taskNotes = editingTaskNotes[task.id] ?? task.notes ?? '';

											return (
												<div
													key={task.id}
													className={index < workflowTasks.length - 1 ? 'border-b' : ''}
												>
													{/* Task row - clickable */}
													<div
														className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2"
														onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
													>
														{/* Expand chevron */}
														<ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />

														{/* Status icon */}
														<div className="flex-shrink-0">
															{isCompleted ? (
																<CircleCheck className="h-5 w-5 text-green-500" />
															) : isSkipped ? (
																<CircleMinus className="h-5 w-5 text-gray-400" />
															) : isInProgress ? (
																<CircleDashed className="h-5 w-5 text-blue-500" />
															) : (
																<Circle className="h-5 w-5 text-gray-300" />
															)}
														</div>

														{/* Task info */}
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2">
																<span className={`font-medium text-sm ${isSkipped ? 'line-through text-muted-foreground' : ''}`}>
																	{task.name}
																</span>
																<Badge variant="outline" className="text-xs capitalize">
																	{task.category}
																</Badge>
																{isAdHoc && (
																	<Badge variant="secondary" className="text-xs">Ad-hoc</Badge>
																)}
															</div>
															<div className="flex items-center gap-3 mt-0.5">
																<span className="text-xs text-muted-foreground flex items-center gap-1">
																	<User className="h-3 w-3" />
																	{task.assigneeName || 'Unassigned'}
																</span>
																{task.dueDate && (
																	<span className="text-xs text-muted-foreground flex items-center gap-1">
																		<Calendar className="h-3 w-3" />
																		{formatDate(task.dueDate)}
																	</span>
																)}
															</div>
														</div>

														{/* Status badge */}
														<div className="flex-shrink-0">
															<Badge
																variant={
																	isCompleted ? 'default' :
																	isInProgress ? 'default' :
																	'secondary'
																}
																className={
																	isCompleted ? 'bg-green-100 text-green-800 hover:bg-green-100' :
																	isInProgress ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
																	isSkipped ? 'bg-gray-100 text-gray-500 hover:bg-gray-100' :
																	''
																}
															>
																{isCompleted ? 'Completed' :
																 isInProgress ? 'In Progress' :
																 isSkipped ? 'Skipped' :
																 'Pending'}
															</Badge>
														</div>
													</div>

													{/* Expanded panel */}
													{isExpanded && (
														<div className="ml-9 pb-4 pt-1 space-y-4">
															{/* Description */}
															{task.description && (
																<p className="text-sm text-muted-foreground">{task.description}</p>
															)}

															{/* Editable fields */}
															<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
																{/* Assignee */}
																<div>
																	<Label className="text-xs text-muted-foreground">Assignee</Label>
																	<Select
																		value={task.assigneeId || 'unassigned'}
																		onValueChange={(value) => {
																			updateTaskMutation.mutate({
																				taskId: task.id,
																				input: { assigneeId: value === 'unassigned' ? null : value },
																			}, {
																				onError: (err) => toast.error(err.message),
																			});
																		}}
																	>
																		<SelectTrigger className="h-8 mt-1">
																			<SelectValue />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectItem value="unassigned">Unassigned</SelectItem>
																			{teamMembers?.map((member) => (
																				<SelectItem key={member.id} value={member.id}>
																					{member.name}
																				</SelectItem>
																			))}
																		</SelectContent>
																	</Select>
																</div>

																{/* Due date */}
																<div>
																	<Label className="text-xs text-muted-foreground">Due Date</Label>
																	<Input
																		type="date"
																		className="h-8 mt-1"
																		value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
																		onChange={(e) => {
																			updateTaskMutation.mutate({
																				taskId: task.id,
																				input: { dueDate: e.target.value || null },
																			}, {
																				onError: (err) => toast.error(err.message),
																			});
																		}}
																	/>
																</div>

																{/* Task date (for requiresDate steps) */}
																{task.taskDate !== undefined && (
																	<div>
																		<Label className="text-xs text-muted-foreground">Task Date</Label>
																		<Input
																			type="date"
																			className="h-8 mt-1"
																			value={task.taskDate ? new Date(task.taskDate).toISOString().split('T')[0] : ''}
																			onChange={(e) => {
																				updateTaskMutation.mutate({
																					taskId: task.id,
																					input: { taskDate: e.target.value || null },
																				}, {
																					onError: (err) => toast.error(err.message),
																				});
																			}}
																		/>
																	</div>
																)}
															</div>

															{/* Notes */}
															<div>
																<Label className="text-xs text-muted-foreground">Notes</Label>
																<div className="flex gap-2 mt-1">
																	<Textarea
																		className="text-sm min-h-[60px]"
																		placeholder="Add notes..."
																		value={taskNotes}
																		onChange={(e) => setEditingTaskNotes((prev) => ({ ...prev, [task.id]: e.target.value }))}
																	/>
																</div>
																{(editingTaskNotes[task.id] !== undefined && editingTaskNotes[task.id] !== (task.notes ?? '')) && (
																	<div className="flex gap-2 mt-2">
																		<Button
																			size="sm"
																			variant="outline"
																			onClick={() => {
																				updateTaskMutation.mutate({
																					taskId: task.id,
																					input: { notes: editingTaskNotes[task.id] || null },
																				}, {
																					onSuccess: () => {
																						toast.success('Notes saved');
																						setEditingTaskNotes((prev) => {
																							const next = { ...prev };
																							delete next[task.id];
																							return next;
																						});
																					},
																					onError: (err) => toast.error(err.message),
																				});
																			}}
																		>
																			<Save className="h-3 w-3 mr-1" />
																			Save
																		</Button>
																		<Button
																			size="sm"
																			variant="ghost"
																			onClick={() => setEditingTaskNotes((prev) => {
																				const next = { ...prev };
																				delete next[task.id];
																				return next;
																			})}
																		>
																			Cancel
																		</Button>
																	</div>
																)}
															</div>

															{/* Action buttons */}
															<div className="flex items-center gap-2 pt-1">
																{(isPending || isInProgress) && (
																	<Button
																		size="sm"
																		onClick={(e) => {
																			e.stopPropagation();
																			completeTaskMutation.mutate(task.id, {
																				onSuccess: () => toast.success(`"${task.name}" completed`),
																				onError: (err) => toast.error(err.message),
																			});
																		}}
																		disabled={completeTaskMutation.isPending}
																	>
																		<Check className="h-3 w-3 mr-1" />
																		Complete
																	</Button>
																)}
																{isPending && (
																	<Button
																		size="sm"
																		variant="outline"
																		onClick={(e) => {
																			e.stopPropagation();
																			updateTaskMutation.mutate({
																				taskId: task.id,
																				input: { status: 'in_progress' },
																			}, {
																				onSuccess: () => toast.success(`"${task.name}" started`),
																				onError: (err) => toast.error(err.message),
																			});
																		}}
																		disabled={updateTaskMutation.isPending}
																	>
																		<Play className="h-3 w-3 mr-1" />
																		In Progress
																	</Button>
																)}
																{(isPending || isInProgress) && (
																	<DropdownMenu>
																		<DropdownMenuTrigger asChild>
																			<Button size="sm" variant="ghost">
																				<MoreHorizontal className="h-4 w-4" />
																			</Button>
																		</DropdownMenuTrigger>
																		<DropdownMenuContent align="end">
																			<DropdownMenuItem
																				onClick={() => {
																					skipTaskMutation.mutate(task.id, {
																						onSuccess: () => toast.success(`"${task.name}" skipped`),
																						onError: (err) => toast.error(err.message),
																					});
																				}}
																			>
																				<CircleMinus className="h-4 w-4 mr-2" />
																				Skip
																			</DropdownMenuItem>
																			{isAdHoc && (
																				<DropdownMenuItem
																					className="text-destructive"
																					onClick={() => {
																						deleteTaskMutation.mutate(task.id, {
																							onSuccess: () => {
																								toast.success(`"${task.name}" deleted`);
																								setExpandedTaskId(null);
																							},
																							onError: (err) => toast.error(err.message),
																						});
																					}}
																				>
																					<Trash2 className="h-4 w-4 mr-2" />
																					Delete
																				</DropdownMenuItem>
																			)}
																		</DropdownMenuContent>
																	</DropdownMenu>
																)}
																{/* Delete for ad-hoc tasks that are completed/skipped */}
																{(isCompleted || isSkipped) && isAdHoc && (
																	<Button
																		size="sm"
																		variant="ghost"
																		className="text-destructive hover:text-destructive"
																		onClick={(e) => {
																			e.stopPropagation();
																			deleteTaskMutation.mutate(task.id, {
																				onSuccess: () => {
																					toast.success(`"${task.name}" deleted`);
																					setExpandedTaskId(null);
																				},
																				onError: (err) => toast.error(err.message),
																			});
																		}}
																	>
																		<Trash2 className="h-3 w-3 mr-1" />
																		Delete
																	</Button>
																)}
															</div>

															{/* Completed info */}
															{isCompleted && task.completedAt && (
																<p className="text-xs text-muted-foreground">
																	Completed {formatDate(task.completedAt)}
																</p>
															)}
														</div>
													)}
												</div>
											);
										})}
									</div>

									{/* Add Task button & form */}
									<div className="mt-4 pt-4 border-t">
										{showAddTask ? (
											<div className="space-y-3">
												<h4 className="font-medium text-sm">Add Task</h4>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
													<div>
														<Label className="text-xs text-muted-foreground">Name</Label>
														<Input
															className="h-8 mt-1"
															placeholder="Task name"
															value={newTaskName}
															onChange={(e) => setNewTaskName(e.target.value)}
														/>
													</div>
													<div>
														<Label className="text-xs text-muted-foreground">Category</Label>
														<Select value={newTaskCategory} onValueChange={(v) => setNewTaskCategory(v as WorkflowStepCategory)}>
															<SelectTrigger className="h-8 mt-1">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																{WORKFLOW_STEP_CATEGORIES.map((cat) => (
																	<SelectItem key={cat} value={cat} className="capitalize">
																		{cat}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</div>
													<div>
														<Label className="text-xs text-muted-foreground">Assignee</Label>
														<Select value={newTaskAssigneeId || 'unassigned'} onValueChange={setNewTaskAssigneeId}>
															<SelectTrigger className="h-8 mt-1">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="unassigned">Unassigned</SelectItem>
																{teamMembers?.map((member) => (
																	<SelectItem key={member.id} value={member.id}>
																		{member.name}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</div>
													<div>
														<Label className="text-xs text-muted-foreground">Due Date</Label>
														<Input
															type="date"
															className="h-8 mt-1"
															value={newTaskDueDate}
															onChange={(e) => setNewTaskDueDate(e.target.value)}
														/>
													</div>
												</div>
												<div className="flex justify-end gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => {
															setShowAddTask(false);
															setNewTaskName('');
															setNewTaskCategory('admin');
															setNewTaskAssigneeId('');
															setNewTaskDueDate('');
														}}
													>
														Cancel
													</Button>
													<Button
														size="sm"
														disabled={!newTaskName.trim() || addTaskMutation.isPending}
														onClick={() => {
															addTaskMutation.mutate({
																name: newTaskName.trim(),
																category: newTaskCategory,
																assigneeId: newTaskAssigneeId && newTaskAssigneeId !== 'unassigned' ? newTaskAssigneeId : null,
																dueDate: newTaskDueDate || null,
															}, {
																onSuccess: () => {
																	toast.success('Task added');
																	setShowAddTask(false);
																	setNewTaskName('');
																	setNewTaskCategory('admin');
																	setNewTaskAssigneeId('');
																	setNewTaskDueDate('');
																},
																onError: (err) => toast.error(err.message),
															});
														}}
													>
														{addTaskMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
														Add
													</Button>
												</div>
											</div>
										) : (
											<Button
												variant="outline"
												size="sm"
												onClick={() => setShowAddTask(true)}
											>
												<Plus className="h-4 w-4 mr-1" />
												Add Task
											</Button>
										)}
									</div>
								</CardContent>
							</Card>
						</>
					)}
				</div>
			</TabsContent>

			{/* Forms & Fees Tab */}
			<TabsContent value="forms" className="mt-6">
				<div className="max-w-2xl space-y-6">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle>Forms & Fees</CardTitle>
									<CardDescription>
										Track forms, applications and associated fees
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							{formsLoading ? (
								<div className="text-muted-foreground flex items-center gap-2">
									<Loader2 className="h-4 w-4 animate-spin" />
									Loading forms...
								</div>
							) : (
								<>
									{/* Form list */}
									{jobForms && jobForms.length > 0 ? (
										<div className="space-y-2">
											{jobForms.map((form) => (
												<div
													key={form.id}
													className="flex items-center gap-3 p-3 border rounded-lg"
												>
													{/* Name */}
													<div className="flex-1 min-w-0">
														<span className="font-medium text-sm">{form.name}</span>
														{form.referenceNumber && (
															<span className="text-xs text-muted-foreground ml-2">
																Ref: {form.referenceNumber}
															</span>
														)}
														<div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
															{form.submittedAt && (
																<span>Submitted: {formatDate(form.submittedAt)}</span>
															)}
															{form.approvedAt && (
																<span>Approved: {formatDate(form.approvedAt)}</span>
															)}
														</div>
													</div>

													{/* Status select */}
													<Select
														value={form.status}
														onValueChange={(value) => {
															const input: Record<string, unknown> = { status: value };
															if (value === 'submitted' && !form.submittedAt) {
																input.submittedAt = new Date().toISOString();
															}
															if (value === 'approved' && !form.approvedAt) {
																input.approvedAt = new Date().toISOString();
															}
															updateFormMutation.mutate(
																{ formId: form.id, input },
																{
																	onError: (err) => toast.error(err.message),
																}
															);
														}}
													>
														<SelectTrigger className="w-36 h-8">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{FORM_STATUSES.map((status) => (
																<SelectItem key={status} value={status}>
																	<div className="flex items-center gap-2">
																		<div className={`w-2 h-2 rounded-full ${
																			status === 'not_started' ? 'bg-gray-400' :
																			status === 'submitted' ? 'bg-blue-500' :
																			status === 'approved' ? 'bg-green-500' :
																			status === 'received' ? 'bg-green-500' :
																			'bg-gray-400'
																		}`} />
																		{status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
																	</div>
																</SelectItem>
															))}
														</SelectContent>
													</Select>

													{/* Fee input */}
													<div className="w-24">
														<Input
															type="number"
															step="0.01"
															placeholder="Fee"
															className="h-8 text-sm"
															defaultValue={form.fee || ''}
															onBlur={(e) => {
																const newFee = e.target.value || null;
																if (newFee !== form.fee) {
																	updateFormMutation.mutate(
																		{ formId: form.id, input: { fee: newFee } },
																		{
																			onError: (err) => toast.error(err.message),
																		}
																	);
																}
															}}
														/>
													</div>

													{/* Delete */}
													<Button
														variant="ghost"
														size="sm"
														onClick={() => {
															deleteFormMutation.mutate(form.id, {
																onSuccess: () => toast.success(`"${form.name}" removed`),
																onError: (err) => toast.error(err.message),
															});
														}}
														disabled={deleteFormMutation.isPending}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
										</div>
									) : (
										<div className="text-muted-foreground text-center py-6">
											No forms added yet.
										</div>
									)}

									{/* Total fees */}
									{jobForms && jobForms.length > 0 && (
										<div className="flex items-center justify-between pt-4 mt-4 border-t">
											<span className="font-medium text-sm">Total Fees</span>
											<span className="font-bold">
												{formatCurrency(
													jobForms.reduce((sum, f) => sum + (f.fee ? parseFloat(f.fee) : 0), 0)
												)}
											</span>
										</div>
									)}

									{/* Quick-add form */}
									<div className="mt-4 pt-4 border-t">
										<div className="flex items-center gap-2 relative">
											<div className="flex-1 relative">
												<Input
													placeholder="Add a form (e.g., Faculty Application, Burial Rights)..."
													className="h-8"
													value={newFormName}
													onChange={(e) => {
														setNewFormName(e.target.value);
														setShowFormSuggestions(e.target.value.length > 0);
													}}
													onFocus={() => {
														if (newFormName.length > 0) setShowFormSuggestions(true);
													}}
													onBlur={() => {
														// Delay to allow click on suggestion
														setTimeout(() => setShowFormSuggestions(false), 200);
													}}
													onKeyDown={(e) => {
														if (e.key === 'Enter' && newFormName.trim()) {
															addFormMutation.mutate(
																{ name: newFormName.trim() },
																{
																	onSuccess: () => {
																		toast.success('Form added');
																		setNewFormName('');
																		setShowFormSuggestions(false);
																	},
																	onError: (err) => toast.error(err.message),
																}
															);
														}
													}}
												/>
												{showFormSuggestions && formSuggestions && formSuggestions.length > 0 && (
													<div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md z-10 max-h-40 overflow-y-auto">
														{formSuggestions
															.filter((s) =>
																s.toLowerCase().includes(newFormName.toLowerCase())
															)
															.map((suggestion) => (
																<button
																	key={suggestion}
																	type="button"
																	className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
																	onMouseDown={(e) => e.preventDefault()}
																	onClick={() => {
																		setNewFormName(suggestion);
																		setShowFormSuggestions(false);
																	}}
																>
																	{suggestion}
																</button>
															))}
													</div>
												)}
											</div>
											<Button
												size="sm"
												disabled={!newFormName.trim() || addFormMutation.isPending}
												onClick={() => {
													addFormMutation.mutate(
														{ name: newFormName.trim() },
														{
															onSuccess: () => {
																toast.success('Form added');
																setNewFormName('');
															},
															onError: (err) => toast.error(err.message),
														}
													);
												}}
											>
												{addFormMutation.isPending ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<Plus className="h-4 w-4" />
												)}
											</Button>
										</div>
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</div>
			</TabsContent>

			{/* Specifications Tab */}
			{hasSpecifications && (
				<TabsContent value="specifications" className="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>{memorialHeading}</CardTitle>
							<CardDescription>
								Specifications from source quote
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Existing Memorial Description */}
							{sectionConfig?.showExistingMemorial && job.quote.existingMemorialDescription && (
								<div>
									<h4 className="text-sm font-medium text-muted-foreground mb-2">EXISTING MEMORIAL</h4>
									<div className="bg-muted/50 rounded-lg p-3 text-sm">
										{job.quote.existingMemorialDescription}
									</div>
								</div>
							)}

							{/* Related Job */}
							{sectionConfig?.showRelatedJob && job.quote.relatedJobId && (
								<div>
									<h4 className="text-sm font-medium text-muted-foreground mb-2">RELATED JOB</h4>
									<Link to={`/app/jobs/${job.quote.relatedJobId}`}>
										<Button variant="outline" size="sm">
											<ExternalLink className="h-4 w-4 mr-2" />
											View Related Job
										</Button>
									</Link>
								</div>
							)}

							{/* Components */}
							{sectionConfig?.showComponents && job.quote.components.length > 0 && (
								<div>
									<h4 className="text-sm font-medium text-muted-foreground mb-2">COMPONENTS</h4>
									<div className="space-y-2">
										{job.quote.components.map((comp) => (
											<div key={comp.id} className="bg-muted/50 rounded-lg p-3">
												<div className="font-medium">
													{comp.componentType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
													{comp.materialName && ` • ${comp.materialName}`}
													{comp.finishName && ` (${comp.finishName})`}
												</div>
												{(comp.height || comp.width || comp.depth) && (
													<div className="text-sm text-muted-foreground mt-1">
														{[comp.height, comp.width, comp.depth].filter(Boolean).join('" × ')}"
														{comp.quantity > 1 && ` × ${comp.quantity}`}
													</div>
												)}
											</div>
										))}
									</div>
								</div>
							)}

							{/* Lettering */}
							{sectionConfig?.showLettering && job.quote.lettering.length > 0 && (
								<div>
									<h4 className="text-sm font-medium text-muted-foreground mb-2">LETTERING</h4>
									<div className="space-y-2">
										{job.quote.lettering.map((lett) => (
											<div key={lett.id} className="bg-muted/50 rounded-lg p-3">
												{lett.text && (
													<div className="font-medium">"{lett.text}"</div>
												)}
												<div className="text-sm text-muted-foreground mt-1">
													{lett.techniqueName}
													{lett.colorName && ` • ${lett.colorName}`}
													{` • ${lett.letterCount} letters`}
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Proposed Inscription */}
							{sectionConfig?.showProposedInscription && job.quote.proposedInscription && (
								<div>
									<h4 className="text-sm font-medium text-muted-foreground mb-2">INSCRIPTION</h4>
									<div className="bg-muted/50 rounded-lg p-4 font-mono text-sm text-center whitespace-pre-wrap">
										{job.quote.proposedInscription}
									</div>
								</div>
							)}

							{/* Sundries */}
							{sectionConfig?.showSundries && job.quote.sundries.length > 0 && (
								<div>
									<h4 className="text-sm font-medium text-muted-foreground mb-2">ADDITIONAL ITEMS</h4>
									<ul className="space-y-1">
										{job.quote.sundries.map((sundry) => (
											<li key={sundry.id} className="flex items-center gap-2 text-sm">
												<span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
												{sundry.sundryName}
												{sundry.quantity > 1 && ` × ${sundry.quantity}`}
											</li>
										))}
									</ul>
								</div>
							)}

							{/* Flower Holes */}
							{sectionConfig?.showFlowerHoles && job.quote.flowerHoles && (
								<div>
									<h4 className="text-sm font-medium text-muted-foreground mb-2">FLOWER HOLES</h4>
									<div className="text-sm">
										{job.quote.flowerHoles.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			)}


				<TabsContent value="payments" className="mt-6">
					<div className="max-w-2xl space-y-6">
						{/* Payment Schedule Items */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle>Payment Schedule</CardTitle>
										<CardDescription>
											Track payments for this job
										</CardDescription>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setShowAddPayment(true)}
									>
										<Plus className="h-4 w-4 mr-2" />
										Add Payment
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								{paymentLoading ? (
									<div className="text-muted-foreground flex items-center gap-2">
										<Loader2 className="h-4 w-4 animate-spin" />
										Loading payment schedule...
									</div>
								) : paymentData?.paymentSchedule.length === 0 ? (
									<div className="text-muted-foreground text-center py-8">
										No payment schedule items yet.
									</div>
								) : (
									<div className="space-y-3">
										{paymentData?.paymentSchedule.map((item) => {
											const isPaid = isPaymentPaid(item);
											const isOverdue = isPaymentOverdue(item);
											const isEditing = editingPaymentId === item.id;

											return (
												<div
													key={item.id}
													className={`border rounded-lg p-4 ${isPaid ? 'bg-green-50 border-green-200' : isOverdue ? 'bg-red-50 border-red-200' : ''}`}
												>
													<div className="flex items-start justify-between">
														<div className="flex-1">
															<div className="flex items-center gap-2">
																<span className="font-medium">{item.description}</span>
																{isPaid && (
																	<Badge variant="default" className="bg-green-600">
																		<Check className="h-3 w-3 mr-1" />
																		Paid
																	</Badge>
																)}
																{isOverdue && (
																	<Badge variant="destructive">
																		<AlertCircle className="h-3 w-3 mr-1" />
																		Overdue
																	</Badge>
																)}
															</div>
															<div className="text-lg font-bold mt-1">
																{formatCurrency(item.amount)}
															</div>
															<div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
																{isEditing ? (
																	<div className="flex items-center gap-2">
																		<Calendar className="h-4 w-4" />
																		<Input
																			type="date"
																			value={editingDueDate}
																			onChange={(e) => setEditingDueDate(e.target.value)}
																			className="w-40 h-8"
																		/>
																		<Button
																			size="sm"
																			variant="outline"
																			onClick={() => handleUpdateDueDate(item.id)}
																			disabled={updatePaymentMutation.isPending}
																		>
																			Save
																		</Button>
																		<Button
																			size="sm"
																			variant="ghost"
																			onClick={() => {
																				setEditingPaymentId(null);
																				setEditingDueDate('');
																			}}
																		>
																			Cancel
																		</Button>
																	</div>
																) : (
																	<div className="flex items-center gap-1">
																		<Calendar className="h-4 w-4" />
																		{item.dueDate ? (
																			<span>Due: {formatDate(item.dueDate)}</span>
																		) : (
																			<span className="italic">No due date set</span>
																		)}
																		{!isPaid && (
																			<Button
																				variant="ghost"
																				size="sm"
																				className="h-6 px-2 ml-1"
																				onClick={() => {
																					setEditingPaymentId(item.id);
																					setEditingDueDate(item.dueDate ? item.dueDate.split('T')[0] : '');
																				}}
																			>
																				Edit
																			</Button>
																		)}
																	</div>
																)}
																{isPaid && item.paidAt && (
																	<span>Paid: {formatDate(item.paidAt)}</span>
																)}
																{isPaid && item.cardLastFour && (
																	<span className="flex items-center gap-1">
																		<CreditCard className="h-3.5 w-3.5" />
																		****{item.cardLastFour}
																	</span>
																)}
															</div>
														</div>
														<div className="flex items-center gap-2">
															{!isPaid && (
																<>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() => handleGeneratePaymentLink(item.id)}
																		disabled={generateLinkMutation.isPending}
																		title="Copy payment link"
																	>
																		{generateLinkMutation.isPending ? (
																			<Loader2 className="h-4 w-4 animate-spin" />
																		) : (
																			<>
																				<Link2 className="h-4 w-4 mr-1" />
																				Payment Link
																			</>
																		)}
																	</Button>
																	<Button
																		onClick={() => handleMarkAsPaid(item)}
																		disabled={updatePaymentMutation.isPending}
																		size="sm"
																	>
																		{updatePaymentMutation.isPending ? (
																			<Loader2 className="h-4 w-4 animate-spin" />
																		) : (
																			<>
																				<Check className="h-4 w-4 mr-1" />
																				Mark Paid
																			</>
																		)}
																	</Button>
																</>
															)}
															{item.description !== 'Deposit' && item.description !== 'Balance' && (
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() => handleDeletePayment(item.id)}
																	disabled={deletePaymentMutation.isPending}
																>
																	<Trash2 className="h-4 w-4" />
																</Button>
															)}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}

								{/* Add Payment Form */}
								{showAddPayment && (
									<div className="mt-4 border rounded-lg p-4 bg-muted/50">
										<h4 className="font-medium mb-3">Add Payment Item</h4>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
											<div>
												<label className="text-sm text-muted-foreground">Description</label>
												<Input
													placeholder="e.g., Installment 2"
													value={newPaymentDescription}
													onChange={(e) => setNewPaymentDescription(e.target.value)}
												/>
											</div>
											<div>
												<label className="text-sm text-muted-foreground">Amount</label>
												<Input
													type="number"
													step="0.01"
													placeholder="0.00"
													value={newPaymentAmount}
													onChange={(e) => setNewPaymentAmount(e.target.value)}
												/>
											</div>
											<div>
												<label className="text-sm text-muted-foreground">Due Date (optional)</label>
												<Input
													type="date"
													value={newPaymentDueDate}
													onChange={(e) => setNewPaymentDueDate(e.target.value)}
												/>
											</div>
										</div>
										<div className="flex justify-end gap-2 mt-3">
											<Button
												variant="outline"
												onClick={() => {
													setShowAddPayment(false);
													setNewPaymentDescription('');
													setNewPaymentAmount('');
													setNewPaymentDueDate('');
												}}
											>
												Cancel
											</Button>
											<Button
												onClick={handleAddPayment}
												disabled={!newPaymentDescription || !newPaymentAmount || createPaymentMutation.isPending}
											>
												{createPaymentMutation.isPending ? (
													<Loader2 className="h-4 w-4 animate-spin mr-2" />
												) : (
													<Plus className="h-4 w-4 mr-2" />
												)}
												Add
											</Button>
										</div>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Payment Summary */}
						{paymentData?.summary && (
							<Card>
								<CardContent className="pt-6">
									<div className="grid grid-cols-3 gap-4 text-center">
										<div>
											<div className="text-sm text-muted-foreground">Total</div>
											<div className="text-xl font-bold">{formatCurrency(paymentData.summary.totalAmount)}</div>
										</div>
										<div>
											<div className="text-sm text-muted-foreground">Paid</div>
											<div className="text-xl font-bold text-green-600">{formatCurrency(paymentData.summary.paidAmount)}</div>
										</div>
										<div>
											<div className="text-sm text-muted-foreground">Outstanding</div>
											<div className={`text-xl font-bold ${paymentData.summary.hasOverdue ? 'text-red-600' : ''}`}>
												{formatCurrency(paymentData.summary.outstandingAmount)}
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						)}
					</div>
				</TabsContent>

				<TabsContent value="worksheet" className="mt-6">
					<div className="max-w-2xl space-y-6">
						{worksheetLoading ? (
							<div className="text-muted-foreground flex items-center gap-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								Loading worksheet...
							</div>
						) : !worksheet ? (
							<Card>
								<CardContent className="pt-6">
									<div className="text-center py-8">
										<ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
										<p className="text-muted-foreground mb-4">
											No memorial worksheet has been created for this job yet.
										</p>
										<Button
											onClick={handleCreateWorksheet}
											disabled={createWorksheetMutation.isPending}
										>
											{createWorksheetMutation.isPending ? (
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											) : (
												<Plus className="h-4 w-4 mr-2" />
											)}
											Create Memorial Worksheet
										</Button>
									</div>
								</CardContent>
							</Card>
						) : worksheetForm ? (
							<>
								<Card>
									<CardHeader>
										<div className="flex items-center justify-between">
											<div>
												<CardTitle>Memorial Worksheet</CardTitle>
												<CardDescription>
													Reference: {job.jobNumber}
												</CardDescription>
											</div>
											<div className="flex items-center gap-2">
												{worksheetSaved && (
													<span className="text-sm text-green-600 flex items-center gap-1">
														<Check className="h-4 w-4" />
														Saved
													</span>
												)}
												<Button
													variant="outline"
													size="sm"
													onClick={handleSaveWorksheet}
													disabled={updateWorksheetMutation.isPending}
												>
													{updateWorksheetMutation.isPending ? (
														<Loader2 className="h-4 w-4 mr-2 animate-spin" />
													) : (
														<Save className="h-4 w-4 mr-2" />
													)}
													Save
												</Button>
												<Link
													to={`/app/jobs/${id}/worksheet/print`}
													target="_blank"
												>
													<Button variant="outline" size="sm">
														<Printer className="h-4 w-4 mr-2" />
														Print
													</Button>
												</Link>
											</div>
										</div>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<Label htmlFor="ws-date">Date</Label>
												<Input
													id="ws-date"
													type="date"
													value={worksheetForm.date}
													onChange={(e) => updateWorksheetField('date', e.target.value)}
												/>
											</div>
											<div>
												<Label htmlFor="ws-deceased">Memorial Of</Label>
												<Input
													id="ws-deceased"
													placeholder="Name of deceased"
													value={worksheetForm.deceasedName}
													onChange={(e) => updateWorksheetField('deceasedName', e.target.value)}
												/>
											</div>
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<Label htmlFor="ws-cemetery">Cemetery / Churchyard</Label>
												<Input
													id="ws-cemetery"
													placeholder="Cemetery or churchyard name"
													value={worksheetForm.cemeteryChurchyard}
													onChange={(e) => updateWorksheetField('cemeteryChurchyard', e.target.value)}
												/>
											</div>
											<div>
												<Label htmlFor="ws-location">Location</Label>
												<Input
													id="ws-location"
													placeholder="Location details"
													value={worksheetForm.location}
													onChange={(e) => updateWorksheetField('location', e.target.value)}
												/>
											</div>
										</div>

										<div>
											<Label htmlFor="ws-existing">Existing Memorial Description</Label>
											<Input
												id="ws-existing"
												placeholder="Description of existing memorial"
												value={worksheetForm.existingDescription}
												onChange={(e) => updateWorksheetField('existingDescription', e.target.value)}
											/>
										</div>

										<div>
											<Label htmlFor="ws-requirements">Requirements</Label>
											<Textarea
												id="ws-requirements"
												placeholder="Describe the work required..."
												value={worksheetForm.requirements}
												onChange={(e) => updateWorksheetField('requirements', e.target.value)}
												rows={6}
											/>
										</div>

										<div>
											<Label htmlFor="ws-inscription">Proposed Inscription</Label>
											<Textarea
												id="ws-inscription"
												placeholder="Enter the proposed inscription text..."
												value={worksheetForm.inscription}
												onChange={(e) => updateWorksheetField('inscription', e.target.value)}
												rows={6}
												className="font-serif text-center"
											/>
										</div>
									</CardContent>
								</Card>
							</>
						) : null}
					</div>
				</TabsContent>

				<TabsContent value="files" className="mt-6">
					<div className="max-w-2xl space-y-6">
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<div>
										<CardTitle>Files & Attachments</CardTitle>
										<CardDescription>
											Artwork, proofs, and documents for this job
										</CardDescription>
									</div>
									<Button
										onClick={() => setShowUpload(true)}
										disabled={uploadProgress !== 'idle'}
									>
										<Upload className="h-4 w-4 mr-2" />
										Upload File
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								{/* Upload Form */}
								{showUpload && (
									<div className="mb-6 p-4 border rounded-lg bg-muted/50">
										<div className="flex items-center justify-between mb-4">
											<h4 className="font-medium">Upload New File</h4>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													setShowUpload(false);
													setUploadNotes('');
												}}
												disabled={uploadProgress !== 'idle'}
											>
												<X className="h-4 w-4" />
											</Button>
										</div>

										<div className="space-y-4">
											<div>
												<label className="text-sm text-muted-foreground block mb-1">Category</label>
												<Select
													value={uploadCategory}
													onValueChange={(v) => setUploadCategory(v as JobAttachmentCategory)}
													disabled={uploadProgress !== 'idle'}
												>
													<SelectTrigger className="w-full">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="artwork">Artwork</SelectItem>
														<SelectItem value="proof">Proof</SelectItem>
														<SelectItem value="document">Document</SelectItem>
													</SelectContent>
												</Select>
											</div>

											<div>
												<label className="text-sm text-muted-foreground block mb-1">Notes (optional)</label>
												<Input
													placeholder="Add a description..."
													value={uploadNotes}
													onChange={(e) => setUploadNotes(e.target.value)}
													disabled={uploadProgress !== 'idle'}
												/>
											</div>

											<div>
												<label className="text-sm text-muted-foreground block mb-1">File</label>
												{uploadProgress === 'idle' ? (
													<label className="flex items-center justify-center w-full h-24 px-4 transition bg-white border-2 border-dashed rounded-lg cursor-pointer hover:border-primary">
														<div className="flex flex-col items-center">
															<Upload className="h-8 w-8 text-muted-foreground mb-2" />
															<span className="text-sm text-muted-foreground">
																Click to select file (Images, PDFs)
															</span>
														</div>
														<input
															type="file"
															className="hidden"
															accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
															onChange={handleFileSelect}
														/>
													</label>
												) : (
													<div className="flex items-center justify-center h-24 bg-muted rounded-lg">
														<Loader2 className="h-6 w-6 animate-spin mr-2" />
														<span>
															{uploadProgress === 'uploading' ? 'Uploading...' : 'Saving...'}
														</span>
													</div>
												)}
											</div>
										</div>
									</div>
								)}

								{/* Filter */}
								{!attachmentsLoading && attachments && attachments.length > 0 && (
									<div className="flex items-center gap-2 mb-4">
										<span className="text-sm text-muted-foreground">Filter:</span>
										<Select
											value={categoryFilter}
											onValueChange={(v) => setCategoryFilter(v as JobAttachmentCategory | 'all')}
										>
											<SelectTrigger className="w-32">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All</SelectItem>
												<SelectItem value="artwork">Artwork</SelectItem>
												<SelectItem value="proof">Proof</SelectItem>
												<SelectItem value="document">Document</SelectItem>
											</SelectContent>
										</Select>
									</div>
								)}

								{/* Files List */}
								{attachmentsLoading ? (
									<div className="text-muted-foreground flex items-center gap-2">
										<Loader2 className="h-4 w-4 animate-spin" />
										Loading files...
									</div>
								) : filteredAttachments.length === 0 ? (
									<div className="text-muted-foreground text-center py-8">
										{attachments && attachments.length > 0
											? 'No files match the selected filter.'
											: 'No files uploaded yet.'}
									</div>
								) : (
									<div className="space-y-2">
										{filteredAttachments.map((attachment) => (
											<div
												key={attachment.id}
												className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
											>
												<div className="flex items-center gap-3">
													{getFileIcon(attachment.contentType)}
													<div>
														<div className="font-medium text-sm">{attachment.filename}</div>
														<div className="flex items-center gap-2 text-xs text-muted-foreground">
															<Badge variant="outline" className="text-xs">
																{formatAttachmentCategory(attachment.category)}
															</Badge>
															<span>{formatDate(attachment.createdAt)}</span>
															{attachment.size && (
																<span>{(attachment.size / 1024).toFixed(1)} KB</span>
															)}
														</div>
														{attachment.notes && (
															<div className="text-xs text-muted-foreground mt-1">
																{attachment.notes}
															</div>
														)}
													</div>
												</div>
												<div className="flex items-center gap-2">
													<a
														href={attachment.publicUrl}
														target="_blank"
														rel="noopener noreferrer"
													>
														<Button variant="ghost" size="sm">
															<ExternalLink className="h-4 w-4" />
														</Button>
													</a>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleDeleteAttachment(attachment.id)}
														disabled={deleteAttachmentMutation.isPending}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</div>
										))}
									</div>
								)}

								{/* File Count */}
								{attachments && attachments.length > 0 && (
									<div className="text-sm text-muted-foreground mt-4 pt-4 border-t">
										{filteredAttachments.length} of {attachments.length} file{attachments.length !== 1 ? 's' : ''}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
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
