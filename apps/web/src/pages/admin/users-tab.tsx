import { useState } from 'react';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { UserFormDialog } from '@/components/admin/user-form-dialog';
import { Badge } from '@/components/ui/badge';
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
import { useTenantsQuery } from '@/hooks/use-tenants';
import {
	type User,
	useCreateUserMutation,
	useDeleteUserMutation,
	useResendInviteMutation,
	useUpdateUserMutation,
	useUsersQuery,
} from '@/hooks/use-users';
import { useSession } from '@/lib/auth';

export function UsersTab() {
	const { data: session } = useSession();
	const { data: users, isLoading, error } = useUsersQuery();
	const { data: tenants } = useTenantsQuery();
	const createMutation = useCreateUserMutation();
	const updateMutation = useUpdateUserMutation();
	const deleteMutation = useDeleteUserMutation();
	const resendInviteMutation = useResendInviteMutation();

	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);

	const currentUserId = session?.user?.id;

	const handleCreate = () => {
		setSelectedUser(null);
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleEdit = (user: User) => {
		setSelectedUser(user);
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleDelete = (user: User) => {
		setSelectedUser(user);
		setMutationError(null);
		setDeleteDialogOpen(true);
	};

	const handleFormSubmit = async (data: {
		name: string;
		email: string;
		password?: string;
		role: 'app_admin' | 'manager' | 'tenant_user';
		tenantId?: string | null;
	}) => {
		setMutationError(null);
		try {
			if (selectedUser) {
				await updateMutation.mutateAsync({ id: selectedUser.id, ...data });
			} else {
				await createMutation.mutateAsync({
					name: data.name,
					email: data.email,
					role: data.role,
					tenantId: data.tenantId || undefined,
				});
			}
			setFormDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleDeleteConfirm = async () => {
		if (!selectedUser) return;
		setMutationError(null);
		try {
			await deleteMutation.mutateAsync(selectedUser.id);
			setDeleteDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleResendInvite = async (user: User) => {
		try {
			await resendInviteMutation.mutateAsync(user.id);
			toast.success(`Invite email sent to ${user.email}`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to send invite');
		}
	};

	const getTenantName = (tenantId: string | null) => {
		if (!tenantId) return '-';
		const tenant = tenants?.find((t) => t.id === tenantId);
		return tenant?.name || tenantId;
	};

	if (isLoading) {
		return <div className="text-muted-foreground">Loading users...</div>;
	}

	if (error) {
		return <div className="text-destructive">Error loading users: {error.message}</div>;
	}

	return (
		<div>
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-semibold">Users</h2>
				<Button onClick={handleCreate}>Create User</Button>
			</div>

			{mutationError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{mutationError}
				</div>
			)}

			{users && users.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">
					No users yet. Create your first user to get started.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Tenant</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{users?.map((user) => (
								<TableRow key={user.id}>
									<TableCell className="font-medium">
										{user.name}
										{user.id === currentUserId && (
											<span className="ml-2 text-xs text-muted-foreground">(you)</span>
										)}
									</TableCell>
									<TableCell>{user.email}</TableCell>
									<TableCell>
										<Badge
											variant={
												user.role === 'app_admin'
													? 'default'
													: user.role === 'manager'
														? 'outline'
														: 'secondary'
											}
										>
											{user.role === 'app_admin'
												? 'Admin'
												: user.role === 'manager'
													? 'Manager'
													: 'Tenant User'}
										</Badge>
									</TableCell>
									<TableCell>{getTenantName(user.tenantId)}</TableCell>
									<TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="sm">
													...
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => handleEdit(user)}>Edit</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => handleResendInvite(user)}
													disabled={resendInviteMutation.isPending}
												>
													Resend Invite
												</DropdownMenuItem>
												{user.id !== currentUserId && (
													<DropdownMenuItem
														onClick={() => handleDelete(user)}
														className="text-destructive"
													>
														Delete
													</DropdownMenuItem>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			<UserFormDialog
				open={formDialogOpen}
				onOpenChange={setFormDialogOpen}
				onSubmit={handleFormSubmit}
				user={selectedUser}
				isLoading={createMutation.isPending || updateMutation.isPending}
				currentUserId={currentUserId}
			/>

			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDeleteConfirm}
				title="Delete User"
				description={`Are you sure you want to delete "${selectedUser?.name}"? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
