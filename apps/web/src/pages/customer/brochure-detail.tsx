import {
	ArrowDown,
	ArrowLeft,
	ArrowUp,
	Heart,
	Link as LinkIcon,
	Mail,
	MessageSquare,
	MoreHorizontal,
	Pencil,
	Plus,
	Search,
	X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
	type BrochureProduct,
	useArchiveBrochureMutation,
	useBrochureQuery,
	useSendBrochureMutation,
	useUpdateBrochureMutation,
} from '@/hooks/use-brochures';
import { type Product, useProductsQuery } from '@/hooks/use-products';
import { useSignedUrls } from '@/hooks/use-uploads';

type SelectedProduct = {
	productId: string;
	name: string;
	imageUrl: string | null;
	categoryName: string | null;
};

function getBrochureStatus(brochure: { archivedAt: string | null; expiresAt: string }) {
	if (brochure.archivedAt) return 'archived' as const;
	if (new Date(brochure.expiresAt) < new Date()) return 'expired' as const;
	return 'active' as const;
}

function getStatusBadgeVariant(status: 'active' | 'expired' | 'archived') {
	switch (status) {
		case 'active':
			return 'default' as const;
		case 'expired':
			return 'secondary' as const;
		case 'archived':
			return 'outline' as const;
	}
}

