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

export type MemorialSiteType = 'churchyard' | 'crematorium' | 'council_cemetery' | 'chapel';

export type MemorialSite = {
	id: string;
	tenantId: string;
	name: string;
	siteType: MemorialSiteType;
	notes: string | null;
	isActive: boolean;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type MemorialSiteWithRelations = MemorialSite & {
	contactInfo: ContactInfo[];
	addresses: Address[];
};

export type MemorialSiteListItem = MemorialSite & {
	primaryEmail: ContactInfo | null;
	primaryPhone: ContactInfo | null;
	primaryAddress: Address | null;
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

export type CreateMemorialSiteInput = {
	name: string;
	siteType: MemorialSiteType;
	notes?: string;
	contactInfo?: ContactInfoInput[];
	addresses?: AddressInput[];
};

export type UpdateMemorialSiteInput = Partial<CreateMemorialSiteInput>;

export type MemorialSiteSearchParams = {
	q?: string;
	siteType?: MemorialSiteType;
	archivedOnly?: boolean;
};

// Fetch functions
async function fetchMemorialSites(params?: MemorialSiteSearchParams): Promise<MemorialSiteListItem[]> {
	const searchParams = new URLSearchParams();
	if (params?.q) searchParams.set('q', params.q);
	if (params?.siteType) searchParams.set('siteType', params.siteType);
	if (params?.archivedOnly) searchParams.set('archivedOnly', 'true');

	const url = `${API_URL}/api/memorial-sites${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

	const response = await fetch(url, { credentials: 'include' });

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch memorial sites');
	}

	const data = await response.json();
	return data.memorialSites;
}

async function fetchMemorialSite(id: string): Promise<MemorialSiteWithRelations> {
	const response = await fetch(`${API_URL}/api/memorial-sites/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch memorial site');
	}

	const data = await response.json();
	return data.memorialSite;
}

async function createMemorialSite(input: CreateMemorialSiteInput): Promise<MemorialSiteWithRelations> {
	const response = await fetch(`${API_URL}/api/memorial-sites`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create memorial site');
	}

	const data = await response.json();
	return data.memorialSite;
}

async function updateMemorialSite({
	id,
	...input
}: UpdateMemorialSiteInput & { id: string }): Promise<MemorialSiteWithRelations> {
	const response = await fetch(`${API_URL}/api/memorial-sites/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update memorial site');
	}

	const data = await response.json();
	return data.memorialSite;
}

async function archiveMemorialSite(id: string): Promise<MemorialSite> {
	const response = await fetch(`${API_URL}/api/memorial-sites/${id}/archive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to archive memorial site');
	}

	const data = await response.json();
	return data.memorialSite;
}

async function unarchiveMemorialSite(id: string): Promise<MemorialSite> {
	const response = await fetch(`${API_URL}/api/memorial-sites/${id}/unarchive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to unarchive memorial site');
	}

	const data = await response.json();
	return data.memorialSite;
}

// React Query hooks
export function useMemorialSitesQuery(params?: MemorialSiteSearchParams) {
	return useQuery({
		queryKey: ['memorial-sites', params],
		queryFn: () => fetchMemorialSites(params),
		placeholderData: keepPreviousData,
	});
}

export function useMemorialSiteQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['memorial-site', id],
		queryFn: () => fetchMemorialSite(id!),
		enabled: !!id,
	});
}

export function useCreateMemorialSiteMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createMemorialSite,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['memorial-sites'] });
		},
	});
}

export function useUpdateMemorialSiteMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateMemorialSite,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['memorial-sites'] });
			queryClient.invalidateQueries({ queryKey: ['memorial-site', data.id] });
		},
	});
}

export function useArchiveMemorialSiteMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: archiveMemorialSite,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['memorial-sites'] });
		},
	});
}

export function useUnarchiveMemorialSiteMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: unarchiveMemorialSite,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['memorial-sites'] });
		},
	});
}

// Helper constants for labels
export const SITE_TYPE_LABELS: Record<MemorialSiteType, string> = {
	churchyard: 'Churchyard',
	crematorium: 'Crematorium',
	council_cemetery: 'Council Cemetery',
	chapel: 'Chapel',
};
