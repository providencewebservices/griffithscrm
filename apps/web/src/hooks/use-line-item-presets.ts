import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type LineItemPreset = {
	id: string;
	tenantId: string;
	name: string;
	defaultPrice: string;
	vatExempt: boolean;
	visibleToCustomer: boolean;
	priceVisibleToCustomer: boolean;
	isActive: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type CreateLineItemPresetInput = {
	name: string;
	defaultPrice: number;
	vatExempt?: boolean;
	visibleToCustomer?: boolean;
	priceVisibleToCustomer?: boolean;
};

export type UpdateLineItemPresetInput = {
	name?: string;
	defaultPrice?: number;
	vatExempt?: boolean;
	visibleToCustomer?: boolean;
	priceVisibleToCustomer?: boolean;
	isActive?: boolean;
};

type ListResponse = {
	presets: LineItemPreset[];
};

type ItemResponse = {
	preset: LineItemPreset;
};

async function fetchLineItemPresets(): Promise<LineItemPreset[]> {
	const response = await fetch(`${API_URL}/api/tenant/line-item-presets`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch line item presets');
	}

	const data: ListResponse = await response.json();
	return data.presets;
}

async function createLineItemPreset(input: CreateLineItemPresetInput): Promise<LineItemPreset> {
	const response = await fetch(`${API_URL}/api/tenant/line-item-presets`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create line item preset');
	}

	const data: ItemResponse = await response.json();
	return data.preset;
}

async function updateLineItemPreset({
	id,
	...input
}: UpdateLineItemPresetInput & { id: string }): Promise<LineItemPreset> {
	const response = await fetch(`${API_URL}/api/tenant/line-item-presets/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update line item preset');
	}

	const data: ItemResponse = await response.json();
	return data.preset;
}

async function deleteLineItemPreset(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/line-item-presets/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete line item preset');
	}
}

export function useLineItemPresetsQuery() {
	return useQuery({
		queryKey: ['line-item-presets'],
		queryFn: fetchLineItemPresets,
	});
}

export function useCreateLineItemPresetMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createLineItemPreset,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['line-item-presets'] });
		},
	});
}

export function useUpdateLineItemPresetMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateLineItemPreset,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['line-item-presets'] });
		},
	});
}

export function useDeleteLineItemPresetMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteLineItemPreset,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['line-item-presets'] });
		},
	});
}
