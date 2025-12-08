import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { createDb } from '@griffiths-crm/shared/db';

const db = createDb(process.env.DATABASE_URL!);

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		usePlural: true,
	}),
	trustedOrigins: ['http://localhost:5173'],
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
	},
	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: false,
				defaultValue: 'customer',
				input: false, // Don't allow users to set their own role on signup
			},
			tenantId: {
				type: 'string',
				required: false,
				input: false, // Don't allow users to set their own tenant on signup
			},
		},
	},
	plugins: [
		admin({
			defaultRole: 'customer',
			adminRoles: ['app_admin'],
			isAdmin: async (user) => {
				return user.role === 'app_admin';
			},
		}),
	],
});

export type Auth = typeof auth;

// Export db for use in other parts of the API
export { db };
