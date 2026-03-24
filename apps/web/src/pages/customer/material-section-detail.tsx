import { ArrowLeft, ImageIcon, MoreHorizontal, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ImageUpload } from '@/components/ui/image-upload';
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
import {
	type UpdateMaterialSectionInput,
	useDeleteMaterialSectionMutation,
	useMaterialSectionQuery,
	useUpdateMaterialSectionMutation,
} from '@/hooks/use-material-sections';
import { type CreateMaterialInput, useCreateMaterialMutation } from '@/hooks/use-materials';
import { useSuppliersQuery } from '@/hooks/use-suppliers';
import { useSignedUrls } from '@/hooks/use-uploads';

export function MaterialSectionDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [materialFormOpen, setMaterialFormOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Section form state
	const [formName, setFormName] = useState('');

	// Material form state (for adding new materials)
	const [materialName, setMaterialName] = useState('');
	const [materialImageUrl, setMaterialImageUrl] = useState<string | null>(null);
	const [materialEntityId, setMaterialEntityId] = useState('');
	const [materialSupplierId, setMaterialSupplierId] = useState<string | null>(null);

	const { data: section, isLoading, error } = useMaterialSectionQuery(id);
	const { data: suppliers } = useSuppliersQuery({});
	const updateMutation = useUpdateMaterialSectionMutation();
	const deleteMutation = useDeleteMaterialSectionMutation();
	const createMaterialMutation = useCreateMaterialMutation();

	const materialImageUrls = useMemo(
		() => section?.materials.map((m) => m.imageUrl).filter(Boolean) || [],
		[section?.materials],
	);
	const { data: signedUrls } = useSignedUrls(materialImageUrls);

	const handleEdit = () => {
		if (!section) return;
		setFormName(section.name);
		setMutationError(null);
		setEditDialogOpen(true);
	};

	const handleEditSubmit = async () => {
		if (!id) return;
		setMutationError(null);
		const data: UpdateMaterialSectionInput = {
			name: formName,
		};

		try {
			await updateMutation.mutateAsync({ id, ...data });
			setEditDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleDelete = async () => {
		if (!id) return;
		try {
			await deleteMutation.mutateAsync(id);
			setDeleteDialogOpen(false);
			navigate('/app/settings?tab=materials');
		} catch {
			// Error handled by mutation
		}
	};

	const handleAddMaterial = () => {
		setMaterialName('');
		setMaterialImageUrl(null);
		setMaterialEntityId(crypto.randomUUID());
		setMaterialSupplierId(null);
		setMutationError(null);
		setMaterialFormOpen(true);
	};

	const handleMaterialSubmit = async () => {
		if (!id) return;
		setMutationError(null);

		try {
			const data: CreateMaterialInput = {
				sectionId: id,
				name: materialName,
				imageUrl: materialImageUrl,
				supplierId: materialSupplierId,
			};
			await createMaterialMutation.mutateAsync(data);
			setMaterialFormOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Material Section Details</h2>
				</div>
				<div className="text-muted-foreground">Loading section...</div>
			</div>
		);
	}

	if (error || !section) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Material Section Details</h2>
				</div>
				<div className="text-destructive">
					{error ? `Error loading section: ${error.message}` : 'Section not found'}
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
					<BreadcrumbItem>
						<BreadcrumbPage>{section.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Link to="/app/settings?tab=materials">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<h2 className="text-2xl font-bold">{section.name}</h2>
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
								onClick={() => setDeleteDialogOpen(true)}
							>
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<div className="space-y-6">
				{/* Materials */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Materials</CardTitle>
								<CardDescription>Stone types in this section</CardDescription>
							</div>
							<Button onClick={handleAddMaterial}>
								<Plus className="h-4 w-4 mr-2" />
								Add Material
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{section.materials.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground border rounded-lg">
								No materials yet. Add a material to this section.
							</div>
						) : (
							<div className="border rounded-lg">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[50px]"></TableHead>
											<TableHead>Name</TableHead>
											<TableHead>Supplier</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="w-[80px]"></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{section.materials.map((material) => (
											<TableRow key={material.id}>
												<TableCell>
													{material.imageUrl ? (
														<img
															src={signedUrls?.get(material.imageUrl) || material.imageUrl}
															alt={material.name}
															className="w-10 h-10 object-cover rounded"
														/>
													) : (
														<div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
															<ImageIcon className="w-4 h-4 text-muted-foreground" />
														</div>
													)}
												</TableCell>
												<TableCell className="font-medium">{material.name}</TableCell>
												<TableCell>
													{material.supplierName ? (
														<Link
															to={`/app/suppliers/${material.supplierId}`}
															className="text-primary hover:underline"
														>
															{material.supplierName}
														</Link>
													) : (
														<span className="text-muted-foreground">-</span>
													)}
												</TableCell>
												<TableCell>
													<Badge variant={material.isActive ? 'default' : 'secondary'}>
														{material.isActive ? 'Active' : 'Inactive'}
													</Badge>
												</TableCell>
												<TableCell>
													<Link to={`/app/materials/${material.id}`}>
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

			{/* Edit Section Dialog */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Section</DialogTitle>
						<DialogDescription>Update the section details.</DialogDescription>
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
								placeholder="e.g., White, Black, Light Grey"
							/>
						</Field>
					</FieldGroup>

					<DialogFooter>
						<Button variant="outline" onClick={() => setEditDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleEditSubmit} disabled={!formName || updateMutation.isPending}>
							{updateMutation.isPending ? 'Saving...' : 'Update'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Section Dialog */}
			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDelete}
				title="Delete Section"
				description={`Are you sure you want to delete "${section.name}"? This will also delete all materials in this section. This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>

			{/* Add Material Dialog */}
			<Dialog open={materialFormOpen} onOpenChange={setMaterialFormOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Material</DialogTitle>
						<DialogDescription>Add a new stone type to this section.</DialogDescription>
					</DialogHeader>

					{mutationError && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
							{mutationError}
						</div>
					)}

					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="materialName">Name</FieldLabel>
							<Input
								id="materialName"
								value={materialName}
								onChange={(e) => setMaterialName(e.target.value)}
								placeholder="e.g., Carrara White, Nero Assoluto"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="materialSupplier">Supplier (optional)</FieldLabel>
							<Select
								value={materialSupplierId || 'none'}
								onValueChange={(value) => setMaterialSupplierId(value === 'none' ? null : value)}
							>
								<SelectTrigger id="materialSupplier">
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
							<FieldLabel>Image (optional)</FieldLabel>
							<ImageUpload
								value={materialImageUrl}
								onChange={setMaterialImageUrl}
								category="materials"
								entityId={materialEntityId}
							/>
						</Field>
					</FieldGroup>

					<DialogFooter>
						<Button variant="outline" onClick={() => setMaterialFormOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleMaterialSubmit}
							disabled={!materialName || createMaterialMutation.isPending}
						>
							{createMaterialMutation.isPending ? 'Creating...' : 'Create'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
