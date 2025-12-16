import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://localhost:3000';

export type ProductComponent = {
	id: string;
	productId: string;
	componentType: string;
	name: string | null;
	quantity: number;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type CreateProductComponentInput = {
	componentType: string;
	name?: string | null;
	quantity?: number;
};

export type UpdateProductComponentInput = {
	componentType?: string;
	name?: string | null;
	quantity?: number;
	sortOrder?: number;
};

type ListResponse = {
	components: ProductComponent[];
};

type ItemResponse = {
	component: ProductComponent;
};

async function fetchComponents(productId: string): Promise<ProductComponent[]> {
	const response = await fetch(`${API_URL}/api/tenant/products/${productId}/components`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch components');
	}

	const data: ListResponse = await response.json();
	return data.components;
}

async function createComponent({
	productId,
	...input
}: CreateProductComponentInput & { productId: string }): Promise<ProductComponent> {
	const response = await fetch(`${API_URL}/api/tenant/products/${productId}/components`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create component');
	}

	const data: ItemResponse = await response.json();
	return data.component;
}

async function updateComponent({
	id,
	...input
}: UpdateProductComponentInput & { id: string }): Promise<ProductComponent> {
	const response = await fetch(`${API_URL}/api/tenant/product-components/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update component');
	}

	const data: ItemResponse = await response.json();
	return data.component;
}

async function deleteComponent(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/product-components/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete component');
	}
}

export function useProductComponentsQuery(productId: string | undefined) {
	return useQuery({
		queryKey: ['product-components', productId],
		queryFn: () => fetchComponents(productId!),
		enabled: !!productId,
	});
}

export function useCreateProductComponentMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createComponent,
		onSuccess: (component) => {
			queryClient.invalidateQueries({ queryKey: ['product-components', component.productId] });
			queryClient.invalidateQueries({ queryKey: ['product', component.productId] });
		},
	});
}

export function useUpdateProductComponentMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateComponent,
		onSuccess: (component) => {
			queryClient.invalidateQueries({ queryKey: ['product-components', component.productId] });
			queryClient.invalidateQueries({ queryKey: ['product', component.productId] });
		},
	});
}

export function useDeleteProductComponentMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteComponent,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['product-components'] });
			queryClient.invalidateQueries({ queryKey: ['product'] });
		},
	});
}
