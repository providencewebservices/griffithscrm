import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type TenantPricingSettings = {
	id: string;
	tenantId: string;
	defaultMarkupPercent: string;
	vatRate: string;
	defaultDepositPercent: string;
	quoteValidityDays: number;
	createdAt: string;
	updatedAt: string;
};

export type UpdateTenantPricingSettingsInput = {
	defaultMarkupPercent?: number;
	vatRate?: number;
	defaultDepositPercent?: number;
	quoteValidityDays?: number;
};

type TenantPricingSettingsResponse = {
	pricingSettings: TenantPricingSettings;
};

async function fetchTenantPricingSettings(): Promise<TenantPricingSettings> {
	const response = await fetch(`${API_URL}/api/tenant/pricing-settings`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch pricing settings');
	}

	const data: TenantPricingSettingsResponse = await response.json();
	return data.pricingSettings;
}

async function updateTenantPricingSettings(
	input: UpdateTenantPricingSettingsInput,
): Promise<TenantPricingSettings> {
	const response = await fetch(`${API_URL}/api/tenant/pricing-settings`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update pricing settings');
	}

	const data: TenantPricingSettingsResponse = await response.json();
	return data.pricingSettings;
}

export function useTenantPricingSettingsQuery() {
	return useQuery({
		queryKey: ['tenant-pricing-settings'],
		queryFn: fetchTenantPricingSettings,
	});
}

export function useUpdateTenantPricingSettingsMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateTenantPricingSettings,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tenant-pricing-settings'] });
		},
	});
}
