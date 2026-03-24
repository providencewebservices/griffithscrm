import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type Sundry = {
	id: string;
	tenantId: string;
	supplierId: string | null;
	name: string;
	description: string | null;
	price: string;
	imageUrl: string | null;
	isActive: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
	supplierName: string | null;
};

export type CreateSundryInput = {
	name: string;
	description?: string;
	price: number;
	supplierId?: string | null;
	imageUrl?: string | null;
};

export type UpdateSundryInput = {
	name?: string;
	description?: string | null;
	price?: number;
	supplierId?: string | null;
	imageUrl?: string | null;
	isActive?: boolean;
};

type ListResponse = {
	sundries: Sundry[];
};

type ItemResponse = {
	sundry: Sundry;
};

async function fetchSundry(id: string): Promise<Sundry> {
	const response = await fetch(`${API_URL}/api/tenant/sundries/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch sundry');
	}

	const data: ItemResponse = await response.json();
	return data.sundry;
}

async function fetchSundries(): Promise<Sundry[]> {
	const response = await fetch(`${API_URL}/api/tenant/sundries`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch sundries');
	}

	const data: ListResponse = await response.json();
	return data.sundries;
}

async function createSundry(input: CreateSundryInput): Promise<Sundry> {
	const response = await fetch(`${API_URL}/api/tenant/sundries`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create sundry');
	}

	const data: ItemResponse = await response.json();
	return data.sundry;
}

async function updateSundry({ id, ...input }: UpdateSundryInput & { id: string }): Promise<Sundry> {
	const response = await fetch(`${API_URL}/api/tenant/sundries/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update sundry');
	}

	const data: ItemResponse = await response.json();
	return data.sundry;
}

async function deleteSundry(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/sundries/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete sundry');
	}
}

export function useSundriesQuery() {
	return useQuery({
		queryKey: ['sundries'],
		queryFn: fetchSundries,
	});
}

export function useSundryQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['sundry', id],
		queryFn: () => fetchSundry(id!),
		enabled: !!id,
	});
}

export function useCreateSundryMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createSundry,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sundries'] });
		},
	});
}

export function useUpdateSundryMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateSundry,
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['sundries'] });
			queryClient.invalidateQueries({ queryKey: ['sundry', variables.id] });
		},
	});
}

export function useDeleteSundryMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteSundry,
		onSuccess: (_data, id) => {
			queryClient.invalidateQueries({ queryKey: ['sundries'] });
			queryClient.invalidateQueries({ queryKey: ['sundry', id] });
		},
	});
}
