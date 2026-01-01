import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './lib/auth';
import { adminRoutes } from './routes/admin';
import { teamRoutes } from './routes/team';
import { customerRoutes } from './routes/customers';
import { tenantSettingsRoutes } from './routes/tenant-settings';
import { uploadRoutes } from './routes/uploads';
import { letteringTechniquesRoutes } from './routes/lettering-techniques';
import { letteringCostsRoutes } from './routes/lettering-costs';
import { letteringColorsRoutes } from './routes/lettering-colors';
import { sundriesRoutes } from './routes/sundries';
import { servicesRoutes } from './routes/services';
import { productCategoriesRoutes } from './routes/product-categories';
import { productsRoutes } from './routes/products';
import { productOptionsRoutes } from './routes/product-options';
import { optionChoicesRoutes } from './routes/option-choices';
import { productComponentsRoutes } from './routes/product-components';
import { dimensionCombosRoutes } from './routes/dimension-combos';
import { materialSectionsRoutes } from './routes/material-sections';
import { materialsRoutes } from './routes/materials';
import { finishesRoutes } from './routes/finishes';
import { tenantPricingSettingsRoutes } from './routes/tenant-pricing-settings';
import { quotesRoutes } from './routes/quotes';
import { publicQuotesRoutes } from './routes/public-quotes';
import { jobsRouter } from './routes/jobs';
import { dashboardRoutes } from './routes/dashboard';
import { funeralDirectorsRoutes } from './routes/funeral-directors';
import { councilsRoutes } from './routes/councils';
import { memorialSitesRoutes } from './routes/memorial-sites';
import { suppliersRoutes } from './routes/suppliers';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
	'*',
	cors({
		origin: 'http://localhost:5173',
		credentials: true,
	})
);

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Better Auth routes
app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw));

// Public routes (no auth required)
app.route('/api/public/quotes', publicQuotesRoutes);

// API routes
const api = new Hono()
	.get('/hello', (c) => c.json({ message: 'Hello from Griffiths CRM API!' }))
	.get('/me', async (c) => {
		const session = await auth.api.getSession({ headers: c.req.raw.headers });
		if (!session) {
			return c.json({ error: 'Not authenticated' }, 401);
		}
		return c.json({
			user: {
				id: session.user.id,
				name: session.user.name,
				email: session.user.email,
				role: (session.user as { role?: string }).role || 'tenant_user',
				tenantId: (session.user as { tenantId?: string }).tenantId || null,
			},
		});
	});

app.route('/api', api);

// Admin routes
app.route('/api/admin', adminRoutes);

// Team routes (for tenant users)
app.route('/api/team', teamRoutes);

// Customer routes (for tenant users)
app.route('/api/customers', customerRoutes);

// Tenant settings routes (for tenant users)
app.route('/api/tenant/settings', tenantSettingsRoutes);

// Upload routes (for tenant users)
app.route('/api/uploads', uploadRoutes);

// Tenant configuration routes (for tenant users)
app.route('/api/tenant/lettering-techniques', letteringTechniquesRoutes);
app.route('/api/tenant/lettering-costs', letteringCostsRoutes);
app.route('/api/tenant/lettering-colors', letteringColorsRoutes);
app.route('/api/tenant/sundries', sundriesRoutes);
app.route('/api/tenant/services', servicesRoutes);

// Product catalog routes (for tenant users)
app.route('/api/tenant/product-categories', productCategoriesRoutes);
app.route('/api/tenant/products', productsRoutes);
app.route('/api/tenant', productOptionsRoutes);
app.route('/api/tenant', optionChoicesRoutes);
app.route('/api/tenant', productComponentsRoutes);
app.route('/api/tenant', dimensionCombosRoutes);

// Materials & pricing routes (for tenant users)
app.route('/api/tenant/material-sections', materialSectionsRoutes);
app.route('/api/tenant/materials', materialsRoutes);
app.route('/api/tenant/finishes', finishesRoutes);
app.route('/api/tenant/pricing-settings', tenantPricingSettingsRoutes);

// Quote routes (for tenant users)
app.route('/api/quotes', quotesRoutes);

// Job routes (for tenant users)
app.route('/api/jobs', jobsRouter);

// Dashboard routes (for tenant users)
app.route('/api/dashboard', dashboardRoutes);

// Linked records routes (for tenant users)
app.route('/api/funeral-directors', funeralDirectorsRoutes);
app.route('/api/councils', councilsRoutes);
app.route('/api/memorial-sites', memorialSitesRoutes);
app.route('/api/suppliers', suppliersRoutes);

// Export type for RPC client
export type AppType = typeof api;

export default {
	port: 3000,
	fetch: app.fetch,
};
