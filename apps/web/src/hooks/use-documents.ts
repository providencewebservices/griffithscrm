import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

// Document type
export type Document = {
	id: string;
	tenantId: string;
	entityType: DocumentEntityType;
	entityId: string;
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
	entityType: DocumentEntityType;
	entityId: string;
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
};

export type DocumentSearchParams = {
	search?: string;
	entityType?: DocumentEntityType;
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
	entityType: DocumentEntityType;
	entityId: string;
	file: File;
	name: string;
	tags?: string;
	notes?: string;
};

// MOCKED HOOKS FOR DEMO - Returns fake data, no API calls

const MOCK_DOCUMENTS: Document[] = [
	{
		id: 'doc-1',
		tenantId: 'tenant-1',
		entityType: 'customer',
		entityId: 'cust-1',
		name: 'Memorial Design Approval',
		tags: 'approval, design',
		notes: 'Customer approved the headstone design on 15th December',
		filename: 'design-approval-smith.pdf',
		s3Key: 'mock/design-approval.pdf',
		contentType: 'application/pdf',
		size: 245000,
		uploadedBy: 'user-1',
		uploaderName: 'Sarah Johnson',
		publicUrl: null,
		createdAt: '2024-12-15T10:30:00Z',
		updatedAt: '2024-12-15T10:30:00Z',
	},
	{
		id: 'doc-2',
		tenantId: 'tenant-1',
		entityType: 'job',
		entityId: 'job-1',
		name: 'Site Photo - Before Installation',
		tags: 'photo, site, before',
		notes: 'Photo of grave site before memorial installation',
		filename: 'site-before-install.jpg',
		s3Key: 'mock/site-photo.jpg',
		contentType: 'image/jpeg',
		size: 1850000,
		uploadedBy: 'user-2',
		uploaderName: 'Mike Williams',
		publicUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
		createdAt: '2024-12-18T14:20:00Z',
		updatedAt: '2024-12-18T14:20:00Z',
	},
	{
		id: 'doc-3',
		tenantId: 'tenant-1',
		entityType: 'quote',
		entityId: 'quote-1',
		name: 'Council Permit Application',
		tags: 'permit, council',
		notes: 'Submitted to Chester Council - awaiting approval',
		filename: 'permit-application-2024.pdf',
		s3Key: 'mock/permit.pdf',
		contentType: 'application/pdf',
		size: 320000,
		uploadedBy: 'user-1',
		uploaderName: 'Sarah Johnson',
		publicUrl: null,
		createdAt: '2024-12-10T09:15:00Z',
		updatedAt: '2024-12-12T11:00:00Z',
	},
];

export function useDocumentsQuery(_params?: DocumentSearchParams) {
	return useQuery({
		queryKey: ['documents', _params],
		queryFn: async (): Promise<DocumentsResponse> => ({
			documents: MOCK_DOCUMENTS,
			pagination: { total: 3, limit: 50, offset: 0, hasMore: false },
		}),
	});
}

export function useEntityDocumentsQuery(_entityType: DocumentEntityType, entityId: string | undefined) {
	return useQuery({
		queryKey: ['documents', 'entity', _entityType, entityId],
		queryFn: async (): Promise<Document[]> => MOCK_DOCUMENTS.slice(0, 2),
		enabled: !!entityId,
	});
}

export function useDocumentQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['document', id],
		queryFn: async (): Promise<Document | null> =>
			MOCK_DOCUMENTS.find(d => d.id === id) || MOCK_DOCUMENTS[0],
		enabled: !!id,
	});
}

export function usePresignDocumentMutation() {
	return useMutation({
		mutationFn: async (_input: { entityType: DocumentEntityType; entityId: string; filename: string; contentType: string }): Promise<PresignResponse> => {
			throw new Error('Document upload coming soon');
		},
	});
}

export function useCreateDocumentMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (_input: CreateDocumentInput): Promise<Document> => {
			throw new Error('Document upload coming soon');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] });
		},
	});
}

export function useUpdateDocumentMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (_input: UpdateDocumentInput & { id: string }): Promise<Document> => {
			throw new Error('Document update coming soon');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] });
		},
	});
}

export function useDeleteDocumentMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (_id: string): Promise<void> => {
			throw new Error('Document delete coming soon');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] });
		},
	});
}

export function useUploadDocumentMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (_input: DocumentUploadInput): Promise<Document> => {
			throw new Error('Document upload coming soon');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] });
		},
	});
}
