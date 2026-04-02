import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type StorageKind = 'private' | 'public';

interface StorageConfig {
	kind: StorageKind;
	bucket: string;
	region: string;
	endpoint: string;
	baseUrl?: string;
}

const DEFAULT_REGION = process.env.AWS_REGION || 'eu-west-2';

const privateStorageConfig: StorageConfig = {
	kind: 'private',
	bucket: process.env.S3_BUCKET || '',
	region: process.env.S3_REGION || DEFAULT_REGION,
	endpoint: process.env.S3_ENDPOINT || '',
};

const publicMediaConfig: StorageConfig = {
	kind: 'public',
	bucket: process.env.PUBLIC_MEDIA_BUCKET || '',
	region: process.env.PUBLIC_MEDIA_REGION || process.env.S3_REGION || DEFAULT_REGION,
	endpoint: process.env.PUBLIC_MEDIA_ENDPOINT || process.env.S3_ENDPOINT || '',
	baseUrl: process.env.PUBLIC_MEDIA_BASE_URL || '',
};

const s3Clients = new Map<string, S3Client>();

function getS3Client(config: StorageConfig): S3Client {
	const cacheKey = `${config.region}:${config.endpoint || 'aws'}`;
	const cached = s3Clients.get(cacheKey);
	if (cached) {
		return cached;
	}

	const client = new S3Client({
		region: config.region,
		...(config.endpoint && {
			endpoint: config.endpoint,
			forcePathStyle: true,
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
			},
		}),
	});

	s3Clients.set(cacheKey, client);
	return client;
}

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, '');
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isAbsoluteUrl(value: string): boolean {
	return value.startsWith('http://') || value.startsWith('https://');
}

function isStorageConfigured(config: StorageConfig): boolean {
	if (!config.bucket) return false;

	if (config.endpoint) {
		return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
	}

	return true;
}

function getBucketObjectUrl(config: StorageConfig, key: string): string {
	if (config.endpoint) {
		return `${trimTrailingSlash(config.endpoint)}/${config.bucket}/${key}`;
	}

	return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
}

function getDeliveryUrl(config: StorageConfig, key: string): string {
	if (config.kind === 'public' && config.baseUrl) {
		return `${trimTrailingSlash(config.baseUrl)}/${key}`;
	}

	return getBucketObjectUrl(config, key);
}

function extractKeyFromStorageUrl(url: string, config: StorageConfig): string | null {
	if (!config.bucket) return null;

	if (config.endpoint) {
		const prefix = `${trimTrailingSlash(config.endpoint)}/${config.bucket}/`;
		if (url.startsWith(prefix)) {
			return url.slice(prefix.length) || null;
		}
	}

	const awsPattern = new RegExp(
		`^https://${escapeRegex(config.bucket)}\\.s3\\.[^/]+\\.amazonaws\\.com/(.+)$`,
	);
	const match = url.match(awsPattern);
	if (match) {
		return match[1];
	}

	if (config.kind === 'public' && config.baseUrl) {
		const basePrefix = `${trimTrailingSlash(config.baseUrl)}/`;
		if (url.startsWith(basePrefix)) {
			return url.slice(basePrefix.length) || null;
		}
	}

	return null;
}

function getUploadStorage(category: UploadCategory): StorageConfig {
	if (isPublicMediaCategory(category) && isPublicMediaConfigured()) {
		return publicMediaConfig;
	}

	return privateStorageConfig;
}

function getApiBaseUrl(): string {
	return trimTrailingSlash(process.env.API_BASE_URL || 'http://localhost:3000');
}

const PUBLIC_MEDIA_UPLOAD_CATEGORIES = new Set<UploadCategory>([
	'products',
	'options',
	'sundries',
	'categories',
	'materials',
	'branding',
]);

export type UploadCategory =
	| 'products'
	| 'options'
	| 'sundries'
	| 'categories'
	| 'materials'
	| 'inquiry-products'
	| 'jobs'
	| 'documents'
	| 'fonts'
	| 'branding';

interface PresignedUrlOptions {
	tenantId: string;
	category: UploadCategory;
	entityId: string;
	filename: string;
	contentType: string;
}

export function isPublicMediaCategory(category: UploadCategory): boolean {
	return PUBLIC_MEDIA_UPLOAD_CATEGORIES.has(category);
}

export function isPublicMediaConfigured(): boolean {
	return isStorageConfigured(publicMediaConfig);
}

export function canUploadCategory(category: UploadCategory): boolean {
	if (isPublicMediaCategory(category)) {
		return isPublicMediaConfigured() || isS3Configured();
	}

	return isS3Configured();
}

/**
 * Check if private S3-backed storage is configured.
 * Private storage continues to back documents, jobs, and legacy images.
 */
export function isS3Configured(): boolean {
	return isStorageConfigured(privateStorageConfig);
}

export function isPrivateStorageUrl(url: string): boolean {
	if (!isAbsoluteUrl(url)) return false;
	return extractKeyFromStorageUrl(url, privateStorageConfig) !== null;
}

export function isPublicMediaUrl(url: string): boolean {
	if (!isAbsoluteUrl(url)) return false;
	return extractKeyFromStorageUrl(url, publicMediaConfig) !== null;
}

export function isDirectlyReadableUrl(url: string): boolean {
	if (!isAbsoluteUrl(url)) return false;
	return !isPrivateStorageUrl(url);
}

export function isPublicMediaKey(key: string): boolean {
	const [, category] = key.split('/').filter(Boolean);
	if (!category) return false;
	return PUBLIC_MEDIA_UPLOAD_CATEGORIES.has(category as UploadCategory);
}

