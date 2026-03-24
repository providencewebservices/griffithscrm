import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type Address = {
	id: string;
	streetNumber: string | null;
	route: string | null;
	locality: string | null;
	administrativeAreaLevel1: string | null;
	administrativeAreaLevel2: string | null;
	postalCode: string | null;
	postalCodeSuffix: string | null;
	country: string;
	formattedAddress: string;
	placeId: string | null;
	latitude: string | null;
	longitude: string | null;
	label: string | null;
	isPrimary: boolean;
	createdAt: string;
	updatedAt: string;
};

export type TenantSettings = {
	id: string;
	name: string;
	slug: string;
	logoUrl: string | null;
	logoSignedUrl: string | null;
	phone: string | null;
	email: string | null;
	website: string | null;
	address: Address | null;
	createdAt: string;
	updatedAt: string;
};

export type AddressInput = {
	streetNumber?: string;
	route?: string;
	locality?: string;
	administrativeAreaLevel1?: string;
	administrativeAreaLevel2?: string;
	postalCode?: string;
	postalCodeSuffix?: string;
	country: string;
	formattedAddress: string;
	placeId?: string;
	latitude?: string;
	longitude?: string;
	label?: string;
};

export type UpdateTenantSettingsInput = {
	name?: string;
	logoUrl?: string | null;
	phone?: string | null;
	email?: string | null;
	website?: string | null;
	address?: AddressInput | null;
};

type TenantSettingsResponse = {
	tenant: TenantSettings;
};

async function fetchTenantSettings(): Promise<TenantSettings> {
	const response = await fetch(`${API_URL}/api/tenant/settings`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch tenant settings');
	}

	const data: TenantSettingsResponse = await response.json();
	return data.tenant;
}

async function updateTenantSettings(input: UpdateTenantSettingsInput): Promise<TenantSettings> {
	const response = await fetch(`${API_URL}/api/tenant/settings`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update tenant settings');
	}

	const data: TenantSettingsResponse = await response.json();
	return data.tenant;
}

export function useTenantSettingsQuery() {
	return useQuery({
		queryKey: ['tenant-settings'],
		queryFn: fetchTenantSettings,
	});
}

export function useUpdateTenantSettingsMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateTenantSettings,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
		},
	});
}
