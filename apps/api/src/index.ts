import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './lib/auth';

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
const api = new Hono().get('/hello', (c) =>
  c.json({ message: 'Hello from Griffiths CRM API!' })
);

app.route('/api', api);

// Export type for RPC client
export type AppType = typeof api;

export default {
  port: 3000,
  fetch: app.fetch,
};
