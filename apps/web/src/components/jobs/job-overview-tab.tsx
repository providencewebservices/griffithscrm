import {
	Calendar,
	Check,
	ChevronDown,
	ExternalLink,
	Loader2,
	Receipt,
	RefreshCw,
	Star,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { JobTasksSection } from '@/components/tasks/job-tasks-section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
	ACCOUNT_STATUSES,
	type AccountStatus,
	formatAccountStatus,
	getAccountStatusColor,
	type JobWithQuoteSummary,
	REVIEW_OUTCOMES,
	type ReviewOutcome,
	useMarkInvoicedMutation,
	useRecalculateAccountStatusMutation,
	useSubmitReviewMutation,
	useUpdateAccountStatusMutation,
	useUpdateJobDatesMutation,
	useUpdateJobNotesMutation,
} from '@/hooks/use-jobs';
import {
	QUOTE_TYPE_SECTION_CONFIG,
	type QuoteType,
} from '@/hooks/use-quotes';
import { useTasksQuery } from '@/hooks/use-tasks';
import { useTeamQuery } from '@/hooks/use-team';
import { JobNeedsAttention } from './job-needs-attention';
import { JobSpecificationsSection } from './job-specifications-section';
import { formatCurrency, formatDate, formatReviewOutcome, toDateInputValue } from './types';
import { useAutosave, type AutosaveStatus } from './use-autosave';

function AutosaveIndicator({ status }: { status: AutosaveStatus }) {
	if (status === 'saving') {
		return (
			<span className="text-sm text-muted-foreground flex items-center gap-1">
				<Loader2 className="h-3 w-3 animate-spin" />
				Saving...
			</span>
		);
	}
	if (status === 'saved') {
		return (
			<span className="text-sm text-green-600 flex items-center gap-1">
				<Check className="h-4 w-4" />
				Saved
			</span>
		);
	}
	if (status === 'error') {
		return <span className="text-sm text-destructive">Save failed</span>;
	}
	return null;
}

