import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export type QuoteStatus = 'draft' | 'review' | 'ready' | 'presented' | 'accepted' | 'rejected' | 'expired';
export type JobStatus = 'pending' | 'materials_ordered' | 'in_production' | 'ready_for_install' | 'installed' | 'completed';

export type RecentQuote = {
	id: string;
	quoteNumber: string;
	status: QuoteStatus;
	total: string;
	customerName: string;
	updatedAt: string;
};

export type RecentJob = {
	id: string;
	jobNumber: string;
	status: JobStatus;
	total: string;
	customerName: string;
	paidAmount: string;
	totalPaymentAmount: string;
	updatedAt: string;
};

export type DashboardStats = {
	quotes: {
		byStatus: Record<QuoteStatus, number>;
		awaitingDecision: number;
	};
	jobs: {
		byStatus: Record<JobStatus, number>;
		stalled: number;
	};
	payments: {
		overdueCount: number;
		overdueAmount: string;
	};
	recent: {
		quotes: RecentQuote[];
		jobs: RecentJob[];
	};
};

// Fetch function
async function fetchDashboardStats(): Promise<DashboardStats> {
	const response = await fetch(`${API_URL}/api/dashboard/stats`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch dashboard stats');
	}

	return response.json();
}

// React Query hook
export function useDashboardQuery() {
	return useQuery({
		queryKey: ['dashboard-stats'],
		queryFn: fetchDashboardStats,
		refetchInterval: 60000, // Refresh every minute
	});
}

// Helper: Format relative time
export function formatTimeAgo(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 60) {
		return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
	} else if (diffHours < 24) {
		return `${diffHours}h ago`;
	} else if (diffDays < 7) {
		return `${diffDays}d ago`;
	} else {
		return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	}
}
