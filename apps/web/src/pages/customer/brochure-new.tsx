import { ArrowLeft, Check, ChevronsUpDown, Eye, ImageIcon, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useCreateBrochureMutation } from '@/hooks/use-brochures';
import { useCustomersQuery } from '@/hooks/use-customers';
import { useInquiryQuery } from '@/hooks/use-inquiries';
import { useProductCategoriesQuery } from '@/hooks/use-product-categories';
import { type Product, useProductsQuery } from '@/hooks/use-products';
import { SortableProductList } from '@/components/sortable-product-list';
import { useSignedUrls } from '@/hooks/use-uploads';
import { cn } from '@/lib/utils';

type SelectedProduct = {
	productId: string;
	name: string;
	imageUrl: string | null;
	categoryName: string | null;
	description: string | null;
};

function getDefaultExpiry(): string {
	const date = new Date();
	date.setDate(date.getDate() + 30);
	return date.toISOString().split('T')[0];
}

export function BrochureNewPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const preselectedCustomerId = searchParams.get('customerId');
	const inquiryId = searchParams.get('inquiryId');

	// Inquiry pre-fill
	const { data: inquiryData } = useInquiryQuery(inquiryId || undefined);

	// Customer selector state
	const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
	const [customerComboOpen, setCustomerComboOpen] = useState(false);

	// Product search state
	const [productSearch, setProductSearch] = useState('');
	const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
	const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

	// Selected products
	const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

	// Form fields
	const [message, setMessage] = useState('');
	const [expiresAt, setExpiresAt] = useState(getDefaultExpiry());

	// Validation
	const [submitted, setSubmitted] = useState(false);

	// Cancel confirmation
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

	// Mutations
	const createBrochure = useCreateBrochureMutation();

	// Data queries
	const { data: customers } = useCustomersQuery();
	const { data: categories } = useProductCategoriesQuery();
	const { data: productsData } = useProductsQuery({
		search: debouncedProductSearch || undefined,
		categoryId: categoryFilter || undefined,
		isActive: 'true',
		limit: 20,
	});

	// Pre-fill from inquiry data
	useEffect(() => {
		if (!inquiryData) return;
		if (inquiryData.customerId && !customerId) {
			setCustomerId(inquiryData.customerId);
		}
		if (inquiryData.products.length > 0 && selectedProducts.length === 0) {
			setSelectedProducts(
				inquiryData.products.map((p) => ({
					productId: p.productId,
					name: p.productName,
					imageUrl: p.productImageUrl,
					categoryName: p.productCategoryName,
					description: null,
				})),
			);
		}
	}, [inquiryData]); // eslint-disable-line react-hooks/exhaustive-deps

	// Debounce product search
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedProductSearch(productSearch);
		}, 300);
		return () => clearTimeout(timer);
	}, [productSearch]);

	// Get signed URLs for selected product images
	const selectedImageUrls = selectedProducts.map((p) => p.imageUrl);
	const { data: selectedSignedUrls } = useSignedUrls(selectedImageUrls);

	// Get signed URLs for product search result images
	const searchResultImageUrls = productsData?.products.map((p) => p.imageUrl) ?? [];
	const { data: searchSignedUrls } = useSignedUrls(searchResultImageUrls);

	// Filter out already-selected products from search results
	const selectedIds = useMemo(
		() => new Set(selectedProducts.map((p) => p.productId)),
		[selectedProducts],
	);

	const availableProducts = useMemo(
		() => productsData?.products.filter((p) => !selectedIds.has(p.id)) ?? [],
		[productsData, selectedIds],
	);

	// Find customer name for display
	const selectedCustomer = customers?.find((c) => c.id === customerId);
	const customerDisplayName = selectedCustomer
		? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
		: '';

	// Dirty state for unsaved-changes protection
	const isDirty = useMemo(() => {
		return (
			customerId !== (preselectedCustomerId || '') ||
			selectedProducts.length > 0 ||
			message !== '' ||
			expiresAt !== getDefaultExpiry()
		);
	}, [customerId, preselectedCustomerId, selectedProducts, message, expiresAt]);

	// Protect against browser close/refresh with unsaved changes
	useEffect(() => {
		if (!isDirty) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	}, [isDirty]);

	function addProduct(product: Product) {
		setSelectedProducts((prev) => [
			...prev,
			{
				productId: product.id,
				name: product.name,
				imageUrl: product.imageUrl,
				categoryName: product.category?.name ?? null,
				description: product.description,
			},
		]);
	}

	function removeProduct(productId: string) {
		setSelectedProducts((prev) => prev.filter((p) => p.productId !== productId));
	}

	async function handleSubmit(openPreview = false) {
		setSubmitted(true);
		if (!customerId || selectedProducts.length === 0) return;

		try {
			const brochure = await createBrochure.mutateAsync({
				customerId,
				inquiryId: inquiryId || undefined,
				message: message || undefined,
				expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
				products: selectedProducts.map((p, i) => ({
					productId: p.productId,
					sortOrder: i,
				})),
			});
			if (openPreview) {
				window.open(`${window.location.origin}/brochure/${brochure.accessToken}`, '_blank');
			}
			navigate(`/app/brochures/${brochure.id}`);
		} catch {
			// Error is handled by mutation state
		}
	}

	function handleCancel() {
		if (isDirty) {
			setCancelDialogOpen(true);
		} else {
			navigate('/app/brochures');
		}
	}

	const canSave = customerId && selectedProducts.length > 0 && !createBrochure.isPending;

	return (
		<div>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/brochures">Brochures</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>New Brochure</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="mb-6 flex items-center gap-3">
				<Link to="/app/brochures">
					<Button variant="ghost" size="icon" className="h-8 w-8">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<h2 className="text-2xl font-bold">New Brochure</h2>
			</div>

			<div className="max-w-3xl space-y-6">
				{/* Customer, Message & Expiry */}
				<div className="space-y-3">
					<div className="space-y-1">
						<FieldLabel className="text-xs font-medium text-muted-foreground">Customer</FieldLabel>
						<Popover open={customerComboOpen} onOpenChange={setCustomerComboOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={customerComboOpen}
									className="w-full justify-between font-normal h-9 text-sm"
								>
									<span className="truncate">
										{customerId ? customerDisplayName || 'Select...' : 'Select a customer...'}
									</span>
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
								<Command>
									<CommandInput placeholder="Search customers..." />
									<CommandList>
										<CommandEmpty>No customers found.</CommandEmpty>
										{customerId && (
											<CommandGroup>
												<CommandItem
													value="_clear"
													onSelect={() => {
														setCustomerId('');
														setCustomerComboOpen(false);
													}}
												>
													<span className="text-muted-foreground">Clear selection</span>
												</CommandItem>
											</CommandGroup>
										)}
										<CommandGroup>
											{customers?.map((customer) => (
												<CommandItem
													key={customer.id}
													value={`${customer.firstName} ${customer.lastName}`}
													onSelect={() => {
														setCustomerId(customer.id);
														setCustomerComboOpen(false);
													}}
												>
													<Check
														className={cn(
															'mr-2 h-4 w-4',
															customerId === customer.id ? 'opacity-100' : 'opacity-0',
														)}
													/>
													{customer.firstName} {customer.lastName}
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
						{submitted && !customerId && (
							<FieldError>Please select a customer</FieldError>
						)}
					</div>

					<div className="space-y-1">
						<FieldLabel className="text-xs font-medium text-muted-foreground">Message (optional)</FieldLabel>
						<Textarea
							placeholder="Write a personal message for the customer..."
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							rows={3}
						/>
					</div>

					<div className="space-y-1">
						<FieldLabel className="text-xs font-medium text-muted-foreground">Expires</FieldLabel>
						<Input
							type="date"
							value={expiresAt}
							onChange={(e) => setExpiresAt(e.target.value)}
							className="h-9 text-sm max-w-[180px]"
						/>
					</div>
				</div>

				{/* Product Selector */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Products</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Category Tabs */}
						{categories && categories.length > 0 && (
							<Tabs
								value={categoryFilter || 'all'}
								onValueChange={(v) => setCategoryFilter(v === 'all' ? null : v)}
							>
								<div className="overflow-x-auto">
									<TabsList className="h-8 w-max">
										<TabsTrigger value="all" className="text-xs px-2 h-6">
											All
										</TabsTrigger>
										{categories.map((cat) => (
											<TabsTrigger key={cat.id} value={cat.id} className="text-xs px-2 h-6">
												{cat.name}
											</TabsTrigger>
										))}
									</TabsList>
								</div>
							</Tabs>
						)}

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

						{/* Product Grid */}
						<div className="border rounded-lg max-h-72 overflow-y-auto">
							{availableProducts.length === 0 ? (
								<div className="p-4 text-sm text-muted-foreground text-center">
									No products found.
								</div>
							) : (
								<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-2">
									{availableProducts.map((product) => {
										const signedUrl = product.imageUrl
											? searchSignedUrls?.get(product.imageUrl)
											: null;
										return (
											<button
												key={product.id}
												type="button"
												onClick={() => addProduct(product)}
												className="group relative text-left rounded-lg border bg-background hover:bg-muted/50 overflow-hidden transition-colors"
											>
												{signedUrl ? (
													<img
														src={signedUrl}
														alt={product.name}
														className="w-full aspect-[4/3] object-cover"
													/>
												) : (
													<div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
														<ImageIcon className="h-8 w-8 text-muted-foreground/40" />
													</div>
												)}
												<div className="p-2">
													<p className="text-sm font-medium truncate">{product.name}</p>
													{product.category && (
														<p className="text-xs text-muted-foreground truncate">
															{product.category.name}
														</p>
													)}
												</div>
												<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg pointer-events-none">
													<div className="rounded-full bg-white/90 p-1.5">
														<Plus className="h-4 w-4 text-foreground" />
													</div>
												</div>
											</button>
										);
									})}
								</div>
							)}
						</div>

						{/* Selected Products */}
						{selectedProducts.length > 0 && (
							<div>
								<p className="text-sm font-medium mb-2">
									Selected ({selectedProducts.length})
								</p>
								<SortableProductList
									products={selectedProducts}
									signedUrls={selectedSignedUrls}
									onReorder={setSelectedProducts}
									onRemove={removeProduct}
								/>
							</div>
						)}

						{submitted && selectedProducts.length === 0 && (
							<FieldError>Add at least one product to the brochure</FieldError>
						)}
					</CardContent>
				</Card>

				{/* Actions */}
				<div className="flex items-center gap-3">
					<Button onClick={() => handleSubmit(false)} disabled={!canSave}>
						{createBrochure.isPending ? 'Creating...' : 'Create Brochure'}
					</Button>
					<Button variant="outline" onClick={() => handleSubmit(true)} disabled={!canSave}>
						<Eye className="h-4 w-4 mr-2" />
						Save & Preview
					</Button>
					<Button variant="ghost" onClick={handleCancel}>
						Cancel
					</Button>
				</div>

				{createBrochure.isError && (
					<p className="text-sm text-destructive">
						{createBrochure.error?.message || 'Failed to create brochure'}
					</p>
				)}
			</div>

			{/* Cancel Confirmation */}
			<AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Discard changes?</AlertDialogTitle>
						<AlertDialogDescription>
							You have unsaved changes. Are you sure you want to leave?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep Editing</AlertDialogCancel>
						<AlertDialogAction onClick={() => navigate('/app/brochures')}>
							Discard
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

