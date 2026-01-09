import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type DimensionComboValue = {
	id: string;
	comboId: string;
	productComponentId: string;
	dimension1: string;
	dimension2: string;
	dimension3: string;
	createdAt: string;
	updatedAt: string;
	// Joined from productComponents
	componentType: string;
	componentName: string | null;
	componentQuantity: number;
};

export type DimensionCombo = {
	id: string;
	productId: string;
	name: string | null;
	priceAdjustment: string;
	isActive: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
	values: DimensionComboValue[];
};

export type DimensionValueInput = {
	productComponentId: string;
	dimension1: number;
	dimension2: number;
	dimension3: number;
};

export type CreateDimensionComboInput = {
	name?: string | null;
	priceAdjustment?: number;
	values: DimensionValueInput[];
};

export type UpdateDimensionComboInput = {
	name?: string | null;
	priceAdjustment?: number;
	isActive?: boolean;
	sortOrder?: number;
	values?: DimensionValueInput[];
};

type ListResponse = {
	combos: DimensionCombo[];
};

type ItemResponse = {
	combo: DimensionCombo;
};

async function fetchCombos(productId: string): Promise<DimensionCombo[]> {
	const response = await fetch(`${API_URL}/api/tenant/products/${productId}/dimension-combos`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch dimension combos');
	}

	const data: ListResponse = await response.json();
	return data.combos;
}

async function fetchCombo(id: string): Promise<DimensionCombo> {
	const response = await fetch(`${API_URL}/api/tenant/dimension-combos/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch dimension combo');
	}

	const data: ItemResponse = await response.json();
	return data.combo;
}

async function createCombo({
	productId,
	...input
}: CreateDimensionComboInput & { productId: string }): Promise<DimensionCombo> {
	const response = await fetch(`${API_URL}/api/tenant/products/${productId}/dimension-combos`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create dimension combo');
	}

	const data: ItemResponse = await response.json();
	return data.combo;
}

async function updateCombo({
	id,
	...input
}: UpdateDimensionComboInput & { id: string }): Promise<DimensionCombo> {
	const response = await fetch(`${API_URL}/api/tenant/dimension-combos/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update dimension combo');
	}

	const data: ItemResponse = await response.json();
	return data.combo;
}

async function deleteCombo(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/dimension-combos/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete dimension combo');
	}
}

export function useDimensionCombosQuery(productId: string | undefined) {
	return useQuery({
		queryKey: ['dimension-combos', productId],
		queryFn: () => fetchCombos(productId!),
		enabled: !!productId,
	});
}

export function useDimensionComboQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['dimension-combo', id],
		queryFn: () => fetchCombo(id!),
		enabled: !!id,
	});
}

export function useCreateDimensionComboMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createCombo,
		onSuccess: (combo) => {
			queryClient.invalidateQueries({ queryKey: ['dimension-combos', combo.productId] });
			queryClient.invalidateQueries({ queryKey: ['product', combo.productId] });
		},
	});
}

export function useUpdateDimensionComboMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateCombo,
		onSuccess: (combo) => {
			queryClient.invalidateQueries({ queryKey: ['dimension-combos', combo.productId] });
			queryClient.invalidateQueries({ queryKey: ['dimension-combo', combo.id] });
			queryClient.invalidateQueries({ queryKey: ['product', combo.productId] });
		},
	});
}

export function useDeleteDimensionComboMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteCombo,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['dimension-combos'] });
			queryClient.invalidateQueries({ queryKey: ['product'] });
		},
	});
}
