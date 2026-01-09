import { useMutation, useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type UploadCategory = 'products' | 'options' | 'sundries' | 'categories' | 'materials';

// Cache for signed URLs to avoid re-fetching
const signedUrlCache = new Map<string, { url: string; expiry: number }>();
const CACHE_DURATION = 55 * 60 * 1000; // 55 minutes (URLs expire in 1 hour)

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

// Get a signed URL for viewing an image
async function getSignedUrl(url: string): Promise<string> {
	// Check cache first
	const cached = signedUrlCache.get(url);
	if (cached && cached.expiry > Date.now()) {
		return cached.url;
	}

	const response = await fetch(`${API_URL}/api/uploads/sign-url`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ url }),
	});

	if (!response.ok) {
		throw new Error('Failed to get signed URL');
	}

	const data = await response.json();

	// Cache the result
	signedUrlCache.set(url, {
		url: data.signedUrl,
		expiry: Date.now() + CACHE_DURATION,
	});

	return data.signedUrl;
}

// Hook to get a signed URL for a single image
export function useSignedUrl(url: string | null | undefined) {
	return useQuery({
		queryKey: ['signed-url', url],
		queryFn: () => getSignedUrl(url!),
		enabled: !!url,
		staleTime: CACHE_DURATION,
		gcTime: CACHE_DURATION,
	});
}

// Get signed URLs for multiple images
async function getSignedUrls(urls: string[]): Promise<Map<string, string>> {
	// Filter out cached URLs
	const uncachedUrls: string[] = [];
	const result = new Map<string, string>();

	for (const url of urls) {
		const cached = signedUrlCache.get(url);
		if (cached && cached.expiry > Date.now()) {
			result.set(url, cached.url);
		} else {
			uncachedUrls.push(url);
		}
	}

	if (uncachedUrls.length === 0) {
		return result;
	}

	const response = await fetch(`${API_URL}/api/uploads/sign-urls`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ urls: uncachedUrls }),
	});

	if (!response.ok) {
		throw new Error('Failed to get signed URLs');
	}

	const data = await response.json();

	for (const item of data.signedUrls) {
		if (item.signed) {
			signedUrlCache.set(item.original, {
				url: item.signed,
				expiry: Date.now() + CACHE_DURATION,
			});
			result.set(item.original, item.signed);
		}
	}

	return result;
}

// Hook to get signed URLs for multiple images
export function useSignedUrls(urls: (string | null | undefined)[]) {
	const validUrls = urls.filter((url): url is string => !!url);

	return useQuery({
		queryKey: ['signed-urls', validUrls],
		queryFn: () => getSignedUrls(validUrls),
		enabled: validUrls.length > 0,
		staleTime: CACHE_DURATION,
		gcTime: CACHE_DURATION,
	});
}
