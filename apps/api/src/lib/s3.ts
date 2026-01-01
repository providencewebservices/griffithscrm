import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 configuration from environment
const s3Config = {
	bucket: process.env.S3_BUCKET || '',
	region: process.env.S3_REGION || 'us-east-1',
	endpoint: process.env.S3_ENDPOINT || '', // LocalStack or custom endpoint
};

// Create S3 client with optional LocalStack support
const s3Client = new S3Client({
	region: s3Config.region,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
	},
	// LocalStack/custom endpoint support
	...(s3Config.endpoint && {
		endpoint: s3Config.endpoint,
		forcePathStyle: true, // Required for LocalStack
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

export type UploadCategory = 'products' | 'options' | 'sundries' | 'categories' | 'materials' | 'jobs' | 'documents';

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
		ACL: 'public-read',
	});

	// Generate presigned URL (expires in 5 minutes)
	const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

	// Public URL for accessing the file after upload
	const publicUrl = getPublicUrl(key);

	return { uploadUrl, publicUrl, key };
}

/**
 * Check if S3 is properly configured
 */
export function isS3Configured(): boolean {
	return !!(
		process.env.S3_BUCKET &&
		process.env.AWS_ACCESS_KEY_ID &&
		process.env.AWS_SECRET_ACCESS_KEY
	);
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
 * Convert a stored image URL to a signed URL for display
 * Returns null if the URL is invalid or S3 is not configured
 */
export async function getSignedImageUrl(storedUrl: string | null): Promise<string | null> {
	if (!storedUrl || !isS3Configured()) return null;

	const key = extractKeyFromUrl(storedUrl);
	if (!key) return null;

	return generateSignedReadUrl(key);
}
