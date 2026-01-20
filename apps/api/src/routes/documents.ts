import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	generatePresignedUploadUrl,
	isS3Configured,
	getSignedImageUrl,
	deleteObject,
} from '../lib/s3';
import { documents, users } from '@griffiths-crm/shared/db/schema';

// Entity types that can have documents attached
const entityTypeSchema = z.enum([
	'customer',
	'quote',
	'job',
	'funeral_director',
	'supplier',
	'council',
	'memorial_site',
	'product',
]);

// Validation schemas - entityType and entityId are optional to support orphan documents
const presignRequestSchema = z.object({
	entityType: entityTypeSchema.optional(),
	entityId: z.string().min(1).optional(),
	filename: z.string().min(1, 'Filename is required'),
	contentType: z.string().min(1, 'Content type is required'),
});

const createDocumentSchema = z.object({
	entityType: entityTypeSchema.optional(),
	entityId: z.string().min(1).optional(),
	name: z.string().min(1).max(255),
	tags: z.string().optional(),
	notes: z.string().optional(),
	filename: z.string().min(1),
	s3Key: z.string().min(1),
	contentType: z.string().min(1),
	size: z.number().optional(),
});

const updateDocumentSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	tags: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
});

// Extended entity type schema that includes 'unassigned' for filtering orphan documents
const searchEntityTypeSchema = z.enum([
	'customer',
	'quote',
	'job',
	'funeral_director',
	'supplier',
	'council',
	'memorial_site',
	'product',
	'unassigned', // Special filter for orphan documents
]);

const searchQuerySchema = z.object({
	search: z.string().optional(),
	entityType: searchEntityTypeSchema.optional(),
	tags: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(50),
	offset: z.coerce.number().min(0).optional().default(0),
});

// Helper function to add signed URL to document
async function addSignedUrl(doc: typeof documents.$inferSelect) {
	const publicUrl = await getSignedImageUrl(doc.s3Key);
	return {
		...doc,
		publicUrl,
	};
}

