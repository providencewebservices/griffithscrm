import { pgTable, text, timestamp, boolean, primaryKey } from 'drizzle-orm/pg-core';

// Tenants table (must be defined before users due to foreign key)
export const tenants = pgTable('tenants', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Better Auth required tables (with custom fields for multi-tenancy)
export const users = pgTable('users', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	// Custom fields for multi-tenancy
	role: text('role').notNull().default('tenant_user'), // 'app_admin' | 'tenant_user'
	tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
	// Admin plugin fields
	banned: boolean('banned'),
	banReason: text('ban_reason'),
	banExpires: timestamp('ban_expires'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	token: text('token').notNull().unique(),
	expiresAt: timestamp('expires_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	idToken: text('id_token'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customers table (tenant-scoped)
export const customers = pgTable('customers', {
	id: text('id').primaryKey(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	archivedAt: timestamp('archived_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Contact info table (reusable via join tables)
export const contactInfo = pgTable('contact_info', {
	id: text('id').primaryKey(),
	type: text('type').notNull(), // 'email' | 'phone' | 'mobile' | 'fax' | 'other'
	value: text('value').notNull(),
	label: text('label'), // 'Work', 'Home', etc.
	isPrimary: boolean('is_primary').notNull().default(false),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Addresses table (Google Places compatible, reusable via join tables)
export const addresses = pgTable('addresses', {
	id: text('id').primaryKey(),
	// Google Places API address_components format
	streetNumber: text('street_number'),
	route: text('route'), // Street name
	locality: text('locality'), // City
	administrativeAreaLevel1: text('administrative_area_level_1'), // State/Province
	administrativeAreaLevel2: text('administrative_area_level_2'), // County
	postalCode: text('postal_code'),
	postalCodeSuffix: text('postal_code_suffix'),
	country: text('country').notNull().default('US'),
	// Additional fields
	formattedAddress: text('formatted_address').notNull(),
	placeId: text('place_id'), // Google Place ID
	latitude: text('latitude'),
	longitude: text('longitude'),
	label: text('label'), // 'Billing', 'Shipping', etc.
	isPrimary: boolean('is_primary').notNull().default(false),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer <-> Contact Info join table
export const customerContactInfo = pgTable(
	'customer_contact_info',
	{
		customerId: text('customer_id')
			.notNull()
			.references(() => customers.id, { onDelete: 'cascade' }),
		contactInfoId: text('contact_info_id')
			.notNull()
			.references(() => contactInfo.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.customerId, table.contactInfoId] }),
	})
);

// Customer <-> Addresses join table
export const customerAddresses = pgTable(
	'customer_addresses',
	{
		customerId: text('customer_id')
			.notNull()
			.references(() => customers.id, { onDelete: 'cascade' }),
		addressId: text('address_id')
			.notNull()
			.references(() => addresses.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.customerId, table.addressId] }),
	})
);
