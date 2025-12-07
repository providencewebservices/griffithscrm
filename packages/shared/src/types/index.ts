import type { InferSelectModel } from 'drizzle-orm';
import type { users, tenants } from '../db/schema';

// Role types
export const USER_ROLES = ['app_admin', 'customer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Database model types
export type User = InferSelectModel<typeof users>;
export type Tenant = InferSelectModel<typeof tenants>;

// Helper type for user with tenant
export type UserWithTenant = User & {
	tenant: Tenant | null;
};
