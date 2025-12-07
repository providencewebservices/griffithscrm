import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './lib/auth';
import { adminRoutes } from './routes/admin';

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
				role: (session.user as { role?: string }).role || 'customer',
				tenantId: (session.user as { tenantId?: string }).tenantId || null,
			},
		});
	});

app.route('/api', api);

// Admin routes
app.route('/api/admin', adminRoutes);

// Export type for RPC client
export type AppType = typeof api;

export default {
	port: 3000,
	fetch: app.fetch,
};
