import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types for pipeline items
export type PipelineQuoteItem = {
	id: string;
	quoteNumber: string;
	customerName: string;
	total: string;
	status: string;
	updatedAt: string;
};

export type PipelineJobItem = {
	id: string;
	jobNumber: string;
	customerName: string;
	total: string;
	status: string;
	paymentStatus: string;
	updatedAt: string;
};

export type PipelineColumn<T> = {
	id: string;
	label: string;
	statuses: readonly string[];
	color: string;
	count: number;
	totalValue: string;
	items: T[];
};

export type PipelineData = {
	quotes: {
		columns: PipelineColumn<PipelineQuoteItem>[];
	};
	jobs: {
		columns: PipelineColumn<PipelineJobItem>[];
	};
};

// Fetch function
async function fetchPipelineData(): Promise<PipelineData> {
	const response = await fetch(`${API_URL}/api/dashboard/pipeline`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch pipeline data');
	}

	return response.json();
}

// React Query hook
export function usePipelineQuery() {
	return useQuery({
		queryKey: ['dashboard-pipeline'],
		queryFn: fetchPipelineData,
		refetchInterval: 60000, // Refresh every minute
	});
}

// Helper: Format currency
export function formatCurrency(value: string) {
	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'GBP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(parseFloat(value));
}
