import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	TASK_STATUSES,
	TASK_PRIORITIES,
	TASK_ENTITY_TYPES,
} from '@griffiths-crm/shared/db/schema';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskEntityType = (typeof TASK_ENTITY_TYPES)[number];

export type TaskListItem = {
	id: string;
	title: string;
	description: string | null;
	status: TaskStatus;
	priority: TaskPriority;
	assigneeId: string | null;
	createdById: string;
	dueDate: string | null;
	entityType: string | null;
	entityId: string | null;
	worksheetId: string | null;
	sortOrder: number;
	completedAt: string | null;
	createdAt: string;
	updatedAt: string;
	assigneeName: string | null;
};

export type TaskDetail = TaskListItem & {
	tenantId: string;
	completedById: string | null;
	archivedAt: string | null;
};

export type TaskSummary = {
	myOpenCount: number;
	myOverdueCount: number;
	myDueTodayCount: number;
	urgentTasks: {
		id: string;
		title: string;
		status: string;
		priority: string;
		dueDate: string | null;
		entityType: string | null;
		entityId: string | null;
	}[];
};

export type TaskSearchParams = {
	status?: string;
	assigneeId?: string;
	entityType?: string;
	entityId?: string;
	worksheetId?: string;
	search?: string;
	page?: number;
};

export type CreateTaskInput = {
	title: string;
	description?: string;
	priority?: TaskPriority;
	assigneeId?: string;
	dueDate?: string;
	entityType?: TaskEntityType;
	entityId?: string;
	worksheetId?: string;
};

export type UpdateTaskInput = {
	title?: string;
	description?: string | null;
	priority?: TaskPriority;
	assigneeId?: string | null;
	dueDate?: string | null;
	entityType?: TaskEntityType | null;
	entityId?: string | null;
	worksheetId?: string | null;
	sortOrder?: number;
};

// Fetch functions
async function fetchTasks(params?: TaskSearchParams): Promise<TaskListItem[]> {
	const searchParams = new URLSearchParams();
	if (params?.status) searchParams.set('status', params.status);
	if (params?.assigneeId) searchParams.set('assigneeId', params.assigneeId);
	if (params?.entityType) searchParams.set('entityType', params.entityType);
	if (params?.entityId) searchParams.set('entityId', params.entityId);
	if (params?.worksheetId) searchParams.set('worksheetId', params.worksheetId);
	if (params?.search) searchParams.set('search', params.search);
	if (params?.page) searchParams.set('page', params.page.toString());

	const url = `${API_URL}/api/tasks${searchParams.toString() ? `?${searchParams}` : ''}`;
	const response = await fetch(url, { credentials: 'include' });

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch tasks');
	}

	const data = await response.json();
	return data.tasks;
}

async function fetchTask(id: string): Promise<TaskDetail> {
	const response = await fetch(`${API_URL}/api/tasks/${id}`, { credentials: 'include' });

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch task');
	}

	const data = await response.json();
	return data.task;
}

async function fetchTaskSummary(): Promise<TaskSummary> {
	const response = await fetch(`${API_URL}/api/tasks/my/summary`, { credentials: 'include' });

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch task summary');
	}

	return response.json();
}

async function createTask(input: CreateTaskInput): Promise<TaskDetail> {
	const response = await fetch(`${API_URL}/api/tasks`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create task');
	}

	const data = await response.json();
	return data.task;
}

async function updateTask({ id, ...input }: UpdateTaskInput & { id: string }): Promise<TaskDetail> {
	const response = await fetch(`${API_URL}/api/tasks/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update task');
	}

	const data = await response.json();
	return data.task;
}

async function updateTaskStatus({ id, status }: { id: string; status: TaskStatus }): Promise<TaskDetail> {
	const response = await fetch(`${API_URL}/api/tasks/${id}/status`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ status }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update task status');
	}

	const data = await response.json();
	return data.task;
}

async function archiveTask(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tasks/${id}/archive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to archive task');
	}
}

// React Query hooks
export function useTasksQuery(params?: TaskSearchParams) {
	return useQuery({
		queryKey: ['tasks', params],
		queryFn: () => fetchTasks(params),
	});
}

export function useTaskQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['task', id],
		queryFn: () => fetchTask(id!),
		enabled: !!id,
	});
}

export function useTaskSummaryQuery() {
	return useQuery({
		queryKey: ['task-summary'],
		queryFn: fetchTaskSummary,
		refetchInterval: 60000,
	});
}

export function useCreateTaskMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createTask,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tasks'] });
			queryClient.invalidateQueries({ queryKey: ['task-summary'] });
			queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
		},
	});
}

export function useUpdateTaskMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateTask,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['tasks'] });
			queryClient.invalidateQueries({ queryKey: ['task', data.id] });
			queryClient.invalidateQueries({ queryKey: ['task-summary'] });
		},
	});
}

export function useUpdateTaskStatusMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateTaskStatus,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['tasks'] });
			queryClient.invalidateQueries({ queryKey: ['task', data.id] });
			queryClient.invalidateQueries({ queryKey: ['task-summary'] });
			queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
			queryClient.invalidateQueries({ queryKey: ['worksheets'] });
			queryClient.invalidateQueries({ queryKey: ['worksheet'] });
		},
	});
}

export function useArchiveTaskMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: archiveTask,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tasks'] });
			queryClient.invalidateQueries({ queryKey: ['task-summary'] });
			queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
		},
	});
}

// Helpers
export function formatTaskStatus(status: TaskStatus): string {
	const labels: Record<TaskStatus, string> = {
		todo: 'To Do',
		in_progress: 'In Progress',
		done: 'Done',
	};
	return labels[status] || status;
}

export function getTaskStatusVariant(status: TaskStatus): 'default' | 'secondary' | 'outline' {
	switch (status) {
		case 'todo': return 'secondary';
		case 'in_progress': return 'outline';
		case 'done': return 'default';
		default: return 'secondary';
	}
}

export function formatTaskPriority(priority: TaskPriority): string {
	const labels: Record<TaskPriority, string> = {
		low: 'Low',
		normal: 'Normal',
		high: 'High',
		urgent: 'Urgent',
	};
	return labels[priority] || priority;
}

export function getTaskPriorityVariant(priority: TaskPriority): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (priority) {
		case 'low': return 'secondary';
		case 'normal': return 'outline';
		case 'high': return 'default';
		case 'urgent': return 'destructive';
		default: return 'outline';
	}
}

export function formatEntityType(type: string): string {
	const labels: Record<string, string> = {
		job: 'Job',
		quote: 'Quote',
		customer: 'Customer',
	};
	return labels[type] || type;
}

export { TASK_STATUSES, TASK_PRIORITIES, TASK_ENTITY_TYPES };
