import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product } from './use-products';

const API_URL = 'http://localhost:3000';

export type ProductCategory = {
	id: string;
	name: string;
	description: string | null;
	imageUrl: string | null;
	sortOrder: number;
	productCount: number;
	createdAt: string;
	updatedAt: string;
};

export type ProductCategoryWithProducts = Omit<ProductCategory, 'productCount'> & {
	products: Product[];
};

export type CreateProductCategoryInput = {
	name: string;
	description?: string;
	imageUrl?: string | null;
};

export type UpdateProductCategoryInput = {
	name?: string;
	description?: string | null;
	imageUrl?: string | null;
};

type ListResponse = {
	categories: ProductCategory[];
};

type ItemResponse = {
	category: ProductCategory;
};

async function fetchCategories(): Promise<ProductCategory[]> {
	const response = await fetch(`${API_URL}/api/tenant/product-categories`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch categories');
	}

	const data: ListResponse = await response.json();
	return data.categories;
}

async function fetchCategory(id: string): Promise<ProductCategoryWithProducts> {
	const response = await fetch(`${API_URL}/api/tenant/product-categories/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch category');
	}

	const data: { category: ProductCategoryWithProducts } = await response.json();
	return data.category;
}

async function createCategory(input: CreateProductCategoryInput): Promise<ProductCategory> {
	const response = await fetch(`${API_URL}/api/tenant/product-categories`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create category');
	}

	const data: ItemResponse = await response.json();
	return data.category;
}

async function updateCategory({
	id,
	...input
}: UpdateProductCategoryInput & { id: string }): Promise<ProductCategory> {
	const response = await fetch(`${API_URL}/api/tenant/product-categories/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update category');
	}

	const data: ItemResponse = await response.json();
	return data.category;
}

async function deleteCategory(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/product-categories/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete category');
	}
}

export function useProductCategoriesQuery() {
	return useQuery({
		queryKey: ['product-categories'],
		queryFn: fetchCategories,
	});
}

export function useProductCategoryQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['product-category', id],
		queryFn: () => fetchCategory(id!),
		enabled: !!id,
	});
}

export function useCreateProductCategoryMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createCategory,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['product-categories'] });
		},
	});
}

export function useUpdateProductCategoryMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateCategory,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['product-categories'] });
		},
	});
}

export function useDeleteProductCategoryMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteCategory,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['product-categories'] });
		},
	});
}
