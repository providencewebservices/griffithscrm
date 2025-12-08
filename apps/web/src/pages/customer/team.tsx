import { useState } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InviteMemberDialog } from '@/components/customer/invite-member-dialog';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { useSession } from '@/lib/auth';
import {
	useTeamQuery,
	useInviteUserMutation,
	useUpdateTeamMemberMutation,
	useDeleteTeamMemberMutation,
	useResendInviteMutation,
	type TeamMember,
} from '@/hooks/use-team';

export function TeamPage() {
	const { data: session } = useSession();
	const { data: members, isLoading, error } = useTeamQuery();
	const inviteMutation = useInviteUserMutation();
	const updateMutation = useUpdateTeamMemberMutation();
	const deleteMutation = useDeleteTeamMemberMutation();
	const resendMutation = useResendInviteMutation();

	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);

	const currentUserId = session?.user?.id;

	const handleInvite = () => {
		setSelectedMember(null);
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleEdit = (member: TeamMember) => {
		setSelectedMember(member);
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleDelete = (member: TeamMember) => {
		setSelectedMember(member);
		setMutationError(null);
		setDeleteDialogOpen(true);
	};

	const handleResendInvite = async (member: TeamMember) => {
		setMutationError(null);
		try {
			await resendMutation.mutateAsync(member.id);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'Failed to resend invite');
		}
	};

	const handleFormSubmit = async (data: { name: string; email: string }) => {
		setMutationError(null);
		try {
			if (selectedMember) {
				await updateMutation.mutateAsync({ id: selectedMember.id, ...data });
			} else {
				await inviteMutation.mutateAsync(data);
			}
			setFormDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleDeleteConfirm = async () => {
		if (!selectedMember) return;
		setMutationError(null);
		try {
			await deleteMutation.mutateAsync(selectedMember.id);
			setDeleteDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Team Management</h2>
					<p className="text-muted-foreground mt-1">
						Manage your team members
					</p>
				</div>
				<div className="text-muted-foreground">Loading team members...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className="mb-6">
					<h2 className="text-2xl font-bold">Team Management</h2>
					<p className="text-muted-foreground mt-1">
						Manage your team members
					</p>
				</div>
				<div className="text-destructive">
					Error loading team: {error.message}
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Team Management</h2>
				<p className="text-muted-foreground mt-1">
					Manage your team members
				</p>
			</div>

			<div className="flex justify-between items-center mb-4">
				<h3 className="text-xl font-semibold">Team Members</h3>
				<Button onClick={handleInvite}>Invite Member</Button>
			</div>

			{mutationError && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
					{mutationError}
				</div>
			)}

			{resendMutation.isSuccess && (
				<div className="bg-green-500/10 text-green-600 px-4 py-2 rounded mb-4">
					Invitation resent successfully!
				</div>
			)}

			{members && members.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">
					No team members yet. Invite your first team member to get started.
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Joined</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{members?.map((member) => (
								<TableRow key={member.id}>
									<TableCell className="font-medium">
										{member.name}
										{member.id === currentUserId && (
											<span className="ml-2 text-xs text-muted-foreground">
												(you)
											</span>
										)}
									</TableCell>
									<TableCell>{member.email}</TableCell>
									<TableCell>
										{member.emailVerified ? (
											<Badge variant="default">Active</Badge>
										) : (
											<Badge variant="secondary">Pending</Badge>
										)}
									</TableCell>
									<TableCell>
										{new Date(member.createdAt).toLocaleDateString()}
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="sm">
													...
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => handleEdit(member)}>
													Edit
												</DropdownMenuItem>
												{!member.emailVerified && (
													<DropdownMenuItem
														onClick={() => handleResendInvite(member)}
														disabled={resendMutation.isPending}
													>
														Resend Invite
													</DropdownMenuItem>
												)}
												{member.id !== currentUserId && (
													<DropdownMenuItem
														onClick={() => handleDelete(member)}
														className="text-destructive"
													>
														Remove
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

			<InviteMemberDialog
				open={formDialogOpen}
				onOpenChange={setFormDialogOpen}
				onSubmit={handleFormSubmit}
				member={selectedMember}
				isLoading={inviteMutation.isPending || updateMutation.isPending}
				error={mutationError}
			/>

			<DeleteConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDeleteConfirm}
				title="Remove Team Member"
				description={`Are you sure you want to remove "${selectedMember?.name}" from your team? This action cannot be undone.`}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
