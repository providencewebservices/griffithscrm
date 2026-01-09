import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://localhost:3000';

// Time-off request type
export type TimeOffRequest = {
	id: string;
	tenantId: string;
	userId: string;
	startDate: string;
	endDate: string;
	reason: string | null;
	status: 'pending' | 'approved' | 'rejected';
	reviewedById: string | null;
	reviewedAt: string | null;
	reviewNotes: string | null;
	createdAt: string;
	updatedAt: string;
	// Joined fields
	userName: string | null;
	reviewerName: string | null;
	isOwn: boolean;
};

// Fetch time-off requests
export function useTimeOffRequestsQuery() {
	return useQuery({
		queryKey: ['time-off-requests'],
		queryFn: async (): Promise<TimeOffRequest[]> => {
			const response = await fetch(`${API_URL}/api/time-off`, {
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error('Failed to fetch time-off requests');
			}

			const data = await response.json();
			return data.requests;
		},
	});
}

// Fetch single time-off request
export function useTimeOffRequestQuery(id: string) {
	return useQuery({
		queryKey: ['time-off-request', id],
		queryFn: async (): Promise<TimeOffRequest> => {
			const response = await fetch(`${API_URL}/api/time-off/${id}`, {
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error('Failed to fetch time-off request');
			}

			const data = await response.json();
			return data.request;
		},
		enabled: !!id,
	});
}

// Create time-off request input
export type CreateTimeOffInput = {
	startDate: string;
	endDate: string;
	reason?: string;
};

// Create time-off request mutation
export function useCreateTimeOffMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateTimeOffInput) => {
			const response = await fetch(`${API_URL}/api/time-off`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
				credentials: 'include',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create time-off request');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
			queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
		},
	});
}

// Update time-off request input
export type UpdateTimeOffInput = {
	id: string;
	startDate?: string;
	endDate?: string;
	reason?: string | null;
};

// Update time-off request mutation
export function useUpdateTimeOffMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, ...input }: UpdateTimeOffInput) => {
			const response = await fetch(`${API_URL}/api/time-off/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
				credentials: 'include',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to update time-off request');
			}

			return response.json();
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
			queryClient.invalidateQueries({
				queryKey: ['time-off-request', variables.id],
			});
			queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
		},
	});
}

// Delete time-off request mutation
export function useDeleteTimeOffMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const response = await fetch(`${API_URL}/api/time-off/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete time-off request');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
			queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
		},
	});
}

// Approve time-off request mutation
export type ApproveTimeOffInput = {
	id: string;
	notes?: string;
};

export function useApproveTimeOffMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, notes }: ApproveTimeOffInput) => {
			const response = await fetch(`${API_URL}/api/time-off/${id}/approve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notes }),
				credentials: 'include',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to approve time-off request');
			}

			return response.json();
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
			queryClient.invalidateQueries({
				queryKey: ['time-off-request', variables.id],
			});
			queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
		},
	});
}

// Reject time-off request mutation
export type RejectTimeOffInput = {
	id: string;
	notes?: string;
};

export function useRejectTimeOffMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, notes }: RejectTimeOffInput) => {
			const response = await fetch(`${API_URL}/api/time-off/${id}/reject`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notes }),
				credentials: 'include',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to reject time-off request');
			}

			return response.json();
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
			queryClient.invalidateQueries({
				queryKey: ['time-off-request', variables.id],
			});
			queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
		},
	});
}
