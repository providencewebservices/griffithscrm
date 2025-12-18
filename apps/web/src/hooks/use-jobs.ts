import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { JOB_STATUSES } from '@griffiths-crm/shared/db/schema';

const API_URL = 'http://localhost:3000';

// Types
export type JobStatus = (typeof JOB_STATUSES)[number];

export type JobQuoteSummary = {
	id: string;
	quoteNumber: string;
	total: string;
	customer: {
		id: string;
		firstName: string;
		lastName: string;
	} | null;
	product: {
		id: string;
		name: string;
	} | null;
	service: {
		id: string;
		name: string;
	} | null;
};

export type Job = {
	id: string;
	tenantId: string;
	quoteId: string;
	jobNumber: string;
	status: JobStatus;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
};

export type JobListItem = Job & {
	customerFirstName: string | null;
	customerLastName: string | null;
	serviceName: string | null;
	total: string;
};

export type JobWithQuoteSummary = Job & {
	quote: JobQuoteSummary;
};

export type JobSearchParams = {
	status?: JobStatus;
	search?: string;
};

// Response types
type JobsResponse = {
	jobs: JobListItem[];
};

type JobResponse = {
	job: JobWithQuoteSummary;
};

// Fetch functions
async function fetchJobs(params?: JobSearchParams): Promise<JobListItem[]> {
	const searchParams = new URLSearchParams();
	if (params?.status) searchParams.set('status', params.status);
	if (params?.search) searchParams.set('search', params.search);

	const url = `${API_URL}/api/jobs${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

	const response = await fetch(url, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch jobs');
	}

	const data: JobsResponse = await response.json();
	return data.jobs;
}

async function fetchJob(id: string): Promise<JobWithQuoteSummary> {
	const response = await fetch(`${API_URL}/api/jobs/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch job');
	}

	const data: JobResponse = await response.json();
	return data.job;
}

async function updateJobStatus({
	id,
	status,
}: {
	id: string;
	status: JobStatus;
}): Promise<JobWithQuoteSummary> {
	const response = await fetch(`${API_URL}/api/jobs/${id}/status`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ status }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update job status');
	}

	const data: JobResponse = await response.json();
	return data.job;
}

async function updateJobNotes({
	id,
	notes,
}: {
	id: string;
	notes?: string;
}): Promise<JobWithQuoteSummary> {
	const response = await fetch(`${API_URL}/api/jobs/${id}/notes`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ notes }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update job notes');
	}

	const data: JobResponse = await response.json();
	return data.job;
}

async function deleteJob(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/jobs/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete job');
	}
}

// React Query hooks
export function useJobsQuery(params?: JobSearchParams) {
	return useQuery({
		queryKey: ['jobs', params],
		queryFn: () => fetchJobs(params),
	});
}

export function useJobQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['job', id],
		queryFn: () => fetchJob(id!),
		enabled: !!id,
	});
}

export function useUpdateJobStatusMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateJobStatus,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['jobs'] });
			queryClient.invalidateQueries({ queryKey: ['job', data.id] });
		},
	});
}

export function useUpdateJobNotesMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateJobNotes,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['job', data.id] });
		},
	});
}

export function useDeleteJobMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteJob,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['jobs'] });
		},
	});
}

// Helper: Format status for display
export function formatJobStatus(status: JobStatus): string {
	const statusLabels: Record<JobStatus, string> = {
		pending: 'Pending',
		materials_ordered: 'Materials Ordered',
		in_production: 'In Production',
		ready_for_install: 'Ready for Install',
		installed: 'Installed',
		completed: 'Completed',
	};
	return statusLabels[status] || status;
}

// Helper: Get status color for badges
export function getJobStatusVariant(
	status: JobStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (status) {
		case 'pending':
			return 'secondary';
		case 'materials_ordered':
			return 'outline';
		case 'in_production':
			return 'outline';
		case 'ready_for_install':
			return 'default';
		case 'installed':
			return 'default';
		case 'completed':
			return 'default';
		default:
			return 'secondary';
	}
}

// Helper: Get next status in workflow
export function getNextJobStatus(currentStatus: JobStatus): JobStatus | null {
	const transitions: Record<JobStatus, JobStatus | null> = {
		pending: 'materials_ordered',
		materials_ordered: 'in_production',
		in_production: 'ready_for_install',
		ready_for_install: 'installed',
		installed: 'completed',
		completed: null,
	};
	return transitions[currentStatus];
}

// Helper: Get button label for next status
export function getNextStatusButtonLabel(currentStatus: JobStatus): string | null {
	const labels: Record<JobStatus, string | null> = {
		pending: 'Order Materials',
		materials_ordered: 'Start Production',
		in_production: 'Mark Ready for Install',
		ready_for_install: 'Mark Installed',
		installed: 'Complete Job',
		completed: null,
	};
	return labels[currentStatus];
}

// Re-export for convenience
export { JOB_STATUSES };
