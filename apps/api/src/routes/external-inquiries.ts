import crypto from 'node:crypto';
import {
	ENQUIRY_SOURCES,
	inquiries,
	inquiryProducts,
	inquirySundries,
	products,
	sundries,
	tenants,
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { db } from '../lib/auth';
import { extractKeyFromUrl, generatePresignedUploadUrl } from '../lib/s3';

const externalInquiriesRoutes = new Hono();
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

// Open CORS for external consumption (any origin)
externalInquiriesRoutes.use('*', cors({ origin: '*' }));

// Tenant slug resolution middleware
externalInquiriesRoutes.use('/:slug/*', async (c, next) => {
	const slug = c.req.param('slug');

	const [tenant] = await db
		.select({ id: tenants.id })
		.from(tenants)
		.where(eq(tenants.slug, slug))
		.limit(1);

	if (!tenant) {
		return c.json({ error: 'Not found' }, 404);
	}

	c.set('externalTenantId', tenant.id);
	await next();
});

const submitInquirySchema = z.object({
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	email: z.string().optional(),
	phone: z.string().optional(),
	message: z.string().optional(),
	source: z.enum(ENQUIRY_SOURCES).optional().default('website'),
	products: z
		.array(
			z.object({
				productId: z.string().min(1),
				customerPhotoUrl: z.string().optional(),
				customerPhotoFilename: z.string().optional(),
				customerPhotoContentType: z.enum(ALLOWED_CONTENT_TYPES).optional(),
			}),
		)
		.optional()
		.default([]),
	sundries: z
		.array(
			z.object({
				sundryId: z.string().min(1),
			}),
		)
		.optional()
		.default([]),
});

const presignInquiryProductUploadSchema = z.object({
	productId: z.string().min(1, 'Product ID is required'),
	filename: z.string().min(1, 'Filename is required'),
	contentType: z.enum(ALLOWED_CONTENT_TYPES, {
		errorMap: () => ({
			message: `Content type must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
		}),
	}),
});

function hasCompleteProductPhotoData(product: {
	customerPhotoUrl?: string;
	customerPhotoFilename?: string;
	customerPhotoContentType?: string;
}) {
	return !!(
		product.customerPhotoUrl &&
		product.customerPhotoFilename &&
		product.customerPhotoContentType
	);
}

function hasAnyProductPhotoData(product: {
	customerPhotoUrl?: string;
	customerPhotoFilename?: string;
	customerPhotoContentType?: string;
}) {
	return !!(
		product.customerPhotoUrl ||
		product.customerPhotoFilename ||
		product.customerPhotoContentType
	);
}

function isValidInquiryProductPhotoUrl(photoUrl: string, tenantId: string) {
	const key = extractKeyFromUrl(photoUrl);
	return !!key && key.startsWith(`${tenantId}/inquiry-products/`);
}

// POST /:slug/inquiries/uploads/presign — Generate presigned URL for a customer plaque photo
externalInquiriesRoutes.post(
	'/:slug/inquiries/uploads/presign',
	zValidator('json', presignInquiryProductUploadSchema),
	async (c) => {
		const tenantId = c.get('externalTenantId');
		const data = c.req.valid('json');

		const [product] = await db
			.select({
				id: products.id,
				requiresCustomerPhotoUpload: products.requiresCustomerPhotoUpload,
				archivedAt: products.archivedAt,
				isActive: products.isActive,
			})
			.from(products)
			.where(and(eq(products.id, data.productId), eq(products.tenantId, tenantId)))
			.limit(1);

		if (!product || !product.isActive || product.archivedAt) {
			return c.json({ error: 'Product not found' }, 404);
		}

		if (!product.requiresCustomerPhotoUpload) {
			return c.json({ error: 'This product does not accept customer photo uploads' }, 400);
		}

		try {
			const { uploadUrl, publicUrl, key } = await generatePresignedUploadUrl({
				tenantId,
				category: 'inquiry-products',
				entityId: `${data.productId}/${crypto.randomUUID()}`,
				filename: data.filename,
				contentType: data.contentType,
			});

			return c.json({
				uploadUrl,
				fileUrl: publicUrl,
				key,
				filename: data.filename,
				contentType: data.contentType,
			});
		} catch (error) {
			console.error('Error generating inquiry product upload URL:', error);
			return c.json({ error: 'Failed to generate upload URL' }, 500);
		}
	},
);

// POST /:slug/inquiries — Submit inquiry from website (public, no auth)
externalInquiriesRoutes.post(
	'/:slug/inquiries',
	zValidator('json', submitInquirySchema),
	async (c) => {
		const tenantId = c.get('externalTenantId');
		const data = c.req.valid('json');

		// Validate product IDs belong to tenant and are active
		if (data.products.length > 0) {
			for (const productInput of data.products) {
				const [product] = await db
					.select({
						id: products.id,
						requiresCustomerPhotoUpload: products.requiresCustomerPhotoUpload,
					})
					.from(products)
					.where(
						and(
							eq(products.id, productInput.productId),
							eq(products.tenantId, tenantId),
							eq(products.isActive, true),
							isNull(products.archivedAt),
						),
					)
					.limit(1);

				if (!product) {
					return c.json({ error: `Product ${productInput.productId} not found` }, 400);
				}

				const hasPhotoData = hasCompleteProductPhotoData(productInput);
				if (hasAnyProductPhotoData(productInput) && !hasPhotoData) {
					return c.json(
						{ error: `Uploaded photo for product ${productInput.productId} is incomplete` },
						400,
					);
				}

				if (product.requiresCustomerPhotoUpload && !hasPhotoData) {
					return c.json(
						{ error: `Product ${productInput.productId} requires a customer photo upload` },
						400,
					);
				}

				if (
					hasPhotoData &&
					!isValidInquiryProductPhotoUrl(productInput.customerPhotoUrl!, tenantId)
				) {
					return c.json(
						{ error: `Uploaded photo for product ${productInput.productId} is invalid` },
						400,
					);
				}
			}
		}

		// Validate sundry IDs belong to tenant and are active
		if (data.sundries.length > 0) {
			const sundryIds = data.sundries.map((s) => s.sundryId);
			for (const sundryId of sundryIds) {
				const [sundry] = await db
					.select({ id: sundries.id })
					.from(sundries)
					.where(
						and(
							eq(sundries.id, sundryId),
							eq(sundries.tenantId, tenantId),
							eq(sundries.isActive, true),
						),
					)
					.limit(1);

				if (!sundry) {
					return c.json({ error: `Sundry ${sundryId} not found` }, 400);
				}
			}
		}

		const id = crypto.randomUUID();

		await db.insert(inquiries).values({
			id,
			tenantId,
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email || null,
			phone: data.phone || null,
			message: data.message || null,
			source: data.source,
			status: 'new',
		});

		if (data.products.length > 0) {
			await db.insert(inquiryProducts).values(
				data.products.map((p) => ({
					id: crypto.randomUUID(),
					inquiryId: id,
					productId: p.productId,
					customerPhotoUrl: p.customerPhotoUrl || null,
					customerPhotoFilename: p.customerPhotoFilename || null,
					customerPhotoContentType: p.customerPhotoContentType || null,
				})),
			);
		}

		if (data.sundries.length > 0) {
			await db.insert(inquirySundries).values(
				data.sundries.map((s) => ({
					id: crypto.randomUUID(),
					inquiryId: id,
					sundryId: s.sundryId,
				})),
			);
		}

		return c.json({ id, success: true }, 201);
	},
);

export { externalInquiriesRoutes };
