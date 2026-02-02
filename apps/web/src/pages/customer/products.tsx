import { useState, useMemo } from 'react';
import { useSignedUrls } from '@/hooks/use-uploads';
import { Link, useNavigate } from 'react-router';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ProductFormDialog } from '@/components/customer/products/product-form-dialog';
import { CategorySelect } from '@/components/customer/products/category-select';
import {
	useProductsQuery,
	useCreateProductMutation,
	useArchiveProductMutation,
	useUnarchiveProductMutation,
	useDuplicateProductMutation,
	type CreateProductInput,
	type ProductListParams,
	type Product,
} from '@/hooks/use-products';
import { Search, MoreHorizontal, Plus, Package, ChevronLeft, ChevronRight, List, LayoutGrid } from 'lucide-react';

type StatusFilter = 'true' | 'false' | 'all';
type DisplayMode = 'table' | 'cards';

export function ProductsPage() {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('true');
	const [includeArchived, setIncludeArchived] = useState(false);
	const [page, setPage] = useState(1);
	const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Debounce search
	useMemo(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery);
			setPage(1); // Reset to first page on search
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const params: ProductListParams = {
		page,
		limit: 20,
		search: debouncedSearch || undefined,
		categoryId: categoryFilter || undefined,
		isActive: statusFilter,
		includeArchived: includeArchived ? 'true' : 'false',
	};

	const { data, isLoading, error } = useProductsQuery(params);

	// Get signed URLs for product images (S3 bucket is private)
	const products = data?.products || [];
	const imageUrls = useMemo(
		() => products.map((p) => p.imageUrl).filter(Boolean),
		[products]
	);
	const { data: signedUrls } = useSignedUrls(imageUrls);

	const createMutation = useCreateProductMutation();
	const archiveMutation = useArchiveProductMutation();
	const unarchiveMutation = useUnarchiveProductMutation();
	const duplicateMutation = useDuplicateProductMutation();

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

	const handleArchive = async (id: string) => {
		try {
			await archiveMutation.mutateAsync(id);
		} catch (err) {
			// Error handled by mutation
		}
	};

	const handleUnarchive = async (id: string) => {
		try {
			await unarchiveMutation.mutateAsync(id);
		} catch (err) {
			// Error handled by mutation
		}
	};

	const handleDuplicate = async (id: string) => {
		try {
			const product = await duplicateMutation.mutateAsync(id);
			navigate(`/app/products/${product.id}`);
		} catch (err) {
			// Error handled by mutation
		}
	};

	const formatPrice = (price: string | null) => {
		if (!price) return '-';
		return `£${parseFloat(price).toFixed(2)}`;
	};

	const pagination = data?.pagination;

	if (isLoading && !data) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Products</h2>
					<p className="text-muted-foreground mt-1">
						Manage your product catalog
					</p>
				</div>
				<div className="text-muted-foreground">Loading products...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Products</h2>
					<p className="text-muted-foreground mt-1">
						Manage your product catalog
					</p>
				</div>
				<div className="text-destructive">
					Error loading products: {error.message}
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Products</h2>
				<p className="text-muted-foreground mt-1">
					Manage your product catalog
				</p>
			</div>

			<div className="flex justify-between items-center mb-4 gap-4">
				<div className="flex items-center gap-3 flex-1">
					<div className="relative flex-1 max-w-xs">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name or SKU..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9"
						/>
					</div>
					<div className="w-48">
						<CategorySelect
							value={categoryFilter}
							onChange={(val) => {
								setCategoryFilter(val);
								setPage(1);
							}}
							placeholder="All Categories"
							allowClear
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
					<label className="flex items-center gap-2 text-sm whitespace-nowrap">
						<input
							type="checkbox"
							checked={includeArchived}
							onChange={(e) => {
								setIncludeArchived(e.target.checked);
								setPage(1);
							}}
							className="rounded border-gray-300"
						/>
						Archived
					</label>
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
					<Button onClick={handleAddProduct}>
						<Plus className="h-4 w-4 mr-2" />
						Add Product
					</Button>
				</div>
			</div>

			{mutationError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{mutationError}
				</div>
			)}

			{products.length === 0 ? (
				<div className="text-center py-12 text-muted-foreground border rounded-lg">
					<Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
					{searchQuery || categoryFilter || statusFilter !== 'true'
						? 'No products found matching your filters.'
						: 'No products yet. Add your first product to get started.'}
				</div>
			) : displayMode === 'table' ? (
				<>
					<div className="border rounded-lg">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>SKU</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Category</TableHead>
									<TableHead>Base Price</TableHead>
									<TableHead>Options</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-[70px]"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{products.map((product) => (
									<TableRow
										key={product.id}
										className={product.archivedAt ? 'opacity-60' : ''}
									>
										<TableCell className="font-mono text-sm">
											{product.sku}
										</TableCell>
										<TableCell className="font-medium">
											<Link
												to={`/app/products/${product.id}`}
												className="hover:underline"
											>
												{product.name}
											</Link>
										</TableCell>
										<TableCell>
											{product.category?.name || (
												<span className="text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>{formatPrice(product.basePrice)}</TableCell>
										<TableCell>
											{product.optionCount || 0}
										</TableCell>
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
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="icon-sm">
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem asChild>
														<Link to={`/app/products/${product.id}`}>
															View Details
														</Link>
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => handleDuplicate(product.id)}
													>
														Duplicate
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													{product.archivedAt ? (
														<DropdownMenuItem
															onClick={() => handleUnarchive(product.id)}
														>
															Restore
														</DropdownMenuItem>
													) : (
														<DropdownMenuItem
															className="text-destructive"
															onClick={() => handleArchive(product.id)}
														>
															Archive
														</DropdownMenuItem>
													)}
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{/* Pagination */}
					{pagination && pagination.totalPages > 1 && (
						<div className="flex items-center justify-between mt-4">
							<div className="text-sm text-muted-foreground">
								Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
								{Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
								{pagination.total} products
							</div>
							<div className="flex items-center gap-2">
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
				</>
			) : (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{products.map((product) => (
							<ProductCard
								key={product.id}
								product={product}
								signedImageUrl={product.imageUrl ? signedUrls?.get(product.imageUrl) : undefined}
							/>
						))}
					</div>

					{/* Pagination */}
					{pagination && pagination.totalPages > 1 && (
						<div className="flex items-center justify-between mt-4">
							<div className="text-sm text-muted-foreground">
								Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
								{Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
								{pagination.total} products
							</div>
							<div className="flex items-center gap-2">
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
				</>
			)}

			<ProductFormDialog
				open={formDialogOpen}
				onOpenChange={setFormDialogOpen}
				onSubmit={handleFormSubmit}
				product={null}
				isLoading={createMutation.isPending}
				error={mutationError}
			/>
		</div>
	);
}

function ProductCard({
	product,
	signedImageUrl,
}: {
	product: Product;
	signedImageUrl?: string;
}) {
	return (
		<Card
			className={`hover:shadow-md transition-shadow py-0 gap-3 ${product.archivedAt ? 'opacity-60' : ''}`}
		>
			<div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden rounded-t-xl">
				{product.imageUrl ? (
					<img
						src={signedImageUrl || product.imageUrl}
						alt={product.name}
						className="w-full h-full object-cover"
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
			<CardContent className="space-y-2 pb-4">
				<div className="flex items-center">
					{product.archivedAt ? (
						<Badge variant="outline">Archived</Badge>
					) : product.isActive ? (
						<Badge variant="default">Active</Badge>
					) : (
						<Badge variant="secondary">Inactive</Badge>
					)}
				</div>

				{(product.optionCount ?? 0) > 0 && (
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="text-xs">
							{product.optionCount} option{product.optionCount !== 1 ? 's' : ''}
						</Badge>
					</div>
				)}

				<div className="pt-2">
					<Link to={`/app/products/${product.id}`}>
						<Button variant="outline" size="sm" className="w-full">
							View Details
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
