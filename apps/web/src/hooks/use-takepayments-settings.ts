import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type TakepaymentsSettings = {
	merchantId: string;
	hashMethod: string;
	isActive: boolean;
	isConfigured: boolean;
	hasPassword: boolean;
	hasPreSharedKey: boolean;
};

type TakepaymentsSettingsResponse = {
	settings: TakepaymentsSettings | null;
};

type UpdateTakepaymentsSettingsInput = {
	merchantId: string;
	gatewayPassword?: string;
	preSharedKey?: string;
	hashMethod: string;
	isActive?: boolean;
};

async function fetchTakepaymentsSettings(): Promise<TakepaymentsSettingsResponse> {
	const response = await fetch(`${API_URL}/api/tenant/takepayments-settings`, {
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch TakePayments settings');
	}
	return response.json();
}

async function updateTakepaymentsSettings(input: UpdateTakepaymentsSettingsInput): Promise<TakepaymentsSettingsResponse> {
	const response = await fetch(`${API_URL}/api/tenant/takepayments-settings`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update TakePayments settings');
	}
	return response.json();
}

async function testTakepaymentsConnection(): Promise<{ success: boolean; message?: string; error?: string }> {
	const response = await fetch(`${API_URL}/api/tenant/takepayments-settings/test`, {
		method: 'POST',
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Test failed');
	}
	return response.json();
}

export function useTakepaymentsSettingsQuery() {
	return useQuery({
		queryKey: ['takepayments-settings'],
		queryFn: fetchTakepaymentsSettings,
	});
}

export function useUpdateTakepaymentsSettingsMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateTakepaymentsSettings,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['takepayments-settings'] });
		},
	});
}

export function useTestTakepaymentsConnectionMutation() {
	return useMutation({
		mutationFn: testTakepaymentsConnection,
	});
}
