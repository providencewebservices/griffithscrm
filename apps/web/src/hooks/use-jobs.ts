import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { JOB_STATUSES, ACCOUNT_STATUSES, REVIEW_OUTCOMES } from '@griffiths-crm/shared/db/schema';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export type JobStatus = (typeof JOB_STATUSES)[number];
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export type ReviewOutcome = (typeof REVIEW_OUTCOMES)[number];

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
	quoteType: string;
	existingMemorialDescription: string | null;
	relatedJobId: string | null;
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
	productionMethod: string | null;
	proposedDeliveryDate: string | null;
	refixingDate: string | null;
	jobStartDate: string | null;
	ashesDate: string | null;
	installationDate: string | null;
	deadline: string | null;
	invoicedAt: string | null;
	invoiceNumber: string | null;
	accountStatus: string | null;
	reviewCompletedAt: string | null;
	reviewCompletedBy: string | null;
	reviewNotes: string | null;
	reviewOutcome: string | null;
	depositStatus: string | null;
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
	page?: number;
	limit?: number;
};

export type Pagination = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
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
	takepaymentsCrossReference: string | null;
	takepaymentsStatusCode: number | null;
	cardLastFour: string | null;
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
	pagination: Pagination;
};

type JobResponse = {
	job: JobWithQuoteSummary;
};

// Fetch functions
async function fetchJobs(params?: JobSearchParams): Promise<JobsResponse> {
	const searchParams = new URLSearchParams();
	if (params?.status) searchParams.set('status', params.status);
	if (params?.search) searchParams.set('search', params.search);
	if (params?.page) searchParams.set('page', String(params.page));
	if (params?.limit) searchParams.set('limit', String(params.limit));

	const url = `${API_URL}/api/jobs${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

	const response = await fetch(url, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch jobs');
	}

	const data: JobsResponse = await response.json();
	return data;
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
		placeholderData: (prev) => prev,
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

// ============================================
// DATE UPDATE HOOKS
// ============================================

export type UpdateJobDatesInput = {
	proposedDeliveryDate?: string | null;
	refixingDate?: string | null;
	jobStartDate?: string | null;
	ashesDate?: string | null;
	installationDate?: string | null;
};

async function updateJobDates({
	id,
	dates,
}: {
	id: string;
	dates: UpdateJobDatesInput;
}): Promise<JobWithQuoteSummary> {
	const response = await fetch(`${API_URL}/api/jobs/${id}/dates`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(dates),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update dates');
	}

	const data: JobResponse = await response.json();
	return data.job;
}

export function useUpdateJobDatesMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateJobDates,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['jobs'] });
			queryClient.invalidateQueries({ queryKey: ['job', data.id] });
		},
	});
}

// ============================================
// INVOICING HOOKS
// ============================================

async function markJobInvoiced({
	id,
	invoiceNumber,
}: {
	id: string;
	invoiceNumber?: string;
}): Promise<JobWithQuoteSummary> {
	const response = await fetch(`${API_URL}/api/jobs/${id}/invoice`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ invoiceNumber }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to mark as invoiced');
	}

	const data: JobResponse = await response.json();
	return data.job;
}

async function updateAccountStatus({
	id,
	accountStatus,
}: {
	id: string;
	accountStatus: AccountStatus;
}): Promise<JobWithQuoteSummary> {
	const response = await fetch(`${API_URL}/api/jobs/${id}/account-status`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ accountStatus }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update account status');
	}

	const data: JobResponse = await response.json();
	return data.job;
}

async function recalculateAccountStatus(id: string): Promise<JobWithQuoteSummary> {
	const response = await fetch(`${API_URL}/api/jobs/${id}/recalculate-account-status`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to recalculate account status');
	}

	const data: JobResponse = await response.json();
	return data.job;
}

export function useMarkInvoicedMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: markJobInvoiced,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['jobs'] });
			queryClient.invalidateQueries({ queryKey: ['job', data.id] });
		},
	});
}

export function useUpdateAccountStatusMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateAccountStatus,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['jobs'] });
			queryClient.invalidateQueries({ queryKey: ['job', data.id] });
		},
	});
}

export function useRecalculateAccountStatusMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: recalculateAccountStatus,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['jobs'] });
			queryClient.invalidateQueries({ queryKey: ['job', data.id] });
		},
	});
}

// ============================================
// POST-SALES REVIEW HOOKS
// ============================================

async function submitReview({
	id,
	reviewOutcome,
	reviewNotes,
}: {
	id: string;
	reviewOutcome: ReviewOutcome;
	reviewNotes?: string;
}): Promise<JobWithQuoteSummary> {
	const response = await fetch(`${API_URL}/api/jobs/${id}/review`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ reviewOutcome, reviewNotes }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to submit review');
	}

	const data: JobResponse = await response.json();
	return data.job;
}

export function useSubmitReviewMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: submitReview,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['jobs'] });
			queryClient.invalidateQueries({ queryKey: ['job', data.id] });
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

// ============================================
// PAYMENT INTEGRATION TYPES AND HOOKS
// ============================================

export type InitiatePaymentResponse = {
	formAction: string;
	formFields: Record<string, string>;
};

export type GeneratePaymentLinkResponse = {
	paymentUrl: string;
};

async function initiatePayment(milestoneId: string): Promise<InitiatePaymentResponse> {
	const response = await fetch(`${API_URL}/api/payments/initiate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ milestoneId }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to initiate payment');
	}
	return response.json();
}

