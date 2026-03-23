import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { eq, asc } from 'drizzle-orm';
import { db } from '../lib/auth';
import { tenants, productCategories } from '@griffiths-crm/shared/db/schema';

const externalProductsRoutes = new Hono();

// Open CORS for external consumption (any origin)
externalProductsRoutes.use('*', cors({ origin: '*' }));

// Cache-control on all responses
externalProductsRoutes.use('*', async (c, next) => {
	await next();
	c.header('Cache-Control', 'public, max-age=300');
});

// Tenant slug resolution middleware
externalProductsRoutes.use('/:slug/*', async (c, next) => {
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

// GET /:slug/categories — list product categories for tenant
externalProductsRoutes.get('/:slug/categories', async (c) => {
	const tenantId = c.get('externalTenantId');

	const categories = await db
		.select({
			id: productCategories.id,
			name: productCategories.name,
			description: productCategories.description,
			imageUrl: productCategories.imageUrl,
			sortOrder: productCategories.sortOrder,
		})
		.from(productCategories)
		.where(eq(productCategories.tenantId, tenantId))
		.orderBy(asc(productCategories.sortOrder));

	return c.json({ categories });
});

export { externalProductsRoutes };
