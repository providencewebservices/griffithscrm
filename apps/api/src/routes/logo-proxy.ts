import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../lib/auth';
import { tenants } from '@griffiths-crm/shared/db/schema';
import { extractKeyFromUrl, getObjectBuffer } from '../lib/s3';

const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
]);

const logoProxyRoutes = new Hono()
	// GET /api/logo/:tenantId — public, no auth
	.get('/:tenantId', async (c) => {
		const tenantId = c.req.param('tenantId');

		const [tenant] = await db
			.select({ logoUrl: tenants.logoUrl })
			.from(tenants)
			.where(eq(tenants.id, tenantId))
			.limit(1);

		if (!tenant?.logoUrl) {
			return c.json({ error: 'Logo not found' }, 404);
		}

		const key = extractKeyFromUrl(tenant.logoUrl);
		if (!key) {
			return c.json({ error: 'Invalid logo URL' }, 400);
		}

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
	});

export { logoProxyRoutes };
