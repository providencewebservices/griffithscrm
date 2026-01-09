import type { InferSelectModel } from 'drizzle-orm';
import type {
	users,
	tenants,
	customers,
	contactInfo,
	addresses,
	productCategories,
	products,
	productOptions,
	optionChoices,
	letteringTechniques,
	letteringColors,
	sundries,
	services,
} from '../db/schema';

import { PRODUCT_OPTION_TYPES, SERVICE_PRICING_TYPES } from '../db/schema';

// Role types
export const USER_ROLES = ['app_admin', 'manager', 'tenant_user'] as const;
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

// ============================================
// PRODUCT CATALOG TYPES
// ============================================

// Re-export constants for use in other packages
export { PRODUCT_OPTION_TYPES, SERVICE_PRICING_TYPES };

// Product option type enum
export type ProductOptionType = (typeof PRODUCT_OPTION_TYPES)[number];

// Service pricing type enum
export type ServicePricingType = (typeof SERVICE_PRICING_TYPES)[number];

// Database model types for products
export type ProductCategory = InferSelectModel<typeof productCategories>;
export type Product = InferSelectModel<typeof products>;
export type ProductOption = InferSelectModel<typeof productOptions>;
export type OptionChoice = InferSelectModel<typeof optionChoices>;

// Database model types for tenant settings
export type LetteringTechnique = InferSelectModel<typeof letteringTechniques>;
export type LetteringColor = InferSelectModel<typeof letteringColors>;
export type Sundry = InferSelectModel<typeof sundries>;
export type Service = InferSelectModel<typeof services>;

// Helper type for product with category
export type ProductWithCategory = Product & {
	category: ProductCategory | null;
};

// Helper type for product option with choices
export type ProductOptionWithChoices = ProductOption & {
	choices: OptionChoice[];
};

// Helper type for full product with all relations
export type ProductWithRelations = Product & {
	category: ProductCategory | null;
	options: ProductOptionWithChoices[];
};
