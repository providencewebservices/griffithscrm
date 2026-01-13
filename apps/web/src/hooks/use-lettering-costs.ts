import { useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type LetteringCostAppliesTo = 'new_memorial' | 'refurbishment' | 'both';

export type LetteringCost = {
	id: string;
	techniqueId: string;
	colorId: string | null;
	appliesTo: LetteringCostAppliesTo;
	freeLetters: number;
	pricePerLetter: string;
	createdAt: string;
	updatedAt: string;
};

export type CreateLetteringCostInput = {
	techniqueId: string;
	colorId?: string | null;
	appliesTo: LetteringCostAppliesTo;
	freeLetters: number;
	pricePerLetter: number;
};

export type UpdateLetteringCostInput = {
	colorId?: string | null;
	appliesTo?: LetteringCostAppliesTo;
	freeLetters?: number;
	pricePerLetter?: number;
};

type ItemResponse = {
	letteringCost: LetteringCost;
};

async function createLetteringCost(input: CreateLetteringCostInput): Promise<LetteringCost> {
	const response = await fetch(`${API_URL}/api/tenant/lettering-costs`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create lettering cost');
	}

	const data: ItemResponse = await response.json();
	return data.letteringCost;
}

async function updateLetteringCost({
	id,
	...input
}: UpdateLetteringCostInput & { id: string }): Promise<LetteringCost> {
	const response = await fetch(`${API_URL}/api/tenant/lettering-costs/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update lettering cost');
	}

	const data: ItemResponse = await response.json();
	return data.letteringCost;
}

async function deleteLetteringCost(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/lettering-costs/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete lettering cost');
	}
}

export function useCreateLetteringCostMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createLetteringCost,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['lettering-technique', data.techniqueId] });
			queryClient.invalidateQueries({ queryKey: ['lettering-techniques'] });
		},
	});
}

export function useUpdateLetteringCostMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateLetteringCost,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['lettering-technique', data.techniqueId] });
		},
	});
}

export function useDeleteLetteringCostMutation(techniqueId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteLetteringCost,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['lettering-technique', techniqueId] });
			queryClient.invalidateQueries({ queryKey: ['lettering-techniques'] });
		},
	});
}
