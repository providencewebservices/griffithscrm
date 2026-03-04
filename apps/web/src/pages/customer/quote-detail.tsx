import { useState, useRef, useEffect } from 'react';
import { useTenantSettingsQuery } from '@/hooks/use-tenant-settings';
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
import { Separator } from '@/components/ui/separator';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
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
	useAddLetteringMutation,
	useUpdateLetteringMutation,
	useDeleteLetteringMutation,
	formatQuoteStatus,
	getQuoteStatusVariant,
	formatComponentType,
	formatPriceRange,
	QUOTE_TYPE_LABELS,
	type QuoteStatus,
	type QuoteType,
	type QuoteOption,
	type QuotePackageWithOptions,
	type QuoteLettering,
} from '@/hooks/use-quotes';
import { useCustomerView } from '@/contexts/customer-view-context';
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
import { useLetteringTechniquesQuery } from '@/hooks/use-lettering-techniques';
import { useLetteringColorsQuery } from '@/hooks/use-lettering-colors';
import { useFontsQuery } from '@/hooks/use-fonts';
import { InscriptionText } from '@/components/inscription-text';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
	const canSendEmail = ['ready', 'presented'].includes(pkg.status) && !!(pkg.customerId || pkg.funeralDirectorId);
	const canAddOptions = pkg.status === 'draft';

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
					{settings?.logoUrl && (
						<img
							src={`${API_URL}/api/logo/${settings.id}`}
							alt={settings.name}
							className="h-12 max-w-[160px] object-contain"
						/>
					)}
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

			{/* Customer View */}
			{isCustomerView && <CustomerView pkg={pkg} formatCurrency={formatCurrency} formatDate={formatDate} />}

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
									addLetteringMutation={addLetteringMutation}
									updateLetteringMutation={updateLetteringMutation}
									deleteLetteringMutation={deleteLetteringMutation}
									activePresets={activePresets}
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
						<p className="text-sm font-medium text-muted-foreground">
							{pkg.payerType === 'funeral_director' ? 'Funeral Director (Payer)' : 'Customer'}
						</p>
						<p>
							{pkg.payerType === 'funeral_director' && pkg.funeralDirector ? (
								<Link to={`/app/funeral-directors/${pkg.funeralDirectorId}`} className="text-primary hover:underline">
									{pkg.funeralDirector.tradingName || pkg.funeralDirector.businessName}
								</Link>
							) : pkg.customer ? (
								<Link to={`/app/contacts/${pkg.customerId}`} className="text-primary hover:underline">
									{pkg.customer.firstName} {pkg.customer.lastName}
								</Link>
							) : (
								'Walk-in Customer'
							)}
						</p>
					</div>
					{pkg.relationToDeceased && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Relation to Deceased</p>
							<p>{pkg.relationToDeceased}</p>
						</div>
					)}
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
					{pkg.funeralDirector && pkg.payerType !== 'funeral_director' && (
						<div>
							<p className="text-sm font-medium text-muted-foreground">Funeral Director</p>
							<p>
								<Link to={`/app/funeral-directors/${pkg.funeralDirectorId}`} className="text-primary hover:underline">
									{pkg.funeralDirector.tradingName || pkg.funeralDirector.businessName}
								</Link>
							</p>
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
	addLetteringMutation,
	updateLetteringMutation,
	deleteLetteringMutation,
	activePresets,
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
	addLetteringMutation: ReturnType<typeof useAddLetteringMutation>;
	updateLetteringMutation: ReturnType<typeof useUpdateLetteringMutation>;
	deleteLetteringMutation: ReturnType<typeof useDeleteLetteringMutation>;
	activePresets: { id: string; name: string; defaultPrice: string; vatExempt: boolean; visibleToCustomer: boolean; priceVisibleToCustomer: boolean }[];
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
			<LetteringSection
				pkg={pkg}
				option={option}
				canEditPricing={canEditPricing}
				formatCurrency={formatCurrency}
				updateLetteringPricing={updateLetteringPricing}
				addLetteringMutation={addLetteringMutation}
				updateLetteringMutation={updateLetteringMutation}
				deleteLetteringMutation={deleteLetteringMutation}
			/>

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
			<CustomLineItemsSection
				pkg={pkg}
				option={option}
				canEditPricing={canEditPricing}
				formatCurrency={formatCurrency}
				addLineItem={addLineItem}
				updateLineItem={updateLineItem}
				deleteLineItem={deleteLineItem}
				activePresets={activePresets}
			/>

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

// Lettering Section - with add/edit/delete capabilities for draft quotes
function LetteringSection({
	pkg,
	option,
	canEditPricing,
	formatCurrency,
	updateLetteringPricing,
	addLetteringMutation,
	updateLetteringMutation,
	deleteLetteringMutation,
}: {
	pkg: QuotePackageWithOptions;
	option: QuoteOption;
	canEditPricing: boolean;
	formatCurrency: (value: string | number) => string;
	updateLetteringPricing: ReturnType<typeof useUpdateLetteringPricingMutation>;
	addLetteringMutation: ReturnType<typeof useAddLetteringMutation>;
	updateLetteringMutation: ReturnType<typeof useUpdateLetteringMutation>;
	deleteLetteringMutation: ReturnType<typeof useDeleteLetteringMutation>;
}) {
	const [showAddForm, setShowAddForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	// New lettering form state
	const [newTechniqueId, setNewTechniqueId] = useState('');
	const [newColorId, setNewColorId] = useState('');
	const [newFontId, setNewFontId] = useState('');
	const [newText, setNewText] = useState('');

	// Edit form state
	const [editTechniqueId, setEditTechniqueId] = useState('');
	const [editColorId, setEditColorId] = useState('');
	const [editFontId, setEditFontId] = useState('');
	const [editText, setEditText] = useState('');

	// Fetch techniques, colors, and fonts
	const { data: techniques } = useLetteringTechniquesQuery();
	const { data: colors } = useLetteringColorsQuery();
	const { data: fontsList } = useFontsQuery();

	const activeTechniques = techniques?.filter((t) => t.isActive) || [];
	const activeColors = colors?.filter((c) => c.isActive) || [];
	const activeFonts = fontsList?.filter((f) => f.isActive) || [];

	const handleAddLettering = async () => {
		if (!newTechniqueId || !newText.trim()) return;

		await addLetteringMutation.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			techniqueId: newTechniqueId,
			colorId: newColorId || undefined,
			fontId: newFontId || undefined,
			text: newText.trim(),
		});

		// Reset form
		setNewTechniqueId('');
		setNewColorId('');
		setNewFontId('');
		setNewText('');
		setShowAddForm(false);
	};

	const handleStartEdit = (lett: QuoteLettering) => {
		setEditingId(lett.id);
		setEditTechniqueId(lett.techniqueId || '');
		setEditColorId(lett.colorId || '');
		setEditFontId(lett.fontId || '');
		setEditText(lett.text || '');
	};

	const handleSaveEdit = async (itemId: string) => {
		if (!editTechniqueId || !editText.trim()) return;

		await updateLetteringMutation.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			itemId,
			techniqueId: editTechniqueId,
			colorId: editColorId || null,
			fontId: editFontId || null,
			text: editText.trim(),
		});

		setEditingId(null);
	};

	const handleCancelEdit = () => {
		setEditingId(null);
		setEditTechniqueId('');
		setEditColorId('');
		setEditFontId('');
		setEditText('');
	};

	const handleDelete = async (itemId: string) => {
		await deleteLetteringMutation.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			itemId,
		});
		setDeleteConfirmId(null);
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-3">
				<h4 className="font-medium">
					Lettering ({option.lettering.length} item{option.lettering.length !== 1 ? 's' : ''})
				</h4>
				{canEditPricing && !showAddForm && (
					<Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
						<Plus className="h-4 w-4 mr-1" />
						Add Lettering
					</Button>
				)}
			</div>

			{/* Add Lettering Form */}
			{showAddForm && canEditPricing && (
				<div className="border rounded-lg p-4 mb-4 bg-muted/50">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
						<div>
							<Label className="text-sm mb-1 block">Technique *</Label>
							<Select value={newTechniqueId} onValueChange={setNewTechniqueId}>
								<SelectTrigger>
									<SelectValue placeholder="Select technique" />
								</SelectTrigger>
								<SelectContent>
									{activeTechniques.map((t) => (
										<SelectItem key={t.id} value={t.id}>
											{t.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label className="text-sm mb-1 block">Color</Label>
							<Select value={newColorId || '_none'} onValueChange={(v) => setNewColorId(v === '_none' ? '' : v)}>
								<SelectTrigger>
									<SelectValue placeholder="Select color" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="_none">No color</SelectItem>
									{activeColors.map((c) => (
										<SelectItem key={c.id} value={c.id}>
											{c.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label className="text-sm mb-1 block">Font</Label>
							<Select value={newFontId || '_none'} onValueChange={(v) => setNewFontId(v === '_none' ? '' : v)}>
								<SelectTrigger>
									<SelectValue placeholder="Default font" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="_none">Default font</SelectItem>
									{activeFonts.map((f) => (
										<SelectItem key={f.id} value={f.id}>
											{f.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="md:col-span-3">
							<Label className="text-sm mb-1 block">
								Text * ({newText.replace(/\s/g, '').length} letters)
							</Label>
							<Textarea
								value={newText}
								onChange={(e) => setNewText(e.target.value)}
								placeholder="Enter inscription text..."
								rows={2}
							/>
						</div>
						{newText && newFontId && (
							<div className="md:col-span-3 border rounded p-3 bg-background">
								<Label className="text-xs text-muted-foreground mb-1 block">Preview</Label>
								<InscriptionText
									text={newText}
									fontId={newFontId}
									fontName={activeFonts.find((f) => f.id === newFontId)?.name}
									className="text-sm"
								/>
							</div>
						)}
					</div>
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setShowAddForm(false);
								setNewTechniqueId('');
								setNewColorId('');
								setNewFontId('');
								setNewText('');
							}}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleAddLettering}
							disabled={!newTechniqueId || !newText.trim() || addLetteringMutation.isPending}
						>
							{addLetteringMutation.isPending ? (
								<Loader2 className="h-4 w-4 mr-1 animate-spin" />
							) : (
								<Plus className="h-4 w-4 mr-1" />
							)}
							Add
						</Button>
					</div>
				</div>
			)}

			{/* Empty state */}
			{option.lettering.length === 0 && !showAddForm && (
				<div className="border rounded-lg p-8 text-center text-muted-foreground border-dashed">
					No lettering items added yet.
					{canEditPricing && (
						<>
							{' '}
							<button
								className="text-primary underline"
								onClick={() => setShowAddForm(true)}
							>
								Add one now
							</button>
						</>
					)}
				</div>
			)}

			{/* Lettering Table */}
			{option.lettering.length > 0 && (
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
								{canEditPricing && <TableHead className="w-[80px]"></TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							{option.lettering.map((lett) => (
								<TableRow key={lett.id}>
									{editingId === lett.id ? (
										// Edit mode
										<>
											<TableCell>
												<Select value={editTechniqueId} onValueChange={setEditTechniqueId}>
													<SelectTrigger className="h-8">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{activeTechniques.map((t) => (
															<SelectItem key={t.id} value={t.id}>
																{t.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</TableCell>
											<TableCell>
												<Select
													value={editColorId || '_none'}
													onValueChange={(v) => setEditColorId(v === '_none' ? '' : v)}
												>
													<SelectTrigger className="h-8">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="_none">-</SelectItem>
														{activeColors.map((c) => (
															<SelectItem key={c.id} value={c.id}>
																{c.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</TableCell>
											<TableCell>
												<div className="space-y-1">
													<Input
														value={editText}
														onChange={(e) => setEditText(e.target.value)}
														className="h-8"
													/>
													<Select value={editFontId || '_none'} onValueChange={(v) => setEditFontId(v === '_none' ? '' : v)}>
														<SelectTrigger className="h-7 text-xs">
															<SelectValue placeholder="Font" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="_none">Default font</SelectItem>
															{activeFonts.map((f) => (
																<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											</TableCell>
											<TableCell className="text-center">
												{editText.replace(/\s/g, '').length}
											</TableCell>
											<TableCell colSpan={3}></TableCell>
											<TableCell className="text-right">
												<div className="flex gap-1 justify-end">
													<Button
														variant="ghost"
														size="sm"
														onClick={handleCancelEdit}
														className="h-7 px-2"
													>
														<X className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleSaveEdit(lett.id)}
														disabled={!editTechniqueId || !editText.trim() || updateLetteringMutation.isPending}
														className="h-7 px-2"
													>
														{updateLetteringMutation.isPending ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : (
															<Check className="h-4 w-4" />
														)}
													</Button>
												</div>
											</TableCell>
										</>
									) : (
										// Display mode
										<>
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
											{canEditPricing && (
												<TableCell>
													<div className="flex gap-1 justify-end">
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleStartEdit(lett)}
															className="h-7 w-7 p-0"
															title="Edit"
														>
															<MoreVertical className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => setDeleteConfirmId(lett.id)}
															className="h-7 w-7 p-0 text-destructive hover:text-destructive"
															title="Delete"
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
												</TableCell>
											)}
										</>
									)}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Delete Confirmation Dialog */}
			<DeleteConfirmDialog
				open={deleteConfirmId !== null}
				onOpenChange={(open) => !open && setDeleteConfirmId(null)}
				onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
				title="Delete Lettering Item"
				description="Are you sure you want to delete this lettering item? This action cannot be undone."
				isLoading={deleteLetteringMutation.isPending}
			/>
		</div>
	);
}

function CustomLineItemsSection({
	pkg,
	option,
	canEditPricing,
	formatCurrency,
	addLineItem,
	updateLineItem,
	deleteLineItem,
	activePresets,
}: {
	pkg: QuotePackageWithOptions;
	option: QuoteOption;
	canEditPricing: boolean;
	formatCurrency: (value: string | number) => string;
	addLineItem: ReturnType<typeof useAddLineItemMutation>;
	updateLineItem: ReturnType<typeof useUpdateLineItemMutation>;
	deleteLineItem: ReturnType<typeof useDeleteLineItemMutation>;
	activePresets: { id: string; name: string; defaultPrice: string; vatExempt: boolean; visibleToCustomer: boolean; priceVisibleToCustomer: boolean }[];
}) {
	const [showAddForm, setShowAddForm] = useState(false);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

	// New line item form state
	const [newPresetId, setNewPresetId] = useState('');
	const [newDesc, setNewDesc] = useState('');
	const [newPrice, setNewPrice] = useState('');
	const [newVatExempt, setNewVatExempt] = useState(false);
	const [newVisibleToCustomer, setNewVisibleToCustomer] = useState(true);
	const [newPriceVisibleToCustomer, setNewPriceVisibleToCustomer] = useState(true);

	const handlePresetSelect = (presetId: string) => {
		setNewPresetId(presetId);
		if (presetId === 'custom') {
			setNewDesc('');
			setNewPrice('');
			setNewVatExempt(false);
			setNewVisibleToCustomer(true);
			setNewPriceVisibleToCustomer(true);
		} else {
			const preset = activePresets.find((p) => p.id === presetId);
			if (preset) {
				setNewDesc(preset.name);
				setNewPrice(preset.defaultPrice);
				setNewVatExempt(preset.vatExempt);
				setNewVisibleToCustomer(preset.visibleToCustomer);
				setNewPriceVisibleToCustomer(preset.priceVisibleToCustomer);
			}
		}
	};

	const resetForm = () => {
		setNewPresetId('');
		setNewDesc('');
		setNewPrice('');
		setNewVatExempt(false);
		setNewVisibleToCustomer(true);
		setNewPriceVisibleToCustomer(true);
	};

	const handleAdd = async () => {
		if (!newDesc.trim() || !newPrice) return;
		await addLineItem.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			description: newDesc.trim(),
			price: parseFloat(newPrice),
			vatExempt: newVatExempt,
			visibleToCustomer: newVisibleToCustomer,
			priceVisibleToCustomer: newPriceVisibleToCustomer,
		});
		resetForm();
		setShowAddForm(false);
	};

	const handleDelete = async (itemId: string) => {
		await deleteLineItem.mutateAsync({
			packageId: pkg.id,
			optionId: option.id,
			itemId,
		});
		setDeleteConfirmId(null);
	};

	const lineItems = option.lineItems || [];

	return (
		<div>
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<h4 className="font-medium">
					Custom Line Items{lineItems.length > 0 && ` (${lineItems.length} item${lineItems.length !== 1 ? 's' : ''})`}
				</h4>
				{canEditPricing && !showAddForm && lineItems.length > 0 && (
					<Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
						<Plus className="h-4 w-4 mr-1" />
						Add Line Item
					</Button>
				)}
			</div>

			{/* Add Form */}
			{showAddForm && canEditPricing && (
				<div className="border rounded-lg p-4 mb-4 bg-muted/50">
					<div className="grid grid-cols-12 gap-3 mb-4">
						<div className="col-span-12 md:col-span-4">
							<Label className="text-sm mb-1 block">Line Item</Label>
							<Select value={newPresetId} onValueChange={handlePresetSelect}>
								<SelectTrigger>
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
						{newPresetId === 'custom' && (
							<div className="col-span-12 md:col-span-5">
								<Label className="text-sm mb-1 block">Description</Label>
								<Input
									placeholder="e.g., Labour, Delivery"
									value={newDesc}
									onChange={(e) => setNewDesc(e.target.value)}
								/>
							</div>
						)}
						<div className={`col-span-12 ${newPresetId === 'custom' ? 'md:col-span-3' : 'md:col-span-3'}`}>
							<Label className="text-sm mb-1 block">Price</Label>
							<Input
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
								value={newPrice}
								onChange={(e) => setNewPrice(e.target.value)}
							/>
						</div>
					</div>
					<div className="flex items-center gap-4 mb-4">
						<div className="flex items-center gap-2">
							<Checkbox
								id="newLineItemVatExempt"
								checked={newVatExempt}
								onCheckedChange={(checked) => setNewVatExempt(checked === true)}
							/>
							<Label htmlFor="newLineItemVatExempt" className="text-sm whitespace-nowrap">
								VAT Exempt
							</Label>
						</div>
						<Separator orientation="vertical" className="h-5" />
						<div className="flex items-center gap-2">
							<Checkbox
								id="newLineItemVisible"
								checked={newVisibleToCustomer}
								onCheckedChange={(checked) => {
									setNewVisibleToCustomer(checked === true);
									if (checked !== true) {
										setNewPriceVisibleToCustomer(false);
									}
								}}
							/>
							<Label htmlFor="newLineItemVisible" className="text-sm whitespace-nowrap">
								Show on Quote
							</Label>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								id="newLineItemPriceVisible"
								checked={newPriceVisibleToCustomer}
								onCheckedChange={(checked) => setNewPriceVisibleToCustomer(checked === true)}
								disabled={!newVisibleToCustomer}
							/>
							<Label htmlFor="newLineItemPriceVisible" className={`text-sm whitespace-nowrap ${!newVisibleToCustomer ? 'text-muted-foreground' : ''}`}>
								Show Price
							</Label>
						</div>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								resetForm();
								setShowAddForm(false);
							}}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleAdd}
							disabled={!newDesc.trim() || !newPrice || addLineItem.isPending}
						>
							{addLineItem.isPending ? (
								<Loader2 className="h-4 w-4 mr-1 animate-spin" />
							) : (
								<Plus className="h-4 w-4 mr-1" />
							)}
							Add
						</Button>
					</div>
				</div>
			)}

			{/* Empty State */}
			{lineItems.length === 0 && !showAddForm && (
				<div className="border rounded-lg p-8 text-center text-muted-foreground border-dashed">
					No custom line items added yet.
					{canEditPricing && (
						<>
							{' '}
							<button
								className="text-primary underline"
								onClick={() => setShowAddForm(true)}
							>
								Add one now
							</button>
						</>
					)}
				</div>
			)}

			{/* Table */}
			{lineItems.length > 0 && (
				<div className="border rounded-lg overflow-x-auto">
					<TooltipProvider>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Description</TableHead>
									<TableHead className="text-right w-32">Price</TableHead>
									<TableHead className="text-center w-24">VAT Exempt</TableHead>
									<TableHead className="text-center w-20">
										<Tooltip>
											<TooltipTrigger asChild>
												<span className="inline-flex items-center gap-1 cursor-help">
													<Eye className="h-3.5 w-3.5" /> Line
												</span>
											</TooltipTrigger>
											<TooltipContent>Show line item on customer quote</TooltipContent>
										</Tooltip>
									</TableHead>
									<TableHead className="text-center w-24">
										<Tooltip>
											<TooltipTrigger asChild>
												<span className="inline-flex items-center gap-1 cursor-help">
													<Eye className="h-3.5 w-3.5" /> Price
												</span>
											</TooltipTrigger>
											<TooltipContent>Show price on customer quote</TooltipContent>
										</Tooltip>
									</TableHead>
									{canEditPricing && <TableHead className="w-16"></TableHead>}
								</TableRow>
							</TableHeader>
							<TableBody>
								{lineItems.map((item) => (
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
															...(checked !== true ? { priceVisibleToCustomer: false } : {}),
														});
													}}
												/>
											) : item.visibleToCustomer ? (
												<Eye className="h-4 w-4 mx-auto text-green-600" />
											) : (
												<EyeOff className="h-4 w-4 mx-auto text-muted-foreground" />
											)}
										</TableCell>
										<TableCell className="text-center">
											{canEditPricing ? (
												<Checkbox
													checked={item.priceVisibleToCustomer}
													onCheckedChange={async (checked) => {
														await updateLineItem.mutateAsync({
															packageId: pkg.id,
															optionId: option.id,
															itemId: item.id,
															priceVisibleToCustomer: checked === true,
														});
													}}
													disabled={!item.visibleToCustomer}
												/>
											) : item.visibleToCustomer ? (
												item.priceVisibleToCustomer ? (
													<Eye className="h-4 w-4 mx-auto text-green-600" />
												) : (
													<EyeOff className="h-4 w-4 mx-auto text-muted-foreground" />
												)
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>
										{canEditPricing && (
											<TableCell>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 text-destructive"
													onClick={() => setDeleteConfirmId(item.id)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</TableCell>
										)}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TooltipProvider>
				</div>
			)}

			{/* Delete Confirmation Dialog */}
			<DeleteConfirmDialog
				open={deleteConfirmId !== null}
				onOpenChange={(open) => !open && setDeleteConfirmId(null)}
				onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
				title="Delete Line Item"
				description="Are you sure you want to delete this line item? This action cannot be undone."
				isLoading={deleteLineItem.isPending}
			/>
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
									<div className="text-center">
										<p className="text-sm text-muted-foreground">Product</p>
										<p className="font-bold text-2xl">{currentOption.product.name}</p>
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
									<div className="space-y-1 text-center">
										<p className="text-sm font-medium text-muted-foreground">Proposed Inscription</p>
										<p className="whitespace-pre-wrap italic text-lg py-3">
											{pkg.proposedInscription}
										</p>
									</div>
								)}

								{/* Lettering */}
								{currentOption.lettering.length > 0 && (
									<div className="space-y-4">
										<p className="text-sm font-medium">Lettering</p>
										{currentOption.lettering.map((lett) => (
											<div key={lett.id} className="space-y-2">
												<p className="text-muted-foreground text-xs">
													{lett.techniqueName}
													{lett.colorName && ` with ${lett.colorName}`} · {lett.letterCount} letters
												</p>
												{lett.text && (
													<InscriptionText
														text={`"${lett.text}"`}
														fontId={lett.fontId}
														fontName={lett.fontName}
														fontS3Key={lett.fontS3Key}
														className="italic text-sm"
													/>
												)}
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
														{item.priceVisibleToCustomer && (
															<span>{formatCurrency(item.price)}</span>
														)}
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
