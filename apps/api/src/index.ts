import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './lib/auth';
import { startEmailSyncScheduler } from './lib/email-sync-scheduler';
import { adminRoutes } from './routes/admin';
import { brochuresRoutes } from './routes/brochures';
import { calendarRoutes } from './routes/calendar';
import { customerRoutes } from './routes/customers';
import { dashboardRoutes } from './routes/dashboard';
import { dimensionCombosRoutes } from './routes/dimension-combos';
import { documentFoldersRoutes } from './routes/document-folders';
import { documentsRoutes } from './routes/documents';
import { emailIntegrationsRoutes } from './routes/email-integrations';
import { externalProductsRoutes } from './routes/external-products';
import { finishesRoutes } from './routes/finishes';
import { fontProxyRoutes } from './routes/font-proxy';
import { fontsRoutes } from './routes/fonts';
import { funeralDirectorsRoutes } from './routes/funeral-directors';
import { inboxRoutes } from './routes/inbox';
import { inboxWebhookRoutes } from './routes/inbox-webhook';
import { jobFormsRoutes } from './routes/job-forms';
import { jobProofsRoutes } from './routes/job-proofs';
import { jobWorkflowTasksRoutes } from './routes/job-workflow-tasks';
import { jobsRouter } from './routes/jobs';
import { letteringColorsRoutes } from './routes/lettering-colors';
import { letteringCostsRoutes } from './routes/lettering-costs';
import { letteringTechniquesRoutes } from './routes/lettering-techniques';
import { lineItemPresetsRoutes } from './routes/line-item-presets';
import { logoProxyRoutes } from './routes/logo-proxy';
import { materialSectionsRoutes } from './routes/material-sections';
import { materialsRoutes } from './routes/materials';
import { memorialSitesRoutes } from './routes/memorial-sites';
import { optionChoicesRoutes } from './routes/option-choices';
import { paymentsRoutes } from './routes/payments';
import { pipelineRoutes } from './routes/pipeline';
import { productCategoriesRoutes } from './routes/product-categories';
import { productComponentsRoutes } from './routes/product-components';
import { productOptionsRoutes } from './routes/product-options';
import { productsRoutes } from './routes/products';
import { publicBrochuresRoutes } from './routes/public-brochures';
import { publicPaymentsRoutes } from './routes/public-payments';
import { publicQuotesRoutes } from './routes/public-quotes';
import { quotesRoutes } from './routes/quotes';
import { sundriesRoutes } from './routes/sundries';
import { supplierCategoriesRoutes } from './routes/supplier-categories';
import { supplierCollectionsRoutes } from './routes/supplier-collections';
import { supplierProductsRoutes } from './routes/supplier-products';
import { suppliersRoutes } from './routes/suppliers';
import { takepaymentsSettingsRoutes } from './routes/takepayments-settings';
import { tasksRoutes } from './routes/tasks';
import { teamRoutes } from './routes/team';
import { tenantPricingSettingsRoutes } from './routes/tenant-pricing-settings';
import { tenantSettingsRoutes } from './routes/tenant-settings';
import { timeOffRoutes } from './routes/time-off';
import { uploadRoutes } from './routes/uploads';
import { workflowTemplatesRoutes } from './routes/workflow-templates';
import { worksheetsRoutes } from './routes/worksheets';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
	'*',
	cors({
		origin: ['http://localhost:5173', process.env.CORS_ORIGIN].filter(Boolean) as string[],
		credentials: true,
	}),
);

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Better Auth routes
app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw));

// Public routes (no auth required)
app.route('/api/external', externalProductsRoutes);
app.route('/api/public/quotes', publicQuotesRoutes);
app.route('/api/public/payments', publicPaymentsRoutes);
app.route('/api/public/brochures', publicBrochuresRoutes);
app.route('/api/fonts', fontProxyRoutes);
app.route('/api/logo', logoProxyRoutes);

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
app.route('/api/tenant/fonts', fontsRoutes);
app.route('/api/tenant/sundries', sundriesRoutes);
app.route('/api/tenant/line-item-presets', lineItemPresetsRoutes);
app.route('/api/tenant/workflow-templates', workflowTemplatesRoutes);

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
app.route('/api/tenant/takepayments-settings', takepaymentsSettingsRoutes);

// Payment routes (for tenant users)
app.route('/api/payments', paymentsRoutes);

// Quote routes (for tenant users)
app.route('/api/quotes', quotesRoutes);

// Brochure routes (for tenant users)
app.route('/api/brochures', brochuresRoutes);

// Job routes (for tenant users)
app.route('/api/jobs', jobsRouter);
app.route('/api/jobs', jobWorkflowTasksRoutes);
app.route('/api/jobs', jobFormsRoutes);
app.route('/api/jobs', jobProofsRoutes);

// Dashboard routes (for tenant users)
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/dashboard/pipeline', pipelineRoutes);

// Linked records routes (for tenant users)
app.route('/api/funeral-directors', funeralDirectorsRoutes);
app.route('/api/memorial-sites', memorialSitesRoutes);
app.route('/api/suppliers', suppliersRoutes);
app.route('/api/tenant/supplier-collections', supplierCollectionsRoutes);
app.route('/api/tenant/supplier-categories', supplierCategoriesRoutes);
app.route('/api/tenant/supplier-products', supplierProductsRoutes);

// Calendar routes (for tenant users)
app.route('/api/calendar', calendarRoutes);
app.route('/api/time-off', timeOffRoutes);

// Documents routes (for tenant users)
app.route('/api/documents', documentsRoutes);
app.route('/api/document-folders', documentFoldersRoutes);

// Tasks & Worksheets routes
app.route('/api/tasks', tasksRoutes);
app.route('/api/worksheets', worksheetsRoutes);

// Email integration routes
app.route('/api/email-integrations', emailIntegrationsRoutes);
app.route('/api/inbox', inboxWebhookRoutes); // Unauthenticated webhook (must be before authenticated routes)
app.route('/api/inbox', inboxRoutes);

// Export type for RPC client
export type AppType = typeof api;

// Start background email sync
startEmailSyncScheduler();

export default {
	port: 3000,
	fetch: app.fetch,
};
