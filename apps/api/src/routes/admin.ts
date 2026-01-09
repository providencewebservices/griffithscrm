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

const updateTenantSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	slug: z
		.string()
		.min(1, 'Slug is required')
		.regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
		.optional(),
});

const createUserSchema = z.object({
	email: z.string().email('Invalid email'),
	name: z.string().min(1, 'Name is required'),
	role: z.enum(['app_admin', 'manager', 'tenant_user']),
	tenantId: z.string().optional(),
});

const updateUserSchema = z.object({
	email: z.string().email('Invalid email').optional(),
	password: z.string().min(8, 'Password must be at least 8 characters').optional(),
	name: z.string().min(1, 'Name is required').optional(),
	role: z.enum(['app_admin', 'manager', 'tenant_user']).optional(),
	tenantId: z.string().nullable().optional(),
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

	// Update a tenant
	.put('/tenants/:id', zValidator('json', updateTenantSchema), async (c) => {
		const id = c.req.param('id');
		const updates = c.req.valid('json');

		// Check if tenant exists
		const [existing] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);

		if (!existing) {
			return c.json({ error: 'Tenant not found' }, 404);
		}

		// If updating slug, check it's unique
		if (updates.slug && updates.slug !== existing.slug) {
			const [slugExists] = await db
				.select()
				.from(tenants)
				.where(eq(tenants.slug, updates.slug))
				.limit(1);

			if (slugExists) {
				return c.json({ error: 'Tenant with this slug already exists' }, 400);
			}
		}

		const [updated] = await db
			.update(tenants)
			.set({
				...updates,
				updatedAt: new Date(),
			})
			.where(eq(tenants.id, id))
			.returning();

		return c.json({ tenant: updated });
	})

	// Delete a tenant
	.delete('/tenants/:id', async (c) => {
		const id = c.req.param('id');

		// Check if tenant exists
		const [existing] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);

		if (!existing) {
			return c.json({ error: 'Tenant not found' }, 404);
		}

		// Check if tenant has users
		const tenantUsers = await db.select().from(users).where(eq(users.tenantId, id)).limit(1);

		if (tenantUsers.length > 0) {
			return c.json(
				{ error: 'Cannot delete tenant with assigned users. Reassign or delete users first.' },
				400
			);
		}

		await db.delete(tenants).where(eq(tenants.id, id));

		return c.json({ success: true });
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
		const { email, name, role, tenantId } = c.req.valid('json');

		// Validate tenant requirement for tenant_user and manager roles
		if ((role === 'tenant_user' || role === 'manager') && !tenantId) {
			return c.json({ error: 'Tenant users and managers must have a tenant assigned' }, 400);
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
		// No headers passed - server-side calls are trusted by Better Auth
		// Admin authorization already verified by requireAdmin middleware
		try {
			// Generate a random password (user will set their own via email)
			const randomPassword = crypto.randomUUID() + crypto.randomUUID();

			const result = await auth.api.createUser({
				body: {
					email,
					password: randomPassword,
					name,
					role,
					data: {
						tenantId: tenantId || null,
					},
				},
			});

			// Update the user with tenantId since Better Auth might not handle custom fields
			if (tenantId && result.user) {
				await db.update(users).set({ tenantId }).where(eq(users.id, result.user.id));
			}

			// Send password reset email so user can set their own password
			const webUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
			await auth.api.requestPasswordReset({
				body: {
					email,
					redirectTo: `${webUrl}/reset-password`,
				},
			});

			return c.json(
				{
					user: {
						id: result.user.id,
						name: result.user.name,
						email: result.user.email,
						role,
						tenantId: tenantId || null,
					},
					message: 'Invitation sent. User will receive an email to set their password.',
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
	})

	// Update a user
	.put('/users/:id', zValidator('json', updateUserSchema), async (c) => {
		const id = c.req.param('id');
		const updates = c.req.valid('json');

		// Check if user exists
		const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);

		if (!existing) {
			return c.json({ error: 'User not found' }, 404);
		}

		// Validate role/tenant combination
		const newRole = updates.role ?? existing.role;
		const newTenantId = updates.tenantId !== undefined ? updates.tenantId : existing.tenantId;

		if ((newRole === 'tenant_user' || newRole === 'manager') && !newTenantId) {
			return c.json({ error: 'Tenant users and managers must have a tenant assigned' }, 400);
		}

		if (newRole === 'app_admin' && newTenantId) {
			return c.json({ error: 'App admin users should not have a tenant assigned' }, 400);
		}

		// Verify tenant exists if provided
		if (newTenantId) {
			const [tenant] = await db
				.select()
				.from(tenants)
				.where(eq(tenants.id, newTenantId))
				.limit(1);

			if (!tenant) {
				return c.json({ error: 'Tenant not found' }, 400);
			}
		}

		// If updating email, check it's unique
		if (updates.email && updates.email !== existing.email) {
			const [emailExists] = await db
				.select()
				.from(users)
				.where(eq(users.email, updates.email))
				.limit(1);

			if (emailExists) {
				return c.json({ error: 'User with this email already exists' }, 400);
			}
		}

		// Handle password update separately using Better Auth
		// No headers - server-side calls are trusted, admin check done by middleware
		if (updates.password) {
			try {
				await auth.api.setPassword({
					body: {
						userId: id,
						newPassword: updates.password,
					},
				});
			} catch (error) {
				console.error('Error updating password:', error);
				return c.json({ error: 'Failed to update password' }, 500);
			}
		}

		// Update other fields
		const { password: _, ...fieldsToUpdate } = updates;
		const updateData: Record<string, unknown> = { ...fieldsToUpdate, updatedAt: new Date() };

		// Handle nullable tenantId
		if (updates.tenantId === null) {
			updateData.tenantId = null;
		}

		const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();

		return c.json({
			user: {
				id: updated.id,
				name: updated.name,
				email: updated.email,
				role: updated.role,
				tenantId: updated.tenantId,
				createdAt: updated.createdAt,
			},
		});
	})

	// Delete a user
	.delete('/users/:id', async (c) => {
		const id = c.req.param('id');
		const currentUser = c.get('user');

		// Prevent self-deletion
		if (currentUser?.id === id) {
			return c.json({ error: 'Cannot delete your own account' }, 400);
		}

		// Check if user exists
		const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);

		if (!existing) {
			return c.json({ error: 'User not found' }, 404);
		}

		await db.delete(users).where(eq(users.id, id));

		return c.json({ success: true });
	});

export { adminRoutes };
