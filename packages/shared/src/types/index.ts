import type { InferSelectModel } from 'drizzle-orm';
import type {
	users,
	tenants,
	customers,
	contactInfo,
	addresses,
} from '../db/schema';

// Role types
export const USER_ROLES = ['app_admin', 'tenant_user'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Contact info types
export const CONTACT_INFO_TYPES = ['email', 'phone', 'mobile', 'fax', 'other'] as const;
export type ContactInfoType = (typeof CONTACT_INFO_TYPES)[number];

// Database model types
export type User = InferSelectModel<typeof users>;
export type Tenant = InferSelectModel<typeof tenants>;
export type Customer = InferSelectModel<typeof customers>;
export type ContactInfo = InferSelectModel<typeof contactInfo>;
export type Address = InferSelectModel<typeof addresses>;

// Helper type for user with tenant
export type UserWithTenant = User & {
	tenant: Tenant | null;
};

// Helper type for tenant with business address
export type TenantWithAddress = Tenant & {
	address: Address | null;
};

// Helper type for customer with relations
export type CustomerWithRelations = Customer & {
	contactInfo: ContactInfo[];
	addresses: Address[];
};

// Helper type for customer list item (with primary contact/address)
export type CustomerListItem = Customer & {
	primaryEmail?: ContactInfo;
	primaryPhone?: ContactInfo;
	primaryAddress?: Address;
};
