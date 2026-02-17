import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type SupplierCategory = {
	id: string;
	tenantId: string;
	collectionId: string;
	name: string;
	description: string | null;
	imageUrl: string | null;
	sortOrder: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	productCount: number;
};

export type CreateCategoryInput = {
	collectionId: string;
	name: string;
	description?: string | null;
	imageUrl?: string | null;
};

export type UpdateCategoryInput = {
	name?: string;
	description?: string | null;
	imageUrl?: string | null;
	sortOrder?: number;
};

async function fetchCategories(collectionId: string): Promise<SupplierCategory[]> {
	const response = await fetch(
		`${API_URL}/api/tenant/supplier-categories?collectionId=${collectionId}`,
		{ credentials: 'include' }
	);
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch categories');
	}
	const data = await response.json();
	return data.categories;
}

async function fetchCategory(id: string): Promise<SupplierCategory> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-categories/${id}`, {
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch category');
	}
	const data = await response.json();
	return data.category;
}

async function createCategory(input: CreateCategoryInput): Promise<SupplierCategory> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-categories`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create category');
	}
	const data = await response.json();
	return data.category;
}

async function updateCategory({
	id,
	...input
}: UpdateCategoryInput & { id: string }): Promise<SupplierCategory> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-categories/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update category');
	}
	const data = await response.json();
	return data.category;
}

async function deleteCategory(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-categories/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete category');
	}
}

export function useSupplierCategoriesQuery(collectionId: string | undefined) {
	return useQuery({
		queryKey: ['supplier-categories', collectionId],
		queryFn: () => fetchCategories(collectionId!),
		enabled: !!collectionId,
	});
}

export function useSupplierCategoryQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['supplier-category', id],
		queryFn: () => fetchCategory(id!),
		enabled: !!id,
	});
}

export function useCreateSupplierCategoryMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createCategory,
		onSuccess: (category) => {
			queryClient.invalidateQueries({ queryKey: ['supplier-categories', category.collectionId] });
			queryClient.invalidateQueries({ queryKey: ['supplier-collection'] });
		},
	});
}

export function useUpdateSupplierCategoryMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateCategory,
		onSuccess: (category) => {
			queryClient.invalidateQueries({ queryKey: ['supplier-categories'] });
			queryClient.invalidateQueries({ queryKey: ['supplier-category', category.id] });
		},
	});
}

export function useDeleteSupplierCategoryMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteCategory,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['supplier-categories'] });
			queryClient.invalidateQueries({ queryKey: ['supplier-collection'] });
		},
	});
}
