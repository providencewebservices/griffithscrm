import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type ProductOptionType = 'dimension' | 'stone_color' | 'flower_holes' | 'custom';

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

export type ProductOption = {
	id: string;
	productId: string;
	name: string;
	type: ProductOptionType;
	isRequired: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
	choices: OptionChoice[];
};

export type CreateProductOptionInput = {
	name: string;
	type: ProductOptionType;
	isRequired?: boolean;
};

export type UpdateProductOptionInput = {
	name?: string;
	type?: ProductOptionType;
	isRequired?: boolean;
	sortOrder?: number;
};

type ListResponse = {
	options: ProductOption[];
};

type ItemResponse = {
	option: ProductOption;
};

async function fetchOptions(productId: string): Promise<ProductOption[]> {
	const response = await fetch(`${API_URL}/api/tenant/products/${productId}/options`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch options');
	}

	const data: ListResponse = await response.json();
	return data.options;
}

async function createOption({
	productId,
	...input
}: CreateProductOptionInput & { productId: string }): Promise<ProductOption> {
	const response = await fetch(`${API_URL}/api/tenant/products/${productId}/options`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create option');
	}

	const data: ItemResponse = await response.json();
	return data.option;
}

async function updateOption({
	id,
	...input
}: UpdateProductOptionInput & { id: string }): Promise<ProductOption> {
	const response = await fetch(`${API_URL}/api/tenant/product-options/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update option');
	}

	const data: ItemResponse = await response.json();
	return data.option;
}

async function deleteOption(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/product-options/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete option');
	}
}

export function useProductOptionsQuery(productId: string | undefined) {
	return useQuery({
		queryKey: ['product-options', productId],
		queryFn: () => fetchOptions(productId!),
		enabled: !!productId,
	});
}

export function useCreateProductOptionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createOption,
		onSuccess: (option) => {
			queryClient.invalidateQueries({ queryKey: ['product-options', option.productId] });
			queryClient.invalidateQueries({ queryKey: ['product', option.productId] });
		},
	});
}

export function useUpdateProductOptionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateOption,
		onSuccess: (option) => {
			queryClient.invalidateQueries({ queryKey: ['product-options', option.productId] });
			queryClient.invalidateQueries({ queryKey: ['product', option.productId] });
		},
	});
}

export function useDeleteProductOptionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteOption,
		onSuccess: (_, id) => {
			// We need to invalidate all product-options queries since we don't know the productId
			queryClient.invalidateQueries({ queryKey: ['product-options'] });
			queryClient.invalidateQueries({ queryKey: ['product'] });
		},
	});
}
