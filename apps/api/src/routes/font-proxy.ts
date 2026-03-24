import { fonts } from '@griffiths-crm/shared/db/schema';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../lib/auth';
import { getObjectBuffer } from '../lib/s3';

const ALLOWED_FONT_CONTENT_TYPES = new Set([
	'font/ttf',
	'font/otf',
	'font/woff',
	'font/woff2',
	'application/x-font-ttf',
	'application/x-font-opentype',
	'application/font-woff',
	'application/font-woff2',
]);

const fontProxyRoutes = new Hono()
	// GET /api/fonts/:id/file — public, no auth
	.get('/:id/file', async (c) => {
		const id = c.req.param('id');

		const [font] = await db.select().from(fonts).where(eq(fonts.id, id)).limit(1);

		if (!font) {
			return c.json({ error: 'Font not found' }, 404);
		}

		// Only serve known font content types
		if (!ALLOWED_FONT_CONTENT_TYPES.has(font.contentType)) {
			return c.json({ error: 'Invalid font type' }, 400);
		}

		const { buffer, contentType } = await getObjectBuffer(font.s3Key);

		return new Response(buffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000, immutable',
				'Access-Control-Allow-Origin': '*',
			},
		});
	});

export { fontProxyRoutes };
