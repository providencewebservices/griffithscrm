import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LetteringCost } from './use-lettering-costs';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type LetteringTechnique = {
	id: string;
	tenantId: string;
	name: string;
	isActive: boolean;
	sortOrder: number;
	costCount: number;
	priceMin: string | null;
	priceMax: string | null;
	colorCount: number;
	createdAt: string;
	updatedAt: string;
};

export type LetteringTechniqueWithCosts = Omit<LetteringTechnique, 'costCount'> & {
	costs: LetteringCost[];
};

export type CreateLetteringTechniqueInput = {
	name: string;
};

export type UpdateLetteringTechniqueInput = {
	name?: string;
	isActive?: boolean;
};

type ListResponse = {
	letteringTechniques: LetteringTechnique[];
};

type ItemResponse = {
	letteringTechnique: LetteringTechnique;
};

async function fetchLetteringTechniques(): Promise<LetteringTechnique[]> {
	const response = await fetch(`${API_URL}/api/tenant/lettering-techniques`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch lettering techniques');
	}

	const data: ListResponse = await response.json();
	return data.letteringTechniques;
}

async function fetchLetteringTechnique(id: string): Promise<LetteringTechniqueWithCosts> {
	const response = await fetch(`${API_URL}/api/tenant/lettering-techniques/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch lettering technique');
	}

	const data: { letteringTechnique: LetteringTechniqueWithCosts } = await response.json();
	return data.letteringTechnique;
}

async function createLetteringTechnique(
	input: CreateLetteringTechniqueInput,
): Promise<LetteringTechnique> {
	const response = await fetch(`${API_URL}/api/tenant/lettering-techniques`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create lettering technique');
	}

	const data: ItemResponse = await response.json();
	return data.letteringTechnique;
}

async function updateLetteringTechnique({
	id,
	...input
}: UpdateLetteringTechniqueInput & { id: string }): Promise<LetteringTechnique> {
	const response = await fetch(`${API_URL}/api/tenant/lettering-techniques/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update lettering technique');
	}

	const data: ItemResponse = await response.json();
	return data.letteringTechnique;
}

async function deleteLetteringTechnique(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/lettering-techniques/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete lettering technique');
	}
}

export function useLetteringTechniquesQuery() {
	return useQuery({
		queryKey: ['lettering-techniques'],
		queryFn: fetchLetteringTechniques,
	});
}

export function useLetteringTechniqueQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['lettering-technique', id],
		queryFn: () => fetchLetteringTechnique(id!),
		enabled: !!id,
	});
}

export function useCreateLetteringTechniqueMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createLetteringTechnique,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['lettering-techniques'] });
		},
	});
}

export function useUpdateLetteringTechniqueMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateLetteringTechnique,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['lettering-techniques'] });
			queryClient.invalidateQueries({ queryKey: ['lettering-technique', variables.id] });
		},
	});
}

export function useDeleteLetteringTechniqueMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteLetteringTechnique,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['lettering-techniques'] });
		},
	});
}
