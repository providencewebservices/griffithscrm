import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type InquiryProduct = {
	id: string;
	productId: string;
	productName: string;
	productSku: string;
	productImageUrl: string | null;
	productCategoryName: string | null;
};

export type InquirySundry = {
	id: string;
	sundryId: string | null;
	sundryName: string | null;
	sundryDescription: string | null;
	sundryImageUrl: string | null;
};

export type InquiryListItem = {
	id: string;
	tenantId: string;
	customerId: string | null;
	firstName: string;
	lastName: string;
	email: string | null;
	phone: string | null;
	source: string;
	status: string;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
	customerName: string | null;
	productCount: number;
	sundryCount: number;
	selectionCount: number;
};

export type LinkedBrochure = {
	id: string;
	createdAt: string;
	archivedAt: string | null;
};

export type LinkedQuotePackage = {
	id: string;
	packageNumber: string;
	status: string;
	createdAt: string;
};

export type Inquiry = {
	id: string;
	tenantId: string;
	customerId: string | null;
	firstName: string;
	lastName: string;
	email: string | null;
	phone: string | null;
	message: string | null;
	source: string;
	status: string;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
	customerName: string | null;
	products: InquiryProduct[];
	sundries: InquirySundry[];
	linkedBrochures?: LinkedBrochure[];
	linkedQuotePackages?: LinkedQuotePackage[];
};

export type InquiryListParams = {
	page?: number;
	limit?: number;
	search?: string;
	status?: 'new' | 'contacted' | 'converted' | 'closed' | 'all';
	customerId?: string;
};

export type Pagination = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type CreateInquiryInput = {
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	message?: string;
	source: string;
	customerId?: string;
	products?: { productId: string }[];
	sundries?: { sundryId: string }[];
};

export type UpdateInquiryInput = {
	id: string;
	firstName?: string;
	lastName?: string;
	email?: string | null;
	phone?: string | null;
	message?: string | null;
	source?: string;
	status?: string;
	products?: { productId: string }[];
	sundries?: { sundryId: string }[];
};

type ListResponse = {
	items: InquiryListItem[];
	pagination: Pagination;
};

type ItemResponse = {
	inquiry: Inquiry;
};

async function fetchInquiries(params: InquiryListParams = {}): Promise<ListResponse> {
	const searchParams = new URLSearchParams();
	if (params.page) searchParams.set('page', String(params.page));
	if (params.limit) searchParams.set('limit', String(params.limit));
	if (params.search) searchParams.set('search', params.search);
	if (params.status) searchParams.set('status', params.status);
	if (params.customerId) searchParams.set('customerId', params.customerId);

	const response = await fetch(`${API_URL}/api/inquiries?${searchParams.toString()}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch inquiries');
	}

	return response.json();
}

async function fetchInquiry(id: string): Promise<Inquiry> {
	const response = await fetch(`${API_URL}/api/inquiries/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch inquiry');
	}

	const data: ItemResponse = await response.json();
	return data.inquiry;
}

async function createInquiry(input: CreateInquiryInput): Promise<Inquiry> {
	const response = await fetch(`${API_URL}/api/inquiries`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create inquiry');
	}

	const data: ItemResponse = await response.json();
	return data.inquiry;
}

async function updateInquiry({ id, ...input }: UpdateInquiryInput): Promise<Inquiry> {
	const response = await fetch(`${API_URL}/api/inquiries/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update inquiry');
	}

	const data: ItemResponse = await response.json();
	return data.inquiry;
}

async function archiveInquiry(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/inquiries/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to archive inquiry');
	}
}

async function linkCustomer(inquiryId: string, customerId: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/inquiries/${inquiryId}/link-customer`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ customerId }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to link customer');
	}
}

async function unlinkCustomer(inquiryId: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/inquiries/${inquiryId}/unlink-customer`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to unlink customer');
	}
}

export function useInquiriesQuery(params: InquiryListParams = {}) {
	return useQuery({
		queryKey: ['inquiries', params],
		queryFn: () => fetchInquiries(params),
		placeholderData: keepPreviousData,
	});
}

export function useInquiryQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['inquiry', id],
		queryFn: () => fetchInquiry(id!),
		enabled: !!id,
	});
}

export function useCreateInquiryMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createInquiry,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['inquiries'] });
		},
	});
}

export function useUpdateInquiryMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateInquiry,
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['inquiries'] });
			queryClient.invalidateQueries({ queryKey: ['inquiry', variables.id] });
		},
	});
}

export function useArchiveInquiryMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: archiveInquiry,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['inquiries'] });
		},
	});
}

export function useLinkCustomerMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ inquiryId, customerId }: { inquiryId: string; customerId: string }) =>
			linkCustomer(inquiryId, customerId),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['inquiry', variables.inquiryId] });
			queryClient.invalidateQueries({ queryKey: ['inquiries'] });
		},
	});
}

export function useUnlinkCustomerMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (inquiryId: string) => unlinkCustomer(inquiryId),
		onSuccess: (_data, inquiryId) => {
			queryClient.invalidateQueries({ queryKey: ['inquiry', inquiryId] });
			queryClient.invalidateQueries({ queryKey: ['inquiries'] });
		},
	});
}