async function generatePaymentLink(milestoneId: string): Promise<GeneratePaymentLinkResponse> {
	const response = await fetch(`${API_URL}/api/payments/generate-link`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ milestoneId }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to generate payment link');
	}
	return response.json();
}

export function useInitiatePaymentMutation() {
	return useMutation({
		mutationFn: (milestoneId: string) => initiatePayment(milestoneId),
	});
}

export function useGeneratePaymentLinkMutation() {
	return useMutation({
		mutationFn: (milestoneId: string) => generatePaymentLink(milestoneId),
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
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
	switch (status) {
		case 'pending':
			return 'warning';
		case 'materials_ordered':
			return 'outline';
		case 'in_production':
			return 'default';
		case 'ready_for_install':
			return 'secondary';
		case 'installed':
			return 'success';
		case 'completed':
			return 'success';
		default:
			return 'secondary';
	}
}

// Helper: Get additional className for status badges to distinguish similar variants
export function getJobStatusClassName(status: JobStatus): string {
	switch (status) {
		case 'completed':
			return 'bg-emerald-600 text-white border-transparent';
		default:
			return '';
	}
}

// Type-aware status sequences
export const JOB_STATUS_SEQUENCES: Record<string, JobStatus[]> = {
	new_memorial: ['pending', 'materials_ordered', 'in_production', 'ready_for_install', 'installed', 'completed'],
	additional_inscription: ['pending', 'in_production', 'ready_for_install', 'installed', 'completed'],
	refurbishment: ['pending', 'in_production', 'ready_for_install', 'installed', 'completed'],
	ashes: ['pending', 'ready_for_install', 'installed', 'completed'],
	sundry_only: ['pending', 'ready_for_install', 'completed'],
};

const DEFAULT_SEQUENCE: JobStatus[] = JOB_STATUS_SEQUENCES['new_memorial'];

// Get the status sequence for a given quote type
export function getJobStatusSequence(quoteType?: string): JobStatus[] {
	if (quoteType && JOB_STATUS_SEQUENCES[quoteType]) {
		return JOB_STATUS_SEQUENCES[quoteType];
	}
	return DEFAULT_SEQUENCE;
}

// Helper: Get next status in workflow (type-aware)
export function getNextJobStatus(currentStatus: JobStatus, quoteType?: string): JobStatus | null {
	const sequence = getJobStatusSequence(quoteType);
	const currentIndex = sequence.indexOf(currentStatus);
	// If current status isn't in the sequence, find nearest subsequent status
	if (currentIndex === -1) {
		const allStatuses: JobStatus[] = ['pending', 'materials_ordered', 'in_production', 'ready_for_install', 'installed', 'completed'];
		const currentGlobalIndex = allStatuses.indexOf(currentStatus);
		for (let i = currentGlobalIndex + 1; i < allStatuses.length; i++) {
			if (sequence.includes(allStatuses[i])) {
				return allStatuses[i];
			}
		}
		return null;
	}
	if (currentIndex >= sequence.length - 1) return null;
	return sequence[currentIndex + 1];
}

// Status-specific button labels
const STATUS_BUTTON_LABELS: Record<string, Record<JobStatus, string | null>> = {
	default: {
		pending: 'Order Materials',
		materials_ordered: 'Start Production',
		in_production: 'Mark Ready for Install',
		ready_for_install: 'Mark Installed',
		installed: 'Complete Job',
		completed: null,
	},
	sundry_only: {
		pending: 'Mark Ready',
		materials_ordered: null,
		in_production: null,
		ready_for_install: 'Complete Order',
		installed: null,
		completed: null,
	},
	ashes: {
		pending: 'Mark Ready for Interment',
		materials_ordered: null,
		in_production: null,
		ready_for_install: 'Mark Interred',
		installed: 'Complete Job',
		completed: null,
	},
	additional_inscription: {
		pending: 'Start Work',
		materials_ordered: null,
		in_production: 'Mark Ready for Install',
		ready_for_install: 'Mark Installed',
		installed: 'Complete Job',
		completed: null,
	},
	refurbishment: {
		pending: 'Start Work',
		materials_ordered: null,
		in_production: 'Mark Ready for Install',
		ready_for_install: 'Mark Installed',
		installed: 'Complete Job',
		completed: null,
	},
};

// Helper: Get button label for next status (type-aware)
export function getNextStatusButtonLabel(currentStatus: JobStatus, quoteType?: string): string | null {
	const labels = (quoteType && STATUS_BUTTON_LABELS[quoteType]) || STATUS_BUTTON_LABELS['default'];
	return labels[currentStatus] ?? STATUS_BUTTON_LABELS['default'][currentStatus] ?? null;
}

// Helper: Format account status for display
export function formatAccountStatus(status: string | null): string {
	const labels: Record<string, string> = {
		not_invoiced: 'Not Invoiced',
		invoiced: 'Invoiced',
		partially_paid: 'Partially Paid',
		paid: 'Paid',
		overdue: 'Overdue',
	};
	return status ? labels[status] || status : 'Not Invoiced';
}

// Helper: Get account status badge variant
export function getAccountStatusColor(status: string | null): string {
	switch (status) {
		case 'invoiced':
			return 'bg-blue-100 text-blue-800';
		case 'partially_paid':
			return 'bg-yellow-100 text-yellow-800';
		case 'paid':
			return 'bg-green-100 text-green-800';
		case 'overdue':
			return 'bg-red-100 text-red-800';
		case 'not_invoiced':
		default:
			return 'bg-gray-100 text-gray-800';
	}
}

// Helper: Format deposit status for display
export function formatDepositStatus(status: string | null): string {
	const labels: Record<string, string> = {
		no_deposit_required: 'No Deposit Required',
		awaiting_deposit: 'Awaiting Deposit',
		partially_paid: 'Partially Paid',
		deposit_paid: 'Deposit Paid',
	};
	return status ? labels[status] || status : 'No Deposit Required';
}

// Helper: Get deposit status badge color
export function getDepositStatusColor(status: string | null): string {
	switch (status) {
		case 'deposit_paid':
			return 'bg-green-100 text-green-800';
		case 'partially_paid':
			return 'bg-yellow-100 text-yellow-800';
		case 'awaiting_deposit':
			return 'bg-orange-100 text-orange-800';
		case 'no_deposit_required':
		default:
			return 'bg-gray-100 text-gray-800';
	}
}

// Re-export for convenience
export { JOB_STATUSES, ACCOUNT_STATUSES, REVIEW_OUTCOMES };
