import { useState, useRef, useEffect } from 'react';
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	useQuoteQuery,
	useUpdateQuoteStatusMutation,
	useDeleteQuoteMutation,
	useSendQuoteEmailMutation,
	useUpdateComponentPricingMutation,
	useUpdateLetteringPricingMutation,
	useUpdateSundryPricingMutation,
	useAddLineItemMutation,
	useUpdateLineItemMutation,
	useDeleteLineItemMutation,
	useCloneOptionMutation,
	useDeleteOptionMutation,
	useAcceptOptionMutation,
	formatQuoteStatus,
	getQuoteStatusVariant,
	formatComponentType,
	formatPriceRange,
	QUOTE_TYPE_LABELS,
	type QuoteStatus,
	type QuoteType,
	type QuoteOption,
	type QuotePackageWithOptions,
} from '@/hooks/use-quotes';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	ArrowLeft,
	Send,
	Check,
	X,
	Clock,
	Trash2,
	Eye,
	EyeOff,
	Loader2,
	Mail,
	MessageSquare,
	Plus,
	Copy,
	MoreVertical,
	ChevronDown,
} from 'lucide-react';
import { DocumentsCard } from '@/components/documents';
import { useLineItemPresetsQuery } from '@/hooks/use-line-item-presets';
import { AddOptionDialog } from '@/components/quote/add-option-dialog';

