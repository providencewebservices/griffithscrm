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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	useSupplierCollectionQuery,
	useUpdateSupplierCollectionMutation,
	useArchiveSupplierCollectionMutation,
	useUnarchiveSupplierCollectionMutation,
	useDeleteSupplierCollectionMutation,
} from '@/hooks/use-supplier-collections';
import {
	useSupplierCategoriesQuery,
	useCreateSupplierCategoryMutation,
	useDeleteSupplierCategoryMutation,
} from '@/hooks/use-supplier-categories';
import {
	useSupplierProductsQuery,
	useCreateSupplierProductMutation,
} from '@/hooks/use-supplier-products';
import { CollectionFormDialog } from '@/components/customer/supplier-catalog/collection-form-dialog';
import { CategoryFormDialog } from '@/components/customer/supplier-catalog/category-form-dialog';
import { SupplierProductFormDialog } from '@/components/customer/supplier-catalog/supplier-product-form-dialog';
import { ImportToCatalogDialog } from '@/components/customer/supplier-catalog/import-to-catalog-dialog';
import { CsvImportDialog } from '@/components/customer/supplier-catalog/csv-import-dialog';
import {
	useImportToCatalogMutation,
	useCsvImportMutation,
	type SupplierProduct,
} from '@/hooks/use-supplier-products';
import { toast } from 'sonner';
import { Search, Upload, ChevronLeft, ChevronRight } from 'lucide-react';

