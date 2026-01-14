import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { JOB_STATUSES } from '@griffiths-crm/shared/db/schema';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export type JobStatus = (typeof JOB_STATUSES)[number];

// Quote detail types for job execution
export type JobQuoteComponent = {
	id: string;
	componentType: string;
	materialName: string | null;
	finishName: string | null;
	height: string | null;
	width: string | null;
	depth: string | null;
	quantity: number;
};

export type JobQuoteLettering = {
	id: string;
	text: string | null;
	letterCount: number;
	techniqueName: string | null;
	colorName: string | null;
};

export type JobQuoteSundry = {
	id: string;
	sundryName: string | null;
	quantity: number;
};

export type JobQuoteLineItem = {
	id: string;
	description: string;
	price: string;
	vatExempt: boolean;
};

export type JobQuoteSummary = {
	id: string;
	quoteNumber: string;
	total: string;
	proposedInscription: string | null;
	flowerHoles: string | null;
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
	components: JobQuoteComponent[];
	lettering: JobQuoteLettering[];
	sundries: JobQuoteSundry[];
	lineItems: JobQuoteLineItem[];
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

export type JobPaymentSummary = {
	totalAmount: string;
	paidAmount: string;
	outstandingAmount: string;
	hasOverdue: boolean;
};

export type JobListItem = Job & {
	customerFirstName: string | null;
	customerLastName: string | null;
	total: string;
	paymentSummary: JobPaymentSummary | null;
};

export type JobWithQuoteSummary = Job & {
	quote: JobQuoteSummary;
};

export type JobSearchParams = {
	status?: JobStatus;
	search?: string;
};

// Payment schedule types
export type PaymentScheduleItem = {
	id: string;
	tenantId: string;
	jobId: string;
	description: string;
	amount: string;
	dueDate: string | null;
	paidAmount: string;
	paidAt: string | null;
	paymentMethod: string | null;
	externalPaymentId: string | null;
	sortOrder: number;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
};

export type PaymentScheduleSummary = {
	totalAmount: string;
	paidAmount: string;
	outstandingAmount: string;
	hasOverdue: boolean;
};

export type PaymentScheduleResponse = {
	paymentSchedule: PaymentScheduleItem[];
	summary: PaymentScheduleSummary;
};

export type CreatePaymentScheduleItemInput = {
	description: string;
	amount: string;
	dueDate?: string | null;
	notes?: string;
};

export type UpdatePaymentScheduleItemInput = {
	description?: string;
	amount?: string;
	dueDate?: string | null;
	paidAmount?: string;
	paidAt?: string | null;
	paymentMethod?: string | null;
	notes?: string | null;
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

// Payment schedule fetch functions
async function fetchPaymentSchedule(jobId: string): Promise<PaymentScheduleResponse> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/payment-schedule`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch payment schedule');
	}

	return response.json();
}

async function createPaymentScheduleItem(
	jobId: string,
	input: CreatePaymentScheduleItemInput
): Promise<PaymentScheduleItem> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/payment-schedule`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create payment schedule item');
	}

	const data = await response.json();
	return data.paymentScheduleItem;
}

async function updatePaymentScheduleItem(
	jobId: string,
	itemId: string,
	input: UpdatePaymentScheduleItemInput
): Promise<PaymentScheduleItem> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/payment-schedule/${itemId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update payment schedule item');
	}

	const data = await response.json();
	return data.paymentScheduleItem;
}

async function deletePaymentScheduleItem(jobId: string, itemId: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/payment-schedule/${itemId}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete payment schedule item');
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

// Payment schedule hooks
export function usePaymentScheduleQuery(jobId: string | undefined) {
	return useQuery({
		queryKey: ['payment-schedule', jobId],
		queryFn: () => fetchPaymentSchedule(jobId!),
		enabled: !!jobId,
	});
}

export function useCreatePaymentScheduleItemMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ jobId, input }: { jobId: string; input: CreatePaymentScheduleItemInput }) =>
			createPaymentScheduleItem(jobId, input),
		onSuccess: (_, { jobId }) => {
			queryClient.invalidateQueries({ queryKey: ['payment-schedule', jobId] });
		},
	});
}

export function useUpdatePaymentScheduleItemMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			jobId,
			itemId,
			input,
		}: {
			jobId: string;
			itemId: string;
			input: UpdatePaymentScheduleItemInput;
		}) => updatePaymentScheduleItem(jobId, itemId, input),
		onSuccess: (_, { jobId }) => {
			queryClient.invalidateQueries({ queryKey: ['payment-schedule', jobId] });
		},
	});
}

export function useDeletePaymentScheduleItemMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ jobId, itemId }: { jobId: string; itemId: string }) =>
			deletePaymentScheduleItem(jobId, itemId),
		onSuccess: (_, { jobId }) => {
			queryClient.invalidateQueries({ queryKey: ['payment-schedule', jobId] });
		},
	});
}

// ============================================
// ATTACHMENT TYPES AND HOOKS
// ============================================

export type JobAttachmentCategory = 'artwork' | 'proof' | 'document';

export type JobAttachment = {
	id: string;
	tenantId: string;
	jobId: string;
	category: JobAttachmentCategory;
	filename: string;
	s3Key: string;
	contentType: string;
	size: number | null;
	notes: string | null;
	uploadedBy: string | null;
	createdAt: string;
	publicUrl: string;
};

export type PresignAttachmentInput = {
	filename: string;
	contentType: string;
	category: JobAttachmentCategory;
};

export type PresignAttachmentResponse = {
	uploadUrl: string;
	publicUrl: string;
	key: string;
	attachmentId: string;
};

export type ConfirmAttachmentInput = {
	s3Key: string;
	filename: string;
	contentType: string;
	category: JobAttachmentCategory;
	size?: number;
	notes?: string;
};

type AttachmentsResponse = {
	attachments: JobAttachment[];
};

// Attachment fetch functions
async function fetchAttachments(jobId: string): Promise<JobAttachment[]> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/attachments`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch attachments');
	}

	const data: AttachmentsResponse = await response.json();
	return data.attachments;
}

async function presignAttachment(
	jobId: string,
	input: PresignAttachmentInput
): Promise<PresignAttachmentResponse> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/attachments/presign`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to get upload URL');
	}

	return response.json();
}

async function confirmAttachment(
	jobId: string,
	input: ConfirmAttachmentInput
): Promise<JobAttachment> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/attachments`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to save attachment');
	}

	const data = await response.json();
	return data.attachment;
}

async function deleteAttachment(jobId: string, attachmentId: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/attachments/${attachmentId}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete attachment');
	}
}

// Attachment hooks
export function useAttachmentsQuery(jobId: string | undefined) {
	return useQuery({
		queryKey: ['attachments', jobId],
		queryFn: () => fetchAttachments(jobId!),
		enabled: !!jobId,
	});
}

export function usePresignAttachmentMutation() {
	return useMutation({
		mutationFn: ({ jobId, input }: { jobId: string; input: PresignAttachmentInput }) =>
			presignAttachment(jobId, input),
	});
}

export function useConfirmAttachmentMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ jobId, input }: { jobId: string; input: ConfirmAttachmentInput }) =>
			confirmAttachment(jobId, input),
		onSuccess: (_, { jobId }) => {
			queryClient.invalidateQueries({ queryKey: ['attachments', jobId] });
		},
	});
}

export function useDeleteAttachmentMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ jobId, attachmentId }: { jobId: string; attachmentId: string }) =>
			deleteAttachment(jobId, attachmentId),
		onSuccess: (_, { jobId }) => {
			queryClient.invalidateQueries({ queryKey: ['attachments', jobId] });
		},
	});
}

// Helper: Format attachment category for display
export function formatAttachmentCategory(category: JobAttachmentCategory): string {
	const labels: Record<JobAttachmentCategory, string> = {
		artwork: 'Artwork',
		proof: 'Proof',
		document: 'Document',
	};
	return labels[category] || category;
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
