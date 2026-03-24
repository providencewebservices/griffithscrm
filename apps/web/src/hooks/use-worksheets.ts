import { WORKSHEET_STATUSES } from '@griffiths-crm/shared/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export type WorksheetStatus = (typeof WORKSHEET_STATUSES)[number];

export type WorksheetListItem = {
	id: string;
	title: string;
	description: string | null;
	status: WorksheetStatus;
	assigneeId: string | null;
	createdById: string;
	date: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
	assigneeName: string | null;
	taskCount: number;
	taskDoneCount: number;
};

export type WorksheetTask = {
	id: string;
	title: string;
	description: string | null;
	status: string;
	priority: string;
	assigneeId: string | null;
	dueDate: string | null;
	entityType: string | null;
	entityId: string | null;
	sortOrder: number;
	completedAt: string | null;
	createdAt: string;
};

export type WorksheetDetail = {
	id: string;
	tenantId: string;
	title: string;
	description: string | null;
	status: WorksheetStatus;
	assigneeId: string | null;
	createdById: string;
	date: string | null;
	notes: string | null;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
	assigneeName: string | null;
};

export type WorksheetSearchParams = {
	status?: string;
	assigneeId?: string;
	search?: string;
	page?: number;
};

export type CreateWorksheetInput = {
	title: string;
	description?: string;
	assigneeId?: string;
	date?: string;
	notes?: string;
};

export type UpdateWorksheetInput = {
	title?: string;
	description?: string | null;
	assigneeId?: string | null;
	date?: string | null;
	notes?: string | null;
};

// Fetch functions
async function fetchWorksheets(params?: WorksheetSearchParams): Promise<WorksheetListItem[]> {
	const searchParams = new URLSearchParams();
	if (params?.status) searchParams.set('status', params.status);
	if (params?.assigneeId) searchParams.set('assigneeId', params.assigneeId);
	if (params?.search) searchParams.set('search', params.search);
	if (params?.page) searchParams.set('page', params.page.toString());

	const url = `${API_URL}/api/worksheets${searchParams.toString() ? `?${searchParams}` : ''}`;
	const response = await fetch(url, { credentials: 'include' });

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch worksheets');
	}

	const data = await response.json();
	return data.worksheets;
}

async function fetchWorksheet(
	id: string,
): Promise<{ worksheet: WorksheetDetail; tasks: WorksheetTask[] }> {
	const response = await fetch(`${API_URL}/api/worksheets/${id}`, { credentials: 'include' });

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch worksheet');
	}

	return response.json();
}

async function createWorksheet(input: CreateWorksheetInput): Promise<WorksheetDetail> {
	const response = await fetch(`${API_URL}/api/worksheets`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create worksheet');
	}

	const data = await response.json();
	return data.worksheet;
}

async function updateWorksheet({
	id,
	...input
}: UpdateWorksheetInput & { id: string }): Promise<WorksheetDetail> {
	const response = await fetch(`${API_URL}/api/worksheets/${id}`, {
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

async function updateWorksheetStatus({
	id,
	status,
}: {
	id: string;
	status: WorksheetStatus;
}): Promise<WorksheetDetail> {
	const response = await fetch(`${API_URL}/api/worksheets/${id}/status`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ status }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update worksheet status');
	}

	const data = await response.json();
	return data.worksheet;
}

async function archiveWorksheet(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/worksheets/${id}/archive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to archive worksheet');
	}
}

async function addTasksToWorksheet({
	id,
	taskIds,
}: {
	id: string;
	taskIds: string[];
}): Promise<void> {
	const response = await fetch(`${API_URL}/api/worksheets/${id}/tasks`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ taskIds }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to add tasks to worksheet');
	}
}

async function removeTaskFromWorksheet({
	id,
	taskId,
}: {
	id: string;
	taskId: string;
}): Promise<void> {
	const response = await fetch(`${API_URL}/api/worksheets/${id}/tasks/${taskId}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to remove task from worksheet');
	}
}

async function reorderWorksheetTasks({
	id,
	taskIds,
}: {
	id: string;
	taskIds: string[];
}): Promise<void> {
	const response = await fetch(`${API_URL}/api/worksheets/${id}/reorder`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ taskIds }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to reorder tasks');
	}
}

// React Query hooks
export function useWorksheetsQuery(params?: WorksheetSearchParams) {
	return useQuery({
		queryKey: ['worksheets', params],
		queryFn: () => fetchWorksheets(params),
	});
}

export function useWorksheetQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['worksheet', id],
		queryFn: () => fetchWorksheet(id!),
		enabled: !!id,
	});
}

export function useCreateWorksheetMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createWorksheet,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['worksheets'] });
		},
	});
}

export function useUpdateWorksheetMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateWorksheet,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['worksheets'] });
			queryClient.invalidateQueries({ queryKey: ['worksheet', data.id] });
		},
	});
}

export function useUpdateWorksheetStatusMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateWorksheetStatus,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['worksheets'] });
			queryClient.invalidateQueries({ queryKey: ['worksheet', data.id] });
		},
	});
}

export function useArchiveWorksheetMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: archiveWorksheet,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['worksheets'] });
			queryClient.invalidateQueries({ queryKey: ['tasks'] });
		},
	});
}

export function useAddTasksToWorksheetMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: addTasksToWorksheet,
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
			queryClient.invalidateQueries({ queryKey: ['worksheets'] });
			queryClient.invalidateQueries({ queryKey: ['tasks'] });
		},
	});
}

export function useRemoveTaskFromWorksheetMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: removeTaskFromWorksheet,
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
			queryClient.invalidateQueries({ queryKey: ['worksheets'] });
			queryClient.invalidateQueries({ queryKey: ['tasks'] });
		},
	});
}

export function useReorderWorksheetTasksMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: reorderWorksheetTasks,
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['worksheet', id] });
		},
	});
}

// Helpers
export function formatWorksheetStatus(status: WorksheetStatus): string {
	const labels: Record<WorksheetStatus, string> = {
		draft: 'Draft',
		active: 'Active',
		completed: 'Completed',
	};
	return labels[status] || status;
}

export function getWorksheetStatusVariant(
	status: WorksheetStatus,
): 'default' | 'secondary' | 'outline' {
	switch (status) {
		case 'draft':
			return 'secondary';
		case 'active':
			return 'default';
		case 'completed':
			return 'outline';
		default:
			return 'secondary';
	}
}

export { WORKSHEET_STATUSES };
