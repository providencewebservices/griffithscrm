import { ArrowLeft, Check, ChevronsUpDown, ImageIcon, Search, X } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useCustomersQuery } from '@/hooks/use-customers';
import { useCreateInquiryMutation } from '@/hooks/use-inquiries';
import { useProductCategoriesQuery } from '@/hooks/use-product-categories';
import { type Product, useProductsQuery } from '@/hooks/use-products';
import { type Sundry, useSundriesQuery } from '@/hooks/use-sundries';
import { useSignedUrls } from '@/hooks/use-uploads';
import { cn } from '@/lib/utils';

const SOURCE_OPTIONS = [
	{ value: 'walk_in', label: 'Walk-in' },
	{ value: 'phone', label: 'Phone' },
	{ value: 'email', label: 'Email' },
	{ value: 'website', label: 'Website' },
	{ value: 'facebook', label: 'Facebook' },
	{ value: 'instagram', label: 'Instagram' },
	{ value: 'whatsapp', label: 'WhatsApp' },
	{ value: 'referral', label: 'Referral' },
	{ value: 'other', label: 'Other' },
];

type SelectedProduct = {
	productId: string;
	name: string;
	imageUrl: string | null;
	categoryName: string | null;
};

type SelectedSundry = {
	sundryId: string;
	name: string;
	description: string | null;
	imageUrl: string | null;
};

