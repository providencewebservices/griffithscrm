import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://localhost:3000';

export type User = {
	id: string;
	name: string;
	email: string;
	role: 'app_admin' | 'tenant_user';
	tenantId: string | null;
	createdAt: string;
};

type UsersResponse = {
	users: User[];
};

type UserResponse = {
	user: User;
};

export type CreateUserInput = {
	name: string;
	email: string;
	role: 'app_admin' | 'tenant_user';
	tenantId?: string;
};

type UpdateUserInput = {
	name?: string;
	email?: string;
	password?: string;
	role?: 'app_admin' | 'tenant_user';
	tenantId?: string | null;
};

async function fetchUsers(tenantId?: string): Promise<User[]> {
	const url = new URL(`${API_URL}/api/admin/users`);
	if (tenantId) {
		url.searchParams.set('tenantId', tenantId);
	}

	const response = await fetch(url.toString(), {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch users');
	}

	const data: UsersResponse = await response.json();
	return data.users;
}

async function createUser(input: CreateUserInput): Promise<User> {
	const response = await fetch(`${API_URL}/api/admin/users`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create user');
	}

	const data: UserResponse = await response.json();
	return data.user;
}

async function updateUser({
	id,
	...input
}: UpdateUserInput & { id: string }): Promise<User> {
	const response = await fetch(`${API_URL}/api/admin/users/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update user');
	}

	const data: UserResponse = await response.json();
	return data.user;
}

async function deleteUser(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/admin/users/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete user');
	}
}

export function useUsersQuery(tenantId?: string) {
	return useQuery({
		queryKey: ['users', tenantId],
		queryFn: () => fetchUsers(tenantId),
	});
}

export function useCreateUserMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createUser,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] });
		},
	});
}

export function useUpdateUserMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateUser,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] });
		},
	});
}

export function useDeleteUserMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteUser,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] });
		},
	});
}
