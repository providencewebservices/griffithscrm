import { Calendar, LayoutGrid, List, Mail, Plus, Search, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { InviteMemberDialog } from '@/components/customer/invite-member-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { type TeamMember, useInviteUserMutation, useTeamQuery } from '@/hooks/use-team';
import { useSession } from '@/lib/auth';
import { getAvatarColor, getInitials } from '@/lib/avatar-utils';

type DisplayMode = 'table' | 'cards';

export function TeamPage() {
	const { data: session } = useSession();
	const { data: members, isLoading, error } = useTeamQuery();
	const inviteMutation = useInviteUserMutation();

	const [formDialogOpen, setFormDialogOpen] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');

	const currentUserId = session?.user?.id;

	const filteredMembers = members?.filter((member) => {
		if (!searchQuery) return true;
		const query = searchQuery.toLowerCase();
		return member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query);
	});

	const handleInvite = () => {
		setMutationError(null);
		setFormDialogOpen(true);
	};

	const handleFormSubmit = async (data: { name: string; email: string }) => {
		setMutationError(null);
		try {
			await inviteMutation.mutateAsync(data);
			setFormDialogOpen(false);
		} catch (err) {
			setMutationError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	};

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold">Team</h2>
				<p className="text-muted-foreground mt-1">
					{members
						? `${members.length} member${members.length !== 1 ? 's' : ''}`
						: 'Manage your team members'}
				</p>
			</div>

			{isLoading ? (
				<div className="text-muted-foreground">Loading team members...</div>
			) : error ? (
				<div className="text-destructive">Error loading team: {error.message}</div>
			) : (
				<>
					<div className="flex justify-between items-center mb-4 gap-4">
						<div className="relative flex-1 max-w-md">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by name or email..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9"
							/>
						</div>
						<div className="flex items-center gap-2">
							<div className="flex items-center border rounded-md">
								<Button
									variant={displayMode === 'table' ? 'secondary' : 'ghost'}
									size="sm"
									className="rounded-r-none"
									onClick={() => setDisplayMode('table')}
								>
									<List className="h-4 w-4" />
								</Button>
								<Button
									variant={displayMode === 'cards' ? 'secondary' : 'ghost'}
									size="sm"
									className="rounded-l-none"
									onClick={() => setDisplayMode('cards')}
								>
									<LayoutGrid className="h-4 w-4" />
								</Button>
							</div>
							<Button onClick={handleInvite}>
								<Plus className="h-4 w-4 mr-2" />
								Invite Member
							</Button>
						</div>
					</div>

					{mutationError && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded mb-4">
							{mutationError}
						</div>
					)}

					{filteredMembers && filteredMembers.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground border rounded-lg">
							<Users className="h-12 w-12 mx-auto opacity-50 mb-3" />
							<p>
								{searchQuery
									? 'No team members found matching your search.'
									: 'No team members yet. Invite your first team member to get started.'}
							</p>
						</div>
					) : displayMode === 'table' ? (
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
									{filteredMembers?.map((member) => (
										<TableRow key={member.id}>
											<TableCell className="font-medium">
												<div className="flex items-center gap-3">
													<div
														className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
														style={{ backgroundColor: getAvatarColor(member.name) }}
													>
														{getInitials(member.name)}
													</div>
													<span>
														{member.name}
														{member.id === currentUserId && (
															<Badge variant="outline" className="ml-2 text-xs">
																You
															</Badge>
														)}
													</span>
												</div>
											</TableCell>
											<TableCell>{member.email}</TableCell>
											<TableCell>
												{member.emailVerified ? (
													<Badge variant="default">Active</Badge>
												) : (
													<Badge variant="secondary">Pending</Badge>
												)}
											</TableCell>
											<TableCell>{formatDate(member.createdAt)}</TableCell>
											<TableCell>
												<Link to={`/app/team/${member.id}`}>
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
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{filteredMembers?.map((member) => (
								<TeamMemberCard
									key={member.id}
									member={member}
									isCurrentUser={member.id === currentUserId}
									formatDate={formatDate}
								/>
							))}
						</div>
					)}
				</>
			)}

			<InviteMemberDialog
				open={formDialogOpen}
				onOpenChange={setFormDialogOpen}
				onSubmit={handleFormSubmit}
				isLoading={inviteMutation.isPending}
				error={mutationError}
			/>
		</div>
	);
}

function TeamMemberCard({
	member,
	isCurrentUser,
	formatDate,
}: {
	member: TeamMember;
	isCurrentUser: boolean;
	formatDate: (dateString: string) => string;
}) {
	return (
		<Link to={`/app/team/${member.id}`} className="block">
			<Card className="hover:shadow-md transition-shadow">
				<CardHeader className="pb-3">
					<div className="flex items-center gap-3">
						<div
							className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
							style={{ backgroundColor: getAvatarColor(member.name) }}
						>
							{getInitials(member.name)}
						</div>
						<div className="flex-1 min-w-0">
							<CardTitle className="text-base flex items-center gap-2">
								<span className="truncate">{member.name}</span>
								{isCurrentUser && (
									<Badge variant="outline" className="text-xs shrink-0">
										You
									</Badge>
								)}
							</CardTitle>
						</div>
						{member.emailVerified ? (
							<Badge variant="default" className="shrink-0">
								Active
							</Badge>
						) : (
							<Badge variant="secondary" className="shrink-0">
								Pending
							</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-2">
					<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
						<Mail className="h-3.5 w-3.5" />
						<span className="truncate">{member.email}</span>
					</div>
					<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
						<Calendar className="h-3.5 w-3.5" />
						<span>Joined {formatDate(member.createdAt)}</span>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
