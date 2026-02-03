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

export type PreferredContactMethod = 'email' | 'phone' | 'mobile' | 'post';
export type PreferredContactTime = 'morning' | 'afternoon' | 'evening';

export type Customer = {
	id: string;
	firstName: string;
	lastName: string;
	tenantId: string;
	// Communication Preferences
	preferredContactMethod: PreferredContactMethod | null;
	preferredContactTime: PreferredContactTime | null;
	doNotCall: boolean;
	doNotEmail: boolean;
	doNotMail: boolean;
	communicationNotes: string | null;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type CustomerWithRelations = Customer & {
	contactInfo: ContactInfo[];
	addresses: Address[];
};

export type CustomerListItem = Customer & {
	primaryEmail: ContactInfo | null;
	primaryPhone: ContactInfo | null;
	primaryAddress: Address | null;
};

type CustomersResponse = {
	customers: CustomerListItem[];
};

type CustomerResponse = {
	customer: CustomerWithRelations;
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

export type CreateCustomerInput = {
	firstName: string;
	lastName: string;
	contactInfo?: ContactInfoInput[];
	addresses?: AddressInput[];
};

export type UpdateCustomerInput = {
	firstName?: string;
	lastName?: string;
	contactInfo?: ContactInfoInput[];
	addresses?: AddressInput[];
};

export type CustomerSearchParams = {
	q?: string;
	archivedOnly?: boolean;
};

export type CommunicationPreferencesInput = {
	preferredContactMethod?: PreferredContactMethod | null;
	preferredContactTime?: PreferredContactTime | null;
	doNotCall?: boolean;
	doNotEmail?: boolean;
	doNotMail?: boolean;
	communicationNotes?: string | null;
};

// Fetch functions
async function fetchCustomers(params?: CustomerSearchParams): Promise<CustomerListItem[]> {
	const searchParams = new URLSearchParams();
	if (params?.q) searchParams.set('q', params.q);
	if (params?.archivedOnly) searchParams.set('archivedOnly', 'true');

	const url = `${API_URL}/api/customers${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

	const response = await fetch(url, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch customers');
	}

	const data: CustomersResponse = await response.json();
	return data.customers;
}

async function fetchCustomer(id: string): Promise<CustomerWithRelations> {
	const response = await fetch(`${API_URL}/api/customers/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch customer');
	}

	const data: CustomerResponse = await response.json();
	return data.customer;
}

async function createCustomer(input: CreateCustomerInput): Promise<CustomerWithRelations> {
	const response = await fetch(`${API_URL}/api/customers`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create customer');
	}

	const data: CustomerResponse = await response.json();
	return data.customer;
}

async function updateCustomer({
	id,
	...input
}: UpdateCustomerInput & { id: string }): Promise<CustomerWithRelations> {
	const response = await fetch(`${API_URL}/api/customers/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update customer');
	}

	const data: CustomerResponse = await response.json();
	return data.customer;
}

async function archiveCustomer(id: string): Promise<Customer> {
	const response = await fetch(`${API_URL}/api/customers/${id}/archive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to archive customer');
	}

	const data: { customer: Customer } = await response.json();
	return data.customer;
}

async function unarchiveCustomer(id: string): Promise<Customer> {
	const response = await fetch(`${API_URL}/api/customers/${id}/unarchive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to unarchive customer');
	}

	const data: { customer: Customer } = await response.json();
	return data.customer;
}

async function updateCommunicationPreferences({
	id,
	...input
}: CommunicationPreferencesInput & { id: string }): Promise<Customer> {
	const response = await fetch(`${API_URL}/api/customers/${id}/preferences`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update communication preferences');
	}

	const data: { customer: Customer } = await response.json();
	return data.customer;
}

// React Query hooks
export function useCustomersQuery(params?: CustomerSearchParams) {
	return useQuery({
		queryKey: ['customers', params],
		queryFn: () => fetchCustomers(params),
		placeholderData: keepPreviousData,
	});
}

export function useCustomerQuery(id: string) {
	return useQuery({
		queryKey: ['customer', id],
		queryFn: () => fetchCustomer(id),
		enabled: !!id,
	});
}

export function useCreateCustomerMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createCustomer,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customers'] });
		},
	});
}

export function useUpdateCustomerMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateCustomer,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['customers'] });
			queryClient.invalidateQueries({ queryKey: ['customer', data.id] });
		},
	});
}

export function useArchiveCustomerMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: archiveCustomer,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customers'] });
		},
	});
}

export function useUnarchiveCustomerMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: unarchiveCustomer,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customers'] });
		},
	});
}

export function useUpdateCommunicationPreferencesMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateCommunicationPreferences,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['customers'] });
			queryClient.invalidateQueries({ queryKey: ['customer', data.id] });
		},
	});
}
