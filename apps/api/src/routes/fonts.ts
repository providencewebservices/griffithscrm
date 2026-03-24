import { fonts } from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { deleteObject, generatePresignedUploadUrlForKey } from '../lib/s3';
import { requireAuth, requireTenant } from '../middleware/auth';

const ALLOWED_FONT_TYPES = [
	'font/ttf',
	'font/otf',
	'font/woff',
	'font/woff2',
	'application/x-font-ttf',
	'application/x-font-opentype',
	'application/font-woff',
	'application/font-woff2',
];

const presignSchema = z.object({
	filename: z.string().min(1),
	contentType: z.string().refine((ct) => ALLOWED_FONT_TYPES.includes(ct), {
		message: 'Invalid font file type',
	}),
});

const createSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	filename: z.string().min(1),
	s3Key: z.string().min(1),
	contentType: z.string().min(1),
	fileSize: z.number().int().optional(),
});

const updateSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	isActive: z.boolean().optional(),
	sortOrder: z.number().int().optional(),
});

const fontsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List all fonts for tenant
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const result = await db
			.select()
			.from(fonts)
			.where(eq(fonts.tenantId, tenantId))
			.orderBy(asc(fonts.sortOrder), asc(fonts.name));

		return c.json({ fonts: result });
	})

	// Get single font
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [font] = await db
			.select()
			.from(fonts)
			.where(and(eq(fonts.id, id), eq(fonts.tenantId, tenantId)))
			.limit(1);

		if (!font) {
			return c.json({ error: 'Font not found' }, 404);
		}

		return c.json({ font });
	})

	// Get presigned upload URL
	.post('/presign', zValidator('json', presignSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		const sanitizedFilename = data.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
		const key = `${tenantId}/fonts/${crypto.randomUUID()}-${sanitizedFilename}`;

		const { uploadUrl } = await generatePresignedUploadUrlForKey(key, data.contentType);

		return c.json({ uploadUrl, key });
	})

	// Create font record (after S3 upload)
	.post('/', zValidator('json', createSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Get max sortOrder
		const existing = await db
			.select({ sortOrder: fonts.sortOrder })
			.from(fonts)
			.where(eq(fonts.tenantId, tenantId))
			.orderBy(asc(fonts.sortOrder));

		const maxSortOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.sortOrder)) : -1;

		const [created] = await db
			.insert(fonts)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				name: data.name,
				filename: data.filename,
				s3Key: data.s3Key,
				contentType: data.contentType,
				fileSize: data.fileSize ?? null,
				sortOrder: maxSortOrder + 1,
			})
			.returning();

		return c.json({ font: created }, 201);
	})

	// Update font
	.put('/:id', zValidator('json', updateSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		const [existing] = await db
			.select()
			.from(fonts)
			.where(and(eq(fonts.id, id), eq(fonts.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Font not found' }, 404);
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.name !== undefined) updateData.name = data.name;
		if (data.isActive !== undefined) updateData.isActive = data.isActive;
		if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

		const [updated] = await db.update(fonts).set(updateData).where(eq(fonts.id, id)).returning();

		return c.json({ font: updated });
	})

	// Delete font
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [existing] = await db
			.select()
			.from(fonts)
			.where(and(eq(fonts.id, id), eq(fonts.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Font not found' }, 404);
		}

		// Delete from S3
		try {
			await deleteObject(existing.s3Key);
		} catch {
			// Continue even if S3 delete fails
		}

		await db.delete(fonts).where(eq(fonts.id, id));

		return c.json({ success: true });
	});

export { fontsRoutes };
