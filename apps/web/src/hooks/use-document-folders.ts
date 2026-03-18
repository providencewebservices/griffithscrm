import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { Document } from './use-documents';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Document Folder type
export type DocumentFolder = {
	id: string;
	tenantId: string;
	name: string;
	path: string;
	depth: number;
	parentId: string | null;
	color: string | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

// Breadcrumb item type
export type BreadcrumbItem = {
	id: string;
	name: string;
};

// Input types
export type CreateFolderInput = {
	name: string;
	parentId?: string | null;
	color?: string | null;
};

export type UpdateFolderInput = {
	name?: string;
	color?: string | null;
	sortOrder?: number;
};

export type MoveFolderInput = {
	parentId: string | null;
};

// Response types
export type FoldersResponse = {
	folders: DocumentFolder[];
};

export type FolderResponse = {
	folder: DocumentFolder;
	breadcrumb: BreadcrumbItem[];
};

export type FolderContentsResponse = {
	subfolders: DocumentFolder[];
	documents: Document[];
	breadcrumb: BreadcrumbItem[];
	pagination: {
		total: number;
		limit: number;
		offset: number;
		hasMore: boolean;
	};
};

// API functions
async function fetchFolders(parentId?: string | null): Promise<DocumentFolder[]> {
	const url = new URL(`${API_URL}/api/document-folders`);
	if (parentId !== undefined) {
		url.searchParams.set('parentId', parentId || 'root');
	}
	const response = await fetch(url.toString(), { credentials: 'include' });
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch folders');
	}
	const data = await response.json();
	return data.folders;
}

async function fetchAllFolders(): Promise<DocumentFolder[]> {
	const response = await fetch(`${API_URL}/api/document-folders/all`, { credentials: 'include' });
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch folders');
	}
	const data = await response.json();
	return data.folders;
}

async function fetchFolder(id: string): Promise<FolderResponse> {
	const response = await fetch(`${API_URL}/api/document-folders/${id}`, {
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch folder');
	}
	return response.json();
}

async function fetchFolderContents(
	folderId: string,
	params?: { limit?: number; offset?: number }
): Promise<FolderContentsResponse> {
	const url = new URL(`${API_URL}/api/document-folders/${folderId}/contents`);
	if (params?.limit) url.searchParams.set('limit', params.limit.toString());
	if (params?.offset) url.searchParams.set('offset', params.offset.toString());
	const response = await fetch(url.toString(), {
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch folder contents');
	}
	return response.json();
}

async function createFolder(input: CreateFolderInput): Promise<DocumentFolder> {
	const response = await fetch(`${API_URL}/api/document-folders`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create folder');
	}
	const data = await response.json();
	return data.folder;
}

async function updateFolder(
	input: UpdateFolderInput & { id: string }
): Promise<DocumentFolder> {
	const { id, ...data } = input;
	const response = await fetch(`${API_URL}/api/document-folders/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update folder');
	}
	const result = await response.json();
	return result.folder;
}

async function moveFolder(
	input: MoveFolderInput & { id: string }
): Promise<DocumentFolder> {
	const { id, parentId } = input;
	const response = await fetch(`${API_URL}/api/document-folders/${id}/move`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ parentId }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to move folder');
	}
	const result = await response.json();
	return result.folder;
}

async function deleteFolder(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/document-folders/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete folder');
	}
}

async function moveDocument(input: { id: string; folderId: string | null }): Promise<Document> {
	const { id, folderId } = input;
	const response = await fetch(`${API_URL}/api/documents/${id}/move`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ folderId }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to move document');
	}
	const result = await response.json();
	return result.document;
}

async function bulkMoveDocuments(input: {
	documentIds: string[];
	folderId: string | null;
}): Promise<{ success: boolean; movedCount: number; movedIds: string[] }> {
	const response = await fetch(`${API_URL}/api/documents/bulk-move`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to move documents');
	}
	return response.json();
}

// React Query hooks
export function useFoldersQuery(parentId?: string | null) {
	return useQuery({
		queryKey: ['document-folders', 'list', parentId],
		queryFn: () => fetchFolders(parentId),
	});
}

export function useAllFoldersQuery() {
	return useQuery({
		queryKey: ['document-folders', 'all'],
		queryFn: fetchAllFolders,
	});
}

export function useFolderQuery(id: string | undefined) {
	return useQuery({
		queryKey: ['document-folder', id],
		queryFn: () => fetchFolder(id!),
		enabled: !!id,
	});
}

export function useFolderContentsQuery(
	folderId: string | null,
	params?: { limit?: number; offset?: number }
) {
	// Use 'root' for unfiled documents when folderId is null
	const queryFolderId = folderId ?? 'root';
	return useQuery({
		queryKey: ['document-folder-contents', queryFolderId, params],
		queryFn: () => fetchFolderContents(queryFolderId, params),
		placeholderData: keepPreviousData,
	});
}

export function useCreateFolderMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createFolder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['document-folders'] });
			queryClient.invalidateQueries({ queryKey: ['document-folder-contents'] });
		},
	});
}

export function useUpdateFolderMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateFolder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['document-folders'] });
			queryClient.invalidateQueries({ queryKey: ['document-folder'] });
			queryClient.invalidateQueries({ queryKey: ['document-folder-contents'] });
		},
	});
}

export function useMoveFolderMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: moveFolder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['document-folders'] });
			queryClient.invalidateQueries({ queryKey: ['document-folder'] });
			queryClient.invalidateQueries({ queryKey: ['document-folder-contents'] });
		},
	});
}

export function useDeleteFolderMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteFolder,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['document-folders'] });
			queryClient.invalidateQueries({ queryKey: ['document-folder-contents'] });
		},
	});
}

export function useMoveDocumentMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: moveDocument,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] });
			queryClient.invalidateQueries({ queryKey: ['document-folder-contents'] });
		},
	});
}

export function useBulkMoveDocumentsMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: bulkMoveDocuments,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] });
			queryClient.invalidateQueries({ queryKey: ['document-folder-contents'] });
		},
	});
}

// Helper function to build a tree structure from flat folders list
export function buildFolderTree(folders: DocumentFolder[]): DocumentFolder[] {
	const folderMap = new Map<string, DocumentFolder & { children?: DocumentFolder[] }>();
	const rootFolders: (DocumentFolder & { children?: DocumentFolder[] })[] = [];

	// First pass: create map of all folders
	folders.forEach((folder) => {
		folderMap.set(folder.id, { ...folder, children: [] });
	});

	// Second pass: build tree structure
	folders.forEach((folder) => {
		const folderWithChildren = folderMap.get(folder.id)!;
		if (folder.parentId && folderMap.has(folder.parentId)) {
			const parent = folderMap.get(folder.parentId)!;
			parent.children = parent.children || [];
			parent.children.push(folderWithChildren);
		} else {
			rootFolders.push(folderWithChildren);
		}
	});

	// Sort children by sortOrder and name
	const sortFolders = (folders: (DocumentFolder & { children?: DocumentFolder[] })[]) => {
		folders.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
		folders.forEach((folder) => {
			if (folder.children && folder.children.length > 0) {
				sortFolders(folder.children);
			}
		});
	};

	sortFolders(rootFolders);
	return rootFolders;
}
