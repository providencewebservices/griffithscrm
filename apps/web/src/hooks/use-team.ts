import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://localhost:3000';

export type TeamMember = {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	createdAt: string;
};

type TeamMembersResponse = {
	users: TeamMember[];
};

type TeamMemberResponse = {
	user: TeamMember;
	message?: string;
};

export type InviteUserInput = {
	name: string;
	email: string;
};

type UpdateUserInput = {
	name?: string;
	email?: string;
};

async function fetchTeamMembers(): Promise<TeamMember[]> {
	const response = await fetch(`${API_URL}/api/team/users`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch team members');
	}

	const data: TeamMembersResponse = await response.json();
	return data.users;
}

async function inviteUser(input: InviteUserInput): Promise<TeamMember> {
	const response = await fetch(`${API_URL}/api/team/users`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to invite user');
	}

	const data: TeamMemberResponse = await response.json();
	return data.user;
}

async function updateTeamMember({
	id,
	...input
}: UpdateUserInput & { id: string }): Promise<TeamMember> {
	const response = await fetch(`${API_URL}/api/team/users/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update team member');
	}

	const data: TeamMemberResponse = await response.json();
	return data.user;
}

async function deleteTeamMember(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/team/users/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete team member');
	}
}

async function resendInvite(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/team/users/${id}/resend-invite`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to resend invite');
	}
}

export function useTeamQuery() {
	return useQuery({
		queryKey: ['team'],
		queryFn: fetchTeamMembers,
	});
}

export function useInviteUserMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: inviteUser,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['team'] });
		},
	});
}

export function useUpdateTeamMemberMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateTeamMember,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['team'] });
		},
	});
}

export function useDeleteTeamMemberMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteTeamMember,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['team'] });
		},
	});
}

export function useResendInviteMutation() {
	return useMutation({
		mutationFn: resendInvite,
	});
}
