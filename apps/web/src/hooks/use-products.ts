import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export type Product = {
	id: string;
	tenantId: string;
	categoryId: string | null;
	supplierId: string | null;
	supplierProductId: string | null;
	sku: string;
	name: string;
	description: string | null;
	imageUrl: string | null;
	requiresCustomerPhotoUpload: boolean;
	customerPhotoUploadInstructions: string | null;
	isActive: boolean;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
	category: { id: string; name: string } | null;
	supplierName: string | null;
	supplierProductSource?: {
		supplierProductId: string;
		supplierProductName: string | null;
		collectionId: string | null;
		collectionName: string | null;
	} | null;
	optionCount?: number;
	options?: ProductOption[];
};

export type ProductListParams = {
	page?: number;
	limit?: number;
	categoryId?: string;
	search?: string;
	isActive?: 'true' | 'false' | 'all';
	includeArchived?: 'true' | 'false';
};

export type Pagination = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type CreateProductInput = {
	sku: string;
	name: string;
	description?: string;
	categoryId?: string | null;
	supplierId?: string | null;
	imageUrl?: string | null;
	requiresCustomerPhotoUpload?: boolean;
	customerPhotoUploadInstructions?: string | null;
	isActive?: boolean;
};

export type UpdateProductInput = {
	sku?: string;
	name?: string;
	description?: string | null;
	categoryId?: string | null;
	supplierId?: string | null;
	imageUrl?: string | null;
	requiresCustomerPhotoUpload?: boolean;
	customerPhotoUploadInstructions?: string | null;
	isActive?: boolean;
};

type ListResponse = {
	products: Product[];
	pagination: Pagination;
};

type ItemResponse = {
	product: Product;
};

async function fetchProducts(params: ProductListParams = {}): Promise<ListResponse> {
	const searchParams = new URLSearchParams();
	if (params.page) searchParams.set('page', String(params.page));
	if (params.limit) searchParams.set('limit', String(params.limit));
	if (params.categoryId) searchParams.set('categoryId', params.categoryId);
	if (params.search) searchParams.set('search', params.search);
	if (params.isActive) searchParams.set('isActive', params.isActive);
	if (params.includeArchived) searchParams.set('includeArchived', params.includeArchived);

	const url = `${API_URL}/api/tenant/products?${searchParams.toString()}`;
	const response = await fetch(url, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch products');
	}

	return response.json();
}

async function fetchProduct(id: string): Promise<Product> {
	const response = await fetch(`${API_URL}/api/tenant/products/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch product');
	}

	const data: ItemResponse = await response.json();
	return data.product;
}

async function createProduct(input: CreateProductInput): Promise<Product> {
	const response = await fetch(`${API_URL}/api/tenant/products`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create product');
	}

	const data: ItemResponse = await response.json();
	return data.product;
}

async function updateProduct({
	id,
	...input
}: UpdateProductInput & { id: string }): Promise<Product> {
	const response = await fetch(`${API_URL}/api/tenant/products/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update product');
	}

	const data: ItemResponse = await response.json();
	return data.product;
}

async function archiveProduct(id: string): Promise<Product> {
	const response = await fetch(`${API_URL}/api/tenant/products/${id}/archive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to archive product');
	}

	const data: ItemResponse = await response.json();
	return data.product;
}

async function unarchiveProduct(id: string): Promise<Product> {
	const response = await fetch(`${API_URL}/api/tenant/products/${id}/unarchive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to unarchive product');
	}

	const data: ItemResponse = await response.json();
	return data.product;
}

async function deleteProduct(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/products/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete product');
	}
}

async function duplicateProduct(id: string): Promise<Product> {
	const response = await fetch(`${API_URL}/api/tenant/products/${id}/duplicate`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to duplicate product');
	}

	const data: ItemResponse = await response.json();
	return data.product;
}

export function useProductsQuery(params: ProductListParams = {}) {
	return useQuery({
		queryKey: ['products', params],
		queryFn: () => fetchProducts(params),
		placeholderData: keepPreviousData,
	});
}

export function useProductQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['product', id],
		queryFn: () => fetchProduct(id!),
		enabled: !!id,
	});
}

export function useCreateProductMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createProduct,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['products'] });
		},
	});
}

export function useUpdateProductMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateProduct,
		onSuccess: (product) => {
			queryClient.invalidateQueries({ queryKey: ['products'] });
			queryClient.invalidateQueries({ queryKey: ['product', product.id] });
		},
	});
}

export function useArchiveProductMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: archiveProduct,
		onSuccess: (product) => {
			queryClient.invalidateQueries({ queryKey: ['products'] });
			queryClient.invalidateQueries({ queryKey: ['product', product.id] });
		},
	});
}

export function useUnarchiveProductMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: unarchiveProduct,
		onSuccess: (product) => {
			queryClient.invalidateQueries({ queryKey: ['products'] });
			queryClient.invalidateQueries({ queryKey: ['product', product.id] });
		},
	});
}

export function useDeleteProductMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteProduct,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['products'] });
		},
	});
}

export function useDuplicateProductMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: duplicateProduct,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['products'] });
		},
	});
}
