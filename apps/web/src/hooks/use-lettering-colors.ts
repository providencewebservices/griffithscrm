import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type LetteringColor = {
	id: string;
	tenantId: string;
	name: string;
	isActive: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type CreateLetteringColorInput = {
	name: string;
};

export type UpdateLetteringColorInput = {
	name?: string;
	isActive?: boolean;
};

type ListResponse = {
	letteringColors: LetteringColor[];
};

type ItemResponse = {
	letteringColor: LetteringColor;
};

async function fetchLetteringColors(): Promise<LetteringColor[]> {
	const response = await fetch(`${API_URL}/api/tenant/lettering-colors`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch lettering colors');
	}

	const data: ListResponse = await response.json();
	return data.letteringColors;
}

async function createLetteringColor(
	input: CreateLetteringColorInput
): Promise<LetteringColor> {
	const response = await fetch(`${API_URL}/api/tenant/lettering-colors`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create lettering color');
	}

	const data: ItemResponse = await response.json();
	return data.letteringColor;
}

async function updateLetteringColor({
	id,
	...input
}: UpdateLetteringColorInput & { id: string }): Promise<LetteringColor> {
	const response = await fetch(`${API_URL}/api/tenant/lettering-colors/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update lettering color');
	}

	const data: ItemResponse = await response.json();
	return data.letteringColor;
}

async function deleteLetteringColor(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/lettering-colors/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete lettering color');
	}
}

export function useLetteringColorsQuery() {
	return useQuery({
		queryKey: ['lettering-colors'],
		queryFn: fetchLetteringColors,
	});
}

export function useCreateLetteringColorMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createLetteringColor,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['lettering-colors'] });
		},
	});
}

export function useUpdateLetteringColorMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateLetteringColor,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['lettering-colors'] });
		},
	});
}

export function useDeleteLetteringColorMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteLetteringColor,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['lettering-colors'] });
		},
	});
}
