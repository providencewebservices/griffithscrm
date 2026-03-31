import { tenants } from '@griffiths-crm/shared/db/schema';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../lib/auth';
import { resolvePublicMediaUrl } from '../lib/s3';

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

		const publicUrl = resolvePublicMediaUrl(tenant.logoUrl);
		if (!publicUrl) {
			return c.json({ error: 'Invalid logo URL' }, 400);
		}

		return c.redirect(publicUrl, 302);
	});

export { logoProxyRoutes };
