import { ArrowLeft, Loader2, MoreHorizontal, Package, Plus, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { DimensionCombosCard } from '@/components/customer/products/dimension-combos-card';
import { OptionFormDialog } from '@/components/customer/products/option-form-dialog';
import { ProductComponentsCard } from '@/components/customer/products/product-components-card';
import { ProductFormDialog } from '@/components/customer/products/product-form-dialog';
import { ProductOptionCard } from '@/components/customer/products/product-option-card';
import { DocumentsCard } from '@/components/documents';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImageUpload } from '@/components/ui/image-upload';
import { Separator } from '@/components/ui/separator';
import {
	type ProductOptionType,
	useCreateProductOptionMutation,
} from '@/hooks/use-product-options';
import {
	type UpdateProductInput,
	useArchiveProductMutation,
	useDeleteProductMutation,
	useDuplicateProductMutation,
	useProductQuery,
	useUnarchiveProductMutation,
	useUpdateProductMutation,
} from '@/hooks/use-products';
import { useSignedUrl, useUploadImageMutation } from '@/hooks/use-uploads';

export function ProductDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [optionDialogOpen, setOptionDialogOpen] = useState(false);
	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	const { data: product, isLoading, error } = useProductQuery(id);
	const { data: signedImageUrl } = useSignedUrl(product?.imageUrl);
	const updateMutation = useUpdateProductMutation();
	const archiveMutation = useArchiveProductMutation();
	const unarchiveMutation = useUnarchiveProductMutation();
	const deleteMutation = useDeleteProductMutation();
	const duplicateMutation = useDuplicateProductMutation();
	const createOptionMutation = useCreateProductOptionMutation();
	const uploadMutation = useUploadImageMutation();

	const handleEdit = () => {
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleFormSubmit = async (data: UpdateProductInput) => {
		if (!id) return;
		setMutationError(null);
		try {
			await updateMutation.mutateAsync({ id, ...data });
			setFormDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleImageChange = async (imageUrl: string | null) => {
		if (!id) return;
		try {
			await updateMutation.mutateAsync({ id, imageUrl });
		} catch {
			// Error handled by mutation
		}
	};

	const handleFileUpload = async (file: File) => {
		if (!id) return;
		try {
			const publicUrl = await uploadMutation.mutateAsync({
				category: 'products',
				entityId: id,
				file,
			});
			await updateMutation.mutateAsync({ id, imageUrl: publicUrl });
		} catch {
			// Error handled by mutation
		}
	};

	const handleArchive = async () => {
		if (!id) return;
		try {
			await archiveMutation.mutateAsync(id);
			setArchiveDialogOpen(false);
		} catch (_err) {
			// Error handled by mutation
		}
	};

	const handleUnarchive = async () => {
		if (!id) return;
		try {
			await unarchiveMutation.mutateAsync(id);
		} catch (_err) {
			// Error handled by mutation
		}
	};

	const handleDelete = async () => {
		if (!id) return;
		try {
			await deleteMutation.mutateAsync(id);
			setDeleteDialogOpen(false);
			navigate('/app/products');
		} catch (_err) {
			// Error handled by mutation
		}
	};

	const handleDuplicate = async () => {
		if (!id) return;
		try {
			const newProduct = await duplicateMutation.mutateAsync(id);
			navigate(`/app/products/${newProduct.id}`);
		} catch (_err) {
			// Error handled by mutation
		}
	};

	const handleAddOption = () => {
		setMutationError(null);
		setOptionDialogOpen(true);
	};

	const handleOptionSubmit = async (data: {
		name: string;
		type: ProductOptionType;
		isRequired: boolean;
	}) => {
		if (!id) return;
		setMutationError(null);
		try {
			await createOptionMutation.mutateAsync({ productId: id, ...data });
			setOptionDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const toggleActive = async () => {
		if (!id || !product) return;
		try {
			await updateMutation.mutateAsync({ id, isActive: !product.isActive });
		} catch (_err) {
			// Error handled by mutation
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
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
					{error ? `Error loading product: ${error.message}` : 'Product not found'}
				</div>
				<Link to="/app/products">
					<Button variant="outline" className="mt-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Products
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
							<Link to="/app/products">Products</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{product.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Link to="/app/products">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<div className="flex items-center gap-3">
							<h2 className="text-2xl font-bold">{product.name}</h2>
							{product.archivedAt ? (
								<Badge variant="outline">Archived</Badge>
							) : product.isActive ? (
								<Badge variant="default">Active</Badge>
							) : (
								<Badge variant="secondary">Inactive</Badge>
							)}
						</div>
						<p className="text-muted-foreground font-mono">{product.sku}</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button onClick={handleEdit}>Edit</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="icon">
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={toggleActive}>
								{product.isActive ? 'Deactivate' : 'Activate'}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleDuplicate}>Duplicate</DropdownMenuItem>
							<DropdownMenuSeparator />
							{product.archivedAt ? (
								<>
									<DropdownMenuItem onClick={handleUnarchive}>Restore</DropdownMenuItem>
									<DropdownMenuItem
										className="text-destructive"
										onClick={() => setDeleteDialogOpen(true)}
									>
										Delete Permanently
									</DropdownMenuItem>
								</>
							) : (
								<DropdownMenuItem
									className="text-destructive"
									onClick={() => setArchiveDialogOpen(true)}
								>
									Archive
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Product Image */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>Product Image</CardTitle>
								{product.imageUrl && (
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => document.getElementById('product-image-upload')?.click()}
										>
											<Upload className="h-4 w-4 mr-2" />
											Replace
										</Button>
										<Button variant="outline" size="sm" onClick={() => handleImageChange(null)}>
											<X className="h-4 w-4 mr-2" />
											Remove
										</Button>
									</div>
								)}
							</div>
						</CardHeader>
						<CardContent>
							<input
								id="product-image-upload"
								type="file"
								accept="image/jpeg,image/png,image/gif,image/webp"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) {
										handleFileUpload(file);
									}
									e.target.value = '';
								}}
							/>
							{product.imageUrl ? (
								<div className="relative flex justify-center bg-muted/30 rounded-lg p-4">
									<img
										src={signedImageUrl || product.imageUrl}
										alt={product.name}
										className="max-h-80 max-w-full object-contain rounded-lg"
									/>
									{uploadMutation.isPending && (
										<div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
											<Loader2 className="h-8 w-8 animate-spin text-white" />
										</div>
									)}
								</div>
							) : (
								<ImageUpload
									value={null}
									onChange={handleImageChange}
									category="products"
									entityId={product.id}
								/>
							)}
						</CardContent>
					</Card>

					{/* Description */}
					{product.description && (
						<Card>
							<CardHeader>
								<CardTitle>Description</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
							</CardContent>
						</Card>
					)}

					{/* Product Components */}
					<ProductComponentsCard productId={product.id} />

					{/* Dimension Combos */}
					<DimensionCombosCard productId={product.id} />

					{/* Product Options */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle>Product Options</CardTitle>
									<CardDescription>
										Configure available options and choices for this product
									</CardDescription>
								</div>
								<Button onClick={handleAddOption}>
									<Plus className="h-4 w-4 mr-2" />
									Add Option
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							{product.options && product.options.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground border rounded-lg">
									<Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
									No options configured. Add options to make this product configurable.
								</div>
							) : (
								<div className="space-y-4">
									{product.options?.map((option, index) => (
										<ProductOptionCard key={option.id} option={option} defaultOpen={index === 0} />
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Documents */}
					<DocumentsCard
						entityType="product"
						entityId={product.id}
						title="Documents"
						description="Files and documents for this product"
					/>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Category</p>
								<p>{product.category?.name || '-'}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Supplier</p>
								{product.supplierName ? (
									<Link
										to={`/app/suppliers/${product.supplierId}`}
										className="text-primary hover:underline"
									>
										{product.supplierName}
									</Link>
								) : (
									<p className="text-muted-foreground">-</p>
								)}
							</div>
							{product.supplierProductSource && (
								<div>
									<p className="text-sm font-medium text-muted-foreground">Imported From</p>
									<Link
										to={`/app/suppliers/${product.supplierId}/collections/${product.supplierProductSource.collectionId}/products/${product.supplierProductSource.supplierProductId}`}
										className="text-primary hover:underline text-sm"
									>
										{product.supplierProductSource.supplierProductName || 'Supplier Product'}
									</Link>
									{product.supplierProductSource.collectionName && (
										<p className="text-xs text-muted-foreground">
											{product.supplierName} &gt; {product.supplierProductSource.collectionName}
										</p>
									)}
								</div>
							)}
							<Separator />
							<div>
								<p className="text-sm font-medium text-muted-foreground">Status</p>
								<p>{product.archivedAt ? 'Archived' : product.isActive ? 'Active' : 'Inactive'}</p>
							</div>
							<Separator />
							<div>
								<p className="text-sm font-medium text-muted-foreground">Created</p>
								<p>{formatDate(product.createdAt)}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Updated</p>
								<p>{formatDate(product.updatedAt)}</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Edit Product Dialog */}
			<ProductFormDialog
				open={formDialogOpen}
				onOpenChange={setFormDialogOpen}
				onSubmit={handleFormSubmit}
				product={product}
				isLoading={updateMutation.isPending}
				error={mutationError}
			/>

			{/* Add Option Dialog */}
			<OptionFormDialog
				open={optionDialogOpen}
				onOpenChange={setOptionDialogOpen}
				onSubmit={handleOptionSubmit}
				option={null}
				isLoading={createOptionMutation.isPending}
				error={mutationError}
			/>

			{/* Archive Dialog */}
			<DeleteConfirmDialog
				open={archiveDialogOpen}
				onOpenChange={setArchiveDialogOpen}
				onConfirm={handleArchive}
				title="Archive Product"
				description={`Are you sure you want to archive "${product.name}"? The product will be hidden but can be restored later.`}
				isLoading={archiveMutation.isPending}
			/>

			{/* Delete Dialog */}
			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDelete}
				title="Delete Product"
				description={`Are you sure you want to permanently delete "${product.name}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
