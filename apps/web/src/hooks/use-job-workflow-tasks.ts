import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { WORKFLOW_TASK_STATUSES, WORKFLOW_STEP_CATEGORIES } from '@griffiths-crm/shared/db/schema';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export type WorkflowTaskStatus = (typeof WORKFLOW_TASK_STATUSES)[number];
export type WorkflowStepCategory = (typeof WORKFLOW_STEP_CATEGORIES)[number];

export type WorkflowTask = {
	id: string;
	tenantId: string;
	jobId: string;
	workflowStepId: string | null;
	name: string;
	description: string | null;
	sortOrder: number;
	status: WorkflowTaskStatus;
	assigneeId: string | null;
	assigneeName: string | null;
	category: string;
	dueDate: string | null;
	completedAt: string | null;
	completedBy: string | null;
	taskDate: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
};

export type AddWorkflowTaskInput = {
	name: string;
	description?: string | null;
	category: WorkflowStepCategory;
	assigneeId?: string | null;
	dueDate?: string | null;
};

export type UpdateWorkflowTaskInput = {
	status?: WorkflowTaskStatus;
	assigneeId?: string | null;
	notes?: string | null;
	taskDate?: string | null;
	dueDate?: string | null;
};

// Fetch functions
async function fetchWorkflowTasks(jobId: string): Promise<WorkflowTask[]> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/workflow-tasks`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch workflow tasks');
	}

	const data: { workflowTasks: WorkflowTask[] } = await response.json();
	return data.workflowTasks;
}

async function completeWorkflowTask(jobId: string, taskId: string): Promise<WorkflowTask> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/workflow-tasks/${taskId}/complete`, {
		method: 'PUT',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to complete workflow task');
	}

	const data: { workflowTask: WorkflowTask } = await response.json();
	return data.workflowTask;
}

async function skipWorkflowTask(jobId: string, taskId: string): Promise<WorkflowTask> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/workflow-tasks/${taskId}/skip`, {
		method: 'PUT',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to skip workflow task');
	}

	const data: { workflowTask: WorkflowTask } = await response.json();
	return data.workflowTask;
}

async function updateWorkflowTask(
	jobId: string,
	taskId: string,
	input: UpdateWorkflowTaskInput
): Promise<WorkflowTask> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/workflow-tasks/${taskId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update workflow task');
	}

	const data: { workflowTask: WorkflowTask } = await response.json();
	return data.workflowTask;
}

async function addWorkflowTask(jobId: string, input: AddWorkflowTaskInput): Promise<WorkflowTask> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/workflow-tasks`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to add workflow task');
	}

	const data: { workflowTask: WorkflowTask } = await response.json();
	return data.workflowTask;
}

async function deleteWorkflowTask(jobId: string, taskId: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/workflow-tasks/${taskId}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete workflow task');
	}
}

// React Query hooks
export function useJobWorkflowTasksQuery(jobId: string | undefined) {
	return useQuery({
		queryKey: ['workflow-tasks', jobId],
		queryFn: () => fetchWorkflowTasks(jobId!),
		enabled: !!jobId,
	});
}

export function useCompleteWorkflowTaskMutation(jobId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (taskId: string) => completeWorkflowTask(jobId, taskId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workflow-tasks', jobId] });
		},
	});
}

export function useSkipWorkflowTaskMutation(jobId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (taskId: string) => skipWorkflowTask(jobId, taskId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workflow-tasks', jobId] });
		},
	});
}

export function useUpdateWorkflowTaskMutation(jobId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ taskId, input }: { taskId: string; input: UpdateWorkflowTaskInput }) =>
			updateWorkflowTask(jobId, taskId, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workflow-tasks', jobId] });
		},
	});
}

export function useAddWorkflowTaskMutation(jobId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: AddWorkflowTaskInput) => addWorkflowTask(jobId, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workflow-tasks', jobId] });
		},
	});
}

export function useDeleteWorkflowTaskMutation(jobId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (taskId: string) => deleteWorkflowTask(jobId, taskId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workflow-tasks', jobId] });
		},
	});
}