export function InquiryNewPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const preselectedCustomerId = searchParams.get('customerId');

	// Form fields
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [source, setSource] = useState('phone');
	const [message, setMessage] = useState('');

	// Customer selector
	const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
	const [customerComboOpen, setCustomerComboOpen] = useState(false);

	// Product search
	const [productSearch, setProductSearch] = useState('');
	const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
	const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
	const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
	const [sundrySearch, setSundrySearch] = useState('');
	const [selectedSundries, setSelectedSundries] = useState<SelectedSundry[]>([]);

	// Validation + UI state
	const [submitted, setSubmitted] = useState(false);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

	// Mutations
	const createInquiry = useCreateInquiryMutation();

	// Data queries
	const { data: customers } = useCustomersQuery();
	const { data: categories } = useProductCategoriesQuery();
	const { data: productsData } = useProductsQuery({
		search: debouncedProductSearch || undefined,
		categoryId: categoryFilter || undefined,
		isActive: 'true',
		limit: 20,
	});
	const { data: sundriesData } = useSundriesQuery();

	// Debounce product search
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedProductSearch(productSearch);
		}, 300);
		return () => clearTimeout(timer);
	}, [productSearch]);

	// Product image signed URLs
	const searchResultImageUrls = productsData?.products.map((p) => p.imageUrl) ?? [];
	const { data: searchSignedUrls } = useSignedUrls(searchResultImageUrls);
	const selectedProductImageUrls = selectedProducts.map((p) => p.imageUrl);
	const { data: selectedSignedUrls } = useSignedUrls(selectedProductImageUrls);
	const sundryImageUrls =
		sundriesData?.filter((sundry) => sundry.isActive).map((sundry) => sundry.imageUrl) ?? [];
	const { data: sundrySignedUrls } = useSignedUrls(sundryImageUrls);
	const selectedSundryImageUrls = selectedSundries.map((sundry) => sundry.imageUrl);
	const { data: selectedSundrySignedUrls } = useSignedUrls(selectedSundryImageUrls);

	// Filter out already-selected products
	const selectedIds = useMemo(
		() => new Set(selectedProducts.map((p) => p.productId)),
		[selectedProducts],
	);
	const availableProducts = useMemo(
		() => productsData?.products.filter((p) => !selectedIds.has(p.id)) ?? [],
		[productsData, selectedIds],
	);
	const selectedSundryIds = useMemo(
		() => new Set(selectedSundries.map((s) => s.sundryId)),
		[selectedSundries],
	);
	const availableSundries = useMemo(() => {
		if (!sundriesData) return [];
		const search = sundrySearch.trim().toLowerCase();
		return sundriesData.filter((sundry) => {
			if (!sundry.isActive) return false;
			if (selectedSundryIds.has(sundry.id)) return false;
			if (!search) return true;
			return (
				sundry.name.toLowerCase().includes(search) ||
				(sundry.description || '').toLowerCase().includes(search)
			);
		});
	}, [sundriesData, selectedSundryIds, sundrySearch]);

	// Customer display name
	const selectedCustomer = customers?.find((c) => c.id === customerId);
	const customerDisplayName = selectedCustomer
		? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
		: '';

	// Dirty state
	const isDirty = useMemo(() => {
		return (
			firstName !== '' ||
			lastName !== '' ||
			email !== '' ||
			phone !== '' ||
			message !== '' ||
			selectedProducts.length > 0 ||
			selectedSundries.length > 0 ||
			customerId !== (preselectedCustomerId || '')
		);
	}, [
		firstName,
		lastName,
		email,
		phone,
		message,
		selectedProducts,
		selectedSundries,
		customerId,
		preselectedCustomerId,
	]);

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
			},
		]);
	}

	function removeProduct(productId: string) {
		setSelectedProducts((prev) => prev.filter((p) => p.productId !== productId));
	}

	function addSundry(sundry: Sundry) {
		setSelectedSundries((prev) => [
			...prev,
			{
				sundryId: sundry.id,
				name: sundry.name,
				description: sundry.description,
				imageUrl: sundry.imageUrl,
			},
		]);
	}

	function removeSundry(sundryId: string) {
		setSelectedSundries((prev) => prev.filter((s) => s.sundryId !== sundryId));
	}

	async function handleSubmit() {
		setSubmitted(true);
		if (!firstName.trim() || !lastName.trim() || !source) return;

		try {
			const inquiry = await createInquiry.mutateAsync({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				email: email.trim() || undefined,
				phone: phone.trim() || undefined,
				message: message.trim() || undefined,
				source,
				customerId: customerId || undefined,
				products: selectedProducts.map((p) => ({ productId: p.productId })),
				sundries: selectedSundries.map((s) => ({ sundryId: s.sundryId })),
			});
			navigate(`/app/inquiries/${inquiry.id}`);
		} catch {
			// Error handled by mutation state
		}
	}

	function handleCancel() {
		if (isDirty) {
			setCancelDialogOpen(true);
		} else {
			navigate('/app/inquiries');
		}
	}

	const canSave = firstName.trim() && lastName.trim() && source && !createInquiry.isPending;

	return (
		<div>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/inquiries">Inquiries</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>New Inquiry</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header with actions anchored top-right */}
			<div className="mb-6 flex items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancel}>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<h2 className="text-2xl font-bold">New Inquiry</h2>
				</div>
				<div className="flex items-center gap-3">
					<Button variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!canSave}>
						{createInquiry.isPending ? 'Creating...' : 'Create Inquiry'}
					</Button>
				</div>
			</div>

			{createInquiry.isError && (
				<p className="text-sm text-destructive mb-4">
					{createInquiry.error?.message || 'Failed to create inquiry'}
				</p>
			)}

			{/* Two-column layout: form left, item picker right */}
			<div className="grid lg:grid-cols-2 gap-6">
				{/* Left column — required form fields */}
				<div className="space-y-6">
					{/* Contact Details */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Contact Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1">
									<label htmlFor="firstName" className="text-sm font-medium">
										First Name <span className="text-destructive">*</span>
									</label>
									<Input
										id="firstName"
										value={firstName}
										onChange={(e) => setFirstName(e.target.value)}
										placeholder="First name"
									/>
									{submitted && !firstName.trim() && (
										<p className="text-sm text-destructive">First name is required</p>
									)}
								</div>
								<div className="space-y-1">
									<label htmlFor="lastName" className="text-sm font-medium">
										Last Name <span className="text-destructive">*</span>
									</label>
									<Input
										id="lastName"
										value={lastName}
										onChange={(e) => setLastName(e.target.value)}
										placeholder="Last name"
									/>
									{submitted && !lastName.trim() && (
										<p className="text-sm text-destructive">Last name is required</p>
									)}
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1">
									<label htmlFor="email" className="text-sm font-medium">
										Email
									</label>
									<Input
										id="email"
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="email@example.com"
									/>
								</div>
								<div className="space-y-1">
									<label htmlFor="phone" className="text-sm font-medium">
										Phone
									</label>
									<Input
										id="phone"
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										placeholder="Phone number"
									/>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Inquiry Details */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Inquiry Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-1">
								<label htmlFor="source" className="text-sm font-medium">
									Source <span className="text-destructive">*</span>
								</label>
								<Select value={source} onValueChange={setSource}>
									<SelectTrigger>
										<SelectValue placeholder="Select source..." />
									</SelectTrigger>
									<SelectContent>
										{SOURCE_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<label htmlFor="message" className="text-sm font-medium">
									Message / Notes
								</label>
								<Textarea
									id="message"
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									placeholder="What is the customer interested in?"
									rows={4}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Customer (optional) — lighter title to signal optionality */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Customer (optional)
							</CardTitle>
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
											{customerId
												? customerDisplayName || 'Select...'
												: 'Link to existing customer...'}
										</span>
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent
									className="w-[--radix-popover-trigger-width] p-0"
									align="start"
								>
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
														<span className="text-muted-foreground">
															Clear selection
														</span>
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
																customerId === customer.id
																	? 'opacity-100'
																	: 'opacity-0',
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
							<p className="text-xs text-muted-foreground mt-2">
								You can also link a customer later from the inquiry detail page.
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Right column — item picker */}
				<Card className="h-fit">
					<CardHeader>
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Items of Interest (optional)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Tabs defaultValue="products">
							<TabsList className="w-full mb-4">
								<TabsTrigger value="products" className="flex-1">
									Products
									{selectedProducts.length > 0 && (
										<span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
											{selectedProducts.length}
										</span>
									)}
								</TabsTrigger>
								<TabsTrigger value="sundries" className="flex-1">
									Sundries
									{selectedSundries.length > 0 && (
										<span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
											{selectedSundries.length}
										</span>
									)}
								</TabsTrigger>
							</TabsList>

							{/* ---- Products tab ---- */}
							<TabsContent value="products" className="mt-0 space-y-3">
								{/* Selected product chips */}
								{selectedProducts.length > 0 && (
									<div className="flex flex-wrap gap-1.5">
										{selectedProducts.map((product) => (
											<span
												key={product.productId}
												className="inline-flex items-center gap-1 rounded-full bg-secondary pl-2.5 pr-1 py-1 text-xs text-secondary-foreground"
											>
												{product.name}
												<button
													type="button"
													onClick={() => removeProduct(product.productId)}
													className="rounded-full p-0.5 hover:bg-muted-foreground/20"
												>
													<X className="h-3 w-3" />
												</button>
											</span>
										))}
									</div>
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

								{/* Category filter */}
								{categories && categories.length > 0 && (
									<Tabs
										value={categoryFilter || 'all'}
										onValueChange={(v) =>
											setCategoryFilter(v === 'all' ? null : v)
										}
									>
										<div className="overflow-x-auto">
											<TabsList className="h-8 w-max">
												<TabsTrigger
													value="all"
													className="text-xs px-2 h-6"
												>
													All
												</TabsTrigger>
												{categories.map((cat) => (
													<TabsTrigger
														key={cat.id}
														value={cat.id}
														className="text-xs px-2 h-6"
													>
														{cat.name}
													</TabsTrigger>
												))}
											</TabsList>
										</div>
									</Tabs>
								)}

								{/* Product grid */}
								{availableProducts.length > 0 && (
									<div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
										{availableProducts.map((product) => (
											<button
												key={product.id}
												type="button"
												onClick={() => addProduct(product)}
												className="flex flex-col items-center gap-1 p-2 border rounded-md hover:bg-accent transition-colors text-left"
											>
												{product.imageUrl &&
												searchSignedUrls?.get(product.imageUrl) ? (
													<img
														src={searchSignedUrls.get(product.imageUrl)!}
														alt={product.name}
														className="w-full aspect-square rounded object-cover"
													/>
												) : (
													<div className="w-full aspect-square rounded bg-muted flex items-center justify-center">
														<ImageIcon className="h-6 w-6 text-muted-foreground" />
													</div>
												)}
												<p className="text-xs font-medium truncate w-full">
													{product.name}
												</p>
											</button>
										))}
									</div>
								)}
							</TabsContent>

							{/* ---- Sundries tab ---- */}
							<TabsContent value="sundries" className="mt-0 space-y-3">
								{/* Selected sundry chips */}
								{selectedSundries.length > 0 && (
									<div className="flex flex-wrap gap-1.5">
										{selectedSundries.map((sundry) => (
											<span
												key={sundry.sundryId}
												className="inline-flex items-center gap-1 rounded-full bg-secondary pl-2.5 pr-1 py-1 text-xs text-secondary-foreground"
											>
												{sundry.name}
												<button
													type="button"
													onClick={() => removeSundry(sundry.sundryId)}
													className="rounded-full p-0.5 hover:bg-muted-foreground/20"
												>
													<X className="h-3 w-3" />
												</button>
											</span>
										))}
									</div>
								)}

								{/* Search */}
								<div className="relative">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search sundries..."
										value={sundrySearch}
										onChange={(e) => setSundrySearch(e.target.value)}
										className="pl-9"
									/>
								</div>

								{/* Sundry grid */}
								{availableSundries.length > 0 ? (
									<div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
										{availableSundries.map((sundry) => (
											<button
												key={sundry.id}
												type="button"
												onClick={() => addSundry(sundry)}
												className="flex flex-col items-center gap-1 p-2 border rounded-md hover:bg-accent transition-colors text-left"
											>
												{sundry.imageUrl &&
												sundrySignedUrls?.get(sundry.imageUrl) ? (
													<img
														src={sundrySignedUrls.get(sundry.imageUrl)!}
														alt={sundry.name}
														className="w-full aspect-square rounded object-cover"
													/>
												) : (
													<div className="w-full aspect-square rounded bg-muted flex items-center justify-center">
														<ImageIcon className="h-6 w-6 text-muted-foreground" />
													</div>
												)}
												<p className="text-xs font-medium truncate w-full">
													{sundry.name}
												</p>
											</button>
										))}
									</div>
								) : (
									<p className="text-sm text-muted-foreground">
										{sundrySearch.trim()
											? 'No sundries found matching your search.'
											: 'No active sundries available.'}
									</p>
								)}
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</div>

			{/* Cancel confirmation dialog */}
			<AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Discard changes?</AlertDialogTitle>
						<AlertDialogDescription>
							You have unsaved changes. Are you sure you want to leave?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep editing</AlertDialogCancel>
						<AlertDialogAction onClick={() => navigate('/app/inquiries')}>
							Discard
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
