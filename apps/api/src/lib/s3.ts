import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 configuration from environment
const s3Config = {
	bucket: process.env.S3_BUCKET || '',
	region: process.env.S3_REGION || process.env.AWS_REGION || 'eu-west-2',
	endpoint: process.env.S3_ENDPOINT || '', // LocalStack or custom endpoint
};

// Create S3 client
// In production (ECS), credentials come from the task role automatically
// In local dev with LocalStack, use explicit credentials
const s3Client = new S3Client({
	region: s3Config.region,
	// Only provide explicit credentials for LocalStack (local dev)
	// In production, the SDK uses the ECS task role automatically
	...(s3Config.endpoint && {
		endpoint: s3Config.endpoint,
		forcePathStyle: true, // Required for LocalStack
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
		},
	}),
});

/**
 * Get the public URL for an S3 object
 * Handles both AWS and LocalStack URLs
 */
function getPublicUrl(key: string): string {
	if (s3Config.endpoint) {
		// LocalStack: path-style URL
		return `${s3Config.endpoint}/${s3Config.bucket}/${key}`;
	}
	// AWS: virtual-hosted style URL
	return `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${key}`;
}

export type UploadCategory = 'products' | 'options' | 'sundries' | 'categories' | 'materials' | 'jobs' | 'documents' | 'fonts';

interface PresignedUrlOptions {
	tenantId: string;
	category: UploadCategory;
	entityId: string;
	filename: string;
	contentType: string;
}

/**
 * Generate a presigned URL for uploading a file to S3
 * Path structure: {tenantId}/{category}/{entityId}/{filename}
 */
export async function generatePresignedUploadUrl(
	options: PresignedUrlOptions
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
	const { tenantId, category, entityId, filename, contentType } = options;

	// Sanitize filename
	const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
	const key = `${tenantId}/${category}/${entityId}/${sanitizedFilename}`;

	const command = new PutObjectCommand({
		Bucket: s3Config.bucket,
		Key: key,
		ContentType: contentType,
		// No ACL - bucket is private, all access via signed URLs
	});

	// Generate presigned URL (expires in 5 minutes)
	const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

	// Public URL for accessing the file after upload
	const publicUrl = getPublicUrl(key);

	return { uploadUrl, publicUrl, key };
}

/**
 * Generate a presigned URL for uploading to a specific S3 key
 * Use this when you need full control over the key structure
 */
export async function generatePresignedUploadUrlForKey(
	key: string,
	contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
	const command = new PutObjectCommand({
		Bucket: s3Config.bucket,
		Key: key,
		ContentType: contentType,
	});

	const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
	const publicUrl = getPublicUrl(key);

	return { uploadUrl, publicUrl };
}

/**
 * Check if S3 is properly configured
 * In production with ECS task roles, we only need the bucket name
 * In local dev with LocalStack, we need endpoint + credentials
 */
export function isS3Configured(): boolean {
	// Must have bucket configured
	if (!process.env.S3_BUCKET) return false;

	// LocalStack requires explicit credentials
	if (process.env.S3_ENDPOINT) {
		return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
	}

	// Production uses ECS task role - just need bucket
	return true;
}

/**
 * Extract the S3 key from a stored URL
 * Handles both LocalStack and AWS URL formats
 */
export function extractKeyFromUrl(url: string): string | null {
	if (!url) return null;

	// LocalStack format: http://localhost:4566/bucket/key
	if (s3Config.endpoint && url.startsWith(s3Config.endpoint)) {
		const path = url.replace(`${s3Config.endpoint}/${s3Config.bucket}/`, '');
		return path || null;
	}

	// AWS format: https://bucket.s3.region.amazonaws.com/key
	const awsPattern = new RegExp(
		`https://${s3Config.bucket}\\.s3\\.[^/]+\\.amazonaws\\.com/(.+)`
	);
	const match = url.match(awsPattern);
	if (match) {
		return match[1];
	}

	// If it's just a key (no URL prefix), return as-is
	if (!url.startsWith('http')) {
		return url;
	}

	return null;
}

/**
 * Generate a signed URL for reading/viewing an S3 object
 * URLs expire in 1 hour by default
 */
export async function generateSignedReadUrl(
	key: string,
	expiresIn = 3600
): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: s3Config.bucket,
		Key: key,
	});

	return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a signed URL for downloading an S3 object
 * Includes Content-Disposition header to force download instead of browser preview
 * URLs expire in 1 hour by default
 */
export async function generateSignedDownloadUrl(
	key: string,
	filename: string,
	expiresIn = 3600
): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: s3Config.bucket,
		Key: key,
		ResponseContentDisposition: `attachment; filename="${filename}"`,
	});

	return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Convert a stored image URL to a signed URL for display
 * Returns null if the URL is invalid or S3 is not configured
 */
export async function getSignedImageUrl(storedUrl: string | null): Promise<string | null> {
	if (!storedUrl || !isS3Configured()) return null;

	const key = extractKeyFromUrl(storedUrl);
	if (!key) return null;

	return generateSignedReadUrl(key);
}

/**
 * Fetch an S3 object as a Buffer
 * Used for attaching CRM documents to outgoing emails
 */
export async function getObjectBuffer(key: string): Promise<{ buffer: Buffer; contentType: string }> {
	const command = new GetObjectCommand({
		Bucket: s3Config.bucket,
		Key: key,
	});

	const response = await s3Client.send(command);
	const stream = response.Body;
	if (!stream) {
		throw new Error(`S3 object not found: ${key}`);
	}

	const chunks: Uint8Array[] = [];
	// @ts-expect-error - S3 Body is a Readable stream in Node
	for await (const chunk of stream) {
		chunks.push(chunk);
	}

	return {
		buffer: Buffer.concat(chunks),
		contentType: response.ContentType || 'application/octet-stream',
	};
}

/**
 * Delete an object from S3
 */
export async function deleteObject(key: string): Promise<void> {
	const command = new DeleteObjectCommand({
		Bucket: s3Config.bucket,
		Key: key,
	});
	await s3Client.send(command);
}
