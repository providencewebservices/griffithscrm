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
	formatJobStatus,
	getNextJobStatus,
	getNextStatusButtonLabel,
	formatAttachmentCategory,
	type JobStatus,
	type PaymentScheduleItem,
	type JobAttachment,
	type JobAttachmentCategory,
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
} from 'lucide-react';
import { DocumentsCard } from '@/components/documents';
import { JobTasksSection } from '@/components/tasks/job-tasks-section';
import {
	useMemorialWorksheetQuery,
	useCreateMemorialWorksheetMutation,
	useUpdateMemorialWorksheetMutation,
	type MemorialWorksheet,
} from '@/hooks/use-memorial-worksheet';

// Job status order for progress calculation
const JOB_STATUS_ORDER: JobStatus[] = [
	'pending',
	'materials_ordered',
	'in_production',
	'ready_for_install',
	'installed',
	'completed',
];

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

	const { data: job, isLoading, error } = useJobQuery(id);
	const { data: paymentData, isLoading: paymentLoading } = usePaymentScheduleQuery(id);
	const { data: attachments, isLoading: attachmentsLoading } = useAttachmentsQuery(id);
	const { data: worksheet, isLoading: worksheetLoading } = useMemorialWorksheetQuery(id);
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

			{/* Header with compact inline status */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Link to="/app/jobs">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<h2 className="text-2xl font-bold">{job.jobNumber}</h2>
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
								{JOB_STATUS_ORDER.map((status, index) => {
									const currentIndex = JOB_STATUS_ORDER.indexOf(job.status);
									const isFilled = index <= currentIndex;
									return (
										<div
											key={status}
											className={`w-4 h-1 rounded-full ${isFilled ? 'bg-green-500' : 'bg-muted'}`}
										/>
									);
								})}
							</div>
							<span className="text-xs text-muted-foreground">
								Step {JOB_STATUS_ORDER.indexOf(job.status) + 1} of 6
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

			<Tabs defaultValue="overview" className="mt-4">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="payments" className="flex items-center gap-2">
						<CreditCard className="h-4 w-4" />
						Payments
						{paymentData?.summary?.hasOverdue && (
							<Badge variant="destructive" className="h-5 text-xs px-1.5">Late</Badge>
						)}
					</TabsTrigger>
					<TabsTrigger value="worksheet" className="flex items-center gap-2">
						<ClipboardList className="h-4 w-4" />
						Worksheet
					</TabsTrigger>
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
						<div>
							<p className="text-sm text-muted-foreground">Product</p>
							<p className="font-medium">
								{job.quote.product?.name || '—'}
							</p>
						</div>
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

			{/* Memorial Details Card */}
			{(job.quote.components.length > 0 ||
				job.quote.lettering.length > 0 ||
				job.quote.sundries.length > 0 ||
				job.quote.proposedInscription ||
				job.quote.flowerHoles) && (
				<Card className="mt-6">
					<CardHeader>
						<CardTitle>Memorial Details</CardTitle>
						<CardDescription>
							Specifications for this job
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Components */}
						{job.quote.components.length > 0 && (
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
						{job.quote.lettering.length > 0 && (
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
						{job.quote.proposedInscription && (
							<div>
								<h4 className="text-sm font-medium text-muted-foreground mb-2">INSCRIPTION</h4>
								<div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
									{job.quote.proposedInscription}
								</div>
							</div>
						)}

						{/* Sundries */}
						{job.quote.sundries.length > 0 && (
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
						{job.quote.flowerHoles && (
							<div>
								<h4 className="text-sm font-medium text-muted-foreground mb-2">FLOWER HOLES</h4>
								<div className="text-sm">
									{job.quote.flowerHoles.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}

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

					{/* Tasks Section */}
					<div className="mt-6">
						<JobTasksSection jobId={id!} />
					</div>
				</TabsContent>

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

			{/* Documents */}
			<div className="mt-6">
				<DocumentsCard
					entityType="job"
					entityId={job.id}
					title="Documents"
					description="Files and documents for this job"
				/>
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
