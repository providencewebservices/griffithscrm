import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Entity types that can have documents attached
export type DocumentEntityType =
	| 'customer'
	| 'quote'
	| 'job'
	| 'funeral_director'
	| 'supplier'
	| 'council'
	| 'memorial_site'
	| 'product';

// Extended type that includes 'unassigned' for filtering
export type DocumentEntityTypeFilter = DocumentEntityType | 'unassigned';

export const DOCUMENT_ENTITY_LABELS: Record<DocumentEntityType, string> = {
	customer: 'Customer',
	quote: 'Quote',
	job: 'Job',
	funeral_director: 'Funeral Director',
	supplier: 'Supplier',
	council: 'Council',
	memorial_site: 'Memorial Site',
	product: 'Product',
};

// Labels including unassigned for filter dropdowns
export const DOCUMENT_ENTITY_FILTER_LABELS: Record<DocumentEntityTypeFilter, string> = {
	...DOCUMENT_ENTITY_LABELS,
	unassigned: 'Unassigned',
};

// Document type
export type Document = {
	id: string;
	tenantId: string;
	folderId: string | null; // Folder for organization (independent of entity)
	entityType: DocumentEntityType | null; // Nullable for unassigned documents
	entityId: string | null; // Nullable for unassigned documents
	entityName?: string | null; // Display name for the linked entity (e.g., "John Smith" for customers)
	name: string;
	tags: string | null;
	notes: string | null;
	filename: string;
	s3Key: string;
	contentType: string;
	size: number | null;
	uploadedBy: string | null;
	uploaderName?: string | null;
	publicUrl?: string | null;
	createdAt: string;
	updatedAt: string;
};

// Input types
export type CreateDocumentInput = {
	entityType?: DocumentEntityType; // Optional for unassigned documents
	entityId?: string; // Optional for unassigned documents
	folderId?: string | null; // Optional folder assignment
	name: string;
	tags?: string;
	notes?: string;
	filename: string;
	s3Key: string;
	contentType: string;
	size?: number;
};

export type UpdateDocumentInput = {
	name?: string;
	tags?: string | null;
	notes?: string | null;
	folderId?: string | null;
};

export type DocumentSearchParams = {
	search?: string;
	entityType?: DocumentEntityTypeFilter; // Includes 'unassigned' option
	folderId?: string; // 'root' for unfiled, 'all' for all folders, or specific folder ID
	tags?: string;
	limit?: number;
	offset?: number;
};

export type DocumentsResponse = {
	documents: Document[];
	pagination: {
		total: number;
		limit: number;
		offset: number;
		hasMore: boolean;
	};
};

export type PresignResponse = {
	uploadUrl: string;
	publicUrl: string;
	key: string;
};

export type DocumentUploadInput = {
	entityType?: DocumentEntityType; // Optional for unassigned documents
	entityId?: string; // Optional for unassigned documents
	folderId?: string | null; // Optional folder assignment
	file: File;
	name: string;
	tags?: string;
	notes?: string;
};

// API functions
async function fetchDocuments(params?: DocumentSearchParams): Promise<DocumentsResponse> {
	const url = new URL(`${API_URL}/api/documents`);
	if (params?.search) url.searchParams.set('search', params.search);
	if (params?.entityType) url.searchParams.set('entityType', params.entityType);
	if (params?.folderId) url.searchParams.set('folderId', params.folderId);
	if (params?.tags) url.searchParams.set('tags', params.tags);
	if (params?.limit) url.searchParams.set('limit', params.limit.toString());
	if (params?.offset) url.searchParams.set('offset', params.offset.toString());

	const response = await fetch(url.toString(), { credentials: 'include' });
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch documents');
	}
	return response.json();
}

async function fetchEntityDocuments(
	entityType: DocumentEntityType,
	entityId: string
): Promise<Document[]> {
	const response = await fetch(
		`${API_URL}/api/documents/entity/${entityType}/${entityId}`,
		{ credentials: 'include' }
	);
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch documents');
	}
	const data = await response.json();
	return data.documents;
}

async function fetchDocument(id: string): Promise<Document> {
	const response = await fetch(`${API_URL}/api/documents/${id}`, {
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch document');
	}
	const data = await response.json();
	return data.document;
}

async function presignDocument(input: {
	entityType?: DocumentEntityType; // Optional for unassigned documents
	entityId?: string; // Optional for unassigned documents
	filename: string;
	contentType: string;
}): Promise<PresignResponse> {
	const response = await fetch(`${API_URL}/api/documents/presign`, {
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

async function createDocument(input: CreateDocumentInput): Promise<Document> {
	const response = await fetch(`${API_URL}/api/documents`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create document');
	}
	const data = await response.json();
	return data.document;
}

async function updateDocument(
	input: UpdateDocumentInput & { id: string }
): Promise<Document> {
	const { id, ...data } = input;
	const response = await fetch(`${API_URL}/api/documents/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update document');
	}
	const result = await response.json();
	return result.document;
}

async function deleteDocument(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/documents/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete document');
	}
}

async function uploadDocument(input: DocumentUploadInput): Promise<Document> {
	const { entityType, entityId, folderId, file, name, tags, notes } = input;

	// Step 1: Get presigned URL
	const presignResult = await presignDocument({
		entityType,
		entityId,
		filename: file.name,
		contentType: file.type,
	});

	// Step 2: Upload file directly to S3
	const uploadResponse = await fetch(presignResult.uploadUrl, {
		method: 'PUT',
		body: file,
		headers: {
			'Content-Type': file.type,
		},
	});
	if (!uploadResponse.ok) {
		throw new Error('Failed to upload file to storage');
	}

	// Step 3: Create document record
	return createDocument({
		entityType,
		entityId,
		folderId,
		name,
		tags,
		notes,
		filename: file.name,
		s3Key: presignResult.key,
		contentType: file.type,
		size: file.size,
	});
}

// React Query hooks
export function useDocumentsQuery(params?: DocumentSearchParams) {
	return useQuery({
		queryKey: ['documents', params],
		queryFn: () => fetchDocuments(params),
		placeholderData: keepPreviousData,
	});
}

export function useEntityDocumentsQuery(
	entityType: DocumentEntityType,
	entityId: string | undefined
) {
	return useQuery({
		queryKey: ['documents', 'entity', entityType, entityId],
		queryFn: () => fetchEntityDocuments(entityType, entityId!),
		enabled: !!entityId,
	});
}

export function useDocumentQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['document', id],
		queryFn: () => fetchDocument(id!),
		enabled: !!id,
	});
}

export function usePresignDocumentMutation() {
	return useMutation({
		mutationFn: presignDocument,
	});
}

export function useCreateDocumentMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createDocument,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] });
		},
	});
}

export function useUpdateDocumentMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateDocument,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] });
		},
	});
}

export function useDeleteDocumentMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteDocument,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] });
			queryClient.invalidateQueries({ queryKey: ['document-folder-contents'] });
		},
	});
}

export function useUploadDocumentMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: uploadDocument,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] });
			queryClient.invalidateQueries({ queryKey: ['document-folder-contents'] });
		},
	});
}

async function getDownloadUrl(id: string): Promise<string> {
	const response = await fetch(`${API_URL}/api/documents/${id}/download`, {
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to get download URL');
	}
	const data = await response.json();
	return data.downloadUrl;
}

export function useDownloadUrl() {
	return useMutation({
		mutationFn: getDownloadUrl,
	});
}
