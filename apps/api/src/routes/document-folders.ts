import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, asc, count, sql, isNull } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { documentFolders, documents } from '@griffiths-crm/shared/db/schema';
import { getSignedImageUrl } from '../lib/s3';

// Constants
const MAX_FOLDER_NAME_LENGTH = 100;
const MAX_FOLDER_DEPTH = 10;

// Validation schemas
const createFolderSchema = z.object({
	name: z.string().min(1).max(MAX_FOLDER_NAME_LENGTH),
	parentId: z.string().nullable().optional(),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
});

const updateFolderSchema = z.object({
	name: z.string().min(1).max(MAX_FOLDER_NAME_LENGTH).optional(),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
	sortOrder: z.number().int().optional(),
});

const moveFolderSchema = z.object({
	parentId: z.string().nullable(),
});

// Helper function to build breadcrumb path from folder to root
async function buildBreadcrumb(
	tenantId: string,
	folderId: string | null
): Promise<Array<{ id: string; name: string }>> {
	if (!folderId) return [];

	const breadcrumb: Array<{ id: string; name: string }> = [];
	let currentId: string | null = folderId;

	while (currentId) {
		const [folder] = await db
			.select({ id: documentFolders.id, name: documentFolders.name, parentId: documentFolders.parentId })
			.from(documentFolders)
			.where(and(eq(documentFolders.id, currentId), eq(documentFolders.tenantId, tenantId)))
			.limit(1);

		if (!folder) break;

		breadcrumb.unshift({ id: folder.id, name: folder.name });
		currentId = folder.parentId;
	}

	return breadcrumb;
}

// Helper function to compute materialized path
async function computePath(tenantId: string, parentId: string | null, folderId: string): Promise<string> {
	if (!parentId) {
		return `/${folderId}`;
	}

	const [parent] = await db
		.select({ path: documentFolders.path })
		.from(documentFolders)
		.where(and(eq(documentFolders.id, parentId), eq(documentFolders.tenantId, tenantId)))
		.limit(1);

	if (!parent) {
		return `/${folderId}`;
	}

	return `${parent.path}/${folderId}`;
}

// Helper function to compute depth
async function computeDepth(tenantId: string, parentId: string | null): Promise<number> {
	if (!parentId) return 0;

	const [parent] = await db
		.select({ depth: documentFolders.depth })
		.from(documentFolders)
		.where(and(eq(documentFolders.id, parentId), eq(documentFolders.tenantId, tenantId)))
		.limit(1);

	return parent ? parent.depth + 1 : 0;
}

// Helper function to check if folder name is unique within parent
async function isNameUniqueInParent(
	tenantId: string,
	name: string,
	parentId: string | null,
	excludeId?: string
): Promise<boolean> {
	const conditions = [
		eq(documentFolders.tenantId, tenantId),
		eq(documentFolders.name, name),
	];

	if (parentId === null) {
		conditions.push(isNull(documentFolders.parentId));
	} else {
		conditions.push(eq(documentFolders.parentId, parentId));
	}

	if (excludeId) {
		conditions.push(sql`${documentFolders.id} != ${excludeId}`);
	}

	const [existing] = await db
		.select({ id: documentFolders.id })
		.from(documentFolders)
		.where(and(...conditions))
		.limit(1);

	return !existing;
}

