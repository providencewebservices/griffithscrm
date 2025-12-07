import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { auth, db } from '../lib/auth';
import { tenants, users } from '@griffiths-crm/shared/db/schema';

// Validation schemas
const createTenantSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	slug: z
		.string()
		.min(1, 'Slug is required')
		.regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

const createUserSchema = z.object({
	email: z.string().email('Invalid email'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	name: z.string().min(1, 'Name is required'),
	role: z.enum(['app_admin', 'customer']),
	tenantId: z.string().optional(),
});

// Create admin routes
const adminRoutes = new Hono()
	// Apply auth middleware to all admin routes
	.use('*', requireAuth)
	.use('*', requireAdmin)

	// === Tenant Routes ===

	// List all tenants
	.get('/tenants', async (c) => {
		const allTenants = await db.select().from(tenants).orderBy(tenants.name);
		return c.json({ tenants: allTenants });
	})

	// Create a new tenant
	.post('/tenants', zValidator('json', createTenantSchema), async (c) => {
		const { name, slug } = c.req.valid('json');

		// Check if slug already exists
		const existing = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);

		if (existing.length > 0) {
			return c.json({ error: 'Tenant with this slug already exists' }, 400);
		}

		const id = crypto.randomUUID();
		const now = new Date();

		const [newTenant] = await db
			.insert(tenants)
			.values({
				id,
				name,
				slug,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		return c.json({ tenant: newTenant }, 201);
	})

	// Get a specific tenant
	.get('/tenants/:id', async (c) => {
		const id = c.req.param('id');
		const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);

		if (!tenant) {
			return c.json({ error: 'Tenant not found' }, 404);
		}

		return c.json({ tenant });
	})

	// === User Routes ===

	// List all users (optionally filtered by tenant)
	.get('/users', async (c) => {
		const tenantId = c.req.query('tenantId');

		let query = db.select().from(users);

		if (tenantId) {
			query = query.where(eq(users.tenantId, tenantId)) as typeof query;
		}

		const allUsers = await query.orderBy(users.name);

		// Remove sensitive fields
		const safeUsers = allUsers.map(({ ...user }) => ({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			tenantId: user.tenantId,
			createdAt: user.createdAt,
		}));

		return c.json({ users: safeUsers });
	})

	// Create a new user
	.post('/users', zValidator('json', createUserSchema), async (c) => {
		const { email, password, name, role, tenantId } = c.req.valid('json');

		// Validate tenant requirement for customer role
		if (role === 'customer' && !tenantId) {
			return c.json({ error: 'Customer users must have a tenant assigned' }, 400);
		}

		// Validate app_admin should not have tenant
		if (role === 'app_admin' && tenantId) {
			return c.json({ error: 'App admin users should not have a tenant assigned' }, 400);
		}

		// Verify tenant exists if provided
		if (tenantId) {
			const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

			if (!tenant) {
				return c.json({ error: 'Tenant not found' }, 400);
			}
		}

		// Check if email already exists
		const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

		if (existingUser.length > 0) {
			return c.json({ error: 'User with this email already exists' }, 400);
		}

		// Use Better Auth's admin API to create user
		try {
			const result = await auth.api.createUser({
				body: {
					email,
					password,
					name,
					role,
					data: {
						tenantId: tenantId || null,
					},
				},
				headers: c.req.raw.headers,
			});

			// Update the user with tenantId since Better Auth might not handle custom fields
			if (tenantId && result.user) {
				await db.update(users).set({ tenantId }).where(eq(users.id, result.user.id));
			}

			return c.json(
				{
					user: {
						id: result.user.id,
						name: result.user.name,
						email: result.user.email,
						role,
						tenantId: tenantId || null,
					},
				},
				201
			);
		} catch (error) {
			console.error('Error creating user:', error);
			return c.json({ error: 'Failed to create user' }, 500);
		}
	})

	// Get a specific user
	.get('/users/:id', async (c) => {
		const id = c.req.param('id');
		const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

		if (!user) {
			return c.json({ error: 'User not found' }, 404);
		}

		return c.json({
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				tenantId: user.tenantId,
				createdAt: user.createdAt,
			},
		});
	});

export { adminRoutes };
