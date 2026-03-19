import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FORM_STATUSES } from '@griffiths-crm/shared/db/schema';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export type FormStatus = (typeof FORM_STATUSES)[number];

export type JobForm = {
	id: string;
	tenantId: string;
	jobId: string;
	name: string;
	status: FormStatus;
	fee: string | null;
	submittedAt: string | null;
	approvedAt: string | null;
	referenceNumber: string | null;
	notes: string | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type AddFormInput = {
	name: string;
	status?: FormStatus;
	fee?: string | null;
	notes?: string | null;
};

export type UpdateFormInput = {
	status?: FormStatus;
	fee?: string | null;
	submittedAt?: string | null;
	approvedAt?: string | null;
	referenceNumber?: string | null;
	notes?: string | null;
};

// Fetch functions
async function fetchJobForms(jobId: string): Promise<JobForm[]> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/forms`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch forms');
	}

	const data: { forms: JobForm[] } = await response.json();
	return data.forms;
}

async function fetchFormSuggestions(): Promise<string[]> {
	const response = await fetch(`${API_URL}/api/jobs/form-suggestions`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch form suggestions');
	}

	const data: { suggestions: string[] } = await response.json();
	return data.suggestions;
}

async function addForm(jobId: string, input: AddFormInput): Promise<JobForm> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/forms`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to add form');
	}

	const data: { form: JobForm } = await response.json();
	return data.form;
}

async function updateForm(jobId: string, formId: string, input: UpdateFormInput): Promise<JobForm> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/forms/${formId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update form');
	}

	const data: { form: JobForm } = await response.json();
	return data.form;
}

async function deleteForm(jobId: string, formId: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/forms/${formId}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete form');
	}
}

// React Query hooks
export function useJobFormsQuery(jobId: string | undefined) {
	return useQuery({
		queryKey: ['job-forms', jobId],
		queryFn: () => fetchJobForms(jobId!),
		enabled: !!jobId,
	});
}

export function useFormSuggestionsQuery() {
	return useQuery({
		queryKey: ['form-suggestions'],
		queryFn: fetchFormSuggestions,
	});
}

export function useAddFormMutation(jobId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: AddFormInput) => addForm(jobId, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['job-forms', jobId] });
		},
	});
}

export function useUpdateFormMutation(jobId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ formId, input }: { formId: string; input: UpdateFormInput }) =>
			updateForm(jobId, formId, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['job-forms', jobId] });
		},
	});
}

export function useDeleteFormMutation(jobId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (formId: string) => deleteForm(jobId, formId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['job-forms', jobId] });
		},
	});
}