function formatDate(dateString: string) {
	return new Date(dateString).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

function formatDateTime(dateString: string) {
	return new Date(dateString).toLocaleString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function BrochureDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [editMessageOpen, setEditMessageOpen] = useState(false);
	const [editProductsOpen, setEditProductsOpen] = useState(false);
	const [editExpiryOpen, setEditExpiryOpen] = useState(false);

	const { data: brochure, isLoading, error } = useBrochureQuery(id);
	const updateMutation = useUpdateBrochureMutation();
	const archiveMutation = useArchiveBrochureMutation();
	const sendMutation = useSendBrochureMutation();

	// Signed URLs for product images
	const productImageUrls = brochure?.products.map((p) => p.productImageUrl) ?? [];
	const { data: signedUrls } = useSignedUrls(productImageUrls);

	const isArchived = !!brochure?.archivedAt;
	const status = brochure ? getBrochureStatus(brochure) : 'active';

	const handleArchive = async () => {
		if (!id) return;
		try {
			await archiveMutation.mutateAsync(id);
			setArchiveDialogOpen(false);
			navigate('/app/brochures');
		} catch {
			// Error handled by mutation
		}
	};

	const handleSendEmail = () => {
		if (!id) return;
		sendMutation.mutate(id, {
			onSuccess: () => toast.success('Brochure email sent'),
			onError: (err) => toast.error(err.message || 'Failed to send email'),
		});
	};

	const handleCopyLink = async () => {
		if (!brochure) return;
		const url = `${window.location.origin}/brochure/${brochure.accessToken}`;
		await navigator.clipboard.writeText(url);
		toast.success('Link copied to clipboard');
	};

	const getCustomerName = () => {
		if (!brochure) return '';
		if (brochure.customerName) return brochure.customerName;
		return (
			[brochure.customerFirstName, brochure.customerLastName].filter(Boolean).join(' ') || 'Unknown'
		);
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Brochure Details</h2>
				</div>
				<div className="text-muted-foreground">Loading brochure...</div>
			</div>
		);
	}

	if (error || !brochure) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Brochure Details</h2>
				</div>
				<div className="text-destructive">
					{error ? `Error loading brochure: ${error.message}` : 'Brochure not found'}
				</div>
				<Link to="/app/brochures">
					<Button variant="outline" className="mt-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Brochures
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<div>
			{/* Breadcrumb */}
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/brochures">Brochures</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Brochure for {getCustomerName()}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Link to="/app/brochures">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<div className="flex items-center gap-3">
							<h2 className="text-2xl font-bold">
								Brochure for{' '}
								<Link
									to={`/app/customers/${brochure.customerId}`}
									className="text-primary hover:underline"
								>
									{getCustomerName()}
								</Link>
							</h2>
							<Badge variant={getStatusBadgeVariant(status)}>
								{status.charAt(0).toUpperCase() + status.slice(1)}
							</Badge>
						</div>
						<p className="text-muted-foreground text-sm">
							Created {formatDate(brochure.createdAt)}
							{brochure.createdByName && ` by ${brochure.createdByName}`}
						</p>
					</div>
				</div>
				{!isArchived && (
					<div className="flex items-center gap-2">
						<Button variant="ghost" size="sm" onClick={handleCopyLink}>
							<LinkIcon className="h-4 w-4 mr-2" />
							Copy Link
						</Button>
						<Button
							size="sm"
							onClick={handleSendEmail}
							disabled={!brochure.customerEmail || sendMutation.isPending}
						>
							<Mail className="h-4 w-4 mr-2" />
							{sendMutation.isPending ? 'Sending...' : 'Send Email'}
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="icon">
									<MoreHorizontal className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => setEditMessageOpen(true)}>
									Edit Message
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setEditProductsOpen(true)}>
									Edit Products
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setEditExpiryOpen(true)}>
									Change Expiry
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="text-destructive"
									onClick={() => setArchiveDialogOpen(true)}
								>
									Archive
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Ready to Discuss */}
					{brochure.readyToDiscussAt ? (
						<Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
									<div>
										<p className="font-medium text-green-800 dark:text-green-300">
											Customer is ready to discuss
										</p>
										<p className="text-sm text-green-600 dark:text-green-400">
											Indicated on {formatDateTime(brochure.readyToDiscussAt)}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					) : (
						<Card>
							<CardContent className="pt-6">
								<p className="text-muted-foreground text-sm">
									Customer has not indicated readiness to discuss yet.
								</p>
							</CardContent>
						</Card>
					)}

					{/* Message */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>Message</CardTitle>
								{!isArchived && (
									<Button variant="ghost" size="sm" onClick={() => setEditMessageOpen(true)}>
										<Pencil className="h-3.5 w-3.5 mr-1" />
										Edit
									</Button>
								)}
							</div>
						</CardHeader>
						<CardContent>
							{brochure.message ? (
								<p className="text-sm whitespace-pre-wrap">{brochure.message}</p>
							) : (
								<p className="text-sm text-muted-foreground">No message set.</p>
							)}
						</CardContent>
					</Card>

					{/* Products */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>Products ({brochure.products.length})</CardTitle>
								{!isArchived && (
									<Button variant="ghost" size="sm" onClick={() => setEditProductsOpen(true)}>
										<Pencil className="h-3.5 w-3.5 mr-1" />
										Edit
									</Button>
								)}
							</div>
						</CardHeader>
						<CardContent>
							{brochure.products.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-4">
									No products in this brochure.
								</p>
							) : (
								<div className="divide-y">
									{brochure.products.map((product) => {
										const imgUrl = product.productImageUrl
											? signedUrls?.get(product.productImageUrl)
											: null;
										return (
											<div
												key={product.id}
												className="flex items-start gap-4 py-3 first:pt-0 last:pb-0"
											>
												{imgUrl ? (
													<img
														src={imgUrl}
														alt={product.productName}
														className="h-16 w-16 rounded object-cover shrink-0"
													/>
												) : (
													<div className="h-16 w-16 rounded bg-muted shrink-0" />
												)}
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<p className="font-medium text-sm truncate">{product.productName}</p>
														<InterestIndicator product={product} />
													</div>
													{product.productCategoryName && (
														<p className="text-xs text-muted-foreground">
															{product.productCategoryName}
														</p>
													)}
													{product.productDescription && (
														<p className="text-xs text-muted-foreground line-clamp-2 mt-1">
															{product.productDescription}
														</p>
													)}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Customer</p>
								<Link
									to={`/app/customers/${brochure.customerId}`}
									className="text-primary hover:underline"
								>
									{getCustomerName()}
								</Link>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Status</p>
								<Badge variant={getStatusBadgeVariant(status)}>
									{status.charAt(0).toUpperCase() + status.slice(1)}
								</Badge>
							</div>
							<Separator />
							<div>
								<p className="text-sm font-medium text-muted-foreground">Created</p>
								<p className="text-sm">{formatDate(brochure.createdAt)}</p>
							</div>
							{brochure.createdByName && (
								<div>
									<p className="text-sm font-medium text-muted-foreground">Created By</p>
									<p className="text-sm">{brochure.createdByName}</p>
								</div>
							)}
							<div>
								<p className="text-sm font-medium text-muted-foreground">Expires</p>
								<p className="text-sm">{formatDate(brochure.expiresAt)}</p>
							</div>
							<Separator />
							<div>
								<p className="text-sm font-medium text-muted-foreground">Email</p>
								{brochure.emailSentAt ? (
									<>
										<p className="text-sm">Last sent: {formatDateTime(brochure.emailSentAt)}</p>
										<p className="text-sm text-muted-foreground">
											Sent {brochure.emailSentCount}{' '}
											{brochure.emailSentCount === 1 ? 'time' : 'times'}
										</p>
									</>
								) : (
									<p className="text-sm text-muted-foreground">Not yet sent</p>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Edit Message Dialog */}
			<EditMessageDialog
				open={editMessageOpen}
				onOpenChange={setEditMessageOpen}
				brochureId={brochure.id}
				currentMessage={brochure.message}
				updateMutation={updateMutation}
			/>

			{/* Edit Products Dialog */}
			<EditProductsDialog
				open={editProductsOpen}
				onOpenChange={setEditProductsOpen}
				brochureId={brochure.id}
				currentProducts={brochure.products}
				updateMutation={updateMutation}
			/>

			{/* Edit Expiry Dialog */}
			<EditExpiryDialog
				open={editExpiryOpen}
				onOpenChange={setEditExpiryOpen}
				brochureId={brochure.id}
				currentExpiry={brochure.expiresAt}
				updateMutation={updateMutation}
			/>

			{/* Archive Dialog */}
			<DeleteConfirmDialog
				open={archiveDialogOpen}
				onOpenChange={setArchiveDialogOpen}
				onConfirm={handleArchive}
				title="Archive Brochure"
				description={`Are you sure you want to archive this brochure for ${getCustomerName()}? The brochure link will stop working.`}
				isLoading={archiveMutation.isPending}
			/>
		</div>
	);
}

function InterestIndicator({ product }: { product: BrochureProduct }) {
	if (!product.isInterested) return null;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="inline-flex">
					<Heart className="h-4 w-4 fill-red-500 text-red-500" />
				</span>
			</TooltipTrigger>
			<TooltipContent>
				Interested{product.interestedAt && ` on ${formatDateTime(product.interestedAt)}`}
			</TooltipContent>
		</Tooltip>
	);
}

function EditMessageDialog({
	open,
	onOpenChange,
	brochureId,
	currentMessage,
	updateMutation,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	brochureId: string;
	currentMessage: string | null;
	updateMutation: ReturnType<typeof useUpdateBrochureMutation>;
}) {
	const [message, setMessage] = useState(currentMessage || '');

	useEffect(() => {
		if (open) {
			setMessage(currentMessage || '');
		}
	}, [open, currentMessage]);

	const handleSave = async () => {
		try {
			await updateMutation.mutateAsync({ id: brochureId, message: message || undefined });
			onOpenChange(false);
		} catch {
			// Error handled by mutation
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Message</DialogTitle>
					<DialogDescription>Update the personal message for this brochure.</DialogDescription>
				</DialogHeader>
				<Textarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder="Write a personal message for the customer..."
					rows={5}
				/>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={updateMutation.isPending}>
						{updateMutation.isPending ? 'Saving...' : 'Save'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function EditExpiryDialog({
	open,
	onOpenChange,
	brochureId,
	currentExpiry,
	updateMutation,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	brochureId: string;
	currentExpiry: string;
	updateMutation: ReturnType<typeof useUpdateBrochureMutation>;
}) {
	const [expiresAt, setExpiresAt] = useState('');

	useEffect(() => {
		if (open) {
			setExpiresAt(new Date(currentExpiry).toISOString().split('T')[0]);
		}
	}, [open, currentExpiry]);

	const handleSave = async () => {
		try {
			await updateMutation.mutateAsync({
				id: brochureId,
				expiresAt: new Date(expiresAt).toISOString(),
			});
			onOpenChange(false);
		} catch {
			// Error handled by mutation
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Change Expiry Date</DialogTitle>
					<DialogDescription>Set a new expiry date for this brochure.</DialogDescription>
				</DialogHeader>
				<Input
					type="date"
					value={expiresAt}
					onChange={(e) => setExpiresAt(e.target.value)}
					className="max-w-xs"
				/>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={updateMutation.isPending || !expiresAt}>
						{updateMutation.isPending ? 'Saving...' : 'Save'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function EditProductsDialog({
	open,
	onOpenChange,
	brochureId,
	currentProducts,
	updateMutation,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	brochureId: string;
	currentProducts: BrochureProduct[];
	updateMutation: ReturnType<typeof useUpdateBrochureMutation>;
}) {
	const [selected, setSelected] = useState<SelectedProduct[]>([]);
	const [productSearch, setProductSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');

	// Initialize selected from current products when dialog opens
	useEffect(() => {
		if (open) {
			setSelected(
				currentProducts.map((p) => ({
					productId: p.productId,
					name: p.productName,
					imageUrl: p.productImageUrl,
					categoryName: p.productCategoryName,
				})),
			);
			setProductSearch('');
			setDebouncedSearch('');
		}
	}, [open, currentProducts]);

	// Debounce search
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(productSearch);
		}, 300);
		return () => clearTimeout(timer);
	}, [productSearch]);

	const { data: productsData } = useProductsQuery({
		search: debouncedSearch || undefined,
		isActive: 'true',
		limit: 20,
	});

	// Signed URLs for search results
	const searchImageUrls = productsData?.products.map((p) => p.imageUrl) ?? [];
	const { data: searchSignedUrls } = useSignedUrls(searchImageUrls);

	// Signed URLs for selected products
	const selectedImageUrls = selected.map((p) => p.imageUrl);
	const { data: selectedSignedUrls } = useSignedUrls(selectedImageUrls);

	const selectedIds = useMemo(() => new Set(selected.map((p) => p.productId)), [selected]);

	const availableProducts = useMemo(
		() => productsData?.products.filter((p) => !selectedIds.has(p.id)) ?? [],
		[productsData, selectedIds],
	);

	function addProduct(product: Product) {
		setSelected((prev) => [
			...prev,
			{
				productId: product.id,
				name: product.name,
				imageUrl: product.imageUrl,
				categoryName: product.category?.name ?? null,
			},
		]);
	}

	function removeProduct(productId: string) {
		setSelected((prev) => prev.filter((p) => p.productId !== productId));
	}

	function moveProduct(index: number, direction: 'up' | 'down') {
		setSelected((prev) => {
			const next = [...prev];
			const targetIndex = direction === 'up' ? index - 1 : index + 1;
			if (targetIndex < 0 || targetIndex >= next.length) return prev;
			[next[index], next[targetIndex]] = [next[targetIndex], next[index]];
			return next;
		});
	}

	const handleSave = async () => {
		try {
			await updateMutation.mutateAsync({
				id: brochureId,
				products: selected.map((p, i) => ({ productId: p.productId, sortOrder: i })),
			});
			onOpenChange(false);
		} catch {
			// Error handled by mutation
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit Products</DialogTitle>
					<DialogDescription>Add, remove, or reorder products in this brochure.</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Search */}
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search products..."
							value={productSearch}
							onChange={(e) => setProductSearch(e.target.value)}
							className="pl-9"
						/>
					</div>

					{/* Search Results */}
					{(debouncedSearch || productSearch) && (
						<div className="border rounded-lg max-h-48 overflow-y-auto">
							{availableProducts.length === 0 ? (
								<div className="p-4 text-sm text-muted-foreground text-center">
									No products found.
								</div>
							) : (
								<div className="divide-y">
									{availableProducts.map((product) => {
										const url = product.imageUrl ? searchSignedUrls?.get(product.imageUrl) : null;
										return (
											<div
												key={product.id}
												className="flex items-center gap-3 p-3 hover:bg-muted/50"
											>
												{url ? (
													<img
														src={url}
														alt={product.name}
														className="h-10 w-10 rounded object-cover shrink-0"
													/>
												) : (
													<div className="h-10 w-10 rounded bg-muted shrink-0" />
												)}
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium truncate">{product.name}</p>
													{product.category && (
														<p className="text-xs text-muted-foreground">{product.category.name}</p>
													)}
												</div>
												<Button variant="ghost" size="sm" onClick={() => addProduct(product)}>
													<Plus className="h-4 w-4 mr-1" />
													Add
												</Button>
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}

					{/* Selected Products */}
					{selected.length > 0 ? (
						<div>
							<p className="text-sm font-medium mb-2">Selected ({selected.length})</p>
							<div className="border rounded-lg divide-y">
								{selected.map((product, index) => {
									const url = product.imageUrl ? selectedSignedUrls?.get(product.imageUrl) : null;
									return (
										<div key={product.productId} className="flex items-center gap-3 p-3">
											{url ? (
												<img
													src={url}
													alt={product.name}
													className="h-10 w-10 rounded object-cover shrink-0"
												/>
											) : (
												<div className="h-10 w-10 rounded bg-muted shrink-0" />
											)}
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">{product.name}</p>
												{product.categoryName && (
													<p className="text-xs text-muted-foreground">{product.categoryName}</p>
												)}
											</div>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7"
													disabled={index === 0}
													onClick={() => moveProduct(index, 'up')}
												>
													<ArrowUp className="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7"
													disabled={index === selected.length - 1}
													onClick={() => moveProduct(index, 'down')}
												>
													<ArrowDown className="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7 text-destructive hover:text-destructive"
													onClick={() => removeProduct(product.productId)}
												>
													<X className="h-3.5 w-3.5" />
												</Button>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No products selected.</p>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={updateMutation.isPending || selected.length === 0}>
						{updateMutation.isPending ? 'Saving...' : 'Save'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