// Create documents routes
const documentsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List/search all documents
	.get('/', zValidator('query', searchQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { search, entityType, tags, limit, offset } = c.req.valid('query');

		// Build conditions
		const conditions: ReturnType<typeof eq>[] = [eq(documents.tenantId, tenantId)];

		// Filter by entity type - 'unassigned' filters for orphan documents
		if (entityType === 'unassigned') {
			conditions.push(sql`${documents.entityType} IS NULL`);
		} else if (entityType) {
			conditions.push(eq(documents.entityType, entityType));
		}

		// Search by name
		if (search && search.trim()) {
			const searchTerm = `%${search.trim().toLowerCase()}%`;
			conditions.push(sql`LOWER(${documents.name}) LIKE ${searchTerm}`);
		}

		// Filter by tags (partial match)
		if (tags && tags.trim()) {
			const tagTerm = `%${tags.trim().toLowerCase()}%`;
			conditions.push(sql`LOWER(${documents.tags}) LIKE ${tagTerm}`);
		}

		// Get total count
		const [totalResult] = await db
			.select({ count: count() })
			.from(documents)
			.where(and(...conditions));
		const total = Number(totalResult.count);

		// Get paginated documents with uploader info
		const documentList = await db
			.select({
				id: documents.id,
				tenantId: documents.tenantId,
				entityType: documents.entityType,
				entityId: documents.entityId,
				name: documents.name,
				tags: documents.tags,
				notes: documents.notes,
				filename: documents.filename,
				s3Key: documents.s3Key,
				contentType: documents.contentType,
				size: documents.size,
				uploadedBy: documents.uploadedBy,
				uploaderName: users.name,
				createdAt: documents.createdAt,
				updatedAt: documents.updatedAt,
			})
			.from(documents)
			.leftJoin(users, eq(users.id, documents.uploadedBy))
			.where(and(...conditions))
			.orderBy(desc(documents.createdAt))
			.limit(limit)
			.offset(offset);

		// Add signed URLs
		const documentsWithUrls = await Promise.all(
			documentList.map(async (doc) => ({
				...doc,
				publicUrl: await getSignedImageUrl(doc.s3Key),
			}))
		);

		return c.json({
			documents: documentsWithUrls,
			pagination: {
				total,
				limit,
				offset,
				hasMore: offset + limit < total,
			},
		});
	})

	// Get documents for a specific entity
	.get('/entity/:type/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const entityType = c.req.param('type');
		const entityId = c.req.param('id');

		// Validate entity type
		const validTypes = [
			'customer',
			'quote',
			'job',
			'funeral_director',
			'supplier',
			'council',
			'memorial_site',
			'product',
		];
		if (!validTypes.includes(entityType)) {
			return c.json({ error: 'Invalid entity type' }, 400);
		}

		const documentList = await db
			.select({
				id: documents.id,
				tenantId: documents.tenantId,
				entityType: documents.entityType,
				entityId: documents.entityId,
				name: documents.name,
				tags: documents.tags,
				notes: documents.notes,
				filename: documents.filename,
				s3Key: documents.s3Key,
				contentType: documents.contentType,
				size: documents.size,
				uploadedBy: documents.uploadedBy,
				uploaderName: users.name,
				createdAt: documents.createdAt,
				updatedAt: documents.updatedAt,
			})
			.from(documents)
			.leftJoin(users, eq(users.id, documents.uploadedBy))
			.where(
				and(
					eq(documents.tenantId, tenantId),
					eq(documents.entityType, entityType),
					eq(documents.entityId, entityId)
				)
			)
			.orderBy(desc(documents.createdAt));

		// Add signed URLs
		const documentsWithUrls = await Promise.all(
			documentList.map(async (doc) => ({
				...doc,
				publicUrl: await getSignedImageUrl(doc.s3Key),
			}))
		);

		return c.json({ documents: documentsWithUrls });
	})

	// Get single document
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const documentId = c.req.param('id');

		const [doc] = await db
			.select({
				id: documents.id,
				tenantId: documents.tenantId,
				entityType: documents.entityType,
				entityId: documents.entityId,
				name: documents.name,
				tags: documents.tags,
				notes: documents.notes,
				filename: documents.filename,
				s3Key: documents.s3Key,
				contentType: documents.contentType,
				size: documents.size,
				uploadedBy: documents.uploadedBy,
				uploaderName: users.name,
				createdAt: documents.createdAt,
				updatedAt: documents.updatedAt,
			})
			.from(documents)
			.leftJoin(users, eq(users.id, documents.uploadedBy))
			.where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
			.limit(1);

		if (!doc) {
			return c.json({ error: 'Document not found' }, 404);
		}

		const publicUrl = await getSignedImageUrl(doc.s3Key);
		return c.json({ document: { ...doc, publicUrl } });
	})

	// Generate presigned URL for upload
	.post('/presign', zValidator('json', presignRequestSchema), async (c) => {
		if (!isS3Configured()) {
			return c.json(
				{
					error:
						'S3 is not configured. Please set S3_BUCKET environment variable.',
				},
				503
			);
		}

		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { entityType, entityId, filename, contentType } = c.req.valid('json');

		try {
			// Generate unique key with UUID prefix to avoid collisions
			const uuid = crypto.randomUUID();
			const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

			// Use different path for orphan documents vs entity-linked documents
			const key =
				entityType && entityId
					? `${tenantId}/documents/${entityType}/${entityId}/${uuid}-${sanitizedFilename}`
					: `${tenantId}/documents/unassigned/${uuid}-${sanitizedFilename}`;

			const { uploadUrl, publicUrl } = await generatePresignedUploadUrl({
				tenantId,
				category: 'documents',
				entityId:
					entityType && entityId
						? `${entityType}/${entityId}/${uuid}`
						: `unassigned/${uuid}`,
				filename: sanitizedFilename,
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

	// Create document record (after S3 upload)
	.post('/', zValidator('json', createDocumentSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const userId = currentUser.id;
		const data = c.req.valid('json');

		const [created] = await db
			.insert(documents)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				entityType: data.entityType || null, // Allow null for orphan documents
				entityId: data.entityId || null, // Allow null for orphan documents
				name: data.name,
				tags: data.tags || null,
				notes: data.notes || null,
				filename: data.filename,
				s3Key: data.s3Key,
				contentType: data.contentType,
				size: data.size || null,
				uploadedBy: userId,
			})
			.returning();

		const publicUrl = await getSignedImageUrl(created.s3Key);
		return c.json({ document: { ...created, publicUrl } }, 201);
	})

	// Update document metadata
	.put('/:id', zValidator('json', updateDocumentSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const documentId = c.req.param('id');
		const data = c.req.valid('json');

		// Verify document belongs to tenant
		const [existing] = await db
			.select()
			.from(documents)
			.where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Document not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.tags !== undefined) updateData.tags = data.tags;
		if (data.notes !== undefined) updateData.notes = data.notes;

		const [updated] = await db
			.update(documents)
			.set(updateData)
			.where(eq(documents.id, documentId))
			.returning();

		const publicUrl = await getSignedImageUrl(updated.s3Key);
		return c.json({ document: { ...updated, publicUrl } });
	})

	// Delete document
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const documentId = c.req.param('id');

		// Get document first
		const [existing] = await db
			.select()
			.from(documents)
			.where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Document not found' }, 404);
		}

		// Delete from S3 (continue even if this fails)
		await deleteObject(existing.s3Key);

		// Delete from database
		await db.delete(documents).where(eq(documents.id, documentId));

		return c.json({ success: true });
	});

export { documentsRoutes };
