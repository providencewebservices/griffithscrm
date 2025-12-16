import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://localhost:3000';

export type OptionChoice = {
	id: string;
	optionId: string;
	name: string;
	priceAdjustment: string;
	imageUrl: string | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type CreateOptionChoiceInput = {
	name: string;
	priceAdjustment?: number;
};

export type UpdateOptionChoiceInput = {
	name?: string;
	priceAdjustment?: number;
	imageUrl?: string | null;
	sortOrder?: number;
};

type ListResponse = {
	choices: OptionChoice[];
};

type ItemResponse = {
	choice: OptionChoice;
};

async function fetchChoices(optionId: string): Promise<OptionChoice[]> {
	const response = await fetch(`${API_URL}/api/tenant/product-options/${optionId}/choices`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch choices');
	}

	const data: ListResponse = await response.json();
	return data.choices;
}

async function createChoice({
	optionId,
	...input
}: CreateOptionChoiceInput & { optionId: string }): Promise<OptionChoice> {
	const response = await fetch(`${API_URL}/api/tenant/product-options/${optionId}/choices`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create choice');
	}

	const data: ItemResponse = await response.json();
	return data.choice;
}

async function updateChoice({
	id,
	...input
}: UpdateOptionChoiceInput & { id: string }): Promise<OptionChoice> {
	const response = await fetch(`${API_URL}/api/tenant/option-choices/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update choice');
	}

	const data: ItemResponse = await response.json();
	return data.choice;
}

async function deleteChoice(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/option-choices/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete choice');
	}
}

export function useOptionChoicesQuery(optionId: string | undefined) {
	return useQuery({
		queryKey: ['option-choices', optionId],
		queryFn: () => fetchChoices(optionId!),
		enabled: !!optionId,
	});
}

export function useCreateOptionChoiceMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createChoice,
		onSuccess: (choice) => {
			queryClient.invalidateQueries({ queryKey: ['option-choices', choice.optionId] });
			queryClient.invalidateQueries({ queryKey: ['product-options'] });
			queryClient.invalidateQueries({ queryKey: ['product'] });
		},
	});
}

export function useUpdateOptionChoiceMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateChoice,
		onSuccess: (choice) => {
			queryClient.invalidateQueries({ queryKey: ['option-choices', choice.optionId] });
			queryClient.invalidateQueries({ queryKey: ['product-options'] });
			queryClient.invalidateQueries({ queryKey: ['product'] });
		},
	});
}

export function useDeleteOptionChoiceMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteChoice,
		onSuccess: () => {
			// Invalidate all related queries
			queryClient.invalidateQueries({ queryKey: ['option-choices'] });
			queryClient.invalidateQueries({ queryKey: ['product-options'] });
			queryClient.invalidateQueries({ queryKey: ['product'] });
		},
	});
}
