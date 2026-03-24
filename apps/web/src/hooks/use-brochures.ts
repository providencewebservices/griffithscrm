import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type BrochureProduct = {
	id: string;
	productId: string;
	sortOrder: number;
	isInterested: boolean;
	interestedAt: string | null;
	productName: string;
	productSku: string;
	productImageUrl: string | null;
	productDescription: string | null;
	productCategoryName: string | null;
};

export type BrochureListItem = {
	id: string;
	tenantId: string;
	customerId: string;
	message: string | null;
	expiresAt: string;
	readyToDiscussAt: string | null;
	archivedAt: string | null;
	emailSentAt: string | null;
	emailSentCount: number;
	createdAt: string;
	updatedAt: string;
	customerFirstName: string | null;
	customerLastName: string | null;
	customerName: string | null;
	productCount: number;
};

export type Brochure = {
	id: string;
	tenantId: string;
	customerId: string;
	createdById: string;
	createdByName: string | null;
	message: string | null;
	accessToken: string;
	expiresAt: string;
	readyToDiscussAt: string | null;
	archivedAt: string | null;
	emailSentAt: string | null;
	emailSentCount: number;
	createdAt: string;
	updatedAt: string;
	customerFirstName: string | null;
	customerLastName: string | null;
	customerName: string | null;
	customerEmail: string | null;
	products: BrochureProduct[];
};

export type BrochureListParams = {
	page?: number;
	limit?: number;
	search?: string;
	status?: 'active' | 'expired' | 'archived' | 'all';
};

export type Pagination = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type CreateBrochureInput = {
	customerId: string;
	message?: string;
	expiresAt?: string;
	products: { productId: string; sortOrder: number }[];
};

export type UpdateBrochureInput = {
	id: string;
	message?: string;
	expiresAt?: string;
	products?: { productId: string; sortOrder: number }[];
};

type ListResponse = {
	brochures: BrochureListItem[];
	pagination: Pagination;
};

type ItemResponse = {
	brochure: Brochure;
};

async function fetchBrochures(params: BrochureListParams = {}): Promise<ListResponse> {
	const searchParams = new URLSearchParams();
	if (params.page) searchParams.set('page', String(params.page));
	if (params.limit) searchParams.set('limit', String(params.limit));
	if (params.search) searchParams.set('search', params.search);
	if (params.status) searchParams.set('status', params.status);

	const url = `${API_URL}/api/brochures?${searchParams.toString()}`;
	const response = await fetch(url, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch brochures');
	}

	return response.json();
}

async function fetchBrochure(id: string): Promise<Brochure> {
	const response = await fetch(`${API_URL}/api/brochures/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch brochure');
	}

	const data: ItemResponse = await response.json();
	return data.brochure;
}

async function createBrochure(input: CreateBrochureInput): Promise<Brochure> {
	const response = await fetch(`${API_URL}/api/brochures`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create brochure');
	}

	const data: ItemResponse = await response.json();
	return data.brochure;
}

async function updateBrochure({ id, ...input }: UpdateBrochureInput): Promise<Brochure> {
	const response = await fetch(`${API_URL}/api/brochures/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update brochure');
	}

	const data: ItemResponse = await response.json();
	return data.brochure;
}

async function archiveBrochure(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/brochures/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to archive brochure');
	}
}

async function sendBrochure(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/brochures/${id}/send`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to send brochure');
	}
}

export function useBrochuresQuery(params: BrochureListParams = {}) {
	return useQuery({
		queryKey: ['brochures', params],
		queryFn: () => fetchBrochures(params),
		placeholderData: keepPreviousData,
	});
}

export function useBrochureQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['brochure', id],
		queryFn: () => fetchBrochure(id!),
		enabled: !!id,
	});
}

export function useCreateBrochureMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createBrochure,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['brochures'] });
		},
	});
}

export function useUpdateBrochureMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateBrochure,
		onSuccess: (brochure) => {
			queryClient.invalidateQueries({ queryKey: ['brochures'] });
			queryClient.invalidateQueries({ queryKey: ['brochure', brochure.id] });
		},
	});
}

export function useArchiveBrochureMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: archiveBrochure,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['brochures'] });
		},
	});
}

export function useSendBrochureMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: sendBrochure,
		onSuccess: (_data, id) => {
			queryClient.invalidateQueries({ queryKey: ['brochure', id] });
		},
	});
}
