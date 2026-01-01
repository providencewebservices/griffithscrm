import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://localhost:3000';

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

export type Council = {
	id: string;
	tenantId: string;
	councilName: string;
	cemeteryName: string | null;
	department: string | null;
	permitRequired: boolean;
	permitFee: string | null;
	foundationSpec: string | null;
	maxHeadstoneHeight: string | null;
	maxHeadstoneWidth: string | null;
	approvedMaterials: string | null;
	installationRules: string | null;
	notes: string | null;
	isActive: boolean;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type CouncilWithRelations = Council & {
	contactInfo: ContactInfo[];
	addresses: Address[];
};

export type CouncilListItem = Council & {
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

export type CreateCouncilInput = {
	councilName: string;
	cemeteryName?: string;
	department?: string;
	permitRequired?: boolean;
	permitFee?: number;
	foundationSpec?: string;
	maxHeadstoneHeight?: string;
	maxHeadstoneWidth?: string;
	approvedMaterials?: string;
	installationRules?: string;
	notes?: string;
	contactInfo?: ContactInfoInput[];
	addresses?: AddressInput[];
};

export type UpdateCouncilInput = Partial<CreateCouncilInput>;

export type CouncilSearchParams = {
	q?: string;
	archivedOnly?: boolean;
};

// Fetch functions
async function fetchCouncils(params?: CouncilSearchParams): Promise<CouncilListItem[]> {
	const searchParams = new URLSearchParams();
	if (params?.q) searchParams.set('q', params.q);
	if (params?.archivedOnly) searchParams.set('archivedOnly', 'true');

	const url = `${API_URL}/api/councils${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

	const response = await fetch(url, { credentials: 'include' });

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch councils');
	}

	const data = await response.json();
	return data.councils;
}

async function fetchCouncil(id: string): Promise<CouncilWithRelations> {
	const response = await fetch(`${API_URL}/api/councils/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch council');
	}

	const data = await response.json();
	return data.council;
}

async function createCouncil(input: CreateCouncilInput): Promise<CouncilWithRelations> {
	const response = await fetch(`${API_URL}/api/councils`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create council');
	}

	const data = await response.json();
	return data.council;
}

async function updateCouncil({
	id,
	...input
}: UpdateCouncilInput & { id: string }): Promise<CouncilWithRelations> {
	const response = await fetch(`${API_URL}/api/councils/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update council');
	}

	const data = await response.json();
	return data.council;
}

async function archiveCouncil(id: string): Promise<Council> {
	const response = await fetch(`${API_URL}/api/councils/${id}/archive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to archive council');
	}

	const data = await response.json();
	return data.council;
}

async function unarchiveCouncil(id: string): Promise<Council> {
	const response = await fetch(`${API_URL}/api/councils/${id}/unarchive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to unarchive council');
	}

	const data = await response.json();
	return data.council;
}

// React Query hooks
export function useCouncilsQuery(params?: CouncilSearchParams) {
	return useQuery({
		queryKey: ['councils', params],
		queryFn: () => fetchCouncils(params),
	});
}

export function useCouncilQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['council', id],
		queryFn: () => fetchCouncil(id!),
		enabled: !!id,
	});
}

export function useCreateCouncilMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createCouncil,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['councils'] });
		},
	});
}

export function useUpdateCouncilMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateCouncil,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['councils'] });
			queryClient.invalidateQueries({ queryKey: ['council', data.id] });
		},
	});
}

export function useArchiveCouncilMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: archiveCouncil,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['councils'] });
		},
	});
}

export function useUnarchiveCouncilMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: unarchiveCouncil,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['councils'] });
		},
	});
}
