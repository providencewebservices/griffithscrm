import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth, requireTenant } from '../middleware/auth';
import {
	generatePresignedUploadUrl,
	isS3Configured,
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
	});

export { uploadRoutes };
