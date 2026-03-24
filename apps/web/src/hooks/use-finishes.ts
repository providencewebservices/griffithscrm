import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type Finish = {
	id: string;
	tenantId: string;
	name: string;
	isActive: boolean;
	sortOrder: number;
	usageCount: number;
	createdAt: string;
	updatedAt: string;
};

export type CreateFinishInput = {
	name: string;
	isActive?: boolean;
};

export type UpdateFinishInput = {
	name?: string;
	isActive?: boolean;
};

type ListResponse = {
	finishes: Finish[];
};

type ItemResponse = {
	finish: Finish;
};

async function fetchFinishes(): Promise<Finish[]> {
	const response = await fetch(`${API_URL}/api/tenant/finishes`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch finishes');
	}

	const data: ListResponse = await response.json();
	return data.finishes;
}

async function createFinish(input: CreateFinishInput): Promise<Finish> {
	const response = await fetch(`${API_URL}/api/tenant/finishes`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create finish');
	}

	const data: ItemResponse = await response.json();
	return data.finish;
}

async function updateFinish({ id, ...input }: UpdateFinishInput & { id: string }): Promise<Finish> {
	const response = await fetch(`${API_URL}/api/tenant/finishes/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update finish');
	}

	const data: ItemResponse = await response.json();
	return data.finish;
}

async function deleteFinish(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/finishes/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete finish');
	}
}

export function useFinishesQuery() {
	return useQuery({
		queryKey: ['finishes'],
		queryFn: fetchFinishes,
	});
}

export function useCreateFinishMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createFinish,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['finishes'] });
		},
	});
}

export function useUpdateFinishMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateFinish,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['finishes'] });
		},
	});
}

export function useDeleteFinishMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteFinish,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['finishes'] });
		},
	});
}
