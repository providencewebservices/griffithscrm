import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import { auth } from '../lib/auth';

// Type for the user object stored in context
export type AuthUser = {
	id: string;
	name: string;
	email: string;
	role: string;
	tenantId: string | null;
};

// Type for session object
export type AuthSession = {
	id: string;
	userId: string;
	token: string;
	expiresAt: Date;
};

// Extend Hono context with our auth types
declare module 'hono' {
	interface ContextVariableMap {
		user: AuthUser;
		session: AuthSession;
	}
}

/**
 * Middleware that requires authentication.
 * Sets user and session on context if authenticated.
 * Returns 401 if not authenticated.
 */
export const requireAuth = createMiddleware(async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });

	if (!session) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	c.set('user', session.user as AuthUser);
	c.set('session', session.session as AuthSession);
	await next();
});

/**
 * Middleware that requires app_admin role.
 * Must be used AFTER requireAuth middleware.
 * Returns 403 if user is not an admin.
 */
export const requireAdmin = createMiddleware(async (c, next) => {
	const user = c.get('user');

	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	if (user.role !== 'app_admin') {
		return c.json({ error: 'Forbidden: Admin access required' }, 403);
	}

	await next();
});

/**
 * Middleware that requires the user to belong to a tenant.
 * Must be used AFTER requireAuth middleware.
 * Returns 403 if user has no tenant assigned.
 */
export const requireTenant = createMiddleware(async (c, next) => {
	const user = c.get('user');

	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	if (!user.tenantId) {
		return c.json({ error: 'Forbidden: No tenant assigned' }, 403);
	}

	await next();
});

/**
 * Helper to get current user from context.
 * Returns null if not authenticated.
 */
export function getUser(c: Context): AuthUser | null {
	try {
		return c.get('user') || null;
	} catch {
		return null;
	}
}

/**
 * Helper to check if current user is an admin.
 */
export function isAdmin(c: Context): boolean {
	const user = getUser(c);
	return user?.role === 'app_admin';
}

/**
 * Middleware that requires manager or app_admin role.
 * Must be used AFTER requireAuth middleware.
 * Returns 403 if user is not a manager or admin.
 */
export const requireManager = createMiddleware(async (c, next) => {
	const user = c.get('user');

	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	if (user.role !== 'app_admin' && user.role !== 'manager') {
		return c.json({ error: 'Forbidden: Manager access required' }, 403);
	}

	await next();
});

/**
 * Helper to check if a role has manager privileges.
 */
export function isManagerRole(role: string): boolean {
	return role === 'app_admin' || role === 'manager';
}
