import { useState, useEffect } from 'react';
import { useTenantSettingsQuery } from '@/hooks/use-tenant-settings';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
	useQuoteQuery,
	useUpdateQuoteStatusMutation,
	useDeleteQuoteMutation,
	useSendQuoteEmailMutation,
	useUpdateComponentPricingMutation,
	useUpdateLetteringPricingMutation,
	useUpdateSundryPricingMutation,
	useUpdateProductPricingMutation,
	useAddLineItemMutation,
	useUpdateLineItemMutation,
	useDeleteLineItemMutation,
	useCloneOptionMutation,
	useDeleteOptionMutation,
	useAcceptOptionMutation,
	useAddLetteringMutation,
	useUpdateLetteringMutation,
	useDeleteLetteringMutation,
	formatQuoteStatus,
	formatPriceRange,
	getNextQuoteStatus,
	getNextQuoteStatusLabel,
	QUOTE_TYPE_LABELS,
	type QuoteStatus,
	type QuoteType,
} from '@/hooks/use-quotes';
import { useCustomerView } from '@/contexts/customer-view-context';
import {
	ArrowLeft,
	Check,
	Loader2,
	Mail,
	MessageSquare,
	Plus,
	Copy,
	MoreHorizontal,
	ChevronDown,
	Trash2,
	X,
	Clock,
} from 'lucide-react';
import { DocumentsCard } from '@/components/documents';
import { useLineItemPresetsQuery } from '@/hooks/use-line-item-presets';
import { AddOptionDialog } from '@/components/quote/add-option-dialog';
import {
	SharedContextCard,
	OptionContent,
	CustomerView,
} from '@/components/quote/detail';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Quote status order for progress indicator
const QUOTE_STATUS_ORDER: QuoteStatus[] = ['draft', 'review', 'ready', 'presented', 'accepted'];

const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
	draft: 'bg-amber-500',
	review: 'bg-blue-500',
	ready: 'bg-purple-500',
	presented: 'bg-cyan-500',
	accepted: 'bg-green-600',
	rejected: 'bg-red-500',
	expired: 'bg-gray-400',
};

