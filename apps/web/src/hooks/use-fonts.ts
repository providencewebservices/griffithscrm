import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type Font = {
	id: string;
	tenantId: string;
	name: string;
	filename: string;
	s3Key: string;
	contentType: string;
	fileSize: number | null;
	isActive: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type CreateFontInput = {
	name: string;
	file: File;
};

export type UpdateFontInput = {
	id: string;
	name?: string;
	isActive?: boolean;
	sortOrder?: number;
};

type ListResponse = {
	fonts: Font[];
};

type ItemResponse = {
	font: Font;
};

type PresignResponse = {
	uploadUrl: string;
	key: string;
};

async function fetchFonts(): Promise<Font[]> {
	const response = await fetch(`${API_URL}/api/tenant/fonts`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch fonts');
	}

	const data: ListResponse = await response.json();
	return data.fonts;
}

async function createFont(input: CreateFontInput): Promise<Font> {
	// 1. Get presigned upload URL
	const presignResponse = await fetch(`${API_URL}/api/tenant/fonts/presign`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({
			filename: input.file.name,
			contentType: input.file.type || 'font/ttf',
		}),
	});

	if (!presignResponse.ok) {
		const error = await presignResponse.json();
		throw new Error(error.error || 'Failed to get upload URL');
	}

	const { uploadUrl, key }: PresignResponse = await presignResponse.json();

	// 2. Upload file to S3
	const uploadResponse = await fetch(uploadUrl, {
		method: 'PUT',
		headers: { 'Content-Type': input.file.type || 'font/ttf' },
		body: input.file,
	});

	if (!uploadResponse.ok) {
		throw new Error('Failed to upload font file');
	}

	// 3. Create font record
	const createResponse = await fetch(`${API_URL}/api/tenant/fonts`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({
			name: input.name,
			filename: input.file.name,
			s3Key: key,
			contentType: input.file.type || 'font/ttf',
			fileSize: input.file.size,
		}),
	});

	if (!createResponse.ok) {
		const error = await createResponse.json();
		throw new Error(error.error || 'Failed to create font');
	}

	const data: ItemResponse = await createResponse.json();
	return data.font;
}

async function updateFont({ id, ...input }: UpdateFontInput): Promise<Font> {
	const response = await fetch(`${API_URL}/api/tenant/fonts/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update font');
	}

	const data: ItemResponse = await response.json();
	return data.font;
}

async function deleteFont(id: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/tenant/fonts/${id}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete font');
	}
}

export function useFontsQuery() {
	return useQuery({
		queryKey: ['fonts'],
		queryFn: fetchFonts,
	});
}

export function useCreateFontMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createFont,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['fonts'] });
		},
	});
}

export function useUpdateFontMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateFont,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['fonts'] });
		},
	});
}

export function useDeleteFontMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteFont,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['fonts'] });
		},
	});
}
