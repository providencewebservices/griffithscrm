import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Material } from './use-materials';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type MaterialSection = {
	id: string;
	tenantId: string;
	name: string;
	sortOrder: number;
	materialCount: number;
	materialNames: string[];
	createdAt: string;
	updatedAt: string;
};

export type MaterialSectionWithMaterials = Omit<MaterialSection, 'materialCount'> & {
	materials: Material[];
};

export type CreateMaterialSectionInput = {
	name: string;
};

export type UpdateMaterialSectionInput = {
	name?: string;
};

type ListResponse = {
	materialSections: MaterialSection[];
};

type ItemResponse = {
	materialSection: MaterialSection;
};

async function fetchMaterialSections(): Promise<MaterialSection[]> {
	const response = await fetch(`${API_URL}/api/tenant/material-sections`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch material sections');
	}

	const data: ListResponse = await response.json();
	return data.materialSections;
}

async function fetchMaterialSection(id: string): Promise<MaterialSectionWithMaterials> {
	const response = await fetch(`${API_URL}/api/tenant/material-sections/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch material section');
	}

	const data: { materialSection: MaterialSectionWithMaterials } = await response.json();
	return data.materialSection;
}

async function createMaterialSection(input: CreateMaterialSectionInput): Promise<MaterialSection> {
	const response = await fetch(`${API_URL}/api/tenant/material-sections`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create material section');
	}

	const data: ItemResponse = await response.json();
	return data.materialSection;
}

async function updateMaterialSection({
	id,
	...input
}: UpdateMaterialSectionInput & { id: string }): Promise<MaterialSection> {
	const response = await fetch(`${API_URL}/api/tenant/material-sections/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update material section');
	}

	const data: ItemResponse = await response.json();
	return data.materialSection;
}

async function deleteMaterialSection(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/material-sections/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete material section');
	}
}

export function useMaterialSectionsQuery() {
	return useQuery({
		queryKey: ['material-sections'],
		queryFn: fetchMaterialSections,
	});
}

export function useMaterialSectionQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['material-section', id],
		queryFn: () => fetchMaterialSection(id!),
		enabled: !!id,
	});
}

export function useCreateMaterialSectionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createMaterialSection,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['material-sections'] });
		},
	});
}

export function useUpdateMaterialSectionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateMaterialSection,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['material-sections'] });
			queryClient.invalidateQueries({ queryKey: ['material-section', variables.id] });
		},
	});
}

export function useDeleteMaterialSectionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteMaterialSection,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['material-sections'] });
		},
	});
}
