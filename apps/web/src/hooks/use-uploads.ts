import { useMutation } from '@tanstack/react-query';

const API_URL = 'http://localhost:3000';

export type UploadCategory = 'products' | 'options' | 'sundries' | 'categories' | 'materials';

type PresignResponse = {
	uploadUrl: string;
	publicUrl: string;
	key: string;
};

type UploadInput = {
	category: UploadCategory;
	entityId: string;
	file: File;
};

async function requestPresignedUrl(
	category: UploadCategory,
	entityId: string,
	filename: string,
	contentType: string
): Promise<PresignResponse> {
	const response = await fetch(`${API_URL}/api/uploads/presign`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({
			category,
			entityId,
			filename,
			contentType,
		}),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to get upload URL');
	}

	return response.json();
}

async function uploadToS3(uploadUrl: string, file: File): Promise<void> {
	const response = await fetch(uploadUrl, {
		method: 'PUT',
		headers: {
			'Content-Type': file.type,
		},
		body: file,
	});

	if (!response.ok) {
		throw new Error('Failed to upload file to S3');
	}
}

async function uploadImage(input: UploadInput): Promise<string> {
	const { category, entityId, file } = input;

	// Get presigned URL
	const { uploadUrl, publicUrl } = await requestPresignedUrl(
		category,
		entityId,
		file.name,
		file.type
	);

	// Upload to S3
	await uploadToS3(uploadUrl, file);

	// Return the public URL
	return publicUrl;
}

export function useUploadImageMutation() {
	return useMutation({
		mutationFn: uploadImage,
	});
}
