import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Plus } from 'lucide-react';
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

	const handleToggleActive = async () => {
		if (!selectedFinish) return;
		try {
			await updateMutation.mutateAsync({
				id: selectedFinish.id,
				isActive: !selectedFinish.isActive,
			});
			setDialogOpen(false);
			resetForm();
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
			setDialogOpen(false);
			setSelectedFinish(null);
		} catch {
			// Error handled by mutation
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<div>
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-4 w-80 mt-2" />
					</div>
					<Skeleton className="h-9 w-28" />
				</div>
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Usage</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 4 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell>
										<Skeleton className="h-4 w-32" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-20" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-8 w-12" />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		);
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
								<TableHead>Usage</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{finishes?.map((item) => (
								<TableRow
									key={item.id}
									className="cursor-pointer"
									onClick={() => handleEdit(item)}
								>
									<TableCell className="font-medium">
										{item.name}
										{!item.isActive && (
											<Badge variant="secondary" className="ml-2">
												Inactive
											</Badge>
										)}
									</TableCell>
									<TableCell>
										<Badge variant="secondary">
											{item.usageCount} {item.usageCount === 1 ? 'quote' : 'quotes'}
										</Badge>
									</TableCell>
									<TableCell>
										<Button
											variant="ghost"
											size="sm"
											onClick={(e) => {
												e.stopPropagation();
												handleEdit(item);
											}}
										>
											Edit
										</Button>
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

					<DialogFooter className="flex-col sm:flex-row gap-2">
						{isEditing && selectedFinish && (
							<div className="flex gap-2 mr-auto">
								<Button
									variant="outline"
									size="sm"
									onClick={handleToggleActive}
									disabled={updateMutation.isPending}
								>
									{selectedFinish.isActive ? 'Deactivate' : 'Activate'}
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => setDeleteDialogOpen(true)}
								>
									Delete
								</Button>
							</div>
						)}
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
