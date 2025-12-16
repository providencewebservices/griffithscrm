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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { MoreHorizontal, Plus } from 'lucide-react';
import {
	useFinishesQuery,
	useCreateFinishMutation,
	useUpdateFinishMutation,
	useDeleteFinishMutation,
	type Finish,
	type CreateFinishInput,
} from '@/hooks/use-finishes';

export function FinishesTab() {
	const { data: finishes, isLoading, error } = useFinishesQuery();
	const createMutation = useCreateFinishMutation();
	const updateMutation = useUpdateFinishMutation();
	const deleteMutation = useDeleteFinishMutation();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedFinish, setSelectedFinish] = useState<Finish | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);

	// Form state
	const [formName, setFormName] = useState('');

	const isEditing = !!selectedFinish;

	const resetForm = () => {
		setFormName('');
		setSelectedFinish(null);
		setMutationError(null);
	};

	const handleCreate = () => {
		resetForm();
		setDialogOpen(true);
	};

	const handleEdit = (finish: Finish) => {
		setSelectedFinish(finish);
		setFormName(finish.name);
		setMutationError(null);
		setDialogOpen(true);
	};

	const handleDelete = (finish: Finish) => {
		setSelectedFinish(finish);
		setDeleteDialogOpen(true);
	};

	const handleToggleActive = async (finish: Finish) => {
		try {
			await updateMutation.mutateAsync({
				id: finish.id,
				isActive: !finish.isActive,
			});
		} catch {
			// Error handled by mutation
		}
	};

	const handleFormSubmit = async () => {
		setMutationError(null);
		const data: CreateFinishInput = {
			name: formName,
		};

		try {
			if (isEditing && selectedFinish) {
				await updateMutation.mutateAsync({ id: selectedFinish.id, ...data });
			} else {
				await createMutation.mutateAsync(data);
			}
			setDialogOpen(false);
			resetForm();
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleDeleteConfirm = async () => {
		if (!selectedFinish) return;
		try {
			await deleteMutation.mutateAsync(selectedFinish.id);
			setDeleteDialogOpen(false);
			setSelectedFinish(null);
		} catch {
			// Error handled by mutation
		}
	};

	if (isLoading) {
		return <div className="text-muted-foreground">Loading finishes...</div>;
	}

	if (error) {
		return (
			<div className="text-destructive">Error loading finishes: {error.message}</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-lg font-semibold">Finishes</h3>
					<p className="text-sm text-muted-foreground">
						Surface treatments applied to stone (e.g., Polished, Honed)
					</p>
				</div>
				<Button onClick={handleCreate}>
					<Plus className="h-4 w-4 mr-2" />
					Add Finish
				</Button>
			</div>

			{finishes && finishes.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground border rounded-lg">
					No finishes yet. Add your first finish to get started.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{finishes?.map((item) => (
								<TableRow key={item.id}>
									<TableCell className="font-medium">{item.name}</TableCell>
									<TableCell>
										<Badge variant={item.isActive ? 'default' : 'secondary'}>
											{item.isActive ? 'Active' : 'Inactive'}
										</Badge>
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
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

			{/* Create/Edit Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{isEditing ? 'Edit Finish' : 'Add Finish'}</DialogTitle>
						<DialogDescription>
							{isEditing
								? 'Update the finish details.'
								: 'Add a new surface finish option.'}
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
								placeholder="e.g., Polished, Honed, Flamed"
							/>
						</Field>
					</FieldGroup>

					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
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

			{/* Delete Confirmation Dialog */}
			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDeleteConfirm}
				title="Delete Finish"
				description={`Are you sure you want to delete "${selectedFinish?.name}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
