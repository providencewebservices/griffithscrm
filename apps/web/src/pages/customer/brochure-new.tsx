import { Check, ChevronsUpDown, Eye, ImageIcon, Info, Mail, Package, Phone, Search, Sparkles, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CustomerFormDialog } from '@/components/customer/customer-form-dialog';
import { useCreateBrochureMutation } from '@/hooks/use-brochures';
import {
	type ContactInfoInput,
	type CreateCustomerInput,
	useCreateCustomerMutation,
	useCustomersQuery,
} from '@/hooks/use-customers';
import { useInquiryQuery, useLinkCustomerMutation } from '@/hooks/use-inquiries';
import { useProductCategoriesQuery } from '@/hooks/use-product-categories';
import { type Product, useProductsQuery } from '@/hooks/use-products';
import { SortableProductList } from '@/components/sortable-product-list';
import { useTenantSettingsQuery } from '@/hooks/use-tenant-settings';
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
	return getExpiryInDays(30);
}

function getExpiryInDays(days: number): string {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date.toISOString().split('T')[0];
}

const EXPIRY_PRESETS: Array<{ label: string; days: number }> = [
	{ label: '30d', days: 30 },
	{ label: '60d', days: 60 },
	{ label: '90d', days: 90 },
];

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
	const customerComboRef = useRef<HTMLButtonElement>(null);

	// Customer creation dialog (rescue flow when inquiry has no linked customer)
	const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
	const [createCustomerError, setCreateCustomerError] = useState<string | null>(null);

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
	const createCustomerMutation = useCreateCustomerMutation();
	const linkCustomerMutation = useLinkCustomerMutation();

	// Data queries
	const { data: customers } = useCustomersQuery();
	const { data: categories } = useProductCategoriesQuery();
	const { data: tenantSettings } = useTenantSettingsQuery();
	const defaultCountry = tenantSettings?.address?.country || 'GB';
	const { data: productsData } = useProductsQuery({
		search: debouncedProductSearch || undefined,
		categoryId: categoryFilter || undefined,
		isActive: 'true',
		limit: 100,
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

	// Track selected IDs for toggle behavior
	const selectedIds = useMemo(
		() => new Set(selectedProducts.map((p) => p.productId)),
		[selectedProducts],
	);

	const allProducts = productsData?.products ?? [];

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

	const inquiryNeedsCustomer = Boolean(inquiryId && inquiryData && !inquiryData.customerId && !customerId);

	const inquiryCustomerInitialValues = useMemo(() => {
		if (!inquiryData) return undefined;
		const contactInfo: ContactInfoInput[] = [];
		if (inquiryData.email) {
			contactInfo.push({ type: 'email', value: inquiryData.email, label: '', isPrimary: true });
		}
		if (inquiryData.phone) {
			contactInfo.push({
				type: 'phone',
				value: inquiryData.phone,
				label: '',
				isPrimary: !inquiryData.email,
			});
		}
		return {
			firstName: inquiryData.firstName,
			lastName: inquiryData.lastName,
			contactInfo,
		};
	}, [inquiryData]);

	async function handleCreateCustomerForInquiry(data: CreateCustomerInput) {
		setCreateCustomerError(null);
		try {
			const newCustomer = await createCustomerMutation.mutateAsync(data);
			if (inquiryId) {
				await linkCustomerMutation.mutateAsync({ inquiryId, customerId: newCustomer.id });
			}
			setCustomerId(newCustomer.id);
			setCreateCustomerOpen(false);
		} catch (err) {
			setCreateCustomerError(err instanceof Error ? err.message : 'Failed to create customer');
		}
	}

	function toggleProduct(product: Product) {
		if (selectedIds.has(product.id)) {
			setSelectedProducts((prev) => prev.filter((p) => p.productId !== product.id));
		} else {
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
	}

	function addAllVisible() {
		const newProducts = allProducts
			.filter((p) => !selectedIds.has(p.id))
			.map((p) => ({
				productId: p.id,
				name: p.name,
				imageUrl: p.imageUrl,
				categoryName: p.category?.name ?? null,
				description: p.description,
			}));
		if (newProducts.length > 0) {
			setSelectedProducts((prev) => [...prev, ...newProducts]);
		}
	}

	function removeAllVisible() {
		const visibleIds = new Set(allProducts.map((p) => p.id));
		setSelectedProducts((prev) => prev.filter((p) => !visibleIds.has(p.productId)));
	}

	function removeProduct(productId: string) {
		setSelectedProducts((prev) => prev.filter((p) => p.productId !== productId));
	}

	const allVisibleSelected = allProducts.length > 0 && allProducts.every((p) => selectedIds.has(p.id));
	const someVisibleSelected = allProducts.some((p) => selectedIds.has(p.id));

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
		<div className="flex flex-col">
			<div className="mb-6">
				<Breadcrumb className="mb-2">
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
				<h1 className="text-2xl font-bold">New Brochure</h1>
			</div>

			{inquiryNeedsCustomer && inquiryData && (
				<div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-4 dark:bg-amber-950/20">
					<div className="flex items-start gap-3">
						<UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
						<div className="flex-1 space-y-3">
							<div>
								<p className="font-medium text-amber-900 dark:text-amber-200">
									{inquiryData.firstName} {inquiryData.lastName} doesn't have a customer record yet
								</p>
								<p className="text-sm text-amber-800/80 dark:text-amber-300/80">
									Brochures are sent to customers, so we need to create one first. We'll use the contact details from this inquiry.
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-amber-900/90 dark:text-amber-200/90">
								{inquiryData.email && (
									<span className="inline-flex items-center gap-1.5">
										<Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
										{inquiryData.email}
									</span>
								)}
								{inquiryData.phone && (
									<span className="inline-flex items-center gap-1.5">
										<Phone className="h-3.5 w-3.5 shrink-0 opacity-70" />
										{inquiryData.phone}
									</span>
								)}
								{!inquiryData.email && !inquiryData.phone && (
									<span className="text-amber-800/70 italic dark:text-amber-300/70">
										No contact details on the inquiry — you can add them in the next step.
									</span>
								)}
							</div>
							<div className="flex flex-wrap gap-2">
								<Button size="sm" onClick={() => setCreateCustomerOpen(true)}>
									<UserPlus className="mr-1.5 h-3.5 w-3.5" />
									Create customer & continue
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setCustomerComboOpen(true);
										customerComboRef.current?.focus();
									}}
								>
									Pick existing customer
								</Button>
								<Link
									to={`/app/inquiries/${inquiryId}`}
									className="inline-flex items-center text-sm font-medium text-amber-900 hover:underline dark:text-amber-200"
								>
									View inquiry
								</Link>
							</div>
						</div>
					</div>
				</div>
			)}

			{inquiryId && inquiryData && !inquiryNeedsCustomer && (
				<div className="mb-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
					<Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
					<div className="flex-1 text-sm">
						<p className="font-medium">Pre-filled from inquiry</p>
						<p className="text-muted-foreground">
							The customer and products from this inquiry have been added. Edit anything that doesn't fit.
						</p>
					</div>
					<Link
						to={`/app/inquiries/${inquiryId}`}
						className="text-sm font-medium text-primary hover:underline shrink-0"
					>
						View inquiry
					</Link>
				</div>
			)}

			<div className="grid gap-6 lg:grid-cols-3 pb-20">
				{/* Details sidebar — first on mobile, right column on desktop */}
				<div className="space-y-6 lg:order-last">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Recipient</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-1.5">
								<FieldLabel className="text-sm font-medium">Customer</FieldLabel>
								<Popover open={customerComboOpen} onOpenChange={setCustomerComboOpen}>
									<PopoverTrigger asChild>
										<Button
											ref={customerComboRef}
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

							<div className="space-y-1.5">
								<FieldLabel className="text-sm font-medium">Message (optional)</FieldLabel>
								<Textarea
									placeholder="Write a personal message for the customer..."
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									rows={3}
								/>
							</div>

							<div className="space-y-1.5">
								<FieldLabel className="text-sm font-medium">Expires</FieldLabel>
								<Input
									type="date"
									value={expiresAt}
									onChange={(e) => setExpiresAt(e.target.value)}
									className="h-9 text-sm w-full"
								/>
								<div className="flex gap-1.5 pt-1">
									{EXPIRY_PRESETS.map((preset) => {
										const presetDate = getExpiryInDays(preset.days);
										const isActive = expiresAt === presetDate;
										return (
											<Button
												key={preset.days}
												type="button"
												variant={isActive ? 'secondary' : 'ghost'}
												size="sm"
												className="h-7 px-2.5 text-xs font-medium"
												onClick={() => setExpiresAt(presetDate)}
											>
												{preset.label}
											</Button>
										);
									})}
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Selected Products */}
					<Card>
						<CardHeader>
							<div className="flex items-center gap-2">
								<CardTitle className="text-base">Selected</CardTitle>
								{selectedProducts.length > 0 && (
									<Badge variant="secondary" className="text-xs">
										{selectedProducts.length}
									</Badge>
								)}
							</div>
						</CardHeader>
						<CardContent>
							{selectedProducts.length === 0 ? (
								<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
									<Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
									<p className="text-sm text-muted-foreground">
										Click products to add them
									</p>
								</div>
							) : (
								<SortableProductList
									products={selectedProducts}
									signedUrls={selectedSignedUrls}
									onReorder={setSelectedProducts}
									onRemove={removeProduct}
								/>
							)}
							{submitted && selectedProducts.length === 0 && (
								<FieldError className="mt-2">Add at least one product to the brochure</FieldError>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Product browser — main area */}
				<div className="lg:col-span-2">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Products</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Category Filter + Bulk Actions */}
							<div className="flex items-center gap-3">
								{categories && categories.length > 0 && (
									<Select
										value={categoryFilter || 'all'}
										onValueChange={(v) => setCategoryFilter(v === 'all' ? null : v)}
									>
										<SelectTrigger className="w-[220px]">
											<SelectValue placeholder="All categories" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All categories</SelectItem>
											{categories.map((cat) => (
												<SelectItem key={cat.id} value={cat.id}>
													{cat.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
								{allProducts.length > 0 && (
									<>
										{allVisibleSelected ? (
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={removeAllVisible}
											>
												Deselect All
											</Button>
										) : (
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={addAllVisible}
											>
												{someVisibleSelected ? 'Select Remaining' : 'Select All'}
											</Button>
										)}
									</>
								)}
							</div>

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
							<div className="border rounded-lg max-h-[32rem] overflow-y-auto">
								{allProducts.length === 0 ? (
									<div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
										<Package className="h-8 w-8 text-muted-foreground/40" />
										<p className="text-sm text-muted-foreground">
											{debouncedProductSearch || categoryFilter
												? 'No products match these filters.'
												: 'No active products yet.'}
										</p>
										{(debouncedProductSearch || categoryFilter) && (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => {
													setProductSearch('');
													setCategoryFilter(null);
												}}
											>
												Clear filters
											</Button>
										)}
									</div>
								) : (
									<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-3">
										{allProducts.map((product) => {
											const signedUrl = product.imageUrl
												? searchSignedUrls?.get(product.imageUrl)
												: null;
											const isSelected = selectedIds.has(product.id);
											return (
												<button
													key={product.id}
													type="button"
													onClick={() => toggleProduct(product)}
													aria-pressed={isSelected}
													className={cn(
														'relative text-left rounded-lg border overflow-hidden bg-background',
														isSelected
															? 'border-primary ring-2 ring-primary/30'
															: 'hover:border-foreground/20',
													)}
												>
													{signedUrl ? (
														<img
															src={signedUrl}
															alt={product.name}
															className="w-full aspect-[4/3] object-cover bg-muted/30"
														/>
													) : (
														<div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
															<ImageIcon className="h-8 w-8 text-muted-foreground/40" />
														</div>
													)}
													<div className="p-2.5">
														<p className="text-sm font-medium truncate">{product.name}</p>
														{product.category && (
															<p className="text-xs text-muted-foreground truncate mt-0.5">
																{product.category.name}
															</p>
														)}
													</div>
													<span
														aria-hidden="true"
														className={cn(
															'absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border-2 shadow-sm',
															isSelected
																? 'border-primary bg-primary text-primary-foreground'
																: 'border-white/80 bg-background/80 backdrop-blur-sm',
														)}
													>
														<Check
															className={cn(
																'size-3.5',
																isSelected ? 'opacity-100' : 'opacity-0',
															)}
														/>
													</span>
												</button>
											);
										})}
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Sticky action bar */}
			<div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 backdrop-blur-sm px-4 py-3">
				<div className="flex flex-wrap items-center gap-3">
					<Button
						onClick={() => handleSubmit(true)}
						disabled={!canSave}
						className="min-w-[14rem]"
					>
						<Eye className="h-4 w-4 mr-2" />
						{createBrochure.isPending
							? 'Creating...'
							: selectedProducts.length > 0
								? `Create & Preview · ${selectedProducts.length} ${selectedProducts.length === 1 ? 'product' : 'products'}`
								: 'Create & Preview'}
					</Button>
					<Button
						variant="ghost"
						onClick={() => handleSubmit(false)}
						disabled={!canSave}
						className="text-muted-foreground"
					>
						Create without preview
					</Button>
					<Button variant="ghost" onClick={handleCancel}>
						Cancel
					</Button>
					{submitted && !canSave && !createBrochure.isPending && (
						<div className="ml-auto flex items-center gap-2 text-sm text-destructive">
							<Info className="h-4 w-4 shrink-0" />
							<span>
								{!customerId && selectedProducts.length === 0
									? 'Pick a customer and add at least one product.'
									: !customerId
										? 'Pick a customer to continue.'
										: 'Add at least one product to continue.'}
							</span>
						</div>
					)}
				</div>
				{createBrochure.isError && (
					<p className="text-sm text-destructive mt-2">
						{createBrochure.error?.message || 'Failed to create brochure'}
					</p>
				)}
			</div>

			{/* Create customer (rescue flow) */}
			<CustomerFormDialog
				open={createCustomerOpen}
				onOpenChange={(open) => {
					setCreateCustomerOpen(open);
					if (!open) setCreateCustomerError(null);
				}}
				onSubmit={handleCreateCustomerForInquiry}
				customer={null}
				initialValues={inquiryCustomerInitialValues}
				isLoading={createCustomerMutation.isPending || linkCustomerMutation.isPending}
				error={createCustomerError}
				defaultCountry={defaultCountry}
			/>

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