export function JobOverviewTab({
	jobId,
	job,
	onSwitchTab,
}: {
	jobId: string;
	job: JobWithQuoteSummary;
	onSwitchTab: (tab: string) => void;
}) {
	const [notes, setNotes] = useState(job.notes || '');
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
	const [invoiceNumber, setInvoiceNumber] = useState('');
	const [reviewOutcome, setReviewOutcome] = useState<ReviewOutcome | ''>('');
	const [reviewNotes, setReviewNotes] = useState('');

	const quoteType = job.quote.quoteType as QuoteType;
	const sectionConfig = QUOTE_TYPE_SECTION_CONFIG[quoteType];

	const updateNotesMutation = useUpdateJobNotesMutation();
	const updateDatesMutation = useUpdateJobDatesMutation();
	const markInvoicedMutation = useMarkInvoicedMutation();
	const updateAccountStatusMutation = useUpdateAccountStatusMutation();
	const recalculateAccountStatusMutation = useRecalculateAccountStatusMutation();
	const submitReviewMutation = useSubmitReviewMutation();
	const { data: teamMembers } = useTeamQuery();
	const { data: jobTasks } = useTasksQuery({ entityType: 'job', entityId: jobId });

	// Auto-save notes
	const { status: notesAutosaveStatus } = useAutosave({
		value: notes,
		onSave: async (val) => {
			await updateNotesMutation.mutateAsync({ id: jobId, notes: val || undefined });
		},
	});

	const handleDateChange = async (field: string, value: string) => {
		try {
			await updateDatesMutation.mutateAsync({
				id: jobId,
				dates: {
					[field]: value ? new Date(value).toISOString() : null,
				},
			});
			toast.success('Date updated');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update date');
		}
	};

	const handleMarkInvoiced = async () => {
		try {
			await markInvoicedMutation.mutateAsync({
				id: jobId,
				invoiceNumber: invoiceNumber || undefined,
			});
			setInvoiceDialogOpen(false);
			setInvoiceNumber('');
			toast.success('Job marked as invoiced');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to mark as invoiced');
		}
	};

	const handleAccountStatusChange = async (newStatus: string) => {
		try {
			await updateAccountStatusMutation.mutateAsync({
				id: jobId,
				accountStatus: newStatus as AccountStatus,
			});
			toast.success('Account status updated');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update account status');
		}
	};

	const handleRecalculateStatus = async () => {
		try {
			await recalculateAccountStatusMutation.mutateAsync(jobId);
			toast.success('Account status recalculated');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to recalculate status');
		}
	};

	return (
		<>
			{/* Needs Attention */}
			<JobNeedsAttention jobId={jobId} job={job} onSwitchTab={onSwitchTab} />

			{/* Two-column layout: Source Quote + Job Notes */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Source Quote Card */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Source Quote</CardTitle>
								<CardDescription>{job.quote.quoteNumber}</CardDescription>
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
								<p className="font-medium">{job.quote.product?.name || '\u2014'}</p>
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
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Job Notes</CardTitle>
								<CardDescription>Internal notes and progress updates</CardDescription>
							</div>
							<AutosaveIndicator status={notesAutosaveStatus} />
						</div>
					</CardHeader>
					<CardContent>
						<Textarea
							placeholder="Add notes about materials, special instructions, or progress updates..."
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={4}
						/>
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
							<span
								className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getAccountStatusColor(job.accountStatus)}`}
							>
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
												This will set the invoice date to now and update the account status to
												"Invoiced".
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
						<Label className="text-sm text-muted-foreground whitespace-nowrap">
							Account Status:
						</Label>
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

			{/* Post-Sales Review Section */}
			{(job.status === 'installed' || job.status === 'completed') && (
				<Card className="mt-6">
					<CardHeader>
						<div className="flex items-center gap-3">
							<CardTitle className="flex items-center gap-2">
								<Star className="h-5 w-5" />
								Post-Sales Review
							</CardTitle>
							{job.reviewOutcome && (
								<Badge
									variant={
										job.reviewOutcome === 'satisfied'
											? 'success'
											: job.reviewOutcome === 'issue_reported'
												? 'destructive'
												: job.reviewOutcome === 'follow_up_needed'
													? 'warning'
													: 'secondary'
									}
								>
									{formatReviewOutcome(job.reviewOutcome)}
								</Badge>
							)}
						</div>
					</CardHeader>
					<CardContent>
						{job.reviewCompletedAt ? (
							<div className="space-y-3">
								<div className="flex items-center gap-6 text-sm">
									<div>
										<span className="text-muted-foreground">Reviewed: </span>
										<span className="font-medium">{formatDate(job.reviewCompletedAt)}</span>
									</div>
									{job.reviewCompletedBy && (
										<div>
											<span className="text-muted-foreground">By: </span>
											<span className="font-medium">
												{teamMembers?.find((m) => m.id === job.reviewCompletedBy)?.name ||
													'Unknown'}
											</span>
										</div>
									)}
								</div>
								{job.reviewNotes && (
									<div>
										<p className="text-sm text-muted-foreground mb-1">Notes</p>
										<p className="text-sm whitespace-pre-wrap">{job.reviewNotes}</p>
									</div>
								)}
							</div>
						) : (
							<div className="space-y-4">
								<div>
									<Label htmlFor="review-outcome">Outcome</Label>
									<Select
										value={reviewOutcome}
										onValueChange={(v) => setReviewOutcome(v as ReviewOutcome)}
									>
										<SelectTrigger id="review-outcome" className="w-64">
											<SelectValue placeholder="Select outcome..." />
										</SelectTrigger>
										<SelectContent>
											{REVIEW_OUTCOMES.map((outcome) => (
												<SelectItem key={outcome} value={outcome}>
													{formatReviewOutcome(outcome)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label htmlFor="review-notes">Notes (optional)</Label>
									<Textarea
										id="review-notes"
										placeholder="Add any notes about the customer's feedback..."
										value={reviewNotes}
										onChange={(e) => setReviewNotes(e.target.value)}
										rows={3}
									/>
								</div>
								<Button
									onClick={async () => {
										if (!reviewOutcome) return;
										try {
											await submitReviewMutation.mutateAsync({
												id: jobId,
												reviewOutcome,
												reviewNotes: reviewNotes || undefined,
											});
											toast.success('Review submitted');
											setReviewOutcome('');
											setReviewNotes('');
										} catch (err) {
											toast.error(
												err instanceof Error ? err.message : 'Failed to submit review',
											);
										}
									}}
									disabled={!reviewOutcome || submitReviewMutation.isPending}
								>
									{submitReviewMutation.isPending ? (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									) : (
										<Star className="h-4 w-4 mr-2" />
									)}
									Submit Review
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Tasks Section */}
			<div className="mt-6">
				<JobTasksSection jobId={jobId} tasks={jobTasks} />
			</div>

			{/* Specifications (collapsible, formerly its own tab) */}
			<JobSpecificationsSection job={job} />

			{/* Collapsible Details Section */}
			<Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="mt-6">
				<CollapsibleTrigger asChild>
					<Button
						variant="ghost"
						className="w-full justify-between text-muted-foreground hover:text-foreground"
					>
						<span className="text-sm">Details</span>
						<ChevronDown
							className={`h-4 w-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
						/>
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="flex items-center gap-6 py-3 px-4 text-sm text-muted-foreground border-t">
						<span>
							Job ID: <span className="font-mono text-xs">{job.id}</span>
						</span>
						<span>&bull;</span>
						<span>Created: {formatDate(job.createdAt)}</span>
						<span>&bull;</span>
						<span>Updated: {formatDate(job.updatedAt)}</span>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</>
	);
}
