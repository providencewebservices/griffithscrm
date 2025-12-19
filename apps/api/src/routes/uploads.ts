import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth, requireTenant } from '../middleware/auth';
import {
	generatePresignedUploadUrl,
	isS3Configured,
	getSignedImageUrl,
	type UploadCategory,
} from '../lib/s3';

// Allowed content types for images
const ALLOWED_CONTENT_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
] as const;

// Validation schema for presigned URL request
const presignRequestSchema = z.object({
	category: z.enum(['products', 'options', 'sundries', 'categories', 'materials']),
	entityId: z.string().min(1, 'Entity ID is required'),
	filename: z.string().min(1, 'Filename is required'),
	contentType: z.enum(ALLOWED_CONTENT_TYPES, {
		errorMap: () => ({
			message: `Content type must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
		}),
	}),
});

// Create upload routes
const uploadRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// Generate presigned URL for upload
	.post('/presign', zValidator('json', presignRequestSchema), async (c) => {
		// Check if S3 is configured
		if (!isS3Configured()) {
			return c.json(
				{
					error: 'S3 is not configured. Please set S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY environment variables.',
				},
				503
			);
		}

		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { category, entityId, filename, contentType } = c.req.valid('json');

		try {
			const { uploadUrl, publicUrl, key } = await generatePresignedUploadUrl({
				tenantId,
				category: category as UploadCategory,
				entityId,
				filename,
				contentType,
			});

			return c.json({
				uploadUrl,
				publicUrl,
				key,
			});
		} catch (error) {
			console.error('Error generating presigned URL:', error);
			return c.json({ error: 'Failed to generate upload URL' }, 500);
		}
	})

	// Get signed URL for viewing an image
	.post(
		'/sign-url',
		zValidator(
			'json',
			z.object({
				url: z.string().min(1, 'URL is required'),
			})
		),
		async (c) => {
			if (!isS3Configured()) {
				return c.json({ error: 'S3 is not configured' }, 503);
			}

			const { url } = c.req.valid('json');

			try {
				const signedUrl = await getSignedImageUrl(url);
				if (!signedUrl) {
					return c.json({ error: 'Could not generate signed URL' }, 400);
				}
				return c.json({ signedUrl });
			} catch (error) {
				console.error('Error generating signed URL:', error);
				return c.json({ error: 'Failed to generate signed URL' }, 500);
			}
		}
	)

	// Batch sign multiple URLs
	.post(
		'/sign-urls',
		zValidator(
			'json',
			z.object({
				urls: z.array(z.string()).min(1).max(50),
			})
		),
		async (c) => {
			if (!isS3Configured()) {
				return c.json({ error: 'S3 is not configured' }, 503);
			}

			const { urls } = c.req.valid('json');

			try {
				const signedUrls = await Promise.all(
					urls.map(async (url) => ({
						original: url,
						signed: await getSignedImageUrl(url),
					}))
				);
				return c.json({ signedUrls });
			} catch (error) {
				console.error('Error generating signed URLs:', error);
				return c.json({ error: 'Failed to generate signed URLs' }, 500);
			}
		}
	);

export { uploadRoutes };
