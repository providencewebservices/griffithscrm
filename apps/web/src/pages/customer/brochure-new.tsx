import {
	ArrowDown,
	ArrowLeft,
	ArrowUp,
	Check,
	ChevronsUpDown,
	Plus,
	Search,
	X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
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
import { FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useCreateBrochureMutation } from '@/hooks/use-brochures';
import { useCustomersQuery } from '@/hooks/use-customers';
import { type Product, useProductsQuery } from '@/hooks/use-products';
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

	// Customer selector state
	const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
	const [customerComboOpen, setCustomerComboOpen] = useState(false);

	// Product search state
	const [productSearch, setProductSearch] = useState('');
	const [debouncedProductSearch, setDebouncedProductSearch] = useState('');

	// Selected products
	const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

	// Form fields
	const [message, setMessage] = useState('');
	const [expiresAt, setExpiresAt] = useState(getDefaultExpiry());

	// Mutations
	const createBrochure = useCreateBrochureMutation();

	// Data queries
	const { data: customers } = useCustomersQuery();
	const { data: productsData } = useProductsQuery({
		search: debouncedProductSearch || undefined,
		isActive: 'true',
		limit: 20,
	});

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

	function moveProduct(index: number, direction: 'up' | 'down') {
		setSelectedProducts((prev) => {
			const next = [...prev];
			const targetIndex = direction === 'up' ? index - 1 : index + 1;
			if (targetIndex < 0 || targetIndex >= next.length) return prev;
			[next[index], next[targetIndex]] = [next[targetIndex], next[index]];
			return next;
		});
	}

	async function handleSubmit() {
		if (!customerId || selectedProducts.length === 0) return;

		try {
			const brochure = await createBrochure.mutateAsync({
				customerId,
				message: message || undefined,
				expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
				products: selectedProducts.map((p, i) => ({
					productId: p.productId,
					sortOrder: i,
				})),
			});
			navigate(`/app/brochures/${brochure.id}`);
		} catch {
			// Error is handled by mutation state
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

			<div className="grid gap-6 max-w-3xl">
				{/* Customer Selector */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Customer</CardTitle>
					</CardHeader>
					<CardContent>
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
					</CardContent>
				</Card>

				{/* Product Selector */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Products</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
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
						{(debouncedProductSearch || productSearch) && (
							<div className="border rounded-lg max-h-64 overflow-y-auto">
								{availableProducts.length === 0 ? (
									<div className="p-4 text-sm text-muted-foreground text-center">
										No products found.
									</div>
								) : (
									<div className="divide-y">
										{availableProducts.map((product) => {
											const signedUrl = product.imageUrl
												? searchSignedUrls?.get(product.imageUrl)
												: null;
											return (
												<div
													key={product.id}
													className="flex items-center gap-3 p-3 hover:bg-muted/50"
												>
													{signedUrl ? (
														<img
															src={signedUrl}
															alt={product.name}
															className="h-10 w-10 rounded object-cover shrink-0"
														/>
													) : (
														<div className="h-10 w-10 rounded bg-muted shrink-0" />
													)}
													<div className="flex-1 min-w-0">
														<p className="text-sm font-medium truncate">{product.name}</p>
														{product.category && (
															<p className="text-xs text-muted-foreground">
																{product.category.name}
															</p>
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
						{selectedProducts.length > 0 && (
							<div>
								<FieldLabel className="text-sm font-medium mb-2">
									Selected ({selectedProducts.length})
								</FieldLabel>
								<div className="border rounded-lg divide-y">
									{selectedProducts.map((product, index) => {
										const signedUrl = product.imageUrl
											? selectedSignedUrls?.get(product.imageUrl)
											: null;
										return (
											<div key={product.productId} className="flex items-center gap-3 p-3">
												{signedUrl ? (
													<img
														src={signedUrl}
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
														disabled={index === selectedProducts.length - 1}
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
						)}

						{selectedProducts.length === 0 && !productSearch && (
							<p className="text-sm text-muted-foreground">
								Search for products above to add them to the brochure.
							</p>
						)}
					</CardContent>
				</Card>

				{/* Message & Expiry */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<FieldLabel className="text-sm font-medium">Message (optional)</FieldLabel>
							<Textarea
								placeholder="Write a personal message for the customer..."
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								rows={4}
							/>
						</div>
						<div className="space-y-2">
							<FieldLabel className="text-sm font-medium">Expires</FieldLabel>
							<Input
								type="date"
								value={expiresAt}
								onChange={(e) => setExpiresAt(e.target.value)}
								className="h-9 text-sm max-w-xs"
							/>
						</div>
					</CardContent>
				</Card>

				{/* Actions */}
				<div className="flex items-center gap-3">
					<Button onClick={handleSubmit} disabled={!canSave}>
						{createBrochure.isPending ? 'Creating...' : 'Create Brochure'}
					</Button>
					<Link to="/app/brochures">
						<Button variant="outline">Cancel</Button>
					</Link>
				</div>

				{createBrochure.isError && (
					<p className="text-sm text-destructive">
						{createBrochure.error?.message || 'Failed to create brochure'}
					</p>
				)}
			</div>
		</div>
	);
}
