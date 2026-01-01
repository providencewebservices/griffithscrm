import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ImageUpload } from '@/components/ui/image-upload';
import { MoreHorizontal, Plus, ImageIcon } from 'lucide-react';
import {
	useSundriesQuery,
	useCreateSundryMutation,
	useUpdateSundryMutation,
	useDeleteSundryMutation,
	type Sundry,
	type CreateSundryInput,
} from '@/hooks/use-sundries';
import { useSuppliersQuery } from '@/hooks/use-suppliers';
import { useSignedUrls } from '@/hooks/use-uploads';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Link } from 'react-router';

export function SundriesTab() {
	const { data: sundries, isLoading, error } = useSundriesQuery();
	const { data: suppliers } = useSuppliersQuery({});
	const sundryImageUrls = sundries?.map((s) => s.imageUrl) || [];
	const { data: signedSundryImages } = useSignedUrls(sundryImageUrls);
	const createMutation = useCreateSundryMutation();
	const updateMutation = useUpdateSundryMutation();
	const deleteMutation = useDeleteSundryMutation();

	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<Sundry | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Form state
	const [formName, setFormName] = useState('');
	const [formDescription, setFormDescription] = useState('');
	const [formPrice, setFormPrice] = useState('0');
	const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
	const [formSupplierId, setFormSupplierId] = useState<string | null>(null);

	const isEditing = !!selectedItem;

	const resetForm = () => {
		setFormName('');
		setFormDescription('');
		setFormPrice('0');
		setFormImageUrl(null);
		setFormSupplierId(null);
		setMutationError(null);
	};

	const handleCreate = () => {
		setSelectedItem(null);
		resetForm();
		setFormDialogOpen(true);
	};

	const handleEdit = (item: Sundry) => {
		setSelectedItem(item);
		setFormName(item.name);
		setFormDescription(item.description || '');
		setFormPrice(item.price);
		setFormImageUrl(item.imageUrl);
		setFormSupplierId(item.supplierId);
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleDelete = (item: Sundry) => {
		setSelectedItem(item);
		setDeleteDialogOpen(true);
	};

	const handleToggleActive = async (item: Sundry) => {
		try {
			await updateMutation.mutateAsync({
				id: item.id,
				isActive: !item.isActive,
			});
		} catch (err) {
			// Error handled by mutation
		}
	};

	const handleFormSubmit = async () => {
		setMutationError(null);
		const data: CreateSundryInput = {
			name: formName,
			description: formDescription || undefined,
			price: parseFloat(formPrice) || 0,
			imageUrl: formImageUrl,
			supplierId: formSupplierId,
		};

		try {
			if (isEditing && selectedItem) {
				await updateMutation.mutateAsync({ id: selectedItem.id, ...data });
			} else {
				await createMutation.mutateAsync(data);
			}
			setFormDialogOpen(false);
			resetForm();
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleDeleteConfirm = async () => {
		if (!selectedItem) return;
		try {
			await deleteMutation.mutateAsync(selectedItem.id);
			setDeleteDialogOpen(false);
			setSelectedItem(null);
		} catch (err) {
			// Error handled by mutation
		}
	};

	if (isLoading) {
		return <div className="text-muted-foreground">Loading sundries...</div>;
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading sundries: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-lg font-semibold">Sundries</h3>
					<p className="text-sm text-muted-foreground">
						Manage add-on items like ceramic flowers and photo plaques
					</p>
				</div>
				<Button onClick={handleCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Add Sundry
				</Button>
			</div>

			{sundries && sundries.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					No sundries yet. Add your first sundry to get started.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[60px]">Image</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Supplier</TableHead>
								<TableHead>Description</TableHead>
								<TableHead>Price</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-[70px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sundries?.map((item) => (
								<TableRow key={item.id}>
									<TableCell>
										{item.imageUrl ? (
											<img
												src={
													(signedSundryImages?.get(item.imageUrl)) ||
													item.imageUrl
												}
												alt={item.name}
												className="w-10 h-10 object-cover rounded"
											/>
										) : (
											<div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
												<ImageIcon className="w-4 h-4 text-muted-foreground" />
											</div>
										)}
									</TableCell>
									<TableCell className="font-medium">{item.name}</TableCell>
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
									<TableCell className="max-w-[200px] truncate">
										{item.description || <span className="text-muted-foreground">-</span>}
									</TableCell>
									<TableCell>£{item.price}</TableCell>
									<TableCell>
										<Badge variant={item.isActive ? 'default' : 'secondary'}>
											{item.isActive ? 'Active' : 'Inactive'}
										</Badge>
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon-sm">
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => handleEdit(item)}>
													Edit
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleToggleActive(item)}>
													{item.isActive ? 'Deactivate' : 'Activate'}
												</DropdownMenuItem>
												<DropdownMenuItem
													className="text-destructive"
													onClick={() => handleDelete(item)}
												>
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Form Dialog */}
			<Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>
							{isEditing ? 'Edit Sundry' : 'Add Sundry'}
						</DialogTitle>
						<DialogDescription>
							{isEditing
								? 'Update the sundry details.'
								: 'Add a new sundry item with pricing.'}
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
								placeholder="e.g., Ceramic Rose (Red), Oval Photo Plaque"
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
							<FieldLabel htmlFor="description">Description</FieldLabel>
							<Textarea
								id="description"
								value={formDescription}
								onChange={(e) => setFormDescription(e.target.value)}
								placeholder="Optional description"
								rows={2}
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="price">Price (£)</FieldLabel>
							<Input
								id="price"
								type="number"
								min="0"
								step="0.01"
								value={formPrice}
								onChange={(e) => setFormPrice(e.target.value)}
								placeholder="0.00"
							/>
						</Field>

						{isEditing && selectedItem && (
							<Field>
								<FieldLabel>Image</FieldLabel>
								<ImageUpload
									value={formImageUrl}
									onChange={setFormImageUrl}
									category="sundries"
									entityId={selectedItem.id}
								/>
							</Field>
						)}
					</FieldGroup>

					<DialogFooter>
						<Button variant="outline" onClick={() => setFormDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleFormSubmit}
							disabled={!formName || createMutation.isPending || updateMutation.isPending}
						>
							{createMutation.isPending || updateMutation.isPending
								? 'Saving...'
								: isEditing
									? 'Update'
									: 'Create'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirm Dialog */}
			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDeleteConfirm}
				title="Delete Sundry"
				description={`Are you sure you want to delete "${selectedItem?.name}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