export function SupplierCollectionDetailPage() {
	const { supplierId, collectionId } = useParams<{
		supplierId: string;
		collectionId: string;
	}>();
	const navigate = useNavigate();

	// Dialog states
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editError, setEditError] = useState<string | null>(null);
	const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
	const [categoryError, setCategoryError] = useState<string | null>(null);
	const [productDialogOpen, setProductDialogOpen] = useState(false);
	const [productError, setProductError] = useState<string | null>(null);
	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [importError, setImportError] = useState<string | null>(null);
	const [importProduct, setImportProduct] = useState<SupplierProduct | null>(null);
	const [csvDialogOpen, setCsvDialogOpen] = useState(false);
	const [csvResult, setCsvResult] = useState<{
		imported: number;
		errors: { row: number; message: string }[];
	} | null>(null);
	const [csvError, setCsvError] = useState<string | null>(null);

	// Filter state
	const [categoryFilter, setCategoryFilter] = useState<string>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [page, setPage] = useState(1);

	// Queries
	const { data: collection, isLoading, error } = useSupplierCollectionQuery(collectionId);
	const { data: categories } = useSupplierCategoriesQuery(collectionId);
	const { data: productsData } = useSupplierProductsQuery({
		collectionId,
		categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
		q: searchQuery || undefined,
		page,
	});

	// Mutations
	const updateMutation = useUpdateSupplierCollectionMutation();
	const archiveMutation = useArchiveSupplierCollectionMutation();
	const unarchiveMutation = useUnarchiveSupplierCollectionMutation();
	const deleteMutation = useDeleteSupplierCollectionMutation();
	const createCategoryMutation = useCreateSupplierCategoryMutation();
	const deleteCategoryMutation = useDeleteSupplierCategoryMutation();
	const createProductMutation = useCreateSupplierProductMutation();
	const importToCatalogMutation = useImportToCatalogMutation();
	const csvImportMutation = useCsvImportMutation();

	const formatCurrency = (amount: string) => {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
		}).format(parseFloat(amount));
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Collection Details</h2>
				</div>
				<div className="text-muted-foreground">Loading collection...</div>
			</div>
		);
	}

	if (error || !collection) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Collection Details</h2>
				</div>
				<div className="text-destructive">
					{error ? `Error: ${error.message}` : 'Collection not found'}
				</div>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => navigate(`/app/suppliers/${supplierId}`)}
				>
					Back to Supplier
				</Button>
			</div>
		);
	}

	return (
		<div>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/suppliers">Suppliers</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to={`/app/suppliers/${supplierId}`}>
								{collection.supplierName || 'Supplier'}
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{collection.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex justify-between items-start mb-6">
				<div>
					<div className="flex items-center gap-3">
						<h2 className="text-2xl font-bold">{collection.name}</h2>
						{collection.archivedAt ? (
							<Badge variant="secondary">Archived</Badge>
						) : (
							<Badge variant="default">Active</Badge>
						)}
					</div>
					{collection.description && (
						<p className="text-sm text-muted-foreground mt-1">
							{collection.description}
						</p>
					)}
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => {
							setEditError(null);
							setEditDialogOpen(true);
						}}
					>
						Edit
					</Button>
					{collection.archivedAt ? (
						<>
							<Button
								variant="outline"
								onClick={async () => {
									try {
										await unarchiveMutation.mutateAsync(collectionId!);
									} catch {}
								}}
								disabled={unarchiveMutation.isPending}
							>
								{unarchiveMutation.isPending ? 'Restoring...' : 'Restore'}
							</Button>
							<Button
								variant="destructive"
								onClick={() => setDeleteDialogOpen(true)}
							>
								Delete
							</Button>
						</>
					) : (
						<Button
							variant="destructive"
							onClick={() => setArchiveDialogOpen(true)}
						>
							Archive
						</Button>
					)}
				</div>
			</div>

			{/* Categories Section */}
			<Card className="mb-6">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Categories</CardTitle>
							<CardDescription>Organize products within this collection</CardDescription>
						</div>
						<Button
							onClick={() => {
								setCategoryError(null);
								setCategoryDialogOpen(true);
							}}
						>
							Add Category
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{!categories || categories.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No categories yet. Add categories to organize products.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead className="text-right">Products</TableHead>
									<TableHead className="w-[80px]"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{categories.map((category) => (
									<TableRow key={category.id}>
										<TableCell className="font-medium">{category.name}</TableCell>
										<TableCell className="text-right">{category.productCount}</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												className="text-destructive"
												onClick={async () => {
													if (category.productCount > 0) {
														toast.error('Remove products from this category first');
														return;
													}
													try {
														await deleteCategoryMutation.mutateAsync(category.id);
														toast.success('Category deleted');
													} catch (err) {
														toast.error(err instanceof Error ? err.message : 'Failed to delete');
													}
												}}
											>
												Delete
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Products Section */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Products</CardTitle>
							<CardDescription>Products in this collection</CardDescription>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => {
									setCsvResult(null);
									setCsvError(null);
									setCsvDialogOpen(true);
								}}
							>
								<Upload className="h-4 w-4 mr-2" />
								Import CSV
							</Button>
							<Button
								onClick={() => {
									setProductError(null);
									setProductDialogOpen(true);
								}}
							>
								Add Product
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{/* Filters */}
					<div className="flex gap-4 mb-4">
						<div className="relative flex-1 max-w-xs">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search products..."
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									setPage(1);
								}}
								className="pl-9"
							/>
						</div>
						{categories && categories.length > 0 && (
							<Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
								<SelectTrigger className="w-48">
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
					</div>

					{!productsData || productsData.products.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No products found. Add products or import from CSV.
						</p>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>SKU</TableHead>
										<TableHead>Material</TableHead>
										<TableHead className="text-right">Cost</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="w-[160px]"></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{productsData.products.map((product) => (
										<TableRow key={product.id}>
											<TableCell className="font-medium">{product.name}</TableCell>
											<TableCell className="text-muted-foreground">
												{product.sku || '-'}
											</TableCell>
											<TableCell className="text-muted-foreground">
												{product.material || '-'}
											</TableCell>
											<TableCell className="text-right">
												{product.supplierCost
													? formatCurrency(product.supplierCost)
													: '-'}
											</TableCell>
											<TableCell>
												<Badge variant={product.isActive ? 'default' : 'secondary'}>
													{product.isActive ? 'Active' : 'Inactive'}
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex gap-1">
													<Link to={`/app/suppliers/${supplierId}/collections/${collectionId}/products/${product.id}`}>
														<Button variant="ghost" size="sm">View</Button>
													</Link>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => {
															setImportError(null);
															setImportProduct(product);
															setImportDialogOpen(true);
														}}
													>
														Import
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>

							{productsData.pagination.totalPages > 1 && (
								<div className="flex items-center justify-between mt-4">
									<div className="text-sm text-muted-foreground">
										Showing {(productsData.pagination.page - 1) * productsData.pagination.limit + 1} to{' '}
										{Math.min(productsData.pagination.page * productsData.pagination.limit, productsData.pagination.total)} of{' '}
										{productsData.pagination.total} products
									</div>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											disabled={productsData.pagination.page <= 1}
										>
											<ChevronLeft className="h-4 w-4" />
											Previous
										</Button>
										<span className="text-sm">
											Page {productsData.pagination.page} of {productsData.pagination.totalPages}
										</span>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => p + 1)}
											disabled={productsData.pagination.page >= productsData.pagination.totalPages}
										>
											Next
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{/* Dialogs */}
			{collectionId && supplierId && (
				<>
					<CollectionFormDialog
						open={editDialogOpen}
						onOpenChange={setEditDialogOpen}
						supplierId={supplierId}
						collection={collection}
						onSubmit={async (data) => {
							setEditError(null);
							try {
								await updateMutation.mutateAsync({
									id: collectionId,
									name: data.name,
									description: data.description,
								});
								setEditDialogOpen(false);
								toast.success('Collection updated');
							} catch (err) {
								setEditError(err instanceof Error ? err.message : 'Failed to update');
							}
						}}
						isLoading={updateMutation.isPending}
						error={editError}
					/>

					<CategoryFormDialog
						open={categoryDialogOpen}
						onOpenChange={setCategoryDialogOpen}
						collectionId={collectionId}
						onSubmit={async (data) => {
							setCategoryError(null);
							try {
								await createCategoryMutation.mutateAsync(data);
								setCategoryDialogOpen(false);
								toast.success('Category created');
							} catch (err) {
								setCategoryError(err instanceof Error ? err.message : 'Failed to create');
							}
						}}
						isLoading={createCategoryMutation.isPending}
						error={categoryError}
					/>

					<SupplierProductFormDialog
						open={productDialogOpen}
						onOpenChange={setProductDialogOpen}
						supplierId={supplierId}
						collectionId={collectionId}
						categories={categories || []}
						onSubmit={async (data) => {
							setProductError(null);
							try {
								await createProductMutation.mutateAsync(data);
								setProductDialogOpen(false);
								toast.success('Product created');
							} catch (err) {
								setProductError(err instanceof Error ? err.message : 'Failed to create');
							}
						}}
						isLoading={createProductMutation.isPending}
						error={productError}
					/>

					<ImportToCatalogDialog
						open={importDialogOpen}
						onOpenChange={setImportDialogOpen}
						product={importProduct}
						onSubmit={async (data) => {
							setImportError(null);
							try {
								await importToCatalogMutation.mutateAsync({
									supplierProductId: importProduct!.id,
									...data,
								});
								setImportDialogOpen(false);
								toast.success('Product imported to your catalog');
							} catch (err) {
								setImportError(err instanceof Error ? err.message : 'Failed to import');
							}
						}}
						isLoading={importToCatalogMutation.isPending}
						error={importError}
					/>

					<CsvImportDialog
						open={csvDialogOpen}
						onOpenChange={setCsvDialogOpen}
						supplierId={supplierId}
						collectionId={collectionId}
						categories={categories || []}
						onSubmit={async (data) => {
							setCsvError(null);
							setCsvResult(null);
							try {
								const result = await csvImportMutation.mutateAsync(data);
								setCsvResult(result);
							} catch (err) {
								setCsvError(err instanceof Error ? err.message : 'Failed to import');
							}
						}}
						isLoading={csvImportMutation.isPending}
						result={csvResult}
						error={csvError}
					/>

					<DeleteConfirmDialog
						open={archiveDialogOpen}
						onOpenChange={setArchiveDialogOpen}
						onConfirm={async () => {
							try {
								await archiveMutation.mutateAsync(collectionId);
								setArchiveDialogOpen(false);
								toast.success('Collection archived');
							} catch {}
						}}
						title="Archive Collection"
						description={`Are you sure you want to archive "${collection.name}"? You can restore it later.`}
						isLoading={archiveMutation.isPending}
					/>

					<DeleteConfirmDialog
						open={deleteDialogOpen}
						onOpenChange={setDeleteDialogOpen}
						onConfirm={async () => {
							try {
								await deleteMutation.mutateAsync(collectionId);
								navigate(`/app/suppliers/${supplierId}`);
								toast.success('Collection deleted');
							} catch {}
						}}
						title="Delete Collection"
						description={`Are you sure you want to permanently delete "${collection.name}"? This cannot be undone.`}
						isLoading={deleteMutation.isPending}
					/>
				</>
			)}
		</div>
	);
}