// Create document folders routes
const documentFoldersRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List folders (optionally filtered by parentId)
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const parentId = c.req.query('parentId');

		// Build conditions based on parentId query param
		const conditions = [eq(documentFolders.tenantId, tenantId)];

		if (parentId === 'root' || parentId === '' || parentId === undefined) {
			// Root level folders (parentId is null)
			conditions.push(isNull(documentFolders.parentId));
		} else if (parentId) {
			// Children of specific folder
			conditions.push(eq(documentFolders.parentId, parentId));
		}

		const folders = await db
			.select()
			.from(documentFolders)
			.where(and(...conditions))
			.orderBy(asc(documentFolders.sortOrder), asc(documentFolders.name));

		return c.json({ folders });
	})

	// Get all folders as a flat list (for tree view or folder picker)
	.get('/all', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const folders = await db
			.select()
			.from(documentFolders)
			.where(eq(documentFolders.tenantId, tenantId))
			.orderBy(asc(documentFolders.path), asc(documentFolders.sortOrder), asc(documentFolders.name));

		return c.json({ folders });
	})

	// Get single folder with breadcrumb
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const folderId = c.req.param('id');

		const [folder] = await db
			.select()
			.from(documentFolders)
			.where(and(eq(documentFolders.id, folderId), eq(documentFolders.tenantId, tenantId)))
			.limit(1);

		if (!folder) {
			return c.json({ error: 'Folder not found' }, 404);
		}

		// Build breadcrumb
		const breadcrumb = await buildBreadcrumb(tenantId, folderId);

		return c.json({ folder, breadcrumb });
	})

	// Get folder contents (subfolders + documents)
	.get(
		'/:id/contents',
		zValidator(
			'query',
			z.object({
				limit: z.coerce.number().min(1).max(100).optional().default(25),
				offset: z.coerce.number().min(0).optional().default(0),
			})
		),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const folderId = c.req.param('id');
			const { limit, offset } = c.req.valid('query');

			// Verify folder exists (unless 'root')
			if (folderId !== 'root') {
				const [folder] = await db
					.select({ id: documentFolders.id })
					.from(documentFolders)
					.where(and(eq(documentFolders.id, folderId), eq(documentFolders.tenantId, tenantId)))
					.limit(1);

				if (!folder) {
					return c.json({ error: 'Folder not found' }, 404);
				}
			}

			// Get subfolders
			const folderConditions = [eq(documentFolders.tenantId, tenantId)];
			if (folderId === 'root') {
				folderConditions.push(isNull(documentFolders.parentId));
			} else {
				folderConditions.push(eq(documentFolders.parentId, folderId));
			}

			const subfolders = await db
				.select()
				.from(documentFolders)
				.where(and(...folderConditions))
				.orderBy(asc(documentFolders.sortOrder), asc(documentFolders.name));

			// Get documents in this folder
			const docConditions = [eq(documents.tenantId, tenantId)];
			if (folderId === 'root') {
				docConditions.push(isNull(documents.folderId));
			} else {
				docConditions.push(eq(documents.folderId, folderId));
			}

			// Get total document count
			const [totalResult] = await db
				.select({ count: count() })
				.from(documents)
				.where(and(...docConditions));
			const total = Number(totalResult.count);

			// Get paginated documents
			const folderDocuments = await db
				.select()
				.from(documents)
				.where(and(...docConditions))
				.orderBy(desc(documents.createdAt))
				.limit(limit)
				.offset(offset);

			// Add signed URLs to documents
			const documentsWithUrls = await Promise.all(
				folderDocuments.map(async (doc) => ({
					...doc,
					publicUrl: await getSignedImageUrl(doc.s3Key),
				}))
			);

			// Build breadcrumb (empty for root)
			const breadcrumb = folderId === 'root' ? [] : await buildBreadcrumb(tenantId, folderId);

			return c.json({
				subfolders,
				documents: documentsWithUrls,
				breadcrumb,
				pagination: {
					total,
					limit,
					offset,
					hasMore: offset + limit < total,
				},
			});
		}
	)

	// Create folder
	.post('/', zValidator('json', createFolderSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		const parentId = data.parentId || null;

		// Check depth limit
		if (parentId) {
			const depth = await computeDepth(tenantId, parentId);
			if (depth >= MAX_FOLDER_DEPTH) {
				return c.json({ error: `Maximum folder depth of ${MAX_FOLDER_DEPTH} exceeded` }, 400);
			}
		}

		// Check name uniqueness within parent
		const isUnique = await isNameUniqueInParent(tenantId, data.name, parentId);
		if (!isUnique) {
			return c.json({ error: 'A folder with this name already exists in this location' }, 400);
		}

		const folderId = crypto.randomUUID();
		const path = await computePath(tenantId, parentId, folderId);
		const depth = await computeDepth(tenantId, parentId);

		// Get next sort order
		const sortConditions = [eq(documentFolders.tenantId, tenantId)];
		if (parentId === null) {
			sortConditions.push(isNull(documentFolders.parentId));
		} else {
			sortConditions.push(eq(documentFolders.parentId, parentId));
		}

		const [maxSort] = await db
			.select({ maxOrder: sql<number>`COALESCE(MAX(${documentFolders.sortOrder}), -1)` })
			.from(documentFolders)
			.where(and(...sortConditions));

		const sortOrder = (maxSort?.maxOrder ?? -1) + 1;

		const [created] = await db
			.insert(documentFolders)
			.values({
				id: folderId,
				tenantId,
				name: data.name,
				path,
				depth,
				parentId,
				color: data.color || null,
				sortOrder,
			})
			.returning();

		return c.json({ folder: created }, 201);
	})

	// Update folder
	.put('/:id', zValidator('json', updateFolderSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const folderId = c.req.param('id');
		const data = c.req.valid('json');

		// Get existing folder
		const [existing] = await db
			.select()
			.from(documentFolders)
			.where(and(eq(documentFolders.id, folderId), eq(documentFolders.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Folder not found' }, 404);
		}

		// If renaming, check uniqueness
		if (data.name && data.name !== existing.name) {
			const isUnique = await isNameUniqueInParent(tenantId, data.name, existing.parentId, folderId);
			if (!isUnique) {
				return c.json({ error: 'A folder with this name already exists in this location' }, 400);
			}
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.color !== undefined) updateData.color = data.color;
		if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

		const [updated] = await db
			.update(documentFolders)
			.set(updateData)
			.where(eq(documentFolders.id, folderId))
			.returning();

		return c.json({ folder: updated });
	})

	// Move folder to new parent
	.put('/:id/move', zValidator('json', moveFolderSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const folderId = c.req.param('id');
		const { parentId } = c.req.valid('json');

		// Get existing folder
		const [existing] = await db
			.select()
			.from(documentFolders)
			.where(and(eq(documentFolders.id, folderId), eq(documentFolders.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Folder not found' }, 404);
		}

		// Can't move folder into itself
		if (parentId === folderId) {
			return c.json({ error: 'Cannot move folder into itself' }, 400);
		}

		// Check if new parent is a descendant of this folder (would create cycle)
		if (parentId) {
			const [potentialParent] = await db
				.select({ path: documentFolders.path })
				.from(documentFolders)
				.where(and(eq(documentFolders.id, parentId), eq(documentFolders.tenantId, tenantId)))
				.limit(1);

			if (!potentialParent) {
				return c.json({ error: 'Target folder not found' }, 404);
			}

			// Check if target's path includes this folder (cycle detection)
			if (potentialParent.path.includes(`/${folderId}/`) || potentialParent.path.endsWith(`/${folderId}`)) {
				return c.json({ error: 'Cannot move folder into its own descendant' }, 400);
			}
		}

		// Check depth limit
		const newDepth = await computeDepth(tenantId, parentId);
		if (newDepth >= MAX_FOLDER_DEPTH) {
			return c.json({ error: `Maximum folder depth of ${MAX_FOLDER_DEPTH} exceeded` }, 400);
		}

		// Check name uniqueness in new location
		const isUnique = await isNameUniqueInParent(tenantId, existing.name, parentId, folderId);
		if (!isUnique) {
			return c.json({ error: 'A folder with this name already exists in the target location' }, 400);
		}

		// Calculate new path
		const newPath = await computePath(tenantId, parentId, folderId);
		const oldPath = existing.path;

		// Update this folder
		await db
			.update(documentFolders)
			.set({
				parentId,
				path: newPath,
				depth: newDepth,
				updatedAt: new Date(),
			})
			.where(eq(documentFolders.id, folderId));

		// Update all descendant paths (those that start with old path)
		// Use SQL replace to update paths efficiently
		await db.execute(sql`
			UPDATE document_folders
			SET path = REPLACE(path, ${oldPath}, ${newPath}),
				depth = depth + ${newDepth - existing.depth},
				updated_at = NOW()
			WHERE tenant_id = ${tenantId}
			AND path LIKE ${oldPath + '/%'}
		`);

		// Get updated folder
		const [updated] = await db
			.select()
			.from(documentFolders)
			.where(eq(documentFolders.id, folderId))
			.limit(1);

		return c.json({ folder: updated });
	})

	// Delete folder
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const folderId = c.req.param('id');

		// Check if folder exists
		const [existing] = await db
			.select({ id: documentFolders.id })
			.from(documentFolders)
			.where(and(eq(documentFolders.id, folderId), eq(documentFolders.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Folder not found' }, 404);
		}

		// Check if folder has subfolders
		const [subfolderCount] = await db
			.select({ count: count() })
			.from(documentFolders)
			.where(and(eq(documentFolders.parentId, folderId), eq(documentFolders.tenantId, tenantId)));

		if (Number(subfolderCount.count) > 0) {
			return c.json({ error: 'Cannot delete folder containing subfolders. Please move or delete them first.' }, 400);
		}

		// Check if folder has documents
		const [documentCount] = await db
			.select({ count: count() })
			.from(documents)
			.where(and(eq(documents.folderId, folderId), eq(documents.tenantId, tenantId)));

		if (Number(documentCount.count) > 0) {
			return c.json({ error: 'Cannot delete folder containing documents. Please move or delete them first.' }, 400);
		}

		// Delete folder
		await db.delete(documentFolders).where(eq(documentFolders.id, folderId));

		return c.json({ success: true });
	});

export { documentFoldersRoutes };