export function QuoteDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteOptionDialogOpen, setDeleteOptionDialogOpen] = useState(false);
	const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
	const [addOptionDialogOpen, setAddOptionDialogOpen] = useState(false);
	const [customMessage, setCustomMessage] = useState('');
	const [mutationError, setMutationError] = useState<string | null>(null);
	const { isCustomerView } = useCustomerView();
	const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

	const { data: settings } = useTenantSettingsQuery();
	const { data: pkg, isLoading, error } = useQuoteQuery(id);
	const updateStatusMutation = useUpdateQuoteStatusMutation();
	const deleteMutation = useDeleteQuoteMutation();
	const sendEmailMutation = useSendQuoteEmailMutation();
	const updateComponentPricing = useUpdateComponentPricingMutation();
	const updateLetteringPricing = useUpdateLetteringPricingMutation();
	const updateSundryPricing = useUpdateSundryPricingMutation();
	const updateProductPricing = useUpdateProductPricingMutation();
	const addLineItem = useAddLineItemMutation();
	const updateLineItem = useUpdateLineItemMutation();
	const deleteLineItem = useDeleteLineItemMutation();
	const cloneOptionMutation = useCloneOptionMutation();
	const deleteOptionMutation = useDeleteOptionMutation();
	const acceptOptionMutation = useAcceptOptionMutation();
	const addLetteringMutation = useAddLetteringMutation();
	const updateLetteringMutation = useUpdateLetteringMutation();
	const deleteLetteringMutation = useDeleteLetteringMutation();

	// Line item presets for dropdown
	const { data: lineItemPresets } = useLineItemPresetsQuery();
	const activePresets = lineItemPresets?.filter((p) => p.isActive) || [];

	// Set initial selected option when data loads
	useEffect(() => {
		if (pkg?.options && pkg.options.length > 0 && !selectedOptionId) {
			setSelectedOptionId(pkg.options[0].id);
		}
	}, [pkg, selectedOptionId]);

	// Get current option
	const currentOption = pkg?.options?.find((opt) => opt.id === selectedOptionId);

	// Can only edit pricing on draft quotes
	const canEditPricing = pkg?.status === 'draft';

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

	const handleStatusChange = async (newStatus: QuoteStatus) => {
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
			navigate('/app/quotes');
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to delete quote');
		}
	};

	const handleSendEmail = async () => {
		if (!id) return;
		setMutationError(null);
		try {
			await sendEmailMutation.mutateAsync({
				id,
				customMessage: customMessage || undefined,
			});
			setSendEmailDialogOpen(false);
			setCustomMessage('');
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to send email');
		}
	};

	const handleCloneOption = async () => {
		if (!id || !selectedOptionId) return;
		setMutationError(null);
		try {
			const result = await cloneOptionMutation.mutateAsync({
				packageId: id,
				optionId: selectedOptionId,
			});
			// Switch to the newly cloned option
			const newOption = result.options[result.options.length - 1];
			setSelectedOptionId(newOption.id);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to clone option');
		}
	};

	const handleDeleteOption = async () => {
		if (!id || !selectedOptionId || !pkg) return;
		try {
			const result = await deleteOptionMutation.mutateAsync({
				packageId: id,
				optionId: selectedOptionId,
			});
			setDeleteOptionDialogOpen(false);
			// Switch to first remaining option
			if (result.options.length > 0) {
				setSelectedOptionId(result.options[0].id);
			}
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to delete option');
		}
	};

	const handleAcceptOption = async (optionId: string) => {
		if (!id) return;
		setMutationError(null);
		try {
			const result = await acceptOptionMutation.mutateAsync({
				packageId: id,
				optionId,
			});
			// Navigate to the created job
			navigate(`/app/jobs/${result.jobId}`);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to accept option');
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Quote Details</h2>
				</div>
				<div className="text-muted-foreground">Loading quote...</div>
			</div>
		);
	}

	if (error || !pkg) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Quote Details</h2>
				</div>
				<div className="text-destructive">
					{error ? `Error loading quote: ${error.message}` : 'Quote not found'}
				</div>
				<Link to="/app/quotes">
					<Button variant="outline" className="mt-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Quotes
					</Button>
				</Link>
			</div>
		);
	}

	// Determine available actions based on status
	const canSendEmail = ['ready', 'presented'].includes(pkg.status) && !!(pkg.customerId || pkg.funeralDirectorId);
	const canAddOptions = pkg.status === 'draft';

	// Primary CTA and secondary actions
	const nextStatus = getNextQuoteStatus(pkg.status);
	const nextStatusLabel = getNextQuoteStatusLabel(pkg.status);

	// For "presented" status, accept is the primary CTA
	const isPresentedStatus = pkg.status === 'presented';

	// Build secondary actions
	const secondaryActions: { label: string; icon: React.ElementType; onClick: () => void; destructive?: boolean }[] = [];

	if (canSendEmail) {
		secondaryActions.push({
			label: `Send Email${pkg.emailSentCount > 0 ? ` (${pkg.emailSentCount})` : ''}`,
			icon: Mail,
			onClick: () => setSendEmailDialogOpen(true),
		});
	}

	if (isPresentedStatus) {
		secondaryActions.push({
			label: 'Reject',
			icon: X,
			onClick: () => handleStatusChange('rejected'),
			destructive: true,
		});
		secondaryActions.push({
			label: 'Mark Expired',
			icon: Clock,
			onClick: () => handleStatusChange('expired'),
			destructive: true,
		});
	}

	if (pkg.status === 'draft') {
		secondaryActions.push({
			label: 'Delete',
			icon: Trash2,
			onClick: () => setDeleteDialogOpen(true),
			destructive: true,
		});
	}

	// Get first quote number for display
	const firstQuoteNumber = pkg.options?.[0]?.quoteNumber || 'Draft';
	const optionCount = pkg.options?.length || 0;

	// Get customer/payer name
	const customerName =
		pkg.payerType === 'funeral_director' && pkg.funeralDirector
			? pkg.funeralDirector.tradingName || pkg.funeralDirector.businessName
			: pkg.customer
				? `${pkg.customer.firstName} ${pkg.customer.lastName}`
				: 'Walk-in Customer';

	// Calculate price range
	const priceRange =
		pkg.options?.length > 0
			? {
					minPrice: Math.min(...pkg.options.map((o) => parseFloat(o.total))).toFixed(2),
					maxPrice: Math.max(...pkg.options.map((o) => parseFloat(o.total))).toFixed(2),
				}
			: { minPrice: '0', maxPrice: '0' };

	return (
		<div>
			{/* Breadcrumb */}
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/quotes">Quotes</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{firstQuoteNumber}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Link to="/app/quotes">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<div className="flex items-center gap-3">
							<h2 className="text-2xl font-bold">{firstQuoteNumber}</h2>
							{pkg.quoteType && pkg.quoteType !== 'new_memorial' && (
								<Badge variant="outline">{QUOTE_TYPE_LABELS[pkg.quoteType as QuoteType]}</Badge>
							)}
						</div>
						<p className="text-muted-foreground mt-1">
							{customerName} &bull; {formatPriceRange(priceRange)}
						</p>
						{/* Status Progress Indicator */}
						<div className="flex items-center gap-3 mt-2">
							<div className="flex items-center gap-2">
								<div className={`w-2.5 h-2.5 rounded-full ${QUOTE_STATUS_COLORS[pkg.status]}`} />
								<span className="font-medium">{formatQuoteStatus(pkg.status)}</span>
							</div>
							<div className="flex items-center gap-1.5">
								{QUOTE_STATUS_ORDER.map((status, index) => {
									const currentIndex = ['rejected', 'expired'].includes(pkg.status)
										? QUOTE_STATUS_ORDER.indexOf('presented')
										: QUOTE_STATUS_ORDER.indexOf(pkg.status);
									const isFilled = index <= currentIndex;
									return (
										<div
											key={status}
											className={`w-4 h-1 rounded-full ${isFilled ? QUOTE_STATUS_COLORS[pkg.status] : 'bg-muted'}`}
										/>
									);
								})}
							</div>
						</div>
					</div>
				</div>
				{/* Consolidated Header Actions */}
				<div className="flex items-center gap-2">
					{/* Primary CTA */}
					{nextStatusLabel && (
						<Button
							onClick={() => nextStatus && handleStatusChange(nextStatus)}
							disabled={updateStatusMutation.isPending}
						>
							{updateStatusMutation.isPending ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : null}
							{nextStatusLabel}
						</Button>
					)}
					{isPresentedStatus && currentOption && (
						<Button
							onClick={() => handleAcceptOption(currentOption.id)}
							disabled={acceptOptionMutation.isPending}
						>
							{acceptOptionMutation.isPending ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : (
								<Check className="h-4 w-4 mr-2" />
							)}
							Accept {currentOption.quoteNumber}
						</Button>
					)}
					{/* Secondary Actions Dropdown */}
					{secondaryActions.length > 0 && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="icon">
									<MoreHorizontal className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{secondaryActions.map((action, i) => {
									const isFirstDestructive = action.destructive && (i === 0 || !secondaryActions[i - 1].destructive);
									return (
										<span key={action.label}>
											{isFirstDestructive && i > 0 && <DropdownMenuSeparator />}
											<DropdownMenuItem
												onClick={action.onClick}
												className={action.destructive ? 'text-destructive' : ''}
											>
												<action.icon className="h-4 w-4 mr-2" />
												{action.label}
											</DropdownMenuItem>
										</span>
									);
								})}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>

			{mutationError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">{mutationError}</div>
			)}

			{/* Customer View */}
			{isCustomerView && <CustomerView pkg={pkg} settings={settings} formatCurrency={formatCurrency} formatDate={formatDate} />}

			{/* Internal View */}
			{!isCustomerView && (
				<div className="space-y-6">
					{/* Shared Context Card */}
					<SharedContextCard pkg={pkg} formatDate={formatDate} />

					{/* Options Section */}
					<Card>
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<div>
									<CardTitle>Pricing Options</CardTitle>
								</div>
								{canAddOptions && (
									<Button variant="outline" onClick={() => setAddOptionDialogOpen(true)}>
										<Plus className="h-4 w-4 mr-2" />
										Add Option
									</Button>
								)}
							</div>
						</CardHeader>
						{pkg.options && pkg.options.length > 0 && (
							<div className="px-6 pb-4">
								<div className="flex items-center gap-2 border-b pb-4">
									{pkg.options.map((option) => (
										<div key={option.id} className="flex items-center">
											<Button
												variant={selectedOptionId === option.id ? 'default' : 'outline'}
												size="sm"
												onClick={() => setSelectedOptionId(option.id)}
												className="gap-2"
											>
												{option.quoteNumber}
												{option.optionLabel && (
													<span className="text-xs opacity-75">({option.optionLabel})</span>
												)}
												<span className="text-xs opacity-75">{formatCurrency(option.total)}</span>
											</Button>
											{selectedOptionId === option.id && canEditPricing && (
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-1">
															<ChevronDown className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem onClick={handleCloneOption}>
															<Copy className="h-4 w-4 mr-2" />
															Clone Option
														</DropdownMenuItem>
														{pkg.options.length > 1 && (
															<>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	className="text-destructive"
																	onClick={() => setDeleteOptionDialogOpen(true)}
																>
																	<Trash2 className="h-4 w-4 mr-2" />
																	Delete Option
																</DropdownMenuItem>
															</>
														)}
													</DropdownMenuContent>
												</DropdownMenu>
											)}
										</div>
									))}
								</div>
							</div>
						)}
						{currentOption && (
							<div className="px-6 pb-6">
								<OptionContent
									pkg={pkg}
									option={currentOption}
									canEditPricing={canEditPricing}
									formatCurrency={formatCurrency}
									updateComponentPricing={updateComponentPricing}
									updateLetteringPricing={updateLetteringPricing}
									updateSundryPricing={updateSundryPricing}
									updateProductPricing={updateProductPricing}
									addLineItem={addLineItem}
									updateLineItem={updateLineItem}
									deleteLineItem={deleteLineItem}
									addLetteringMutation={addLetteringMutation}
									updateLetteringMutation={updateLetteringMutation}
									deleteLetteringMutation={deleteLetteringMutation}
									activePresets={activePresets}
								/>
							</div>
						)}
					</Card>

					{/* Sidebar Content */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div className="lg:col-span-2">
							{/* Documents */}
							<DocumentsCard
								entityType="quote"
								entityId={pkg.id}
								title="Documents"
								description="Files and documents for this quote"
							/>
						</div>
						<div className="space-y-6">
							{/* Internal Notes */}
							{pkg.internalNotes && (
								<Card className="border-orange-200 bg-orange-50">
									<CardHeader className="pb-2">
										<CardTitle className="text-sm">Internal Notes</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-sm whitespace-pre-wrap">{pkg.internalNotes}</p>
									</CardContent>
								</Card>
							)}

							{/* Customer Feedback */}
							{(pkg.acceptedOptionId || pkg.customerFeedback) && (
								<Card className="border-blue-200 bg-blue-50">
									<CardHeader className="pb-2">
										<CardTitle className="text-sm flex items-center gap-2">
											<MessageSquare className="h-4 w-4" />
											Customer Response
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3">
										{pkg.acceptedOptionId && (
											<div className="flex items-center gap-2">
												<Badge className="bg-green-600">Accepted</Badge>
												{pkg.customerDecisionAt && (
													<span className="text-xs text-muted-foreground">
														on {formatDate(pkg.customerDecisionAt)}
													</span>
												)}
											</div>
										)}
										{pkg.customerFeedback && (
											<div className="bg-white p-3 rounded border">
												<p className="text-xs text-muted-foreground mb-1">Customer feedback:</p>
												<p className="text-sm whitespace-pre-wrap">"{pkg.customerFeedback}"</p>
											</div>
										)}
										{pkg.emailSentAt && (
											<div className="text-xs text-muted-foreground">
												Quote emailed {pkg.emailSentCount} time{pkg.emailSentCount !== 1 ? 's' : ''} - last
												sent {formatDate(pkg.emailSentAt)}
											</div>
										)}
									</CardContent>
								</Card>
							)}

							{/* Details Card */}
							<Card>
								<CardHeader>
									<CardTitle>Details</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<p className="text-sm font-medium text-muted-foreground">Created</p>
										<p>{formatDate(pkg.createdAt)}</p>
									</div>
									<div>
										<p className="text-sm font-medium text-muted-foreground">Updated</p>
										<p>{formatDate(pkg.updatedAt)}</p>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			)}

			{/* Delete Package Confirmation Dialog */}
			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDelete}
				title="Delete Quote"
				description={`Are you sure you want to delete this quote and all its options? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>

			{/* Delete Option Confirmation Dialog */}
			<DeleteConfirmDialog
				open={deleteOptionDialogOpen}
				onOpenChange={setDeleteOptionDialogOpen}
				onConfirm={handleDeleteOption}
				title="Delete Option"
				description={`Are you sure you want to delete option ${currentOption?.quoteNumber}? This action cannot be undone.`}
				isLoading={deleteOptionMutation.isPending}
			/>

			{/* Send Email Dialog */}
			<Dialog open={sendEmailDialogOpen} onOpenChange={setSendEmailDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Send Quote to Customer</DialogTitle>
						<DialogDescription>
							Send all {optionCount} option{optionCount !== 1 ? 's' : ''} to {customerName}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						{pkg.emailSentCount > 0 && (
							<div className="text-sm text-muted-foreground bg-muted p-3 rounded">
								This quote has been sent {pkg.emailSentCount} time{pkg.emailSentCount !== 1 ? 's' : ''} previously.
								{pkg.emailSentAt && <> Last sent on {formatDate(pkg.emailSentAt)}.</>}
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="customMessage">Custom Message (optional)</Label>
							<Textarea
								id="customMessage"
								placeholder="Add a personal message to include in the email..."
								value={customMessage}
								onChange={(e) => setCustomMessage(e.target.value)}
								rows={4}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setSendEmailDialogOpen(false);
								setCustomMessage('');
							}}
							disabled={sendEmailMutation.isPending}
						>
							Cancel
						</Button>
						<Button onClick={handleSendEmail} disabled={sendEmailMutation.isPending}>
							{sendEmailMutation.isPending ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Sending...
								</>
							) : (
								<>
									<Mail className="h-4 w-4 mr-2" />
									Send Email
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Add Option Dialog */}
			{pkg.options && (
				<AddOptionDialog
					open={addOptionDialogOpen}
					onOpenChange={setAddOptionDialogOpen}
					packageId={pkg.id}
					existingOptions={pkg.options}
				/>
			)}
		</div>
	);
}
