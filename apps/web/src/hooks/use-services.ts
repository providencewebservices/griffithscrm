import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type ServicePricingType = 'fixed' | 'quoted' | 'hourly';

export type Service = {
	id: string;
	tenantId: string;
	name: string;
	description: string | null;
	basePrice: string | null;
	pricingType: ServicePricingType;
	isActive: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type CreateServiceInput = {
	name: string;
	description?: string;
	basePrice?: number | null;
	pricingType: ServicePricingType;
};

export type UpdateServiceInput = {
	name?: string;
	description?: string | null;
	basePrice?: number | null;
	pricingType?: ServicePricingType;
	isActive?: boolean;
};

type ListResponse = {
	services: Service[];
};

type ItemResponse = {
	service: Service;
};

async function fetchServices(): Promise<Service[]> {
	const response = await fetch(`${API_URL}/api/tenant/services`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch services');
	}

	const data: ListResponse = await response.json();
	return data.services;
}

async function createService(input: CreateServiceInput): Promise<Service> {
	const response = await fetch(`${API_URL}/api/tenant/services`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create service');
	}

	const data: ItemResponse = await response.json();
	return data.service;
}

async function updateService({
	id,
	...input
}: UpdateServiceInput & { id: string }): Promise<Service> {
	const response = await fetch(`${API_URL}/api/tenant/services/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update service');
	}

	const data: ItemResponse = await response.json();
	return data.service;
}

async function deleteService(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/services/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete service');
	}
}

export function useServicesQuery() {
	return useQuery({
		queryKey: ['services'],
		queryFn: fetchServices,
	});
}

export function useCreateServiceMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createService,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['services'] });
		},
	});
}

export function useUpdateServiceMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateService,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['services'] });
		},
	});
}

export function useDeleteServiceMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteService,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['services'] });
		},
	});
}
