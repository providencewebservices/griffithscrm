import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export type ContactInfo = {
	id: string;
	type: 'email' | 'phone' | 'mobile' | 'fax' | 'other';
	value: string;
	label?: string | null;
	isPrimary: boolean;
	createdAt: string;
	updatedAt: string;
};

export type Address = {
	id: string;
	streetNumber?: string | null;
	route?: string | null;
	locality?: string | null;
	administrativeAreaLevel1?: string | null;
	administrativeAreaLevel2?: string | null;
	postalCode?: string | null;
	postalCodeSuffix?: string | null;
	country: string;
	formattedAddress: string;
	placeId?: string | null;
	latitude?: string | null;
	longitude?: string | null;
	label?: string | null;
	isPrimary: boolean;
	createdAt: string;
	updatedAt: string;
};

export type PaymentTerms = 'cod' | 'net_7' | 'net_14' | 'net_30' | 'net_60' | 'net_90';

export const PAYMENT_TERM_LABELS: Record<PaymentTerms, string> = {
	cod: 'Cash on Delivery',
	net_7: 'Net 7 Days',
	net_14: 'Net 14 Days',
	net_30: 'Net 30 Days',
	net_60: 'Net 60 Days',
	net_90: 'Net 90 Days',
};

export type Supplier = {
	id: string;
	tenantId: string;
	businessName: string;
	tradingName: string | null;
	accountNumber: string | null;
	website: string | null;
	paymentTerms: PaymentTerms | null;
	defaultLeadTimeDays: number | null;
	minimumOrderValue: string | null;
	notes: string | null;
	isActive: boolean;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type SupplierWithRelations = Supplier & {
	contactInfo: ContactInfo[];
	addresses: Address[];
};

export type SupplierListItem = Supplier & {
	primaryEmail: ContactInfo | null;
	primaryPhone: ContactInfo | null;
	primaryAddress: Address | null;
	materialsCount: number;
	sundriesCount: number;
};

export type ContactInfoInput = {
	type: 'email' | 'phone' | 'mobile' | 'fax' | 'other';
	value: string;
	label?: string;
	isPrimary: boolean;
};

export type AddressInput = {
	streetNumber?: string;
	route?: string;
	locality?: string;
	administrativeAreaLevel1?: string;
	administrativeAreaLevel2?: string;
	postalCode?: string;
	postalCodeSuffix?: string;
	country?: string;
	formattedAddress: string;
	placeId?: string;
	latitude?: string;
	longitude?: string;
	label?: string;
	isPrimary: boolean;
};

export type CreateSupplierInput = {
	businessName: string;
	tradingName?: string;
	accountNumber?: string;
	website?: string;
	paymentTerms?: PaymentTerms;
	defaultLeadTimeDays?: number;
	minimumOrderValue?: number;
	notes?: string;
	contactInfo?: ContactInfoInput[];
	addresses?: AddressInput[];
};

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export type SupplierSearchParams = {
	q?: string;
	archivedOnly?: boolean;
};

export type SupplierMaterial = {
	id: string;
	name: string;
	supplierCost: string;
	isActive: boolean;
};

export type SupplierSundry = {
	id: string;
	name: string;
	price: string;
	isActive: boolean;
};

// Fetch functions
async function fetchSuppliers(params?: SupplierSearchParams): Promise<SupplierListItem[]> {
	const searchParams = new URLSearchParams();
	if (params?.q) searchParams.set('q', params.q);
	if (params?.archivedOnly) searchParams.set('archivedOnly', 'true');

	const url = `${API_URL}/api/suppliers${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

	const response = await fetch(url, { credentials: 'include' });

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch suppliers');
	}

	const data = await response.json();
	return data.suppliers;
}

async function fetchSupplier(id: string): Promise<SupplierWithRelations> {
	const response = await fetch(`${API_URL}/api/suppliers/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch supplier');
	}

	const data = await response.json();
	return data.supplier;
}

async function fetchSupplierMaterials(id: string): Promise<SupplierMaterial[]> {
	const response = await fetch(`${API_URL}/api/suppliers/${id}/materials`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch supplier materials');
	}

	const data = await response.json();
	return data.materials;
}

async function fetchSupplierSundries(id: string): Promise<SupplierSundry[]> {
	const response = await fetch(`${API_URL}/api/suppliers/${id}/sundries`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch supplier sundries');
	}

	const data = await response.json();
	return data.sundries;
}

async function createSupplier(input: CreateSupplierInput): Promise<SupplierWithRelations> {
	const response = await fetch(`${API_URL}/api/suppliers`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create supplier');
	}

	const data = await response.json();
	return data.supplier;
}

async function updateSupplier({
	id,
	...input
}: UpdateSupplierInput & { id: string }): Promise<SupplierWithRelations> {
	const response = await fetch(`${API_URL}/api/suppliers/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update supplier');
	}

	const data = await response.json();
	return data.supplier;
}

async function archiveSupplier(id: string): Promise<Supplier> {
	const response = await fetch(`${API_URL}/api/suppliers/${id}/archive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to archive supplier');
	}

	const data = await response.json();
	return data.supplier;
}

async function unarchiveSupplier(id: string): Promise<Supplier> {
	const response = await fetch(`${API_URL}/api/suppliers/${id}/unarchive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to unarchive supplier');
	}

	const data = await response.json();
	return data.supplier;
}

// React Query hooks
export function useSuppliersQuery(params?: SupplierSearchParams) {
	return useQuery({
		queryKey: ['suppliers', params],
		queryFn: () => fetchSuppliers(params),
		placeholderData: keepPreviousData,
	});
}

export function useSupplierQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['supplier', id],
		queryFn: () => fetchSupplier(id!),
		enabled: !!id,
	});
}

export function useSupplierMaterialsQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['supplier-materials', id],
		queryFn: () => fetchSupplierMaterials(id!),
		enabled: !!id,
	});
}

export function useSupplierSundriesQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['supplier-sundries', id],
		queryFn: () => fetchSupplierSundries(id!),
		enabled: !!id,
	});
}

export function useCreateSupplierMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createSupplier,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['suppliers'] });
		},
	});
}

export function useUpdateSupplierMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateSupplier,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['suppliers'] });
			queryClient.invalidateQueries({ queryKey: ['supplier', data.id] });
		},
	});
}

export function useArchiveSupplierMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: archiveSupplier,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['suppliers'] });
		},
	});
}

export function useUnarchiveSupplierMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: unarchiveSupplier,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['suppliers'] });
		},
	});
}
