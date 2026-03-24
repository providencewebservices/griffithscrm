import { useState } from 'react';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { TenantFormDialog } from '@/components/admin/tenant-form-dialog';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	type Tenant,
	useCreateTenantMutation,
	useDeleteTenantMutation,
	useTenantsQuery,
	useUpdateTenantMutation,
} from '@/hooks/use-tenants';

export function TenantsTab() {
	const { data: tenants, isLoading, error } = useTenantsQuery();
	const createMutation = useCreateTenantMutation();
	const updateMutation = useUpdateTenantMutation();
	const deleteMutation = useDeleteTenantMutation();

	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);

	const handleCreate = () => {
		setSelectedTenant(null);
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleEdit = (tenant: Tenant) => {
		setSelectedTenant(tenant);
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleDelete = (tenant: Tenant) => {
		setSelectedTenant(tenant);
		setMutationError(null);
		setDeleteDialogOpen(true);
	};

	const handleFormSubmit = async (data: { name: string; slug: string }) => {
		setMutationError(null);
		try {
			if (selectedTenant) {
				await updateMutation.mutateAsync({ id: selectedTenant.id, ...data });
			} else {
				await createMutation.mutateAsync(data);
			}
			setFormDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleDeleteConfirm = async () => {
		if (!selectedTenant) return;
		setMutationError(null);
		try {
			await deleteMutation.mutateAsync(selectedTenant.id);
			setDeleteDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	if (isLoading) {
		return <div className="text-muted-foreground">Loading tenants...</div>;
	}

	if (error) {
		return <div className="text-destructive">Error loading tenants: {error.message}</div>;
	}

	return (
		<div>
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-semibold">Tenants</h2>
				<Button onClick={handleCreate}>Create Tenant</Button>
			</div>

			{mutationError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{mutationError}
				</div>
			)}

			{tenants && tenants.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">
					No tenants yet. Create your first tenant to get started.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Slug</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tenants?.map((tenant) => (
								<TableRow key={tenant.id}>
									<TableCell className="font-medium">{tenant.name}</TableCell>
									<TableCell className="font-mono text-sm">{tenant.slug}</TableCell>
									<TableCell>{new Date(tenant.createdAt).toLocaleDateString()}</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="sm">
													...
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => handleEdit(tenant)}>Edit</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => handleDelete(tenant)}
													className="text-destructive"
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

			<TenantFormDialog
				open={formDialogOpen}
				onOpenChange={setFormDialogOpen}
				onSubmit={handleFormSubmit}
				tenant={selectedTenant}
				isLoading={createMutation.isPending || updateMutation.isPending}
			/>

			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDeleteConfirm}
				title="Delete Tenant"
				description={`Are you sure you want to delete "${selectedTenant?.name}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
