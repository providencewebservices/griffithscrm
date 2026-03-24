import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type WorkflowStep = {
	id: string;
	tenantId: string;
	templateId: string;
	name: string;
	description: string | null;
	sortOrder: number;
	defaultAssigneeId: string | null;
	category: string;
	requiresDate: boolean;
	dateFieldLabel: string | null;
	createdAt: string;
	updatedAt: string;
};

export type WorkflowTemplate = {
	id: string;
	tenantId: string;
	name: string;
	quoteType: string;
	productionMethod: string | null;
	isActive: boolean;
	stepCount: number;
	createdAt: string;
	updatedAt: string;
};

export type WorkflowTemplateWithSteps = Omit<WorkflowTemplate, 'stepCount'> & {
	steps: WorkflowStep[];
};

export type CreateTemplateInput = {
	name: string;
	quoteType: string;
	productionMethod?: string | null;
};

export type UpdateTemplateInput = {
	name?: string;
	isActive?: boolean;
};

export type CreateStepInput = {
	name: string;
	description?: string | null;
	sortOrder: number;
	category: string;
	defaultAssigneeId?: string | null;
	requiresDate?: boolean;
	dateFieldLabel?: string | null;
};

export type UpdateStepInput = {
	name?: string;
	description?: string | null;
	category?: string;
	defaultAssigneeId?: string | null;
	requiresDate?: boolean;
	dateFieldLabel?: string | null;
};

export type ReorderStepInput = {
	id: string;
	sortOrder: number;
};

// Fetch functions

async function fetchWorkflowTemplates(): Promise<WorkflowTemplate[]> {
	const response = await fetch(`${API_URL}/api/tenant/workflow-templates`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch workflow templates');
	}

	const data: { workflowTemplates: WorkflowTemplate[] } = await response.json();
	return data.workflowTemplates;
}

async function fetchWorkflowTemplate(id: string): Promise<WorkflowTemplateWithSteps> {
	const response = await fetch(`${API_URL}/api/tenant/workflow-templates/${id}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch workflow template');
	}

	const data: { workflowTemplate: WorkflowTemplateWithSteps } = await response.json();
	return data.workflowTemplate;
}

async function createTemplate(input: CreateTemplateInput): Promise<WorkflowTemplate> {
	const response = await fetch(`${API_URL}/api/tenant/workflow-templates`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create workflow template');
	}

	const data: { workflowTemplate: WorkflowTemplate } = await response.json();
	return data.workflowTemplate;
}

async function updateTemplate({
	id,
	...input
}: UpdateTemplateInput & { id: string }): Promise<WorkflowTemplate> {
	const response = await fetch(`${API_URL}/api/tenant/workflow-templates/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update workflow template');
	}

	const data: { workflowTemplate: WorkflowTemplate } = await response.json();
	return data.workflowTemplate;
}

async function createStep({
	templateId,
	...input
}: CreateStepInput & { templateId: string }): Promise<WorkflowStep> {
	const response = await fetch(`${API_URL}/api/tenant/workflow-templates/${templateId}/steps`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create workflow step');
	}

	const data: { workflowStep: WorkflowStep } = await response.json();
	return data.workflowStep;
}

async function updateStep({
	templateId,
	stepId,
	...input
}: UpdateStepInput & { templateId: string; stepId: string }): Promise<WorkflowStep> {
	const response = await fetch(
		`${API_URL}/api/tenant/workflow-templates/${templateId}/steps/${stepId}`,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(input),
		},
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update workflow step');
	}

	const data: { workflowStep: WorkflowStep } = await response.json();
	return data.workflowStep;
}

async function deleteStep({
	templateId,
	stepId,
}: {
	templateId: string;
	stepId: string;
}): Promise<void> {
	const response = await fetch(
		`${API_URL}/api/tenant/workflow-templates/${templateId}/steps/${stepId}`,
		{
			method: 'DELETE',
			credentials: 'include',
		},
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete workflow step');
	}
}

async function reorderSteps({
	templateId,
	steps,
}: {
	templateId: string;
	steps: ReorderStepInput[];
}): Promise<WorkflowStep[]> {
	const response = await fetch(
		`${API_URL}/api/tenant/workflow-templates/${templateId}/steps/reorder`,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ steps }),
		},
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to reorder workflow steps');
	}

	const data: { workflowSteps: WorkflowStep[] } = await response.json();
	return data.workflowSteps;
}

async function seedTemplates(): Promise<{ message: string; templatesCreated: number }> {
	const response = await fetch(`${API_URL}/api/tenant/workflow-templates/seed`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to seed workflow templates');
	}

	return response.json();
}

// Query hooks

export function useWorkflowTemplatesQuery() {
	return useQuery({
		queryKey: ['workflow-templates'],
		queryFn: fetchWorkflowTemplates,
	});
}

export function useWorkflowTemplateQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['workflow-template', id],
		queryFn: () => fetchWorkflowTemplate(id!),
		enabled: !!id,
	});
}

// Mutation hooks

export function useCreateTemplateMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createTemplate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
		},
	});
}

export function useUpdateTemplateMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateTemplate,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
			queryClient.invalidateQueries({ queryKey: ['workflow-template', variables.id] });
		},
	});
}

export function useCreateStepMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createStep,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
			queryClient.invalidateQueries({ queryKey: ['workflow-template', variables.templateId] });
		},
	});
}

export function useUpdateStepMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateStep,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workflow-template', variables.templateId] });
		},
	});
}

export function useDeleteStepMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteStep,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
			queryClient.invalidateQueries({ queryKey: ['workflow-template', variables.templateId] });
		},
	});
}

export function useReorderStepsMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: reorderSteps,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['workflow-template', variables.templateId] });
		},
	});
}

export function useSeedTemplatesMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: seedTemplates,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
		},
	});
}
