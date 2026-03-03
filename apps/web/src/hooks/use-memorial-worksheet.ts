import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type MemorialWorksheet = {
	id: string;
	tenantId: string;
	jobId: string;
	jobNumber: string;
	date: string;
	deceasedName: string | null;
	cemeteryChurchyard: string | null;
	location: string | null;
	existingDescription: string | null;
	requirements: string | null;
	inscription: string | null;
	createdAt: string;
	updatedAt: string;
};

export type UpdateWorksheetInput = {
	date?: string;
	deceasedName?: string;
	cemeteryChurchyard?: string;
	location?: string;
	existingDescription?: string;
	requirements?: string;
	inscription?: string;
};

async function fetchWorksheet(jobId: string): Promise<MemorialWorksheet | null> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/worksheet`, {
		credentials: 'include',
	});

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch worksheet');
	}

	const data = await response.json();
	return data.worksheet;
}

async function createWorksheet(jobId: string): Promise<MemorialWorksheet> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/worksheet`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create worksheet');
	}

	const data = await response.json();
	return data.worksheet;
}

async function updateWorksheet(
	jobId: string,
	input: UpdateWorksheetInput
): Promise<MemorialWorksheet> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/worksheet`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update worksheet');
	}

	const data = await response.json();
	return data.worksheet;
}

export function useMemorialWorksheetQuery(jobId: string | undefined) {
	return useQuery({
		queryKey: ['memorial-worksheet', jobId],
		queryFn: () => fetchWorksheet(jobId!),
		enabled: !!jobId,
	});
}

export function useCreateMemorialWorksheetMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (jobId: string) => createWorksheet(jobId),
		onSuccess: (_, jobId) => {
			queryClient.invalidateQueries({ queryKey: ['memorial-worksheet', jobId] });
		},
	});
}

export function useUpdateMemorialWorksheetMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ jobId, input }: { jobId: string; input: UpdateWorksheetInput }) =>
			updateWorksheet(jobId, input),
		onSuccess: (_, { jobId }) => {
			queryClient.invalidateQueries({ queryKey: ['memorial-worksheet', jobId] });
		},
	});
}
