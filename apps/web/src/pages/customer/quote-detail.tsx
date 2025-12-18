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
import { Input } from '@/components/ui/input';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	useQuoteQuery,
	useUpdateQuoteStatusMutation,
	useDeleteQuoteMutation,
	useSendQuoteEmailMutation,
	useUpdateComponentPricingMutation,
	useUpdateLetteringPricingMutation,
	useUpdateSundryPricingMutation,
	useUpdateServicePricingMutation,
	formatQuoteStatus,
	getQuoteStatusVariant,
	formatComponentType,
	type QuoteStatus,
} from '@/hooks/use-quotes';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Send, Check, X, Clock, FileEdit, Trash2, Eye, EyeOff, Loader2, Mail, MessageSquare } from 'lucide-react';

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
	const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
	const [customMessage, setCustomMessage] = useState('');
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>('internal');

	const { data: quote, isLoading, error } = useQuoteQuery(id);
	const updateStatusMutation = useUpdateQuoteStatusMutation();
	const deleteMutation = useDeleteQuoteMutation();
	const sendEmailMutation = useSendQuoteEmailMutation();
	const updateComponentPricing = useUpdateComponentPricingMutation();
	const updateLetteringPricing = useUpdateLetteringPricingMutation();
	const updateSundryPricing = useUpdateSundryPricingMutation();
	const updateServicePricing = useUpdateServicePricingMutation();

	// Can only edit pricing on draft quotes
	const canEditPricing = quote?.status === 'draft';

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

	const handleRevise = () => {
		navigate(`/app/quotes/new?revise=${id}`);
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

	if (error || !quote) {
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
	// New workflow: draft → review → ready → presented → accepted/rejected/expired
	const canPresent = ['draft', 'ready'].includes(quote.status); // Can skip to presented
	const canMarkReady = quote.status === 'draft' || quote.status === 'review';
	const canAccept = quote.status === 'presented';
	const canReject = quote.status === 'presented';
	const canExpire = quote.status === 'presented';
	const canDelete = quote.status === 'draft';
	const canRevise = true; // Can always revise
	const canSendEmail = ['ready', 'presented'].includes(quote.status) && !!quote.customerId;

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
							{quote.quoteNumber} (v{quote.version})
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
							<h2 className="text-2xl font-bold">{quote.quoteNumber}</h2>
							{quote.version > 1 && (
								<span className="text-muted-foreground">(Version {quote.version})</span>
							)}
							<Badge variant={getQuoteStatusVariant(quote.status)}>
								{formatQuoteStatus(quote.status)}
							</Badge>
						</div>
						<p className="text-muted-foreground mt-1">
							Created {formatDate(quote.createdAt)}
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
						<Button
							onClick={() => handleStatusChange('presented')}
							disabled={updateStatusMutation.isPending}
						>
							<Send className="h-4 w-4 mr-2" />
							Present to Customer
						</Button>
					)}
					{canAccept && (
						<Button
							onClick={() => handleStatusChange('accepted')}
							disabled={updateStatusMutation.isPending}
						>
							<Check className="h-4 w-4 mr-2" />
							Mark Accepted
						</Button>
					)}
					{canReject && (
						<Button
							variant="outline"
							onClick={() => handleStatusChange('rejected')}
							disabled={updateStatusMutation.isPending}
						>
							<X className="h-4 w-4 mr-2" />
							Mark Rejected
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
							{quote.emailSentCount > 0 && (
								<Badge variant="secondary" className="ml-2">
									{quote.emailSentCount}
								</Badge>
							)}
						</Button>
					)}
					{canRevise && (
						<Button variant="outline" onClick={handleRevise}>
							<FileEdit className="h-4 w-4 mr-2" />
							Revise
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
					<div className="text-sm text-muted-foreground">
						Showing internal pricing details
					</div>
				)}
			</div>

			{/* Customer View - Clean presentation for customer */}
			{viewMode === 'customer' && (
				<div className="max-w-2xl mx-auto">
					<Card className="border-2">
						<CardHeader className="text-center border-b pb-6">
							<CardTitle className="text-2xl">Quotation</CardTitle>
							<CardDescription className="text-base">
								{quote.quoteNumber}
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-6 space-y-6">
							{/* Customer Info */}
							<div className="text-center">
								<p className="text-sm text-muted-foreground">Prepared for</p>
								<p className="text-lg font-medium">
									{quote.customer
										? `${quote.customer.firstName} ${quote.customer.lastName}`
										: 'Walk-in Customer'}
								</p>
								<p className="text-sm text-muted-foreground mt-2">
									Date: {formatDate(quote.createdAt)}
								</p>
								{quote.validUntil && (
									<p className="text-sm text-muted-foreground">
										Valid Until: {formatDate(quote.validUntil)}
									</p>
								)}
							</div>

							<hr />

							{/* Product Details */}
							<div className="space-y-4">
								{quote.product && (
									<div>
										<p className="font-semibold text-lg">{quote.product.name}</p>
									</div>
								)}

								{/* Components Summary */}
								{quote.components.length > 0 && (
									<div className="space-y-1">
										{quote.components.map((comp) => (
											<div key={comp.id} className="flex justify-between text-sm">
												<span>
													{formatComponentType(comp.componentType)}
													{comp.height && comp.width && comp.depth && (
														<span className="text-muted-foreground ml-2">
															({comp.height}" × {comp.width}" × {comp.depth}")
														</span>
													)}
													{comp.materialName && (
														<span className="text-muted-foreground ml-1">
															- {comp.materialName}
														</span>
													)}
												</span>
											</div>
										))}
									</div>
								)}

								{/* Flower Holes */}
								{quote.flowerHoles && (
									<p className="text-sm">
										<span className="text-muted-foreground">Flower Holes: </span>
										{quote.flowerHoles.replace(/_/g, ' ')}
									</p>
								)}

								{/* Proposed Inscription */}
								{quote.proposedInscription && (
									<div className="space-y-1">
										<p className="text-sm font-medium">
											Proposed Inscription ({quote.proposedInscription.length} characters):
										</p>
										<p className="whitespace-pre-wrap bg-muted p-3 rounded font-mono text-sm">
											{quote.proposedInscription}
										</p>
									</div>
								)}

								{/* Lettering Summary */}
								{quote.lettering.length > 0 && (
									<div className="space-y-2">
										<p className="text-sm font-medium">Inscription:</p>
										{quote.lettering.map((lett) => (
											<div key={lett.id} className="text-sm">
												<p className="italic">"{lett.text}"</p>
												<p className="text-muted-foreground text-xs">
													{lett.techniqueName}
													{lett.colorName && ` with ${lett.colorName}`}
													{' - '}{lett.letterCount} letters
												</p>
											</div>
										))}
									</div>
								)}

								{/* Sundries */}
								{quote.sundries.length > 0 && (
									<div className="space-y-1">
										<p className="text-sm font-medium">Additional Items:</p>
										{quote.sundries.map((s) => (
											<p key={s.id} className="text-sm text-muted-foreground">
												{s.sundryName} × {s.quantity}
											</p>
										))}
									</div>
								)}

								{/* Services */}
								{quote.services.length > 0 && (
									<div className="space-y-1">
										<p className="text-sm font-medium">Services:</p>
										{quote.services.map((s) => (
											<p key={s.id} className="text-sm text-muted-foreground">
												{s.serviceName}
											</p>
										))}
									</div>
								)}
							</div>

							<hr />

							{/* Pricing - Customer sees only totals */}
							<div className="space-y-2 text-right">
								<div className="flex justify-between">
									<span>Subtotal</span>
									<span>{formatCurrency(quote.subtotal)}</span>
								</div>
								<div className="flex justify-between text-muted-foreground">
									<span>VAT ({(parseFloat(quote.vatRate) * 100).toFixed(0)}%)</span>
									<span>{formatCurrency(quote.vatAmount)}</span>
								</div>
								<hr />
								<div className="flex justify-between font-bold text-xl pt-2">
									<span>Total</span>
									<span>{formatCurrency(quote.total)}</span>
								</div>
							</div>

							{/* Notes */}
							{quote.notes && (
								<>
									<hr />
									<div>
										<p className="text-sm text-muted-foreground">{quote.notes}</p>
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</div>
			)}

			{/* Internal View - Full details with pricing breakdown */}
			{viewMode === 'internal' && (
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Quote Info Card */}
					<Card>
						<CardHeader>
							<CardTitle>Quote Information</CardTitle>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-4">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Customer</p>
								<p>
									{quote.customer
										? `${quote.customer.firstName} ${quote.customer.lastName}`
										: 'Walk-in Customer'}
								</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Product</p>
								<p>{quote.product?.name || 'No product selected'}</p>
							</div>
							{quote.flowerHoles && (
								<div>
									<p className="text-sm font-medium text-muted-foreground">Flower Holes</p>
									<p>{quote.flowerHoles.replace(/_/g, ' ')}</p>
								</div>
							)}
							{quote.proposedInscription && (
								<div className="col-span-2">
									<p className="text-sm font-medium text-muted-foreground">
										Proposed Inscription ({quote.proposedInscription.length} characters)
									</p>
									<p className="whitespace-pre-wrap bg-muted p-3 rounded mt-1 font-mono text-sm">
										{quote.proposedInscription}
									</p>
								</div>
							)}
							{quote.validUntil && (
								<div>
									<p className="text-sm font-medium text-muted-foreground">Valid Until</p>
									<p>{formatDate(quote.validUntil)}</p>
								</div>
							)}
							{quote.notes && (
								<div className="col-span-2">
									<p className="text-sm font-medium text-muted-foreground">Notes</p>
									<p className="whitespace-pre-wrap">{quote.notes}</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Components Card - Internal view shows supplier costs and multipliers */}
					{quote.components.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Stone Components</CardTitle>
								<CardDescription>
									{quote.components.length} component{quote.components.length !== 1 ? 's' : ''} - Internal pricing details
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="border rounded-lg overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Type</TableHead>
												<TableHead>Material</TableHead>
												<TableHead>Dimensions</TableHead>
												<TableHead className="text-center">Qty</TableHead>
												<TableHead className="text-right text-orange-600">Supplier</TableHead>
												<TableHead className="text-center">×</TableHead>
												<TableHead className="text-right text-orange-600">+Fixed</TableHead>
												<TableHead className="text-right">Retail</TableHead>
												<TableHead className="text-right">Total</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{quote.components.map((comp) => (
												<TableRow key={comp.id}>
													<TableCell className="font-medium">
														{formatComponentType(comp.componentType)}
													</TableCell>
													<TableCell>
														{comp.materialName || '-'}
														{comp.finishName && (
															<span className="text-muted-foreground text-xs block">
																{comp.finishName}
															</span>
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
																	quoteId: quote.id,
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
															value={parseFloat(comp.multiplier)}
															onSave={async (value) => {
																await updateComponentPricing.mutateAsync({
																	quoteId: quote.id,
																	itemId: comp.id,
																	multiplier: value,
																});
															}}
															disabled={!canEditPricing}
															min={0.01}
														/>
													</TableCell>
													<TableCell className="text-right text-orange-600">
														<EditableNumber
															value={parseFloat(comp.fixedAmount)}
															onSave={async (value) => {
																await updateComponentPricing.mutateAsync({
																	quoteId: quote.id,
																	itemId: comp.id,
																	fixedAmount: value,
																});
															}}
															disabled={!canEditPricing}
															isCurrency
														/>
													</TableCell>
													<TableCell className="text-right">
														{formatCurrency(comp.unitPrice)}
													</TableCell>
													<TableCell className="text-right font-medium">
														{formatCurrency(comp.lineTotal)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Lettering Card */}
					{quote.lettering.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Lettering</CardTitle>
								<CardDescription>
									{quote.lettering.length} inscription{quote.lettering.length !== 1 ? 's' : ''} - Internal pricing details
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="border rounded-lg overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Technique</TableHead>
												<TableHead>Color</TableHead>
												<TableHead>Text</TableHead>
												<TableHead className="text-center">Letters</TableHead>
												<TableHead className="text-right text-orange-600">Cost/Letter</TableHead>
												<TableHead className="text-center">×</TableHead>
												<TableHead className="text-right text-orange-600">+Fixed</TableHead>
												<TableHead className="text-right">Retail</TableHead>
												<TableHead className="text-right">Total</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{quote.lettering.map((lett) => (
												<TableRow key={lett.id}>
													<TableCell className="font-medium">
														{lett.techniqueName || '-'}
													</TableCell>
													<TableCell>{lett.colorName || '-'}</TableCell>
													<TableCell className="max-w-[200px] truncate">
														{lett.text || '-'}
													</TableCell>
													<TableCell className="text-center">{lett.letterCount}</TableCell>
													<TableCell className="text-right text-orange-600">
														<EditableNumber
															value={parseFloat(lett.supplierCost)}
															onSave={async (value) => {
																await updateLetteringPricing.mutateAsync({
																	quoteId: quote.id,
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
															value={parseFloat(lett.multiplier)}
															onSave={async (value) => {
																await updateLetteringPricing.mutateAsync({
																	quoteId: quote.id,
																	itemId: lett.id,
																	multiplier: value,
																});
															}}
															disabled={!canEditPricing}
															min={0.01}
														/>
													</TableCell>
													<TableCell className="text-right text-orange-600">
														<EditableNumber
															value={parseFloat(lett.fixedAmount)}
															onSave={async (value) => {
																await updateLetteringPricing.mutateAsync({
																	quoteId: quote.id,
																	itemId: lett.id,
																	fixedAmount: value,
																});
															}}
															disabled={!canEditPricing}
															isCurrency
														/>
													</TableCell>
													<TableCell className="text-right">
														{formatCurrency(lett.unitPrice)}
													</TableCell>
													<TableCell className="text-right font-medium">
														{formatCurrency(lett.lineTotal)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Sundries Card */}
					{quote.sundries.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Sundries</CardTitle>
								<CardDescription>
									{quote.sundries.length} item{quote.sundries.length !== 1 ? 's' : ''} - Internal pricing details
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="border rounded-lg overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Item</TableHead>
												<TableHead className="text-center">Qty</TableHead>
												<TableHead className="text-right text-orange-600">Supplier</TableHead>
												<TableHead className="text-center">×</TableHead>
												<TableHead className="text-right text-orange-600">+Fixed</TableHead>
												<TableHead className="text-right">Retail</TableHead>
												<TableHead className="text-right">Total</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{quote.sundries.map((sundry) => (
												<TableRow key={sundry.id}>
													<TableCell className="font-medium">
														{sundry.sundryName || '-'}
													</TableCell>
													<TableCell className="text-center">{sundry.quantity}</TableCell>
													<TableCell className="text-right text-orange-600">
														<EditableNumber
															value={parseFloat(sundry.supplierCost)}
															onSave={async (value) => {
																await updateSundryPricing.mutateAsync({
																	quoteId: quote.id,
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
															value={parseFloat(sundry.multiplier)}
															onSave={async (value) => {
																await updateSundryPricing.mutateAsync({
																	quoteId: quote.id,
																	itemId: sundry.id,
																	multiplier: value,
																});
															}}
															disabled={!canEditPricing}
															min={0.01}
														/>
													</TableCell>
													<TableCell className="text-right text-orange-600">
														<EditableNumber
															value={parseFloat(sundry.fixedAmount)}
															onSave={async (value) => {
																await updateSundryPricing.mutateAsync({
																	quoteId: quote.id,
																	itemId: sundry.id,
																	fixedAmount: value,
																});
															}}
															disabled={!canEditPricing}
															isCurrency
														/>
													</TableCell>
													<TableCell className="text-right">
														{formatCurrency(sundry.unitPrice)}
													</TableCell>
													<TableCell className="text-right font-medium">
														{formatCurrency(sundry.lineTotal)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Services Card */}
					{quote.services.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Services</CardTitle>
								<CardDescription>
									{quote.services.length} service{quote.services.length !== 1 ? 's' : ''} - Internal pricing details
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="border rounded-lg overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Service</TableHead>
												<TableHead className="text-center">Qty</TableHead>
												<TableHead className="text-right text-orange-600">Cost</TableHead>
												<TableHead className="text-center">×</TableHead>
												<TableHead className="text-right text-orange-600">+Fixed</TableHead>
												<TableHead className="text-right">Retail</TableHead>
												<TableHead className="text-right">Total</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{quote.services.map((service) => (
												<TableRow key={service.id}>
													<TableCell className="font-medium">
														{service.serviceName || '-'}
													</TableCell>
													<TableCell className="text-center">{service.quantity}</TableCell>
													<TableCell className="text-right text-orange-600">
														<EditableNumber
															value={parseFloat(service.supplierCost)}
															onSave={async (value) => {
																await updateServicePricing.mutateAsync({
																	quoteId: quote.id,
																	itemId: service.id,
																	supplierCost: value,
																});
															}}
															disabled={!canEditPricing}
															isCurrency
														/>
													</TableCell>
													<TableCell className="text-center text-muted-foreground text-sm">
														<EditableNumber
															value={parseFloat(service.multiplier)}
															onSave={async (value) => {
																await updateServicePricing.mutateAsync({
																	quoteId: quote.id,
																	itemId: service.id,
																	multiplier: value,
																});
															}}
															disabled={!canEditPricing}
															min={0.01}
														/>
													</TableCell>
													<TableCell className="text-right text-orange-600">
														<EditableNumber
															value={parseFloat(service.fixedAmount)}
															onSave={async (value) => {
																await updateServicePricing.mutateAsync({
																	quoteId: quote.id,
																	itemId: service.id,
																	fixedAmount: value,
																});
															}}
															disabled={!canEditPricing}
															isCurrency
														/>
													</TableCell>
													<TableCell className="text-right">
														{formatCurrency(service.unitPrice)}
													</TableCell>
													<TableCell className="text-right font-medium">
														{formatCurrency(service.lineTotal)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Pricing Summary Card - Internal View shows costs and margins */}
					<Card>
						<CardHeader>
							<CardTitle>Pricing Summary</CardTitle>
							<CardDescription>Internal pricing breakdown</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{/* Retail pricing */}
							<div className="flex justify-between">
								<span className="text-muted-foreground">Subtotal</span>
								<span>{formatCurrency(quote.subtotal)}</span>
							</div>
							<div className="flex justify-between border-t pt-2">
								<span className="text-muted-foreground">
									VAT ({(parseFloat(quote.vatRate) * 100).toFixed(0)}%)
								</span>
								<span>{formatCurrency(quote.vatAmount)}</span>
							</div>
							<div className="border-t pt-3 flex justify-between font-bold text-lg">
								<span>Total (Retail)</span>
								<span>{formatCurrency(quote.total)}</span>
							</div>

							{/* Cost and margin info */}
							<div className="border-t pt-4 mt-4 space-y-2">
								<p className="text-sm font-medium text-muted-foreground">Internal Metrics</p>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Total Cost</span>
									<span className="text-orange-600">{formatCurrency(quote.totalCost)}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Gross Margin</span>
									<span className="text-green-600">
										{formatCurrency(
											parseFloat(quote.total) -
												parseFloat(quote.vatAmount) -
												parseFloat(quote.totalCost)
										)}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Margin %</span>
									<span className="text-green-600">
										{(
											((parseFloat(quote.total) -
												parseFloat(quote.vatAmount) -
												parseFloat(quote.totalCost)) /
												(parseFloat(quote.total) - parseFloat(quote.vatAmount))) *
											100
										).toFixed(1)}
										%
									</span>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Internal Notes Card */}
					{quote.internalNotes && (
						<Card className="border-orange-200 bg-orange-50">
							<CardHeader className="pb-2">
								<CardTitle className="text-sm">Internal Notes</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm whitespace-pre-wrap">{quote.internalNotes}</p>
							</CardContent>
						</Card>
					)}

					{/* Customer Feedback Card */}
					{(quote.customerDecision || quote.customerFeedback) && (
						<Card className="border-blue-200 bg-blue-50">
							<CardHeader className="pb-2">
								<CardTitle className="text-sm flex items-center gap-2">
									<MessageSquare className="h-4 w-4" />
									Customer Response
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{quote.customerDecision && (
									<div className="flex items-center gap-2">
										{quote.customerDecision === 'accepted' ? (
											<Badge className="bg-green-600">Accepted</Badge>
										) : (
											<Badge variant="destructive">Rejected</Badge>
										)}
										{quote.customerDecisionAt && (
											<span className="text-xs text-muted-foreground">
												on {formatDate(quote.customerDecisionAt)}
											</span>
										)}
									</div>
								)}
								{quote.customerFeedback && (
									<div className="bg-white p-3 rounded border">
										<p className="text-xs text-muted-foreground mb-1">Customer feedback:</p>
										<p className="text-sm whitespace-pre-wrap">"{quote.customerFeedback}"</p>
									</div>
								)}
								{quote.emailSentAt && (
									<div className="text-xs text-muted-foreground">
										Quote emailed {quote.emailSentCount} time{quote.emailSentCount !== 1 ? 's' : ''}
										{' - '}last sent {formatDate(quote.emailSentAt)}
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{/* Version History Card */}
					{quote.versions.length > 1 && (
						<Card>
							<CardHeader>
								<CardTitle>Version History</CardTitle>
								<CardDescription>All versions of this quote</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{quote.versions.map((version) => (
										<div
											key={version.id}
											className={`flex items-center justify-between p-2 rounded ${
												version.id === quote.id
													? 'bg-muted'
													: 'hover:bg-muted/50 cursor-pointer'
											}`}
											onClick={() => {
												if (version.id !== quote.id) {
													navigate(`/app/quotes/${version.id}`);
												}
											}}
										>
											<div>
												<span className="font-medium">v{version.version}</span>
												<span className="text-muted-foreground text-sm ml-2">
													{formatDate(version.createdAt)}
												</span>
											</div>
											<Badge variant={getQuoteStatusVariant(version.status as QuoteStatus)}>
												{formatQuoteStatus(version.status as QuoteStatus)}
											</Badge>
										</div>
									))}
								</div>
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
								<p>{formatDate(quote.createdAt)}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Updated</p>
								<p>{formatDate(quote.updatedAt)}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Quote ID</p>
								<p className="font-mono text-xs">{quote.id}</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
			)}

			{/* Delete Confirmation Dialog */}
			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDelete}
				title="Delete Quote"
				description={`Are you sure you want to delete quote "${quote.quoteNumber}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>

			{/* Send Email Dialog */}
			<Dialog open={sendEmailDialogOpen} onOpenChange={setSendEmailDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Send Quote to Customer</DialogTitle>
						<DialogDescription>
							{quote.customer
								? `Send quote ${quote.quoteNumber} to ${quote.customer.firstName} ${quote.customer.lastName}`
								: 'Send quote to customer'}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						{quote.emailSentCount > 0 && (
							<div className="text-sm text-muted-foreground bg-muted p-3 rounded">
								This quote has been sent {quote.emailSentCount} time{quote.emailSentCount !== 1 ? 's' : ''} previously.
								{quote.emailSentAt && (
									<> Last sent on {formatDate(quote.emailSentAt)}.</>
								)}
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
						<Button
							onClick={handleSendEmail}
							disabled={sendEmailMutation.isPending}
						>
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
		</div>
	);
}
