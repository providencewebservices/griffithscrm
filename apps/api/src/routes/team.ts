import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { auth, db } from '../lib/auth';
import { users } from '@griffiths-crm/shared/db/schema';

// Validation schemas
const inviteUserSchema = z.object({
	email: z.string().email('Invalid email'),
	name: z.string().min(1, 'Name is required'),
});

const updateUserSchema = z.object({
	email: z.string().email('Invalid email').optional(),
	name: z.string().min(1, 'Name is required').optional(),
});

// Create team routes (customer users managing their team)
const teamRoutes = new Hono()
	// Apply auth and tenant middleware to all team routes
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List all users in the current user's tenant
	.get('/users', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		const tenantUsers = await db
			.select()
			.from(users)
			.where(eq(users.tenantId, tenantId))
			.orderBy(users.name);

		// Return safe user data
		const safeUsers = tenantUsers.map((user) => ({
			id: user.id,
			name: user.name,
			email: user.email,
			emailVerified: user.emailVerified,
			createdAt: user.createdAt,
		}));

		return c.json({ users: safeUsers });
	})

	// Invite a new user to the team
	.post('/users', zValidator('json', inviteUserSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { email, name } = c.req.valid('json');

		// Check if email already exists
		const existingUser = await db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		if (existingUser.length > 0) {
			return c.json({ error: 'User with this email already exists' }, 400);
		}

		try {
			// Generate a random password (user will set their own via email)
			const randomPassword = crypto.randomUUID() + crypto.randomUUID();

			// Create user with Better Auth admin API
			const result = await auth.api.createUser({
				body: {
					email,
					password: randomPassword,
					name,
					role: 'tenant_user',
					data: {
						tenantId,
					},
				},
			});

			// Update the user with tenantId
			if (result.user) {
				await db
					.update(users)
					.set({ tenantId })
					.where(eq(users.id, result.user.id));
			}

			// Trigger password reset email so user can set their own password
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
					},
					message: 'Invitation sent. User will receive an email to set their password.',
				},
				201
			);
		} catch (error) {
			console.error('Error inviting user:', error);
			return c.json({ error: 'Failed to invite user' }, 500);
		}
	})

	// Update a team member
	.put('/users/:id', zValidator('json', updateUserSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const userId = c.req.param('id');
		const updates = c.req.valid('json');

		// Check if user exists and belongs to the same tenant
		const [existingUser] = await db
			.select()
			.from(users)
			.where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
			.limit(1);

		if (!existingUser) {
			return c.json({ error: 'User not found' }, 404);
		}

		// If updating email, check it's unique
		if (updates.email && updates.email !== existingUser.email) {
			const [emailExists] = await db
				.select()
				.from(users)
				.where(eq(users.email, updates.email))
				.limit(1);

			if (emailExists) {
				return c.json({ error: 'User with this email already exists' }, 400);
			}
		}

		// Update user
		const [updated] = await db
			.update(users)
			.set({
				...updates,
				updatedAt: new Date(),
			})
			.where(eq(users.id, userId))
			.returning();

		return c.json({
			user: {
				id: updated.id,
				name: updated.name,
				email: updated.email,
				createdAt: updated.createdAt,
			},
		});
	})

	// Delete a team member
	.delete('/users/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const userId = c.req.param('id');

		// Prevent self-deletion
		if (currentUser.id === userId) {
			return c.json({ error: 'Cannot delete your own account' }, 400);
		}

		// Check if user exists and belongs to the same tenant
		const [existingUser] = await db
			.select()
			.from(users)
			.where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
			.limit(1);

		if (!existingUser) {
			return c.json({ error: 'User not found' }, 404);
		}

		await db.delete(users).where(eq(users.id, userId));

		return c.json({ success: true });
	})

	// Resend invitation email
	.post('/users/:id/resend-invite', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const userId = c.req.param('id');

		// Check if user exists and belongs to the same tenant
		const [existingUser] = await db
			.select()
			.from(users)
			.where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
			.limit(1);

		if (!existingUser) {
			return c.json({ error: 'User not found' }, 404);
		}

		try {
			// Trigger password reset email
			const webUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
			await auth.api.requestPasswordReset({
				body: {
					email: existingUser.email,
					redirectTo: `${webUrl}/reset-password`,
				},
			});

			return c.json({ message: 'Invitation resent successfully' });
		} catch (error) {
			console.error('Error resending invite:', error);
			return c.json({ error: 'Failed to resend invitation' }, 500);
		}
	});

export { teamRoutes };
