import { createDb } from '@griffiths-crm/shared/db';
import { users } from '@griffiths-crm/shared/db/schema';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { sendEmail } from './email';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error('DATABASE_URL environment variable is required');
}
const db = createDb(databaseUrl);

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		usePlural: true,
	}),
	trustedOrigins: ['http://localhost:5173', process.env.CORS_ORIGIN].filter(Boolean) as string[],
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID || '',
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
			disableSignUp: true, // Only existing users can sign in
		},
		microsoft: {
			clientId: process.env.MICROSOFT_CLIENT_ID || '',
			clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
			tenantId: 'common', // Allow any Microsoft account
			disableSignUp: true, // Only existing users can sign in
		},
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				subject: 'Verify your email - Griffiths CRM',
				text: `Click the link to verify your email: ${url}`,
				html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
			});
		},
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		resetPasswordTokenExpiresIn: 172800, // 48 hours in seconds
		sendResetPassword: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				subject: 'Set your password - Griffiths CRM',
				text: `Click the link to set your password: ${url}\n\nThis link will expire in 48 hours.`,
				html: `<p>Click <a href="${url}">here</a> to set your password.</p><p><small>This link will expire in 48 hours.</small></p>`,
			});
		},
		onPasswordReset: async ({ user }) => {
			// Mark email as verified since they clicked the reset link
			await db.update(users).set({ emailVerified: true }).where(eq(users.id, user.id));
		},
	},
	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: false,
				defaultValue: 'tenant_user',
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
			defaultRole: 'tenant_user',
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
