import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://localhost:3000';

export type Material = {
	id: string;
	tenantId: string;
	sectionId: string;
	supplierId: string | null;
	name: string;
	imageUrl: string | null;
	supplierCost: string;
	isActive: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
	supplierName: string | null;
};

export type CreateMaterialInput = {
	sectionId: string;
	supplierId?: string | null;
	name: string;
	imageUrl?: string | null;
	supplierCost: number;
	isActive?: boolean;
};

export type UpdateMaterialInput = {
	name?: string;
	supplierId?: string | null;
	imageUrl?: string | null;
	supplierCost?: number;
	isActive?: boolean;
};

type ItemResponse = {
	material: Material;
};

async function fetchMaterials(): Promise<Material[]> {
	const response = await fetch(`${API_URL}/api/tenant/materials`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch materials');
	}

	const data: { materials: Material[] } = await response.json();
	return data.materials;
}

async function fetchMaterial(id: string): Promise<Material> {
	const response = await fetch(`${API_URL}/api/tenant/materials/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch material');
	}

	const data: ItemResponse = await response.json();
	return data.material;
}

async function createMaterial(input: CreateMaterialInput): Promise<Material> {
	const response = await fetch(`${API_URL}/api/tenant/materials`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create material');
	}

	const data: ItemResponse = await response.json();
	return data.material;
}

async function updateMaterial({
	id,
	...input
}: UpdateMaterialInput & { id: string }): Promise<Material> {
	const response = await fetch(`${API_URL}/api/tenant/materials/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update material');
	}

	const data: ItemResponse = await response.json();
	return data.material;
}

async function deleteMaterial(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/materials/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete material');
	}
}

export function useMaterialsQuery() {
	return useQuery({
		queryKey: ['materials'],
		queryFn: fetchMaterials,
	});
}

export function useMaterialQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['material', id],
		queryFn: () => fetchMaterial(id!),
		enabled: !!id,
	});
}

export function useCreateMaterialMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createMaterial,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['material-section', data.sectionId] });
			queryClient.invalidateQueries({ queryKey: ['material-sections'] });
		},
	});
}

export function useUpdateMaterialMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateMaterial,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['material', data.id] });
			queryClient.invalidateQueries({ queryKey: ['material-section', data.sectionId] });
		},
	});
}

export function useDeleteMaterialMutation(sectionId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteMaterial,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['material-section', sectionId] });
			queryClient.invalidateQueries({ queryKey: ['material-sections'] });
		},
	});
}