export function getPublicMediaUrlForKey(key: string): string {
	if (isPublicMediaConfigured()) {
		return getDeliveryUrl(publicMediaConfig, key);
	}

	return `${getApiBaseUrl()}/api/public/media/${key}`;
}

/**
 * Resolve a stored image reference to a stable public URL for website-facing use.
 * Public media URLs are returned as-is. Legacy private-bucket image references are
 * exposed through a stable proxy route until they are migrated.
 */
export function resolvePublicMediaUrl(storedUrl: string | null): string | null {
	if (!storedUrl) return null;

	if (isDirectlyReadableUrl(storedUrl)) {
		return storedUrl;
	}

	const key = extractKeyFromUrl(storedUrl);
	if (!key || !isPublicMediaKey(key)) {
		return null;
	}

	return `${getApiBaseUrl()}/api/public/media/${key}`;
}

/**
 * Extract the private-storage key from a stored URL.
 * Handles LocalStack, AWS S3 URLs, and raw keys.
 */
export function extractKeyFromUrl(url: string): string | null {
	if (!url) return null;

	const key = extractKeyFromStorageUrl(url, privateStorageConfig);
	if (key) {
		return key;
	}

	if (!isAbsoluteUrl(url)) {
		return url;
	}

	return null;
}

/**
 * Generate a presigned URL for uploading a file to storage.
 * Path structure: {tenantId}/{category}/{entityId}/{filename}
 */
export async function generatePresignedUploadUrl(
	options: PresignedUrlOptions,
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
	const { tenantId, category, entityId, filename, contentType } = options;
	const storage = getUploadStorage(category);

	if (!isStorageConfigured(storage)) {
		throw new Error(`Storage is not configured for category "${category}"`);
	}

	const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
	const key = `${tenantId}/${category}/${entityId}/${sanitizedFilename}`;

	const command = new PutObjectCommand({
		Bucket: storage.bucket,
		Key: key,
		ContentType: contentType,
	});

	const uploadUrl = await getSignedUrl(getS3Client(storage), command, { expiresIn: 300 });
	const publicUrl = getDeliveryUrl(storage, key);

	return { uploadUrl, publicUrl, key };
}

/**
 * Generate a presigned URL for uploading to a specific private-storage key.
 */
export async function generatePresignedUploadUrlForKey(
	key: string,
	contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string }> {
	if (!isS3Configured()) {
		throw new Error('Private S3 storage is not configured');
	}

	const command = new PutObjectCommand({
		Bucket: privateStorageConfig.bucket,
		Key: key,
		ContentType: contentType,
	});

	const uploadUrl = await getSignedUrl(getS3Client(privateStorageConfig), command, {
		expiresIn: 300,
	});
	const publicUrl = getBucketObjectUrl(privateStorageConfig, key);

	return { uploadUrl, publicUrl };
}

/**
 * Generate a signed URL for reading/viewing a private S3 object.
 */
export async function generateSignedReadUrl(key: string, expiresIn = 3600): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: privateStorageConfig.bucket,
		Key: key,
	});

	return getSignedUrl(getS3Client(privateStorageConfig), command, { expiresIn });
}

/**
 * Generate a signed URL for downloading a private S3 object.
 */
export async function generateSignedDownloadUrl(
	key: string,
	filename: string,
	expiresIn = 3600,
): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: privateStorageConfig.bucket,
		Key: key,
		ResponseContentDisposition: `attachment; filename="${filename}"`,
	});

	return getSignedUrl(getS3Client(privateStorageConfig), command, { expiresIn });
}

/**
 * Convert a stored image URL to a usable read URL.
 * Public URLs are returned unchanged. Legacy/private URLs are signed.
 */
export async function getSignedImageUrl(storedUrl: string | null): Promise<string | null> {
	if (!storedUrl) return null;

	if (isDirectlyReadableUrl(storedUrl)) {
		return storedUrl;
	}

	if (!isS3Configured()) return null;

	const key = extractKeyFromUrl(storedUrl);
	if (!key) return null;

	return generateSignedReadUrl(key);
}

/**
 * Fetch a private S3 object as a Buffer.
 */
export async function getObjectBuffer(
	key: string,
): Promise<{ buffer: Buffer; contentType: string }> {
	const command = new GetObjectCommand({
		Bucket: privateStorageConfig.bucket,
		Key: key,
	});

	const response = await getS3Client(privateStorageConfig).send(command);
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
 * Delete an object from private S3 storage.
 */
export async function deleteObject(key: string): Promise<void> {
	const command = new DeleteObjectCommand({
		Bucket: privateStorageConfig.bucket,
		Key: key,
	});

	await getS3Client(privateStorageConfig).send(command);
}

/**
 * Copy an object from private storage into the public media bucket.
 * This is used by the migration/backfill tooling.
 */
export async function copyObjectToPublicMedia(
	sourceKey: string,
	destinationKey = sourceKey,
): Promise<string> {
	if (!isS3Configured()) {
		throw new Error('Private S3 storage is not configured');
	}

	if (!isPublicMediaConfigured()) {
		throw new Error('Public media storage is not configured');
	}

	const command = new CopyObjectCommand({
		Bucket: publicMediaConfig.bucket,
		Key: destinationKey,
		CopySource: `${privateStorageConfig.bucket}/${sourceKey
			.split('/')
			.map((segment) => encodeURIComponent(segment))
			.join('/')}`,
	});

	await getS3Client(publicMediaConfig).send(command);

	return getDeliveryUrl(publicMediaConfig, destinationKey);
}
