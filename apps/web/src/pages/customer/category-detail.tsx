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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ImageUpload } from '@/components/ui/image-upload';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import {
	useProductCategoryQuery,
	useUpdateProductCategoryMutation,
	useDeleteProductCategoryMutation,
	type UpdateProductCategoryInput,
} from '@/hooks/use-product-categories';
import { useSignedUrl, useSignedUrls } from '@/hooks/use-uploads';
import { ArrowLeft, Package, ImageIcon } from 'lucide-react';

export function CategoryDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Form state
	const [formName, setFormName] = useState('');
	const [formDescription, setFormDescription] = useState('');
	const [formImageUrl, setFormImageUrl] = useState<string | null>(null);

	const { data: category, isLoading, error } = useProductCategoryQuery(id);
	const { data: signedCategoryImageUrl } = useSignedUrl(category?.imageUrl);
	const productImageUrls = category?.products?.map((p) => p.imageUrl) || [];
	const { data: signedProductImages } = useSignedUrls(productImageUrls);
	const updateMutation = useUpdateProductCategoryMutation();
	const deleteMutation = useDeleteProductCategoryMutation();

	const handleEdit = () => {
		if (!category) return;
		setFormName(category.name);
		setFormDescription(category.description || '');
		setFormImageUrl(category.imageUrl);
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleFormSubmit = async () => {
		if (!id) return;
		setMutationError(null);
		const data: UpdateProductCategoryInput = {
			name: formName,
			description: formDescription || undefined,
			imageUrl: formImageUrl,
		};

		try {
			await updateMutation.mutateAsync({ id, ...data });
			setFormDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleDelete = async () => {
		if (!id) return;
		try {
			await deleteMutation.mutateAsync(id);
			setDeleteDialogOpen(false);
			navigate('/app/settings?tab=categories');
		} catch (err) {
			// Error handled by mutation
		}
	};

	const formatPrice = (price: string | null) => {
		if (!price) return '-';
		return `£${parseFloat(price).toFixed(2)}`;
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Category Details</h2>
				</div>
				<div className="text-muted-foreground">Loading category...</div>
			</div>
		);
	}

	if (error || !category) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Category Details</h2>
				</div>
				<div className="text-destructive">
					{error ? `Error loading category: ${error.message}` : 'Category not found'}
				</div>
				<Link to="/app/settings?tab=categories">
					<Button variant="outline" className="mt-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Categories
					</Button>
				</Link>
			</div>
		);
	}

	const productCount = category.products?.length || 0;

	return (
		<div>
			{/* Breadcrumb */}
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/settings?tab=categories">Settings</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/settings?tab=categories">Categories</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{category.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Link to="/app/settings?tab=categories">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<div className="flex items-center gap-3">
							<h2 className="text-2xl font-bold">{category.name}</h2>
							<Badge variant="secondary">
								{productCount} {productCount === 1 ? 'product' : 'products'}
							</Badge>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button onClick={handleEdit}>Edit</Button>
					<Button
						variant="destructive"
						onClick={() => setDeleteDialogOpen(true)}
						disabled={productCount > 0}
					>
						Delete
					</Button>
				</div>
			</div>

			{mutationError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{mutationError}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Category Image */}
					{category.imageUrl && (
						<Card>
							<CardHeader>
								<CardTitle>Category Image</CardTitle>
							</CardHeader>
							<CardContent>
								<img
									src={signedCategoryImageUrl || category.imageUrl}
									alt={category.name}
									className="w-full max-w-md h-48 object-cover rounded-lg border"
								/>
							</CardContent>
						</Card>
					)}

					{/* Description */}
					{category.description && (
						<Card>
							<CardHeader>
								<CardTitle>Description</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground whitespace-pre-wrap">
									{category.description}
								</p>
							</CardContent>
						</Card>
					)}

					{/* Products */}
					<Card>
						<CardHeader>
							<CardTitle>Products</CardTitle>
							<CardDescription>
								Products in this category
							</CardDescription>
						</CardHeader>
						<CardContent>
							{productCount === 0 ? (
								<div className="text-center py-8 text-muted-foreground border rounded-lg">
									<Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
									No products in this category yet.
								</div>
							) : (
								<div className="border rounded-lg">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="w-[60px]">Image</TableHead>
												<TableHead>SKU</TableHead>
												<TableHead>Name</TableHead>
												<TableHead>Base Price</TableHead>
												<TableHead>Status</TableHead>
												<TableHead className="w-[80px]"></TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{category.products?.map((product) => (
												<TableRow key={product.id}>
													<TableCell>
														{product.imageUrl ? (
															<img
																src={
																	(signedProductImages?.get(product.imageUrl)) ||
																	product.imageUrl
																}
																alt={product.name}
																className="w-10 h-10 object-cover rounded"
															/>
														) : (
															<div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
																<ImageIcon className="h-4 w-4 text-muted-foreground" />
															</div>
														)}
													</TableCell>
													<TableCell className="font-mono text-sm">
														{product.sku}
													</TableCell>
													<TableCell className="font-medium">
														{product.name}
													</TableCell>
													<TableCell>{formatPrice(product.basePrice)}</TableCell>
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
								<p className="text-sm font-medium text-muted-foreground">Products</p>
								<p>{productCount}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Created</p>
								<p>{new Date(category.createdAt).toLocaleDateString()}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Updated</p>
								<p>{new Date(category.updatedAt).toLocaleDateString()}</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Edit Dialog */}
			<Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Category</DialogTitle>
						<DialogDescription>
							Update the category details.
						</DialogDescription>
					</DialogHeader>

					{mutationError && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
							{mutationError}
						</div>
					)}

					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="name">Name</FieldLabel>
							<Input
								id="name"
								value={formName}
								onChange={(e) => setFormName(e.target.value)}
								placeholder="e.g., Full Length Memorials"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="description">Description</FieldLabel>
							<Textarea
								id="description"
								value={formDescription}
								onChange={(e) => setFormDescription(e.target.value)}
								placeholder="Optional description"
								rows={3}
							/>
						</Field>

						<Field>
							<FieldLabel>Image</FieldLabel>
							<ImageUpload
								value={formImageUrl}
								onChange={setFormImageUrl}
								category="categories"
								entityId={id || ''}
							/>
						</Field>
					</FieldGroup>

					<DialogFooter>
						<Button variant="outline" onClick={() => setFormDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleFormSubmit}
							disabled={!formName || updateMutation.isPending}
						>
							{updateMutation.isPending ? 'Saving...' : 'Update'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Dialog */}
			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDelete}
				title="Delete Category"
				description={`Are you sure you want to delete "${category.name}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
