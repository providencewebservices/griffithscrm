import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export type FuneralDirector = {
	id: string;
	tenantId: string;
	businessName: string;
	tradingName: string | null;
	website: string | null;
	notes: string | null;
	isActive: boolean;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type FuneralDirectorWithRelations = FuneralDirector & {
	contactInfo: ContactInfo[];
	addresses: Address[];
};

export type FuneralDirectorListItem = FuneralDirector & {
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

export type CreateFuneralDirectorInput = {
	businessName: string;
	tradingName?: string;
	website?: string;
	notes?: string;
	contactInfo?: ContactInfoInput[];
	addresses?: AddressInput[];
};

export type UpdateFuneralDirectorInput = Partial<CreateFuneralDirectorInput>;

export type FuneralDirectorSearchParams = {
	q?: string;
	archivedOnly?: boolean;
};

// Fetch functions
async function fetchFuneralDirectors(
	params?: FuneralDirectorSearchParams,
): Promise<FuneralDirectorListItem[]> {
	const searchParams = new URLSearchParams();
	if (params?.q) searchParams.set('q', params.q);
	if (params?.archivedOnly) searchParams.set('archivedOnly', 'true');

	const url = `${API_URL}/api/funeral-directors${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

	const response = await fetch(url, { credentials: 'include' });

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch funeral directors');
	}

	const data = await response.json();
	return data.funeralDirectors;
}

async function fetchFuneralDirector(id: string): Promise<FuneralDirectorWithRelations> {
	const response = await fetch(`${API_URL}/api/funeral-directors/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch funeral director');
	}

	const data = await response.json();
	return data.funeralDirector;
}

async function createFuneralDirector(
	input: CreateFuneralDirectorInput,
): Promise<FuneralDirectorWithRelations> {
	const response = await fetch(`${API_URL}/api/funeral-directors`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create funeral director');
	}

	const data = await response.json();
	return data.funeralDirector;
}

async function updateFuneralDirector({
	id,
	...input
}: UpdateFuneralDirectorInput & { id: string }): Promise<FuneralDirectorWithRelations> {
	const response = await fetch(`${API_URL}/api/funeral-directors/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update funeral director');
	}

	const data = await response.json();
	return data.funeralDirector;
}

async function archiveFuneralDirector(id: string): Promise<FuneralDirector> {
	const response = await fetch(`${API_URL}/api/funeral-directors/${id}/archive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to archive funeral director');
	}

	const data = await response.json();
	return data.funeralDirector;
}

async function unarchiveFuneralDirector(id: string): Promise<FuneralDirector> {
	const response = await fetch(`${API_URL}/api/funeral-directors/${id}/unarchive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to unarchive funeral director');
	}

	const data = await response.json();
	return data.funeralDirector;
}

// React Query hooks
export function useFuneralDirectorsQuery(params?: FuneralDirectorSearchParams) {
	return useQuery({
		queryKey: ['funeral-directors', params],
		queryFn: () => fetchFuneralDirectors(params),
		placeholderData: keepPreviousData,
	});
}

export function useFuneralDirectorQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['funeral-director', id],
		queryFn: () => fetchFuneralDirector(id!),
		enabled: !!id,
	});
}

export function useCreateFuneralDirectorMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createFuneralDirector,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['funeral-directors'] });
		},
	});
}

export function useUpdateFuneralDirectorMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateFuneralDirector,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['funeral-directors'] });
			queryClient.invalidateQueries({ queryKey: ['funeral-director', data.id] });
		},
	});
}

export function useArchiveFuneralDirectorMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: archiveFuneralDirector,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['funeral-directors'] });
		},
	});
}

export function useUnarchiveFuneralDirectorMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: unarchiveFuneralDirector,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['funeral-directors'] });
		},
	});
}
