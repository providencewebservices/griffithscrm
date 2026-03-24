import {
	ChevronLeft,
	ChevronRight,
	ImageIcon,
	LayoutGrid,
	List,
	Package,
	Plus,
	Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ProductFormDialog } from '@/components/customer/products/product-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProductCategoriesQuery } from '@/hooks/use-product-categories';
import {
	type CreateProductInput,
	type Product,
	type ProductListParams,
	useCreateProductMutation,
	useProductsQuery,
} from '@/hooks/use-products';
import {
	type CreateSundryInput,
	type Sundry,
	useCreateSundryMutation,
	useSundriesQuery,
} from '@/hooks/use-sundries';
import { useSuppliersQuery } from '@/hooks/use-suppliers';
import { useSignedUrls } from '@/hooks/use-uploads';

type StatusFilter = 'true' | 'false' | 'all';
type DisplayMode = 'table' | 'cards';
type ActiveView = 'products' | 'sundries';

export function ProductsPage() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const { data: categories } = useProductCategoriesQuery();
	const [search, setSearch] = useState('');
	const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('true');
	const [includeArchived, setIncludeArchived] = useState(false);
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Sundry create dialog state
	const [sundryDialogOpen, setSundryDialogOpen] = useState(false);
	const [sundryFormName, setSundryFormName] = useState('');
	const [sundryFormPrice, setSundryFormPrice] = useState('0');
	const [sundryFormSupplierId, setSundryFormSupplierId] = useState<string | null>(null);
	const [sundryMutationError, setSundryMutationError] = useState<string | null>(null);

	const activeView: ActiveView = searchParams.get('tab') === 'sundries' ? 'sundries' : 'products';
	const isSundriesView = activeView === 'sundries';

	// Debounce search
	const debouncedSearch = useMemo(() => {
		let timeout: ReturnType<typeof setTimeout>;
		return (value: string) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				setSearch(value);
				setPage(1);
			}, 300);
		};
	}, []);

	// Products query
	const params: ProductListParams = {
		page,
		limit,
		search: search || undefined,
		categoryId: categoryFilter || undefined,
		isActive: statusFilter,
		includeArchived: includeArchived ? 'true' : 'false',
	};

	const { data, isLoading: productsLoading, error: productsError } = useProductsQuery(params);

	// Sundries query
	const { data: sundries, isLoading: sundriesLoading, error: sundriesError } = useSundriesQuery();
	const { data: suppliers } = useSuppliersQuery({});

	// Filtered sundries (client-side)
	const filteredSundries = useMemo(() => {
		if (!sundries) return [];
		let filtered = sundries;

		if (search) {
			const lowerSearch = search.toLowerCase();
			filtered = filtered.filter((s) => s.name.toLowerCase().includes(lowerSearch));
		}

		if (statusFilter === 'true') {
			filtered = filtered.filter((s) => s.isActive);
		} else if (statusFilter === 'false') {
			filtered = filtered.filter((s) => !s.isActive);
		}

		return filtered;
	}, [sundries, search, statusFilter]);

	// Signed URLs for product images
	const products = data?.products || [];
	const productImageUrls = useMemo(
		() => products.map((p) => p.imageUrl).filter(Boolean),
		[products],
	);
	const { data: signedUrls } = useSignedUrls(productImageUrls);

	// Signed URLs for sundry images
	const sundryImageUrls = useMemo(
		() => filteredSundries.map((s) => s.imageUrl).filter(Boolean),
		[filteredSundries],
	);
	const { data: signedSundryUrls } = useSignedUrls(sundryImageUrls);

	const createMutation = useCreateProductMutation();
	const createSundryMutation = useCreateSundryMutation();

	const handleAddProduct = () => {
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleFormSubmit = async (formData: CreateProductInput) => {
		setMutationError(null);
		try {
			const product = await createMutation.mutateAsync(formData);
			setFormDialogOpen(false);
			navigate(`/app/products/${product.id}`);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleAddSundry = () => {
		setSundryFormName('');
		setSundryFormPrice('0');
		setSundryFormSupplierId(null);
		setSundryMutationError(null);
		setSundryDialogOpen(true);
	};

	const handleSundryFormSubmit = async () => {
		setSundryMutationError(null);
		const input: CreateSundryInput = {
			name: sundryFormName,
			price: parseFloat(sundryFormPrice) || 0,
			supplierId: sundryFormSupplierId,
		};

		try {
			const sundry = await createSundryMutation.mutateAsync(input);
			setSundryDialogOpen(false);
			navigate(`/app/sundries/${sundry.id}`);
		} catch (err) {
			setSundryMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleTabChange = (val: string) => {
		if (val === 'sundries') {
			setSearchParams({ tab: 'sundries' });
			setCategoryFilter(null);
		} else {
			setSearchParams({});
			setCategoryFilter(val === 'all' ? null : val);
		}
		setPage(1);
	};

	const pagination = data?.pagination;
	const isLoading = isSundriesView ? sundriesLoading : productsLoading;
	const error = isSundriesView ? sundriesError : productsError;
	const displayItems = isSundriesView ? filteredSundries : products;

	if (isLoading && !(isSundriesView ? sundries : data)) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Products</h2>
					<p className="text-muted-foreground mt-1">Manage your product catalog</p>
				</div>
				<div className="text-muted-foreground">
					{isSundriesView ? 'Loading sundries...' : 'Loading products...'}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Products</h2>
					<p className="text-muted-foreground mt-1">Manage your product catalog</p>
				</div>
				<div className="text-destructive">Error: {error.message}</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Products</h2>
				<p className="text-muted-foreground mt-1">Manage your product catalog</p>
			</div>

			<Tabs
				value={isSundriesView ? 'sundries' : categoryFilter || 'all'}
				onValueChange={handleTabChange}
			>
				<TabsList className="mb-4">
					<TabsTrigger value="all">All</TabsTrigger>
					{categories?.map((cat) => (
						<TabsTrigger key={cat.id} value={cat.id}>
							{cat.name}
						</TabsTrigger>
					))}
					<TabsTrigger value="sundries">Sundries</TabsTrigger>
				</TabsList>
			</Tabs>

			<div className="flex justify-between items-center mb-4 gap-4">
				<div className="flex items-center gap-3 flex-1">
					<div className="relative flex-1 max-w-xs">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder={isSundriesView ? 'Search by name...' : 'Search by name or SKU...'}
							onChange={(e) => debouncedSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Select
						value={statusFilter}
						onValueChange={(val: StatusFilter) => {
							setStatusFilter(val);
							setPage(1);
						}}
					>
						<SelectTrigger className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="true">Active</SelectItem>
							<SelectItem value="false">Inactive</SelectItem>
							<SelectItem value="all">All</SelectItem>
						</SelectContent>
					</Select>
					{!isSundriesView && (
						<div className="flex items-center gap-2">
							<Checkbox
								id="include-archived"
								checked={includeArchived}
								onCheckedChange={(checked) => {
									setIncludeArchived(checked === true);
									setPage(1);
								}}
							/>
							<label
								htmlFor="include-archived"
								className="text-sm whitespace-nowrap cursor-pointer"
							>
								Archived
							</label>
						</div>
					)}
				</div>
				<div className="flex items-center gap-2">
					<div className="flex items-center border rounded-md">
						<Button
							variant={displayMode === 'table' ? 'secondary' : 'ghost'}
							size="sm"
							className="rounded-r-none"
							onClick={() => setDisplayMode('table')}
						>
							<List className="h-4 w-4" />
						</Button>
						<Button
							variant={displayMode === 'cards' ? 'secondary' : 'ghost'}
							size="sm"
							className="rounded-l-none"
							onClick={() => setDisplayMode('cards')}
						>
							<LayoutGrid className="h-4 w-4" />
						</Button>
					</div>
					<Button onClick={isSundriesView ? handleAddSundry : handleAddProduct}>
						<Plus className="h-4 w-4 mr-2" />
						{isSundriesView ? 'Add Sundry' : 'Add Product'}
					</Button>
				</div>
			</div>

			{(isSundriesView ? sundryMutationError : mutationError) && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{isSundriesView ? sundryMutationError : mutationError}
				</div>
			)}

			{displayItems.length === 0 ? (
				<div className="text-center py-12 text-muted-foreground border rounded-lg">
					<Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
					{isSundriesView
						? search || statusFilter !== 'true'
							? 'No sundries found matching your filters.'
							: 'No sundries yet. Add your first sundry to get started.'
						: search || categoryFilter || statusFilter !== 'true'
							? 'No products found matching your filters.'
							: 'No products yet. Add your first product to get started.'}
				</div>
			) : isSundriesView ? (
				displayMode === 'table' ? (
					<div className="border rounded-lg">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[60px]">Image</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Supplier</TableHead>
									<TableHead>Price</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-[70px]"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredSundries.map((item) => (
									<TableRow key={item.id}>
										<TableCell>
											{item.imageUrl ? (
												<img
													src={signedSundryUrls?.get(item.imageUrl) || item.imageUrl}
													alt={item.name}
													className="w-10 h-10 object-cover rounded"
												/>
											) : (
												<div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
													<ImageIcon className="w-4 h-4 text-muted-foreground" />
												</div>
											)}
										</TableCell>
										<TableCell className="font-medium">
											<Link to={`/app/sundries/${item.id}`} className="hover:underline">
												{item.name}
											</Link>
										</TableCell>
										<TableCell>
											{item.supplierName ? (
												<Link
													to={`/app/suppliers/${item.supplierId}`}
													className="text-primary hover:underline"
												>
													{item.supplierName}
												</Link>
											) : (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>£{parseFloat(item.price).toFixed(2)}</TableCell>
										<TableCell>
											<Badge variant={item.isActive ? 'default' : 'secondary'}>
												{item.isActive ? 'Active' : 'Inactive'}
											</Badge>
										</TableCell>
										<TableCell>
											<Link to={`/app/sundries/${item.id}`}>
												<Button variant="ghost" size="sm">
													View
												</Button>
											</Link>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{filteredSundries.map((item) => (
							<SundryCard
								key={item.id}
								sundry={item}
								signedImageUrl={item.imageUrl ? signedSundryUrls?.get(item.imageUrl) : undefined}
							/>
						))}
					</div>
				)
			) : displayMode === 'table' ? (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>SKU</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Category</TableHead>
								<TableHead>Options</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-[70px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{products.map((product) => (
								<TableRow key={product.id} className={product.archivedAt ? 'opacity-60' : ''}>
									<TableCell className="font-mono text-sm">{product.sku}</TableCell>
									<TableCell className="font-medium">
										<Link to={`/app/products/${product.id}`} className="hover:underline">
											{product.name}
										</Link>
									</TableCell>
									<TableCell>
										{product.category?.name || <span className="text-muted-foreground">-</span>}
									</TableCell>
									<TableCell>{product.optionCount || 0}</TableCell>
									<TableCell>
										{product.archivedAt ? (
											<Badge variant="outline">Archived</Badge>
										) : product.isActive ? (
											<Badge variant="default">Active</Badge>
										) : (
											<Badge variant="secondary">Inactive</Badge>
										)}
									</TableCell>
									<TableCell>
										<Link to={`/app/products/${product.id}`}>
											<Button variant="ghost" size="sm">
												View
											</Button>
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{products.map((product) => (
						<ProductCard
							key={product.id}
							product={product}
							signedImageUrl={product.imageUrl ? signedUrls?.get(product.imageUrl) : undefined}
						/>
					))}
				</div>
			)}

			{!isSundriesView && pagination && products.length > 0 && (
				<div className="flex items-center justify-between mt-4">
					<div className="text-sm text-muted-foreground">
						Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
						{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
						products
					</div>
					<div className="flex items-center gap-2">
						<Select
							value={String(limit)}
							onValueChange={(val) => {
								setLimit(Number(val));
								setPage(1);
							}}
						>
							<SelectTrigger className="w-20 h-8">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="10">10</SelectItem>
								<SelectItem value="20">20</SelectItem>
								<SelectItem value="50">50</SelectItem>
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={pagination.page <= 1}
						>
							<ChevronLeft className="h-4 w-4" />
							Previous
						</Button>
						<span className="text-sm">
							Page {pagination.page} of {pagination.totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => p + 1)}
							disabled={pagination.page >= pagination.totalPages}
						>
							Next
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}

			<ProductFormDialog
				open={formDialogOpen}
				onOpenChange={setFormDialogOpen}
				onSubmit={handleFormSubmit}
				product={null}
				isLoading={createMutation.isPending}
				error={mutationError}
			/>

			{/* Create Sundry Dialog */}
			<Dialog open={sundryDialogOpen} onOpenChange={setSundryDialogOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Add Sundry</DialogTitle>
						<DialogDescription>Add a new sundry item with pricing.</DialogDescription>
					</DialogHeader>

					{sundryMutationError && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
							{sundryMutationError}
						</div>
					)}

					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="sundry-name">Name</FieldLabel>
							<Input
								id="sundry-name"
								value={sundryFormName}
								onChange={(e) => setSundryFormName(e.target.value)}
								placeholder="e.g., Ceramic Rose (Red), Oval Photo Plaque"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="sundry-supplier">Supplier (optional)</FieldLabel>
							<Select
								value={sundryFormSupplierId || 'none'}
								onValueChange={(value) => setSundryFormSupplierId(value === 'none' ? null : value)}
							>
								<SelectTrigger id="sundry-supplier">
									<SelectValue placeholder="Select a supplier" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No supplier</SelectItem>
									{suppliers?.map((supplier) => (
										<SelectItem key={supplier.id} value={supplier.id}>
											{supplier.tradingName || supplier.businessName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>

						<Field>
							<FieldLabel htmlFor="sundry-price">Price (&pound;)</FieldLabel>
							<Input
								id="sundry-price"
								type="number"
								min="0"
								step="0.01"
								value={sundryFormPrice}
								onChange={(e) => setSundryFormPrice(e.target.value)}
								placeholder="0.00"
							/>
						</Field>
					</FieldGroup>

					<DialogFooter>
						<Button variant="outline" onClick={() => setSundryDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleSundryFormSubmit}
							disabled={!sundryFormName || createSundryMutation.isPending}
						>
							{createSundryMutation.isPending ? 'Creating...' : 'Create'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function ProductCard({ product, signedImageUrl }: { product: Product; signedImageUrl?: string }) {
	return (
		<Link to={`/app/products/${product.id}`} className="block">
			<Card
				className={`hover:shadow-md transition-shadow py-0 gap-3 cursor-pointer ${product.archivedAt ? 'opacity-60' : ''}`}
			>
				<div className="aspect-[4/3] bg-white flex items-center justify-center overflow-hidden rounded-t-xl">
					{product.imageUrl ? (
						<img
							src={signedImageUrl || product.imageUrl}
							alt={product.name}
							className="w-full h-full object-contain"
						/>
					) : (
						<Package className="h-12 w-12 text-muted-foreground" />
					)}
				</div>
				<CardHeader className="pb-2 pt-3">
					<div className="flex items-start justify-between">
						<div className="space-y-1 flex-1 min-w-0">
							<CardTitle className="text-base line-clamp-2">{product.name}</CardTitle>
							{product.category?.name && (
								<p className="text-sm text-muted-foreground">{product.category.name}</p>
							)}
						</div>
						<Badge variant="outline" className="text-xs font-mono ml-2">
							{product.sku}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="pb-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							{product.archivedAt ? (
								<Badge variant="outline">Archived</Badge>
							) : product.isActive ? (
								<Badge variant="default">Active</Badge>
							) : (
								<Badge variant="secondary">Inactive</Badge>
							)}
							{(product.optionCount ?? 0) > 0 && (
								<Badge variant="secondary" className="text-xs">
									{product.optionCount} option{product.optionCount !== 1 ? 's' : ''}
								</Badge>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}

function SundryCard({ sundry, signedImageUrl }: { sundry: Sundry; signedImageUrl?: string }) {
	return (
		<Link to={`/app/sundries/${sundry.id}`} className="block">
			<Card className="hover:shadow-md transition-shadow py-0 gap-3 cursor-pointer">
				<div className="aspect-[4/3] bg-white flex items-center justify-center overflow-hidden rounded-t-xl">
					{sundry.imageUrl ? (
						<img
							src={signedImageUrl || sundry.imageUrl}
							alt={sundry.name}
							className="w-full h-full object-contain"
						/>
					) : (
						<Package className="h-12 w-12 text-muted-foreground" />
					)}
				</div>
				<CardHeader className="pb-2 pt-3">
					<div className="space-y-1">
						<CardTitle className="text-base line-clamp-2">{sundry.name}</CardTitle>
						{sundry.supplierName && (
							<p className="text-sm text-muted-foreground">{sundry.supplierName}</p>
						)}
					</div>
				</CardHeader>
				<CardContent className="pb-4">
					<div className="flex items-center justify-between">
						<Badge variant={sundry.isActive ? 'default' : 'secondary'}>
							{sundry.isActive ? 'Active' : 'Inactive'}
						</Badge>
						<span className="text-sm font-medium">£{parseFloat(sundry.price).toFixed(2)}</span>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
