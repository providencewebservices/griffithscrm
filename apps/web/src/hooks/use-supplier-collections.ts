import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type SupplierCollection = {
	id: string;
	tenantId: string;
	supplierId: string;
	name: string;
	description: string | null;
	imageUrl: string | null;
	sortOrder: number;
	isActive: boolean;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
	categoryCount: number;
};

export type SupplierCollectionDetail = SupplierCollection & {
	supplierName: string | null;
	categories: {
		id: string;
		name: string;
		description: string | null;
		sortOrder: number;
		isActive: boolean;
	}[];
};

export type CreateCollectionInput = {
	supplierId: string;
	name: string;
	description?: string | null;
	imageUrl?: string | null;
};

export type UpdateCollectionInput = {
	name?: string;
	description?: string | null;
	imageUrl?: string | null;
	sortOrder?: number;
};

async function fetchCollections(supplierId: string): Promise<SupplierCollection[]> {
	const response = await fetch(
		`${API_URL}/api/tenant/supplier-collections?supplierId=${supplierId}`,
		{ credentials: 'include' }
	);
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch collections');
	}
	const data = await response.json();
	return data.collections;
}

async function fetchCollection(id: string): Promise<SupplierCollectionDetail> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-collections/${id}`, {
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch collection');
	}
	const data = await response.json();
	return data.collection;
}

async function createCollection(input: CreateCollectionInput): Promise<SupplierCollection> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-collections`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create collection');
	}
	const data = await response.json();
	return data.collection;
}

async function updateCollection({
	id,
	...input
}: UpdateCollectionInput & { id: string }): Promise<SupplierCollection> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-collections/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update collection');
	}
	const data = await response.json();
	return data.collection;
}

async function archiveCollection(id: string): Promise<SupplierCollection> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-collections/${id}/archive`, {
		method: 'POST',
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to archive collection');
	}
	const data = await response.json();
	return data.collection;
}

async function unarchiveCollection(id: string): Promise<SupplierCollection> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-collections/${id}/unarchive`, {
		method: 'POST',
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to unarchive collection');
	}
	const data = await response.json();
	return data.collection;
}

async function deleteCollection(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/supplier-collections/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete collection');
	}
}

export function useSupplierCollectionsQuery(supplierId: string | undefined) {
	return useQuery({
		queryKey: ['supplier-collections', supplierId],
		queryFn: () => fetchCollections(supplierId!),
		enabled: !!supplierId,
	});
}

export function useSupplierCollectionQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['supplier-collection', id],
		queryFn: () => fetchCollection(id!),
		enabled: !!id,
	});
}

export function useCreateSupplierCollectionMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createCollection,
		onSuccess: (collection) => {
			queryClient.invalidateQueries({ queryKey: ['supplier-collections', collection.supplierId] });
		},
	});
}

export function useUpdateSupplierCollectionMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateCollection,
		onSuccess: (collection) => {
			queryClient.invalidateQueries({ queryKey: ['supplier-collections'] });
			queryClient.invalidateQueries({ queryKey: ['supplier-collection', collection.id] });
		},
	});
}

export function useArchiveSupplierCollectionMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: archiveCollection,
		onSuccess: (collection) => {
			queryClient.invalidateQueries({ queryKey: ['supplier-collections'] });
			queryClient.invalidateQueries({ queryKey: ['supplier-collection', collection.id] });
		},
	});
}

export function useUnarchiveSupplierCollectionMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: unarchiveCollection,
		onSuccess: (collection) => {
			queryClient.invalidateQueries({ queryKey: ['supplier-collections'] });
			queryClient.invalidateQueries({ queryKey: ['supplier-collection', collection.id] });
		},
	});
}

export function useDeleteSupplierCollectionMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteCollection,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['supplier-collections'] });
		},
	});
}
