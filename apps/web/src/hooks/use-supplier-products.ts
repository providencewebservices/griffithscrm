import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type SupplierProduct = {
	id: string;
	tenantId: string;
	supplierId: string;
	collectionId: string;
	categoryId: string | null;
	sku: string | null;
	name: string;
	description: string | null;
	imageUrl: string | null;
	supplierCost: string | null;
	height: string | null;
	width: string | null;
	depth: string | null;
	weight: string | null;
	material: string | null;
	isActive: boolean;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
	supplierName?: string | null;
	collectionName?: string | null;
	categoryName?: string | null;
};

export type SupplierProductListParams = {
	supplierId?: string;
	collectionId?: string;
	categoryId?: string;
	q?: string;
	archivedOnly?: 'true' | 'false';
	page?: number;
	limit?: number;
};

export type Pagination = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type CreateSupplierProductInput = {
	supplierId: string;
	collectionId: string;
	categoryId?: string | null;
	sku?: string | null;
	name: string;
	description?: string | null;
	imageUrl?: string | null;
	supplierCost?: string | null;
	height?: string | null;
	width?: string | null;
	depth?: string | null;
	weight?: string | null;
	material?: string | null;
};

export type UpdateSupplierProductInput = {
	categoryId?: string | null;
	sku?: string | null;
	name?: string;
	description?: string | null;
	imageUrl?: string | null;
	supplierCost?: string | null;
	height?: string | null;
	width?: string | null;
	depth?: string | null;
	weight?: string | null;
	material?: string | null;
};

export type ImportToCatalogInput = {
	sku: string;
	name?: string;
	description?: string | null;
	categoryId?: string | null;
	imageUrl?: string | null;
};

type ListResponse = {
	products: SupplierProduct[];
	pagination: Pagination;
};

async function fetchSupplierProducts(
	params: SupplierProductListParams = {},
): Promise<ListResponse> {
	const searchParams = new URLSearchParams();
	if (params.supplierId) searchParams.set('supplierId', params.supplierId);
	if (params.collectionId) searchParams.set('collectionId', params.collectionId);
	if (params.categoryId) searchParams.set('categoryId', params.categoryId);
	if (params.q) searchParams.set('q', params.q);
	if (params.archivedOnly) searchParams.set('archivedOnly', params.archivedOnly);
	if (params.page) searchParams.set('page', String(params.page));
	if (params.limit) searchParams.set('limit', String(params.limit));

	const response = await fetch(
		`${API_URL}/api/tenant/supplier-products?${searchParams.toString()}`,
		{ credentials: 'include' },
	);
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch supplier products');
	}
	return response.json();
}

async function fetchSupplierProduct(id: string): Promise<SupplierProduct> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-products/${id}`, {
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch supplier product');
	}
	const data = await response.json();
	return data.product;
}

async function createSupplierProduct(input: CreateSupplierProductInput): Promise<SupplierProduct> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-products`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create supplier product');
	}
	const data = await response.json();
	return data.product;
}

async function updateSupplierProduct({
	id,
	...input
}: UpdateSupplierProductInput & { id: string }): Promise<SupplierProduct> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-products/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update supplier product');
	}
	const data = await response.json();
	return data.product;
}

async function archiveSupplierProduct(id: string): Promise<SupplierProduct> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-products/${id}/archive`, {
		method: 'POST',
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to archive product');
	}
	const data = await response.json();
	return data.product;
}

async function unarchiveSupplierProduct(id: string): Promise<SupplierProduct> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-products/${id}/unarchive`, {
		method: 'POST',
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to unarchive product');
	}
	const data = await response.json();
	return data.product;
}

async function deleteSupplierProduct(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-products/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete product');
	}
}

async function importToCatalog({
	supplierProductId,
	...input
}: ImportToCatalogInput & { supplierProductId: string }): Promise<unknown> {
	const response = await fetch(
		`${API_URL}/api/tenant/supplier-products/${supplierProductId}/import-to-catalog`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(input),
		},
	);
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to import product to catalog');
	}
	const data = await response.json();
	return data.product;
}

async function csvImport({
	file,
	supplierId,
	collectionId,
	categoryId,
}: {
	file: File;
	supplierId: string;
	collectionId: string;
	categoryId?: string;
}): Promise<{ imported: number; errors: { row: number; message: string }[] }> {
	const formData = new FormData();
	formData.append('file', file);
	formData.append('supplierId', supplierId);
	formData.append('collectionId', collectionId);
	if (categoryId) formData.append('categoryId', categoryId);

	const response = await fetch(`${API_URL}/api/tenant/supplier-products/import-csv`, {
		method: 'POST',
		credentials: 'include',
		body: formData,
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to import CSV');
	}
	return response.json();
}

export function useSupplierProductsQuery(params: SupplierProductListParams = {}) {
	return useQuery({
		queryKey: ['supplier-products', params],
		queryFn: () => fetchSupplierProducts(params),
		enabled: !!(params.supplierId || params.collectionId || params.categoryId),
	});
}

export function useSupplierProductQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['supplier-product', id],
		queryFn: () => fetchSupplierProduct(id!),
		enabled: !!id,
	});
}

export function useCreateSupplierProductMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createSupplierProduct,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
			queryClient.invalidateQueries({ queryKey: ['supplier-categories'] });
		},
	});
}

export function useUpdateSupplierProductMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateSupplierProduct,
		onSuccess: (product) => {
			queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
			queryClient.invalidateQueries({ queryKey: ['supplier-product', product.id] });
		},
	});
}

export function useArchiveSupplierProductMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: archiveSupplierProduct,
		onSuccess: (product) => {
			queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
			queryClient.invalidateQueries({ queryKey: ['supplier-product', product.id] });
		},
	});
}

export function useUnarchiveSupplierProductMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: unarchiveSupplierProduct,
		onSuccess: (product) => {
			queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
			queryClient.invalidateQueries({ queryKey: ['supplier-product', product.id] });
		},
	});
}

export function useDeleteSupplierProductMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteSupplierProduct,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
		},
	});
}

export function useImportToCatalogMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: importToCatalog,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['products'] });
		},
	});
}

export function useCsvImportMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: csvImport,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
			queryClient.invalidateQueries({ queryKey: ['supplier-categories'] });
		},
	});
}
