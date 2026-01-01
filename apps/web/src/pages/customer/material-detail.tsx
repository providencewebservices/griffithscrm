import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
	Card,
	CardContent,
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { ImageUpload } from '@/components/ui/image-upload';
import {
	useMaterialQuery,
	useUpdateMaterialMutation,
	useDeleteMaterialMutation,
} from '@/hooks/use-materials';
import { useMaterialSectionQuery } from '@/hooks/use-material-sections';
import { useSuppliersQuery } from '@/hooks/use-suppliers';
import { useUploadImageMutation, useSignedUrl } from '@/hooks/use-uploads';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ImageIcon, Upload, X, Loader2 } from 'lucide-react';

export function MaterialDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Form state
	const [formName, setFormName] = useState('');
	const [formSupplierCost, setFormSupplierCost] = useState('0');
	const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
	const [formSupplierId, setFormSupplierId] = useState<string | null>(null);

	const { data: material, isLoading, error } = useMaterialQuery(id);
	const { data: section } = useMaterialSectionQuery(material?.sectionId);
	const { data: suppliers } = useSuppliersQuery({});
	const { data: signedImageUrl } = useSignedUrl(material?.imageUrl);
	const updateMutation = useUpdateMaterialMutation();
	const deleteMutation = useDeleteMaterialMutation(material?.sectionId || '');
	const uploadMutation = useUploadImageMutation();

	const handleEdit = () => {
		if (!material) return;
		setFormName(material.name);
		setFormSupplierCost(material.supplierCost);
		setFormImageUrl(material.imageUrl);
		setFormSupplierId(material.supplierId);
		setMutationError(null);
		setEditDialogOpen(true);
	};

	const handleEditSubmit = async () => {
		if (!id) return;
		setMutationError(null);
		try {
			await updateMutation.mutateAsync({
				id,
				name: formName,
				supplierCost: parseFloat(formSupplierCost) || 0,
				imageUrl: formImageUrl,
				supplierId: formSupplierId,
			});
			setEditDialogOpen(false);
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
				category: 'materials',
				entityId: id,
				file,
			});
			await updateMutation.mutateAsync({ id, imageUrl: publicUrl });
		} catch {
			// Error handled by mutation
		}
	};

	const handleToggleActive = async () => {
		if (!id || !material) return;
		try {
			await updateMutation.mutateAsync({ id, isActive: !material.isActive });
		} catch {
			// Error handled by mutation
		}
	};

	const handleDelete = async () => {
		if (!id || !material) return;
		try {
			await deleteMutation.mutateAsync(id);
			setDeleteDialogOpen(false);
			navigate(`/app/material-sections/${material.sectionId}`);
		} catch {
			// Error handled by mutation
		}
	};

	const formatPrice = (price: string) => {
		return `£${parseFloat(price).toFixed(2)}`;
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
					<h2 className="text-2xl font-bold">Material Details</h2>
				</div>
				<div className="text-muted-foreground">Loading material...</div>
			</div>
		);
	}

	if (error || !material) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Material Details</h2>
				</div>
				<div className="text-destructive">
					{error ? `Error loading material: ${error.message}` : 'Material not found'}
				</div>
				<Link to="/app/settings?tab=materials">
					<Button variant="outline" className="mt-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Materials
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
							<Link to="/app/settings?tab=materials">Settings</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to="/app/settings?tab=materials">Materials</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					{section && (
						<>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link to={`/app/material-sections/${section.id}`}>{section.name}</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
						</>
					)}
					<BreadcrumbItem>
						<BreadcrumbPage>{material.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Link to={`/app/material-sections/${material.sectionId}`}>
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<div className="flex items-center gap-3">
							<h2 className="text-2xl font-bold">{material.name}</h2>
							<Badge variant={material.isActive ? 'default' : 'secondary'}>
								{material.isActive ? 'Active' : 'Inactive'}
							</Badge>
						</div>
						{section && (
							<p className="text-muted-foreground">{section.name}</p>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={handleToggleActive}>
						{material.isActive ? 'Deactivate' : 'Activate'}
					</Button>
					<Button onClick={handleEdit}>Edit</Button>
					<Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
						Delete
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Material Image */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>Material Image</CardTitle>
								{material.imageUrl && (
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => document.getElementById('image-upload-input')?.click()}
										>
											<Upload className="h-4 w-4 mr-2" />
											Replace
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleImageChange(null)}
										>
											<X className="h-4 w-4 mr-2" />
											Remove
										</Button>
									</div>
								)}
							</div>
						</CardHeader>
						<CardContent>
							<input
								id="image-upload-input"
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
							{material.imageUrl ? (
								<div className="relative flex justify-center bg-muted/30 rounded-lg p-4">
									<img
										src={signedImageUrl || material.imageUrl}
										alt={material.name}
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
									category="materials"
									entityId={material.id}
								/>
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
								<p className="text-sm font-medium text-muted-foreground">Section</p>
								{section ? (
									<Link
										to={`/app/material-sections/${section.id}`}
										className="text-primary hover:underline"
									>
										{section.name}
									</Link>
								) : (
									<p>-</p>
								)}
							</div>
							<Separator />
							<div>
								<p className="text-sm font-medium text-muted-foreground">Supplier</p>
								{material.supplierName ? (
									<Link
										to={`/app/suppliers/${material.supplierId}`}
										className="text-primary hover:underline"
									>
										{material.supplierName}
									</Link>
								) : (
									<p className="text-muted-foreground">-</p>
								)}
							</div>
							<Separator />
							<div>
								<p className="text-sm font-medium text-muted-foreground">Supplier Cost</p>
								<p className="text-lg font-semibold">{formatPrice(material.supplierCost)}</p>
							</div>
							<Separator />
							<div>
								<p className="text-sm font-medium text-muted-foreground">Status</p>
								<p>{material.isActive ? 'Active' : 'Inactive'}</p>
							</div>
							<Separator />
							<div>
								<p className="text-sm font-medium text-muted-foreground">Created</p>
								<p>{formatDate(material.createdAt)}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Updated</p>
								<p>{formatDate(material.updatedAt)}</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Edit Dialog */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Material</DialogTitle>
						<DialogDescription>
							Update the material details.
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
								placeholder="e.g., Carrara White"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="supplier">Supplier (optional)</FieldLabel>
							<Select
								value={formSupplierId || 'none'}
								onValueChange={(value) =>
									setFormSupplierId(value === 'none' ? null : value)
								}
							>
								<SelectTrigger id="supplier">
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
							<FieldLabel htmlFor="supplierCost">Supplier Cost (£)</FieldLabel>
							<Input
								id="supplierCost"
								type="number"
								min="0"
								step="0.01"
								value={formSupplierCost}
								onChange={(e) => setFormSupplierCost(e.target.value)}
								placeholder="0.00"
							/>
						</Field>

						<Field>
							<FieldLabel>Image (optional)</FieldLabel>
							<ImageUpload
								value={formImageUrl}
								onChange={setFormImageUrl}
								category="materials"
								entityId={id || ''}
							/>
						</Field>
					</FieldGroup>

					<DialogFooter>
						<Button variant="outline" onClick={() => setEditDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleEditSubmit}
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
				title="Delete Material"
				description={`Are you sure you want to delete "${material.name}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
