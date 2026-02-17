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
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	useSupplierProductQuery,
	useUpdateSupplierProductMutation,
	useArchiveSupplierProductMutation,
	useUnarchiveSupplierProductMutation,
	useDeleteSupplierProductMutation,
	useImportToCatalogMutation,
} from '@/hooks/use-supplier-products';
import { useSupplierCategoriesQuery } from '@/hooks/use-supplier-categories';
import { SupplierProductFormDialog } from '@/components/customer/supplier-catalog/supplier-product-form-dialog';
import { ImportToCatalogDialog } from '@/components/customer/supplier-catalog/import-to-catalog-dialog';
import { toast } from 'sonner';
import { ShoppingCart } from 'lucide-react';

export function SupplierProductDetailPage() {
	const { supplierId, collectionId, productId } = useParams<{
		supplierId: string;
		collectionId: string;
		productId: string;
	}>();
	const navigate = useNavigate();

	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editError, setEditError] = useState<string | null>(null);
	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [importError, setImportError] = useState<string | null>(null);

	const { data: product, isLoading, error } = useSupplierProductQuery(productId);
	const { data: categories } = useSupplierCategoriesQuery(collectionId);
	const updateMutation = useUpdateSupplierProductMutation();
	const archiveMutation = useArchiveSupplierProductMutation();
	const unarchiveMutation = useUnarchiveSupplierProductMutation();
	const deleteMutation = useDeleteSupplierProductMutation();
	const importToCatalogMutation = useImportToCatalogMutation();

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
					<h2 className="text-2xl font-bold">Product Details</h2>
				</div>
				<div className="text-muted-foreground">Loading product...</div>
			</div>
		);
	}

	if (error || !product) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Product Details</h2>
				</div>
				<div className="text-destructive">
					{error ? `Error: ${error.message}` : 'Product not found'}
				</div>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() =>
						navigate(`/app/suppliers/${supplierId}/collections/${collectionId}`)
					}
				>
					Back to Collection
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
								{product.supplierName || 'Supplier'}
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to={`/app/suppliers/${supplierId}/collections/${collectionId}`}>
								{product.collectionName || 'Collection'}
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{product.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex justify-between items-start mb-6">
				<div>
					<div className="flex items-center gap-3">
						<h2 className="text-2xl font-bold">{product.name}</h2>
						{product.archivedAt ? (
							<Badge variant="secondary">Archived</Badge>
						) : (
							<Badge variant="default">Active</Badge>
						)}
					</div>
					{product.sku && (
						<p className="text-sm text-muted-foreground mt-1">SKU: {product.sku}</p>
					)}
				</div>
				<div className="flex gap-2">
					<Button
						onClick={() => {
							setImportError(null);
							setImportDialogOpen(true);
						}}
					>
						<ShoppingCart className="h-4 w-4 mr-2" />
						Import to My Catalog
					</Button>
					<Button
						variant="outline"
						onClick={() => {
							setEditError(null);
							setEditDialogOpen(true);
						}}
					>
						Edit
					</Button>
					{product.archivedAt ? (
						<>
							<Button
								variant="outline"
								onClick={async () => {
									try {
										await unarchiveMutation.mutateAsync(productId!);
										toast.success('Product restored');
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

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Product Information</CardTitle>
						<CardDescription>Details from the supplier's catalog</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{product.description && (
								<div>
									<p className="text-sm font-medium mb-1">Description</p>
									<p className="text-sm whitespace-pre-wrap">{product.description}</p>
								</div>
							)}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-sm font-medium mb-1">Material</p>
									<p>{product.material || '-'}</p>
								</div>
								<div>
									<p className="text-sm font-medium mb-1">Supplier Cost</p>
									<p className="text-lg font-semibold">
										{product.supplierCost
											? formatCurrency(product.supplierCost)
											: '-'}
									</p>
								</div>
							</div>
							<div>
								<p className="text-sm font-medium mb-1">Category</p>
								<p>{product.categoryName || 'Uncategorized'}</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Dimensions & Weight</CardTitle>
						<CardDescription>Physical measurements</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<p className="text-sm font-medium mb-1">Height</p>
								<p>{product.height || '-'}</p>
							</div>
							<div>
								<p className="text-sm font-medium mb-1">Width</p>
								<p>{product.width || '-'}</p>
							</div>
							<div>
								<p className="text-sm font-medium mb-1">Depth</p>
								<p>{product.depth || '-'}</p>
							</div>
							<div>
								<p className="text-sm font-medium mb-1">Weight</p>
								<p>{product.weight || '-'}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Dialogs */}
			{productId && supplierId && collectionId && (
				<>
					<SupplierProductFormDialog
						open={editDialogOpen}
						onOpenChange={setEditDialogOpen}
						supplierId={supplierId}
						collectionId={collectionId}
						categories={categories || []}
						product={product}
						onSubmit={async (data) => {
							setEditError(null);
							try {
								await updateMutation.mutateAsync({
									id: productId,
									name: data.name,
									sku: data.sku,
									description: data.description,
									categoryId: data.categoryId,
									supplierCost: data.supplierCost,
									height: data.height,
									width: data.width,
									depth: data.depth,
									weight: data.weight,
									material: data.material,
								});
								setEditDialogOpen(false);
								toast.success('Product updated');
							} catch (err) {
								setEditError(err instanceof Error ? err.message : 'Failed to update');
							}
						}}
						isLoading={updateMutation.isPending}
						error={editError}
					/>

					<ImportToCatalogDialog
						open={importDialogOpen}
						onOpenChange={setImportDialogOpen}
						product={product}
						onSubmit={async (data) => {
							setImportError(null);
							try {
								await importToCatalogMutation.mutateAsync({
									supplierProductId: productId,
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

					<DeleteConfirmDialog
						open={archiveDialogOpen}
						onOpenChange={setArchiveDialogOpen}
						onConfirm={async () => {
							try {
								await archiveMutation.mutateAsync(productId);
								setArchiveDialogOpen(false);
								toast.success('Product archived');
							} catch {}
						}}
						title="Archive Product"
						description={`Are you sure you want to archive "${product.name}"?`}
						isLoading={archiveMutation.isPending}
					/>

					<DeleteConfirmDialog
						open={deleteDialogOpen}
						onOpenChange={setDeleteDialogOpen}
						onConfirm={async () => {
							try {
								await deleteMutation.mutateAsync(productId);
								navigate(
									`/app/suppliers/${supplierId}/collections/${collectionId}`
								);
								toast.success('Product deleted');
							} catch {}
						}}
						title="Delete Product"
						description={`Are you sure you want to permanently delete "${product.name}"?`}
						isLoading={deleteMutation.isPending}
					/>
				</>
			)}
		</div>
	);
}
