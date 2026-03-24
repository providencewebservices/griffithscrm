import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
	plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

// Type for user with custom fields
export type AuthUser = {
	id: string;
	name: string;
	email: string;
	role: 'app_admin' | 'tenant_user';
	tenantId: string | null;
};
