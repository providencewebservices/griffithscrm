import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type Tenant = {
	id: string;
	name: string;
	slug: string;
	createdAt: string;
	updatedAt: string;
};

type TenantsResponse = {
	tenants: Tenant[];
};

type TenantResponse = {
	tenant: Tenant;
};

type CreateTenantInput = {
	name: string;
	slug: string;
};

type UpdateTenantInput = {
	name?: string;
	slug?: string;
};

async function fetchTenants(): Promise<Tenant[]> {
	const response = await fetch(`${API_URL}/api/admin/tenants`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch tenants');
	}

	const data: TenantsResponse = await response.json();
	return data.tenants;
}

async function createTenant(input: CreateTenantInput): Promise<Tenant> {
	const response = await fetch(`${API_URL}/api/admin/tenants`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create tenant');
	}

	const data: TenantResponse = await response.json();
	return data.tenant;
}

async function updateTenant({ id, ...input }: UpdateTenantInput & { id: string }): Promise<Tenant> {
	const response = await fetch(`${API_URL}/api/admin/tenants/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update tenant');
	}

	const data: TenantResponse = await response.json();
	return data.tenant;
}

async function deleteTenant(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/admin/tenants/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete tenant');
	}
}

export function useTenantsQuery() {
	return useQuery({
		queryKey: ['tenants'],
		queryFn: fetchTenants,
	});
}

export function useCreateTenantMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createTenant,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tenants'] });
		},
	});
}

export function useUpdateTenantMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateTenant,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tenants'] });
		},
	});
}

export function useDeleteTenantMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteTenant,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tenants'] });
		},
	});
}
