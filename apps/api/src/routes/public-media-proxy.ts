import { Hono } from 'hono';
import { getObjectBuffer, isPublicMediaKey } from '../lib/s3';

const ALLOWED_IMAGE_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const publicMediaProxyRoutes = new Hono().get('/*', async (c) => {
	const key = c.req.param('*')?.replace(/^\/+/, '') || '';

	if (!key || !isPublicMediaKey(key)) {
		return c.json({ error: 'Media not found' }, 404);
	}

	try {
		const { buffer, contentType } = await getObjectBuffer(key);

		if (!ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
			return c.json({ error: 'Invalid image type' }, 400);
		}

		return new Response(buffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=3600',
				'Access-Control-Allow-Origin': '*',
			},
		});
	} catch (error) {
		console.error('Error proxying legacy public media:', error);
		return c.json({ error: 'Media not found' }, 404);
	}
});

export { publicMediaProxyRoutes };
