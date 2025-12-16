import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { MoreHorizontal, Plus } from 'lucide-react';
import {
	useLetteringColorsQuery,
	useCreateLetteringColorMutation,
	useUpdateLetteringColorMutation,
	useDeleteLetteringColorMutation,
	type LetteringColor,
	type CreateLetteringColorInput,
} from '@/hooks/use-lettering-colors';

export function LetteringColorsTab() {
	const { data: colors, isLoading, error } = useLetteringColorsQuery();
	const createMutation = useCreateLetteringColorMutation();
	const updateMutation = useUpdateLetteringColorMutation();
	const deleteMutation = useDeleteLetteringColorMutation();

	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<LetteringColor | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Form state
	const [formName, setFormName] = useState('');
	const [formPrice, setFormPrice] = useState('0');

	const isEditing = !!selectedItem;

	const resetForm = () => {
		setFormName('');
		setFormPrice('0');
		setMutationError(null);
	};

	const handleCreate = () => {
		setSelectedItem(null);
		resetForm();
		setFormDialogOpen(true);
	};

	const handleEdit = (item: LetteringColor) => {
		setSelectedItem(item);
		setFormName(item.name);
		setFormPrice(item.price);
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleDelete = (item: LetteringColor) => {
		setSelectedItem(item);
		setDeleteDialogOpen(true);
	};

	const handleToggleActive = async (item: LetteringColor) => {
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
		const data: CreateLetteringColorInput = {
			name: formName,
			price: parseFloat(formPrice) || 0,
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
		return <div className="text-muted-foreground">Loading lettering colors...</div>;
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading lettering colors: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-lg font-semibold">Lettering Colors</h3>
					<p className="text-sm text-muted-foreground">
						Manage paint finishes and their pricing
					</p>
				</div>
				<Button onClick={handleCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Add Color
				</Button>
			</div>

			{colors && colors.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					No lettering colors yet. Add your first color to get started.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Price</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-[70px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{colors?.map((item) => (
								<TableRow key={item.id}>
									<TableCell className="font-medium">{item.name}</TableCell>
									<TableCell>${item.price}</TableCell>
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
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{isEditing ? 'Edit Lettering Color' : 'Add Lettering Color'}
						</DialogTitle>
						<DialogDescription>
							{isEditing
								? 'Update the lettering color details.'
								: 'Add a new lettering color with pricing.'}
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
								placeholder="e.g., Gold Leaf, White Paint, Silvered Paint"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="price">Price ($)</FieldLabel>
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
				title="Delete Lettering Color"
				description={`Are you sure you want to delete "${selectedItem?.name}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
