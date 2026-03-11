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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useSignedUrl } from '@/hooks/use-uploads';
import { ArrowLeft, Package, ImageIcon, MoreHorizontal, FileText } from 'lucide-react';

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
						<p className="text-sm text-muted-foreground mt-1">
							Created {new Date(category.createdAt).toLocaleDateString()} · Updated {new Date(category.updatedAt).toLocaleDateString()}
						</p>
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
							<DropdownMenuItem
								className="text-destructive"
								disabled={productCount > 0}
								onClick={() => setDeleteDialogOpen(true)}
							>
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{mutationError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{mutationError}
				</div>
			)}

			<div className="space-y-6">
				{/* Category Image */}
				<Card>
					<CardHeader>
						<CardTitle>Category Image</CardTitle>
					</CardHeader>
					<CardContent>
						{category.imageUrl ? (
							<img
								src={signedCategoryImageUrl || category.imageUrl}
								alt={category.name}
								className="w-full max-w-md h-48 object-cover rounded-lg border"
							/>
						) : (
							<div className="text-center py-8 text-muted-foreground border rounded-lg">
								<ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
								No image. Click Edit to add one.
							</div>
						)}
					</CardContent>
				</Card>

				{/* Description */}
				<Card>
					<CardHeader>
						<CardTitle>Description</CardTitle>
					</CardHeader>
					<CardContent>
						{category.description ? (
							<p className="text-muted-foreground whitespace-pre-wrap">
								{category.description}
							</p>
						) : (
							<div className="text-center py-8 text-muted-foreground border rounded-lg">
								<FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
								No description. Click Edit to add one.
							</div>
						)}
					</CardContent>
				</Card>

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
											<TableHead>SKU</TableHead>
											<TableHead>Name</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{category.products?.map((product) => (
											<TableRow key={product.id}>
												<TableCell className="font-mono text-sm">
													{product.sku}
												</TableCell>
												<TableCell className="font-medium">
													<Link to={`/app/products/${product.id}`} className="hover:underline">
														{product.name}
													</Link>
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
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
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
