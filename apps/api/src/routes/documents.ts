import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, count, sql, isNull, inArray } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	generatePresignedUploadUrlForKey,
	isS3Configured,
	getSignedImageUrl,
	deleteObject,
	generateSignedDownloadUrl,
} from '../lib/s3';
import {
	documents,
	users,
	documentFolders,
	customers,
	quotes,
	jobs,
	funeralDirectors,
	suppliers,
	councils,
	memorialSites,
	products,
} from '@griffiths-crm/shared/db/schema';

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
	folderId: z.string().min(1).optional().nullable(),
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
	folderId: z.string().min(1).optional().nullable(),
});

const moveDocumentSchema = z.object({
	folderId: z.string().nullable(),
});

const bulkMoveDocumentsSchema = z.object({
	documentIds: z.array(z.string().min(1)).min(1),
	folderId: z.string().nullable(),
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
	folderId: z.string().optional(), // 'root' for unfiled, 'all' for all folders, or specific folder ID
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

// Helper function to fetch entity names for documents
async function fetchEntityNames(
	documentList: Array<{ entityType: string | null; entityId: string | null }>,
	tenantId: string
): Promise<Map<string, string>> {
	const entityNameMap = new Map<string, string>();

	// Group entity IDs by type
	const entityGroups: Record<string, string[]> = {};
	for (const doc of documentList) {
		if (doc.entityType && doc.entityId) {
			const key = `${doc.entityType}:${doc.entityId}`;
			if (!entityNameMap.has(key)) {
				if (!entityGroups[doc.entityType]) {
					entityGroups[doc.entityType] = [];
				}
				if (!entityGroups[doc.entityType].includes(doc.entityId)) {
					entityGroups[doc.entityType].push(doc.entityId);
				}
			}
		}
	}

	// Fetch names for each entity type
	const fetchPromises: Promise<void>[] = [];

	if (entityGroups.customer?.length) {
		fetchPromises.push(
			db
				.select({ id: customers.id, firstName: customers.firstName, lastName: customers.lastName })
				.from(customers)
				.where(and(eq(customers.tenantId, tenantId), inArray(customers.id, entityGroups.customer)))
				.then((rows) => {
					for (const row of rows) {
						entityNameMap.set(`customer:${row.id}`, `${row.firstName} ${row.lastName}`);
					}
				})
		);
	}

	if (entityGroups.quote?.length) {
		fetchPromises.push(
			db
				.select({ id: quotes.id, quoteNumber: quotes.quoteNumber })
				.from(quotes)
				.where(and(eq(quotes.tenantId, tenantId), inArray(quotes.id, entityGroups.quote)))
				.then((rows) => {
					for (const row of rows) {
						entityNameMap.set(`quote:${row.id}`, row.quoteNumber);
					}
				})
		);
	}

	if (entityGroups.job?.length) {
		fetchPromises.push(
			db
				.select({ id: jobs.id, jobNumber: jobs.jobNumber })
				.from(jobs)
				.where(and(eq(jobs.tenantId, tenantId), inArray(jobs.id, entityGroups.job)))
				.then((rows) => {
					for (const row of rows) {
						entityNameMap.set(`job:${row.id}`, row.jobNumber);
					}
				})
		);
	}

	if (entityGroups.funeral_director?.length) {
		fetchPromises.push(
			db
				.select({ id: funeralDirectors.id, businessName: funeralDirectors.businessName })
				.from(funeralDirectors)
				.where(and(eq(funeralDirectors.tenantId, tenantId), inArray(funeralDirectors.id, entityGroups.funeral_director)))
				.then((rows) => {
					for (const row of rows) {
						entityNameMap.set(`funeral_director:${row.id}`, row.businessName);
					}
				})
		);
	}

	if (entityGroups.supplier?.length) {
		fetchPromises.push(
			db
				.select({ id: suppliers.id, businessName: suppliers.businessName })
				.from(suppliers)
				.where(and(eq(suppliers.tenantId, tenantId), inArray(suppliers.id, entityGroups.supplier)))
				.then((rows) => {
					for (const row of rows) {
						entityNameMap.set(`supplier:${row.id}`, row.businessName);
					}
				})
		);
	}

	if (entityGroups.council?.length) {
		fetchPromises.push(
			db
				.select({ id: councils.id, councilName: councils.councilName })
				.from(councils)
				.where(and(eq(councils.tenantId, tenantId), inArray(councils.id, entityGroups.council)))
				.then((rows) => {
					for (const row of rows) {
						entityNameMap.set(`council:${row.id}`, row.councilName);
					}
				})
		);
	}

	if (entityGroups.memorial_site?.length) {
		fetchPromises.push(
			db
				.select({ id: memorialSites.id, name: memorialSites.name })
				.from(memorialSites)
				.where(and(eq(memorialSites.tenantId, tenantId), inArray(memorialSites.id, entityGroups.memorial_site)))
				.then((rows) => {
					for (const row of rows) {
						entityNameMap.set(`memorial_site:${row.id}`, row.name);
					}
				})
		);
	}

	if (entityGroups.product?.length) {
		fetchPromises.push(
			db
				.select({ id: products.id, name: products.name })
				.from(products)
				.where(and(eq(products.tenantId, tenantId), inArray(products.id, entityGroups.product)))
				.then((rows) => {
					for (const row of rows) {
						entityNameMap.set(`product:${row.id}`, row.name);
					}
				})
		);
	}

	await Promise.all(fetchPromises);
	return entityNameMap;
}

// Create documents routes
const documentsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List/search all documents
	.get('/', zValidator('query', searchQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { search, entityType, folderId, tags, limit, offset } = c.req.valid('query');

		// Build conditions
		const conditions: ReturnType<typeof eq>[] = [eq(documents.tenantId, tenantId)];

		// Filter by entity type - 'unassigned' filters for orphan documents
		if (entityType === 'unassigned') {
			conditions.push(sql`${documents.entityType} IS NULL`);
		} else if (entityType) {
			conditions.push(eq(documents.entityType, entityType));
		}

		// Filter by folder
		if (folderId === 'root') {
			// Documents not in any folder (unfiled)
			conditions.push(isNull(documents.folderId));
		} else if (folderId && folderId !== 'all') {
			// Documents in specific folder
			conditions.push(eq(documents.folderId, folderId));
		}
		// folderId === 'all' or undefined means no folder filtering

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
				folderId: documents.folderId,
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

		// Fetch entity names for all documents
		const entityNameMap = await fetchEntityNames(documentList, tenantId);

		// Add signed URLs and entity names
		const documentsWithUrls = await Promise.all(
			documentList.map(async (doc) => {
				const entityName = doc.entityType && doc.entityId
					? entityNameMap.get(`${doc.entityType}:${doc.entityId}`) || null
					: null;
				return {
					...doc,
					entityName,
					publicUrl: await getSignedImageUrl(doc.s3Key),
				};
			})
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
				folderId: documents.folderId,
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
				folderId: documents.folderId,
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

	// Get download URL for a document (forces download instead of browser preview)
	.get('/:id/download', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const documentId = c.req.param('id');

		const [doc] = await db
			.select()
			.from(documents)
			.where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
			.limit(1);

		if (!doc) {
			return c.json({ error: 'Document not found' }, 404);
		}

		const downloadUrl = await generateSignedDownloadUrl(doc.s3Key, doc.filename);
		return c.json({ downloadUrl });
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

			// Generate presigned URL using the exact key that will be stored in database
			const { uploadUrl, publicUrl } = await generatePresignedUploadUrlForKey(
				key,
				contentType
			);

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

		// Validate folder belongs to tenant if provided
		if (data.folderId) {
			const [folder] = await db
				.select({ id: documentFolders.id })
				.from(documentFolders)
				.where(and(eq(documentFolders.id, data.folderId), eq(documentFolders.tenantId, tenantId)))
				.limit(1);

			if (!folder) {
				return c.json({ error: 'Folder not found' }, 404);
			}
		}

		const [created] = await db
			.insert(documents)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				folderId: data.folderId || null, // Optional folder assignment
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

		// Validate folder belongs to tenant if provided
		if (data.folderId) {
			const [folder] = await db
				.select({ id: documentFolders.id })
				.from(documentFolders)
				.where(and(eq(documentFolders.id, data.folderId), eq(documentFolders.tenantId, tenantId)))
				.limit(1);

			if (!folder) {
				return c.json({ error: 'Folder not found' }, 404);
			}
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.tags !== undefined) updateData.tags = data.tags;
		if (data.notes !== undefined) updateData.notes = data.notes;
		if (data.folderId !== undefined) updateData.folderId = data.folderId;

		const [updated] = await db
			.update(documents)
			.set(updateData)
			.where(eq(documents.id, documentId))
			.returning();

		const publicUrl = await getSignedImageUrl(updated.s3Key);
		return c.json({ document: { ...updated, publicUrl } });
	})

	// Move document to different folder
	.put('/:id/move', zValidator('json', moveDocumentSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const documentId = c.req.param('id');
		const { folderId } = c.req.valid('json');

		// Verify document belongs to tenant
		const [existing] = await db
			.select()
			.from(documents)
			.where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Document not found' }, 404);
		}

		// Validate target folder if not moving to root (unfiled)
		if (folderId) {
			const [folder] = await db
				.select({ id: documentFolders.id })
				.from(documentFolders)
				.where(and(eq(documentFolders.id, folderId), eq(documentFolders.tenantId, tenantId)))
				.limit(1);

			if (!folder) {
				return c.json({ error: 'Target folder not found' }, 404);
			}
		}

		const [updated] = await db
			.update(documents)
			.set({ folderId, updatedAt: new Date() })
			.where(eq(documents.id, documentId))
			.returning();

		const publicUrl = await getSignedImageUrl(updated.s3Key);
		return c.json({ document: { ...updated, publicUrl } });
	})

	// Bulk move documents to folder
	.put('/bulk-move', zValidator('json', bulkMoveDocumentsSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { documentIds, folderId } = c.req.valid('json');

		// Validate target folder if not moving to root (unfiled)
		if (folderId) {
			const [folder] = await db
				.select({ id: documentFolders.id })
				.from(documentFolders)
				.where(and(eq(documentFolders.id, folderId), eq(documentFolders.tenantId, tenantId)))
				.limit(1);

			if (!folder) {
				return c.json({ error: 'Target folder not found' }, 404);
			}
		}

		// Update all documents at once (only those belonging to tenant)
		const updated = await db
			.update(documents)
			.set({ folderId, updatedAt: new Date() })
			.where(
				and(
					eq(documents.tenantId, tenantId),
					inArray(documents.id, documentIds)
				)
			)
			.returning({ id: documents.id });

		return c.json({
			success: true,
			movedCount: updated.length,
			movedIds: updated.map((d) => d.id),
		});
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

		// Delete from S3 (continue even if this fails - S3 object becomes orphaned but DB is source of truth)
		try {
			await deleteObject(existing.s3Key);
		} catch (error) {
			console.error('Failed to delete S3 object:', existing.s3Key, error);
			// Continue with database deletion anyway
		}

		// Delete from database
		await db.delete(documents).where(eq(documents.id, documentId));

		return c.json({ success: true });
	});

export { documentsRoutes };
