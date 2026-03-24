import type { PROOF_STATUSES } from '@griffiths-crm/shared/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export type ProofStatus = (typeof PROOF_STATUSES)[number];

export type JobProof = {
	id: string;
	tenantId: string;
	jobId: string;
	version: number;
	status: ProofStatus;
	s3Key: string;
	filename: string;
	contentType: string;
	size: number | null;
	sentAt: string | null;
	approvedAt: string | null;
	customerFeedback: string | null;
	notes: string | null;
	createdBy: string;
	createdByName: string | null;
	createdAt: string;
	updatedAt: string;
};

export type PresignProofInput = {
	filename: string;
	contentType: string;
};

export type PresignProofResponse = {
	uploadUrl: string;
	publicUrl: string;
	key: string;
	proofId: string;
};

export type ConfirmProofInput = {
	s3Key: string;
	filename: string;
	contentType: string;
	size: number | null;
	notes?: string | null;
	proofId: string;
};

// Fetch functions
async function fetchJobProofs(jobId: string): Promise<JobProof[]> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/proofs`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch proofs');
	}

	const data: { proofs: JobProof[] } = await response.json();
	return data.proofs;
}

async function presignProof(
	jobId: string,
	input: PresignProofInput,
): Promise<PresignProofResponse> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/proofs/presign`, {
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

async function confirmProof(jobId: string, input: ConfirmProofInput): Promise<JobProof> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/proofs`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to confirm proof upload');
	}

	const data: { proof: JobProof } = await response.json();
	return data.proof;
}

async function sendProof(jobId: string, proofId: string): Promise<JobProof> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/proofs/${proofId}/send`, {
		method: 'PUT',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to send proof');
	}

	const data: { proof: JobProof } = await response.json();
	return data.proof;
}

async function approveProof(jobId: string, proofId: string): Promise<JobProof> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/proofs/${proofId}/approve`, {
		method: 'PUT',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to approve proof');
	}

	const data: { proof: JobProof } = await response.json();
	return data.proof;
}

async function requestRevision(
	jobId: string,
	proofId: string,
	customerFeedback: string,
): Promise<JobProof> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/proofs/${proofId}/request-revision`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ customerFeedback }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to request revision');
	}

	const data: { proof: JobProof } = await response.json();
	return data.proof;
}

async function updateProofNotes(
	jobId: string,
	proofId: string,
	notes: string | null,
): Promise<JobProof> {
	const response = await fetch(`${API_URL}/api/jobs/${jobId}/proofs/${proofId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ notes }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update proof notes');
	}

	const data: { proof: JobProof } = await response.json();
	return data.proof;
}

// React Query hooks
export function useJobProofsQuery(jobId: string | undefined) {
	return useQuery({
		queryKey: ['job-proofs', jobId],
		queryFn: () => fetchJobProofs(jobId!),
		enabled: !!jobId,
	});
}

export function usePresignProofMutation(jobId: string) {
	return useMutation({
		mutationFn: (input: PresignProofInput) => presignProof(jobId, input),
	});
}

export function useConfirmProofMutation(jobId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: ConfirmProofInput) => confirmProof(jobId, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['job-proofs', jobId] });
		},
	});
}

export function useSendProofMutation(jobId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (proofId: string) => sendProof(jobId, proofId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['job-proofs', jobId] });
		},
	});
}

export function useApproveProofMutation(jobId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (proofId: string) => approveProof(jobId, proofId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['job-proofs', jobId] });
		},
	});
}

export function useRequestRevisionMutation(jobId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ proofId, customerFeedback }: { proofId: string; customerFeedback: string }) =>
			requestRevision(jobId, proofId, customerFeedback),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['job-proofs', jobId] });
		},
	});
}

export function useUpdateProofNotesMutation(jobId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ proofId, notes }: { proofId: string; notes: string | null }) =>
			updateProofNotes(jobId, proofId, notes),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['job-proofs', jobId] });
		},
	});
}
