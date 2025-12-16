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
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	useQuoteQuery,
	useUpdateQuoteStatusMutation,
	useDeleteQuoteMutation,
	formatQuoteStatus,
	getQuoteStatusVariant,
	formatComponentType,
	type QuoteStatus,
} from '@/hooks/use-quotes';
import { ArrowLeft, Send, Check, X, Clock, FileEdit, Trash2 } from 'lucide-react';

export function QuoteDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	const { data: quote, isLoading, error } = useQuoteQuery(id);
	const updateStatusMutation = useUpdateQuoteStatusMutation();
	const deleteMutation = useDeleteQuoteMutation();

	const formatCurrency = (value: string) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(parseFloat(value));
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
	const canSend = quote.status === 'draft';
	const canAccept = quote.status === 'sent';
	const canReject = quote.status === 'sent';
	const canExpire = quote.status === 'sent';
	const canDelete = quote.status === 'draft';
	const canRevise = true; // Can always revise

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
					{canSend && (
						<Button
							onClick={() => handleStatusChange('sent')}
							disabled={updateStatusMutation.isPending}
						>
							<Send className="h-4 w-4 mr-2" />
							Send to Customer
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

					{/* Components Card */}
					{quote.components.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Stone Components</CardTitle>
								<CardDescription>
									{quote.components.length} component{quote.components.length !== 1 ? 's' : ''}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="border rounded-lg">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Type</TableHead>
												<TableHead>Material</TableHead>
												<TableHead>Finish</TableHead>
												<TableHead>Dimensions</TableHead>
												<TableHead className="text-center">Qty</TableHead>
												<TableHead className="text-right">Unit Price</TableHead>
												<TableHead className="text-right">Total</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{quote.components.map((comp) => (
												<TableRow key={comp.id}>
													<TableCell className="font-medium">
														{formatComponentType(comp.componentType)}
													</TableCell>
													<TableCell>{comp.materialName || '-'}</TableCell>
													<TableCell>{comp.finishName || '-'}</TableCell>
													<TableCell>
														{comp.height && comp.width && comp.depth
															? `${comp.height}" x ${comp.width}" x ${comp.depth}"`
															: '-'}
													</TableCell>
													<TableCell className="text-center">{comp.quantity}</TableCell>
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
									{quote.lettering.length} inscription{quote.lettering.length !== 1 ? 's' : ''}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="border rounded-lg">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Technique</TableHead>
												<TableHead>Color</TableHead>
												<TableHead>Text</TableHead>
												<TableHead className="text-center">Letters</TableHead>
												<TableHead className="text-right">Per Letter</TableHead>
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
									{quote.sundries.length} item{quote.sundries.length !== 1 ? 's' : ''}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="border rounded-lg">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Item</TableHead>
												<TableHead className="text-center">Qty</TableHead>
												<TableHead className="text-right">Unit Price</TableHead>
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
									{quote.services.length} service{quote.services.length !== 1 ? 's' : ''}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="border rounded-lg">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Service</TableHead>
												<TableHead className="text-center">Qty</TableHead>
												<TableHead className="text-right">Unit Price</TableHead>
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
					{/* Pricing Summary Card */}
					<Card>
						<CardHeader>
							<CardTitle>Pricing Summary</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Subtotal</span>
								<span>{formatCurrency(quote.subtotal)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">
									VAT ({(parseFloat(quote.vatRate) * 100).toFixed(0)}%)
								</span>
								<span>{formatCurrency(quote.vatAmount)}</span>
							</div>
							<div className="border-t pt-3 flex justify-between font-bold text-lg">
								<span>Total</span>
								<span>{formatCurrency(quote.total)}</span>
							</div>
						</CardContent>
					</Card>

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

			{/* Delete Confirmation Dialog */}
			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDelete}
				title="Delete Quote"
				description={`Are you sure you want to delete quote "${quote.quoteNumber}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
