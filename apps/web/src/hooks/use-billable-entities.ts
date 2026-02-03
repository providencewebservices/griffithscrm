import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export type PayerType = 'customer' | 'funeral_director';

export type BillableEntity = {
	id: string;
	displayName: string;
	entityType: PayerType;
	// Customer-specific fields (optional)
	firstName?: string;
	lastName?: string;
	// Funeral director-specific fields (optional)
	businessName?: string;
	tradingName?: string | null;
};

type BillableEntitiesResponse = {
	entities: BillableEntity[];
};

// Fetch function
async function fetchBillableEntities(): Promise<BillableEntity[]> {
	const response = await fetch(`${API_URL}/api/quotes/billable-entities`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch billable entities');
	}

	const data: BillableEntitiesResponse = await response.json();
	return data.entities;
}

// React Query hook
export function useBillableEntitiesQuery() {
	return useQuery({
		queryKey: ['billable-entities'],
		queryFn: fetchBillableEntities,
	});
}