// Editable number component for inline editing
function EditableNumber({
	value,
	onSave,
	disabled,
	isCurrency = false,
	formatValue,
	min = 0,
	step = 0.01,
}: {
	value: number;
	onSave: (value: number) => Promise<void>;
	disabled?: boolean;
	isCurrency?: boolean;
	formatValue?: (val: number) => string;
	min?: number;
	step?: number;
}) {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState(String(value));
	const [isSaving, setIsSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	const handleSave = async () => {
		const numValue = parseFloat(editValue);
		if (isNaN(numValue) || numValue < min) {
			setEditValue(String(value));
			setIsEditing(false);
			return;
		}

		if (numValue === value) {
			setIsEditing(false);
			return;
		}

		setIsSaving(true);
		try {
			await onSave(numValue);
			setIsEditing(false);
		} catch (error) {
			setEditValue(String(value));
		} finally {
			setIsSaving(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSave();
		} else if (e.key === 'Escape') {
			setEditValue(String(value));
			setIsEditing(false);
		}
	};

	if (disabled) {
		const displayValue = formatValue
			? formatValue(value)
			: isCurrency
				? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
				: value.toFixed(2);
		return <span>{displayValue}</span>;
	}

	if (isEditing) {
		return (
			<div className="flex items-center gap-1">
				{isCurrency && <span className="text-muted-foreground">£</span>}
				<Input
					ref={inputRef}
					type="number"
					value={editValue}
					onChange={(e) => setEditValue(e.target.value)}
					onBlur={handleSave}
					onKeyDown={handleKeyDown}
					min={min}
					step={step}
					className="h-7 w-20 text-right"
					disabled={isSaving}
				/>
				{isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
			</div>
		);
	}

	const displayValue = formatValue
		? formatValue(value)
		: isCurrency
			? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
			: value.toFixed(2);

	return (
		<button
			type="button"
			onClick={() => {
				setEditValue(String(value));
				setIsEditing(true);
			}}
			className="hover:bg-muted px-1 py-0.5 rounded cursor-pointer text-left"
			title="Click to edit"
		>
			{displayValue}
		</button>
	);
}

type ViewMode = 'internal' | 'customer';

export function QuoteDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteOptionDialogOpen, setDeleteOptionDialogOpen] = useState(false);
	const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
	const [addOptionDialogOpen, setAddOptionDialogOpen] = useState(false);
	const [customMessage, setCustomMessage] = useState('');
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>('internal');
	const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

	const { data: pkg, isLoading, error } = useQuoteQuery(id);
	const updateStatusMutation = useUpdateQuoteStatusMutation();
	const deleteMutation = useDeleteQuoteMutation();
	const sendEmailMutation = useSendQuoteEmailMutation();
	const updateComponentPricing = useUpdateComponentPricingMutation();
	const updateLetteringPricing = useUpdateLetteringPricingMutation();
	const updateSundryPricing = useUpdateSundryPricingMutation();
	const addLineItem = useAddLineItemMutation();
	const updateLineItem = useUpdateLineItemMutation();
	const deleteLineItem = useDeleteLineItemMutation();
	const cloneOptionMutation = useCloneOptionMutation();
	const deleteOptionMutation = useDeleteOptionMutation();
	const acceptOptionMutation = useAcceptOptionMutation();

	// Line item presets for dropdown
	const { data: lineItemPresets } = useLineItemPresetsQuery();
	const activePresets = lineItemPresets?.filter((p) => p.isActive) || [];

	// State for new line item input
	const [newLineItemPresetId, setNewLineItemPresetId] = useState<string>('');
	const [newLineItemDesc, setNewLineItemDesc] = useState('');
	const [newLineItemPrice, setNewLineItemPrice] = useState('');
	const [newLineItemVatExempt, setNewLineItemVatExempt] = useState(false);
	const [newLineItemVisibleToCustomer, setNewLineItemVisibleToCustomer] = useState(true);

	// Set initial selected option when data loads
	useEffect(() => {
		if (pkg?.options && pkg.options.length > 0 && !selectedOptionId) {
			setSelectedOptionId(pkg.options[0].id);
		}
	}, [pkg, selectedOptionId]);

	// Handle preset selection - auto-fill fields
	const handlePresetSelect = (presetId: string) => {
		setNewLineItemPresetId(presetId);
		if (presetId === 'custom') {
			setNewLineItemDesc('');
			setNewLineItemPrice('');
			setNewLineItemVatExempt(false);
			setNewLineItemVisibleToCustomer(true);
		} else {
			const preset = activePresets.find((p) => p.id === presetId);
			if (preset) {
				setNewLineItemDesc(preset.name);
				setNewLineItemPrice(preset.defaultPrice);
				setNewLineItemVatExempt(preset.vatExempt);
				setNewLineItemVisibleToCustomer(preset.visibleToCustomer);
			}
		}
	};

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
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
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
	const canPresent = ['draft', 'ready'].includes(pkg.status);
	const canMarkReady = pkg.status === 'draft' || pkg.status === 'review';
	const canAccept = pkg.status === 'presented';
	const canReject = pkg.status === 'presented';
	const canExpire = pkg.status === 'presented';
	const canDelete = pkg.status === 'draft';
	const canSendEmail = ['ready', 'presented'].includes(pkg.status) && !!pkg.customerId;
	const canAddOptions = pkg.status === 'draft';

	// Get first quote number for display
	const firstQuoteNumber = pkg.options?.[0]?.quoteNumber || 'Draft';
	const optionCount = pkg.options?.length || 0;

	// Get customer name
	const customerName = pkg.customer
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
						<BreadcrumbPage>
							{firstQuoteNumber}
							{optionCount > 1 && ` (+${optionCount - 1})`}
						</BreadcrumbPage>
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
							<h2 className="text-2xl font-bold">
								{firstQuoteNumber}
								{optionCount > 1 && (
									<span className="text-muted-foreground ml-2">(+{optionCount - 1} options)</span>
								)}
							</h2>
							<Badge variant={getQuoteStatusVariant(pkg.status)}>{formatQuoteStatus(pkg.status)}</Badge>
							{pkg.quoteType && pkg.quoteType !== 'new_memorial' && (
								<Badge variant="outline">{QUOTE_TYPE_LABELS[pkg.quoteType as QuoteType]}</Badge>
							)}
						</div>
						<p className="text-muted-foreground mt-1">
							{customerName} &bull; {formatPriceRange(priceRange)}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{canMarkReady && (
						<Button
							variant="outline"
							onClick={() => handleStatusChange('ready')}
							disabled={updateStatusMutation.isPending}
						>
							<Check className="h-4 w-4 mr-2" />
							Mark Ready
						</Button>
					)}
					{canPresent && (
						<Button onClick={() => handleStatusChange('presented')} disabled={updateStatusMutation.isPending}>
							<Send className="h-4 w-4 mr-2" />
							Present to Customer
						</Button>
					)}
					{canAccept && currentOption && (
						<Button
							onClick={() => handleAcceptOption(currentOption.id)}
							disabled={acceptOptionMutation.isPending}
						>
							<Check className="h-4 w-4 mr-2" />
							Accept {currentOption.quoteNumber}
						</Button>
					)}
					{canReject && (
						<Button
							variant="outline"
							onClick={() => handleStatusChange('rejected')}
							disabled={updateStatusMutation.isPending}
						>
							<X className="h-4 w-4 mr-2" />
							Reject
						</Button>
					)}
					{canExpire && (
						<Button
							variant="outline"
							onClick={() => handleStatusChange('expired')}
							disabled={updateStatusMutation.isPending}
						>
							<Clock className="h-4 w-4 mr-2" />
							Mark Expired
						</Button>
					)}
					{canSendEmail && (
						<Button
							variant="outline"
							onClick={() => setSendEmailDialogOpen(true)}
							disabled={sendEmailMutation.isPending}
						>
							<Mail className="h-4 w-4 mr-2" />
							Send Email
							{pkg.emailSentCount > 0 && (
								<Badge variant="secondary" className="ml-2">
									{pkg.emailSentCount}
								</Badge>
							)}
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
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">{mutationError}</div>
			)}

			{/* View Mode Toggle */}
			<div className="flex items-center justify-between mb-6">
				<Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
					<TabsList>
						<TabsTrigger value="internal" className="gap-2">
							<Eye className="h-4 w-4" />
							Internal View
						</TabsTrigger>
						<TabsTrigger value="customer" className="gap-2">
							<EyeOff className="h-4 w-4" />
							Customer View
						</TabsTrigger>
					</TabsList>
				</Tabs>
				{viewMode === 'internal' && (
					<div className="text-sm text-muted-foreground">Showing internal pricing details</div>
				)}
			</div>

			{/* Customer View */}
			{viewMode === 'customer' && <CustomerView pkg={pkg} formatCurrency={formatCurrency} formatDate={formatDate} />}

			{/* Internal View */}
			{viewMode === 'internal' && (
				<div className="space-y-6">
					{/* Shared Context Card */}
					<SharedContextCard pkg={pkg} formatDate={formatDate} />

					{/* Options Section */}
					<Card>
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<div>
									<CardTitle>Pricing Options</CardTitle>
									<CardDescription>
										{optionCount} option{optionCount !== 1 ? 's' : ''} for this quote
									</CardDescription>
								</div>
								{canAddOptions && (
									<Button variant="outline" onClick={() => setAddOptionDialogOpen(true)}>
										<Plus className="h-4 w-4 mr-2" />
										Add Option
									</Button>
								)}
							</div>
						</CardHeader>
						<CardContent>
							{/* Option Tabs */}
							{pkg.options && pkg.options.length > 0 && (
								<div className="flex items-center gap-2 mb-6 border-b pb-4">
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
							)}

							{/* Option Content */}
							{currentOption && (
								<OptionContent
									pkg={pkg}
									option={currentOption}
									canEditPricing={canEditPricing}
									formatCurrency={formatCurrency}
									updateComponentPricing={updateComponentPricing}
									updateLetteringPricing={updateLetteringPricing}
									updateSundryPricing={updateSundryPricing}
									addLineItem={addLineItem}
									updateLineItem={updateLineItem}
									deleteLineItem={deleteLineItem}
									activePresets={activePresets}
									newLineItemPresetId={newLineItemPresetId}
									setNewLineItemPresetId={setNewLineItemPresetId}
									newLineItemDesc={newLineItemDesc}
									setNewLineItemDesc={setNewLineItemDesc}
									newLineItemPrice={newLineItemPrice}
									setNewLineItemPrice={setNewLineItemPrice}
									newLineItemVatExempt={newLineItemVatExempt}
									setNewLineItemVatExempt={setNewLineItemVatExempt}
									newLineItemVisibleToCustomer={newLineItemVisibleToCustomer}
									setNewLineItemVisibleToCustomer={setNewLineItemVisibleToCustomer}
									handlePresetSelect={handlePresetSelect}
								/>
							)}
						</CardContent>
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
									<div>
										<p className="text-sm font-medium text-muted-foreground">Package ID</p>
										<p className="font-mono text-xs">{pkg.id}</p>
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

// Shared Context Card - shows package-level information
function SharedContextCard({
	pkg,
	formatDate,
}: {
	pkg: QuotePackageWithOptions;
	formatDate: (dateString: string) => string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Quote Context</CardTitle>
				<CardDescription>Shared information across all options</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div>
						<p className="text-sm font-medium text-muted-foreground">Customer</p>
						<p>
							{pkg.customer ? (
								<Link to={`/app/contacts/${pkg.customerId}`} className="text-primary hover:underline">
									{pkg.customer.firstName} {pkg.customer.lastName}
								</Link>
							) : (
								'Walk-in Customer'
							)}
						</p>
					</div>
					{pkg.quoteType && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Quote Type</p>
							<p>{QUOTE_TYPE_LABELS[pkg.quoteType as QuoteType]}</p>
						</div>
					)}
					{pkg.validUntil && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Valid Until</p>
							<p>{formatDate(pkg.validUntil)}</p>
						</div>
					)}
					{pkg.funeralDirector && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Funeral Director</p>
							<p>{pkg.funeralDirector.name}</p>
						</div>
					)}
					{pkg.council && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Council</p>
							<p>{pkg.council.name}</p>
						</div>
					)}
					{pkg.memorialSite && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Memorial Site</p>
							<p>{pkg.memorialSite.name}</p>
						</div>
					)}
				</div>

				{pkg.proposedInscription && (
					<div className="mt-4 pt-4 border-t">
						<p className="text-sm font-medium text-muted-foreground mb-2">
							Proposed Inscription ({pkg.proposedInscription.length} characters)
						</p>
						<p className="whitespace-pre-wrap bg-muted p-3 rounded font-mono text-sm">{pkg.proposedInscription}</p>
					</div>
				)}

				{pkg.existingMemorialDescription && (
					<div className="mt-4 pt-4 border-t">
						<p className="text-sm font-medium text-muted-foreground mb-2">Existing Memorial Description</p>
						<p className="whitespace-pre-wrap bg-muted p-3 rounded text-sm">{pkg.existingMemorialDescription}</p>
					</div>
				)}

				{pkg.notes && (
					<div className="mt-4 pt-4 border-t">
						<p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
						<p className="whitespace-pre-wrap text-sm">{pkg.notes}</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// Option Content - shows per-option line items and pricing
function OptionContent({
	pkg,
	option,
	canEditPricing,
	formatCurrency,
	updateComponentPricing,
	updateLetteringPricing,
	updateSundryPricing,
	addLineItem,
	updateLineItem,
	deleteLineItem,
	activePresets,
	newLineItemPresetId,
	setNewLineItemPresetId,
	newLineItemDesc,
	setNewLineItemDesc,
	newLineItemPrice,
	setNewLineItemPrice,
	newLineItemVatExempt,
	setNewLineItemVatExempt,
	newLineItemVisibleToCustomer,
	setNewLineItemVisibleToCustomer,
	handlePresetSelect,
}: {
	pkg: QuotePackageWithOptions;
	option: QuoteOption;
	canEditPricing: boolean;
	formatCurrency: (value: string | number) => string;
	updateComponentPricing: ReturnType<typeof useUpdateComponentPricingMutation>;
	updateLetteringPricing: ReturnType<typeof useUpdateLetteringPricingMutation>;
	updateSundryPricing: ReturnType<typeof useUpdateSundryPricingMutation>;
	addLineItem: ReturnType<typeof useAddLineItemMutation>;
	updateLineItem: ReturnType<typeof useUpdateLineItemMutation>;
	deleteLineItem: ReturnType<typeof useDeleteLineItemMutation>;
	activePresets: { id: string; name: string; defaultPrice: string; vatExempt: boolean; visibleToCustomer: boolean }[];
	newLineItemPresetId: string;
	setNewLineItemPresetId: (value: string) => void;
	newLineItemDesc: string;
	setNewLineItemDesc: (value: string) => void;
	newLineItemPrice: string;
	setNewLineItemPrice: (value: string) => void;
	newLineItemVatExempt: boolean;
	setNewLineItemVatExempt: (value: boolean) => void;
	newLineItemVisibleToCustomer: boolean;
	setNewLineItemVisibleToCustomer: (value: boolean) => void;
	handlePresetSelect: (presetId: string) => void;
}) {
	return (
		<div className="space-y-6">
			{/* Product Info */}
			{option.product && (
				<div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
					<div>
						<p className="text-sm font-medium text-muted-foreground">Product</p>
						<p className="font-semibold">{option.product.name}</p>
					</div>
					{option.flowerHoles && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Flower Holes</p>
							<p>{option.flowerHoles.replace(/_/g, ' ')}</p>
						</div>
					)}
				</div>
			)}

			{/* Components */}
			{option.components.length > 0 && (
				<div>
					<h4 className="font-medium mb-3">
						Stone Components ({option.components.length} item{option.components.length !== 1 ? 's' : ''})
					</h4>
					<div className="border rounded-lg overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Type</TableHead>
									<TableHead>Material</TableHead>
									<TableHead>Dimensions</TableHead>
									<TableHead className="text-center">Qty</TableHead>
									<TableHead className="text-right text-orange-600">Supplier</TableHead>
									<TableHead className="text-center">Markup</TableHead>
									<TableHead className="text-right">Retail</TableHead>
									<TableHead className="text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{option.components.map((comp) => (
									<TableRow key={comp.id}>
										<TableCell className="font-medium">{formatComponentType(comp.componentType)}</TableCell>
										<TableCell>
											{comp.materialName || '-'}
											{comp.finishName && (
												<span className="text-muted-foreground text-xs block">{comp.finishName}</span>
											)}
										</TableCell>
										<TableCell className="text-sm">
											{comp.height && comp.width && comp.depth
												? `${comp.height}" × ${comp.width}" × ${comp.depth}"`
												: '-'}
										</TableCell>
										<TableCell className="text-center">{comp.quantity}</TableCell>
										<TableCell className="text-right text-orange-600">
											<EditableNumber
												value={parseFloat(comp.supplierCost)}
												onSave={async (value) => {
													await updateComponentPricing.mutateAsync({
														packageId: pkg.id,
														optionId: option.id,
														itemId: comp.id,
														supplierCost: value,
													});
												}}
												disabled={!canEditPricing}
												isCurrency
											/>
										</TableCell>
										<TableCell className="text-center text-muted-foreground text-sm">
											<EditableNumber
												value={parseFloat(comp.markupPercent)}
												onSave={async (value) => {
													await updateComponentPricing.mutateAsync({
														packageId: pkg.id,
														optionId: option.id,
														itemId: comp.id,
														markupPercent: value,
													});
												}}
												disabled={!canEditPricing}
												min={0}
												formatValue={(val) => `${val.toFixed(0)}%`}
											/>
										</TableCell>
										<TableCell className="text-right">{formatCurrency(comp.unitPrice)}</TableCell>
										<TableCell className="text-right font-medium">{formatCurrency(comp.lineTotal)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			)}

			{/* Lettering */}
			{option.lettering.length > 0 && (
				<div>
					<h4 className="font-medium mb-3">
						Lettering ({option.lettering.length} item{option.lettering.length !== 1 ? 's' : ''})
					</h4>
					<div className="border rounded-lg overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Technique</TableHead>
									<TableHead>Color</TableHead>
									<TableHead>Text</TableHead>
									<TableHead className="text-center">Letters</TableHead>
									<TableHead className="text-right text-orange-600">Cost/Letter</TableHead>
									<TableHead className="text-center">Markup</TableHead>
									<TableHead className="text-right">Retail</TableHead>
									<TableHead className="text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{option.lettering.map((lett) => (
									<TableRow key={lett.id}>
										<TableCell className="font-medium">{lett.techniqueName || '-'}</TableCell>
										<TableCell>{lett.colorName || '-'}</TableCell>
										<TableCell className="max-w-[200px] truncate">{lett.text || '-'}</TableCell>
										<TableCell className="text-center">{lett.letterCount}</TableCell>
										<TableCell className="text-right text-orange-600">
											<EditableNumber
												value={parseFloat(lett.supplierCost)}
												onSave={async (value) => {
													await updateLetteringPricing.mutateAsync({
														packageId: pkg.id,
														optionId: option.id,
														itemId: lett.id,
														supplierCost: value,
													});
												}}
												disabled={!canEditPricing}
												isCurrency
											/>
										</TableCell>
										<TableCell className="text-center text-muted-foreground text-sm">
											<EditableNumber
												value={parseFloat(lett.markupPercent)}
												onSave={async (value) => {
													await updateLetteringPricing.mutateAsync({
														packageId: pkg.id,
														optionId: option.id,
														itemId: lett.id,
														markupPercent: value,
													});
												}}
												disabled={!canEditPricing}
												min={0}
												formatValue={(val) => `${val.toFixed(0)}%`}
											/>
										</TableCell>
										<TableCell className="text-right">{formatCurrency(lett.unitPrice)}</TableCell>
										<TableCell className="text-right font-medium">{formatCurrency(lett.lineTotal)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			)}

			{/* Sundries */}
			{option.sundries.length > 0 && (
				<div>
					<h4 className="font-medium mb-3">
						Sundries ({option.sundries.length} item{option.sundries.length !== 1 ? 's' : ''})
					</h4>
					<div className="border rounded-lg overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Item</TableHead>
									<TableHead className="text-center">Qty</TableHead>
									<TableHead className="text-right text-orange-600">Supplier</TableHead>
									<TableHead className="text-center">Markup</TableHead>
									<TableHead className="text-right">Retail</TableHead>
									<TableHead className="text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{option.sundries.map((sundry) => (
									<TableRow key={sundry.id}>
										<TableCell className="font-medium">{sundry.sundryName || '-'}</TableCell>
										<TableCell className="text-center">{sundry.quantity}</TableCell>
										<TableCell className="text-right text-orange-600">
											<EditableNumber
												value={parseFloat(sundry.supplierCost)}
												onSave={async (value) => {
													await updateSundryPricing.mutateAsync({
														packageId: pkg.id,
														optionId: option.id,
														itemId: sundry.id,
														supplierCost: value,
													});
												}}
												disabled={!canEditPricing}
												isCurrency
											/>
										</TableCell>
										<TableCell className="text-center text-muted-foreground text-sm">
											<EditableNumber
												value={parseFloat(sundry.markupPercent)}
												onSave={async (value) => {
													await updateSundryPricing.mutateAsync({
														packageId: pkg.id,
														optionId: option.id,
														itemId: sundry.id,
														markupPercent: value,
													});
												}}
												disabled={!canEditPricing}
												min={0}
												formatValue={(val) => `${val.toFixed(0)}%`}
											/>
										</TableCell>
										<TableCell className="text-right">{formatCurrency(sundry.unitPrice)}</TableCell>
										<TableCell className="text-right font-medium">{formatCurrency(sundry.lineTotal)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			)}

			{/* Custom Line Items */}
			<div>
				<h4 className="font-medium mb-3">Custom Line Items</h4>
				{option.lineItems && option.lineItems.length > 0 ? (
					<div className="border rounded-lg overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Description</TableHead>
									<TableHead className="text-right w-32">Price</TableHead>
									<TableHead className="text-center w-24">VAT Exempt</TableHead>
									<TableHead className="text-center w-20">Visible</TableHead>
									{canEditPricing && <TableHead className="w-16"></TableHead>}
								</TableRow>
							</TableHeader>
							<TableBody>
								{option.lineItems.map((item) => (
									<TableRow key={item.id}>
										<TableCell>
											{canEditPricing ? (
												<Input
													defaultValue={item.description}
													onBlur={async (e) => {
														if (e.target.value !== item.description) {
															await updateLineItem.mutateAsync({
																packageId: pkg.id,
																optionId: option.id,
																itemId: item.id,
																description: e.target.value,
															});
														}
													}}
													className="h-8"
												/>
											) : (
												item.description
											)}
										</TableCell>
										<TableCell className="text-right">
											<EditableNumber
												value={parseFloat(item.price)}
												onSave={async (value) => {
													await updateLineItem.mutateAsync({
														packageId: pkg.id,
														optionId: option.id,
														itemId: item.id,
														price: value,
													});
												}}
												disabled={!canEditPricing}
												isCurrency
											/>
										</TableCell>
										<TableCell className="text-center">
											<Checkbox
												checked={item.vatExempt}
												onCheckedChange={async (checked) => {
													await updateLineItem.mutateAsync({
														packageId: pkg.id,
														optionId: option.id,
														itemId: item.id,
														vatExempt: checked === true,
													});
												}}
												disabled={!canEditPricing}
											/>
										</TableCell>
										<TableCell className="text-center">
											{canEditPricing ? (
												<Checkbox
													checked={item.visibleToCustomer}
													onCheckedChange={async (checked) => {
														await updateLineItem.mutateAsync({
															packageId: pkg.id,
															optionId: option.id,
															itemId: item.id,
															visibleToCustomer: checked === true,
														});
													}}
												/>
											) : item.visibleToCustomer ? (
												<Eye className="h-4 w-4 mx-auto text-muted-foreground" />
											) : (
												<EyeOff className="h-4 w-4 mx-auto text-muted-foreground" />
											)}
										</TableCell>
										{canEditPricing && (
											<TableCell>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 text-destructive"
													onClick={async () => {
														await deleteLineItem.mutateAsync({
															packageId: pkg.id,
															optionId: option.id,
															itemId: item.id,
														});
													}}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</TableCell>
										)}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">No custom line items added.</p>
				)}

				{/* Add new line item form */}
				{canEditPricing && (
					<div className="mt-4 space-y-3">
						<div className="flex items-end gap-2">
							<div className="w-48">
								<Label htmlFor="lineItemPreset" className="text-xs">
									Line Item
								</Label>
								<Select value={newLineItemPresetId} onValueChange={handlePresetSelect}>
									<SelectTrigger id="lineItemPreset" className="h-9">
										<SelectValue placeholder="Select a line item..." />
									</SelectTrigger>
									<SelectContent>
										{activePresets.map((preset) => (
											<SelectItem key={preset.id} value={preset.id}>
												{preset.name} ({formatCurrency(preset.defaultPrice)})
											</SelectItem>
										))}
										<SelectItem value="custom">Custom (free-form)</SelectItem>
									</SelectContent>
								</Select>
							</div>
							{newLineItemPresetId === 'custom' && (
								<div className="flex-1">
									<Label htmlFor="lineItemDesc" className="text-xs">
										Description
									</Label>
									<Input
										id="lineItemDesc"
										placeholder="e.g., Labor, Delivery"
										value={newLineItemDesc}
										onChange={(e) => setNewLineItemDesc(e.target.value)}
										className="h-9"
									/>
								</div>
							)}
							<div className="w-28">
								<Label htmlFor="lineItemPrice" className="text-xs">
									Price
								</Label>
								<Input
									id="lineItemPrice"
									type="number"
									min="0"
									step="0.01"
									placeholder="0.00"
									value={newLineItemPrice}
									onChange={(e) => setNewLineItemPrice(e.target.value)}
									className="h-9"
								/>
							</div>
						</div>
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								<Checkbox
									id="lineItemVatExempt"
									checked={newLineItemVatExempt}
									onCheckedChange={(checked) => setNewLineItemVatExempt(checked === true)}
								/>
								<Label htmlFor="lineItemVatExempt" className="text-xs whitespace-nowrap">
									VAT Exempt
								</Label>
							</div>
							<div className="flex items-center gap-2">
								<Checkbox
									id="lineItemVisibleToCustomer"
									checked={newLineItemVisibleToCustomer}
									onCheckedChange={(checked) => setNewLineItemVisibleToCustomer(checked === true)}
								/>
								<Label htmlFor="lineItemVisibleToCustomer" className="text-xs whitespace-nowrap">
									Visible to Customer
								</Label>
							</div>
							<div className="flex-1"></div>
							<Button
								size="sm"
								className="h-9"
								onClick={async () => {
									if (!newLineItemDesc.trim() || !newLineItemPrice) return;
									await addLineItem.mutateAsync({
										packageId: pkg.id,
										optionId: option.id,
										description: newLineItemDesc.trim(),
										price: parseFloat(newLineItemPrice),
										vatExempt: newLineItemVatExempt,
										visibleToCustomer: newLineItemVisibleToCustomer,
									});
									setNewLineItemPresetId('');
									setNewLineItemDesc('');
									setNewLineItemPrice('');
									setNewLineItemVatExempt(false);
									setNewLineItemVisibleToCustomer(true);
								}}
								disabled={!newLineItemDesc.trim() || !newLineItemPrice || addLineItem.isPending}
							>
								<Plus className="h-4 w-4 mr-1" />
								Add
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Pricing Summary */}
			<div className="border-t pt-6">
				<div className="grid grid-cols-2 gap-6">
					<div className="space-y-3">
						<h4 className="font-medium">Pricing Summary</h4>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Subtotal</span>
							<span>{formatCurrency(option.subtotal)}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">
								VAT ({(parseFloat(option.vatRate) * 100).toFixed(0)}%)
							</span>
							<span>{formatCurrency(option.vatAmount)}</span>
						</div>
						<div className="border-t pt-2 flex justify-between font-bold text-lg">
							<span>Total</span>
							<span>{formatCurrency(option.total)}</span>
						</div>
					</div>
					<div className="space-y-3">
						<h4 className="font-medium">Internal Metrics</h4>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Total Cost</span>
							<span className="text-orange-600">{formatCurrency(option.totalCost)}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Gross Margin</span>
							<span className="text-green-600">
								{formatCurrency(
									parseFloat(option.total) - parseFloat(option.vatAmount) - parseFloat(option.totalCost)
								)}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Margin %</span>
							<span className="text-green-600">
								{(
									((parseFloat(option.total) - parseFloat(option.vatAmount) - parseFloat(option.totalCost)) /
										(parseFloat(option.total) - parseFloat(option.vatAmount))) *
									100
								).toFixed(1)}
								%
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// Customer View - clean presentation for customer
function CustomerView({
	pkg,
	formatCurrency,
	formatDate,
}: {
	pkg: QuotePackageWithOptions;
	formatCurrency: (value: string | number) => string;
	formatDate: (dateString: string) => string;
}) {
	const [selectedOptionId, setSelectedOptionId] = useState<string | null>(pkg.options?.[0]?.id || null);
	const currentOption = pkg.options?.find((opt) => opt.id === selectedOptionId);

	return (
		<div className="max-w-3xl mx-auto">
			<Card className="border-2">
				<CardHeader className="text-center border-b pb-6">
					<CardTitle className="text-2xl">Quotation</CardTitle>
					<CardDescription className="text-base">
						{pkg.options?.length > 1
							? `${pkg.options.length} pricing options for your consideration`
							: pkg.options?.[0]?.quoteNumber || 'Quote'}
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-6 space-y-6">
					{/* Customer Info */}
					<div className="text-center">
						<p className="text-sm text-muted-foreground">Prepared for</p>
						<p className="text-lg font-medium">
							{pkg.customer ? `${pkg.customer.firstName} ${pkg.customer.lastName}` : 'Walk-in Customer'}
						</p>
						<p className="text-sm text-muted-foreground mt-2">Date: {formatDate(pkg.createdAt)}</p>
						{pkg.validUntil && (
							<p className="text-sm text-muted-foreground">Valid Until: {formatDate(pkg.validUntil)}</p>
						)}
					</div>

					<hr />

					{/* Option Selector (if multiple options) */}
					{pkg.options && pkg.options.length > 1 && (
						<div className="flex justify-center gap-2">
							{pkg.options.map((option) => (
								<Button
									key={option.id}
									variant={selectedOptionId === option.id ? 'default' : 'outline'}
									onClick={() => setSelectedOptionId(option.id)}
								>
									{option.quoteNumber}
									<span className="ml-2 opacity-75">{formatCurrency(option.total)}</span>
								</Button>
							))}
						</div>
					)}

					{currentOption && (
						<>
							{/* Product Details */}
							<div className="space-y-4">
								{currentOption.product && (
									<div>
										<p className="text-sm text-muted-foreground">Product</p>
										<p className="font-semibold text-lg">{currentOption.product.name}</p>
									</div>
								)}

								{/* Components Summary */}
								{currentOption.components.length > 0 && (
									<div className="space-y-1">
										{currentOption.components.map((comp) => (
											<div key={comp.id} className="flex justify-between text-sm">
												<span>
													{formatComponentType(comp.componentType)}
													{comp.height && comp.width && comp.depth && (
														<span className="text-muted-foreground ml-2">
															({comp.height}" × {comp.width}" × {comp.depth}")
														</span>
													)}
													{comp.materialName && (
														<span className="text-muted-foreground ml-1">- {comp.materialName}</span>
													)}
												</span>
											</div>
										))}
									</div>
								)}

								{/* Flower Holes */}
								{currentOption.flowerHoles && (
									<p className="text-sm">
										<span className="text-muted-foreground">Flower Holes: </span>
										{currentOption.flowerHoles.replace(/_/g, ' ')}
									</p>
								)}

								{/* Inscription */}
								{pkg.proposedInscription && (
									<div className="space-y-1">
										<p className="text-sm font-medium">Proposed Inscription</p>
										<p className="whitespace-pre-wrap bg-muted p-3 rounded font-mono text-sm">
											{pkg.proposedInscription}
										</p>
									</div>
								)}

								{/* Lettering */}
								{currentOption.lettering.length > 0 && (
									<div className="space-y-2">
										<p className="text-sm font-medium">Lettering</p>
										{currentOption.lettering.map((lett) => (
											<div key={lett.id} className="text-sm">
												<p className="italic">"{lett.text}"</p>
												<p className="text-muted-foreground text-xs">
													{lett.techniqueName}
													{lett.colorName && ` with ${lett.colorName}`} - {lett.letterCount} letters
												</p>
											</div>
										))}
									</div>
								)}

								{/* Sundries */}
								{currentOption.sundries.length > 0 && (
									<div className="space-y-1">
										<p className="text-sm font-medium">Additional Items:</p>
										{currentOption.sundries.map((s) => (
											<p key={s.id} className="text-sm text-muted-foreground">
												{s.sundryName} × {s.quantity}
											</p>
										))}
									</div>
								)}

								{/* Custom Line Items - Only visible ones */}
								{currentOption.lineItems &&
									currentOption.lineItems.filter((item) => item.visibleToCustomer).length > 0 && (
										<div className="space-y-1">
											<p className="text-sm font-medium">Other Charges:</p>
											{currentOption.lineItems
												.filter((item) => item.visibleToCustomer)
												.map((item) => (
													<div key={item.id} className="flex justify-between text-sm">
														<span className="text-muted-foreground">
															{item.description}
															{item.vatExempt && <span className="text-xs ml-1">(VAT Exempt)</span>}
														</span>
														<span>{formatCurrency(item.price)}</span>
													</div>
												))}
										</div>
									)}
							</div>

							<hr />

							{/* Pricing */}
							<div className="space-y-2 text-right">
								<div className="flex justify-between">
									<span>Subtotal</span>
									<span>{formatCurrency(currentOption.subtotal)}</span>
								</div>
								<div className="flex justify-between text-muted-foreground">
									<span>VAT ({(parseFloat(currentOption.vatRate) * 100).toFixed(0)}%)</span>
									<span>{formatCurrency(currentOption.vatAmount)}</span>
								</div>
								<hr />
								<div className="flex justify-between font-bold text-xl pt-2">
									<span>Total</span>
									<span>{formatCurrency(currentOption.total)}</span>
								</div>
							</div>
						</>
					)}

					{/* Notes */}
					{pkg.notes && (
						<>
							<hr />
							<div>
								<p className="text-sm text-muted-foreground">{pkg.notes}</p>
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
