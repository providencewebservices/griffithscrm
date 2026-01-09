import { pgTable, text, timestamp, boolean, primaryKey, integer, numeric } from 'drizzle-orm/pg-core';

// Tenants table (must be defined before users due to foreign key)
export const tenants = pgTable('tenants', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	addressId: text('address_id'), // References addresses table (FK added via migration)
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

// ============================================
// LINKED RECORDS (Funeral Directors, Councils, Churches, Chapels)
// ============================================

// Referral arrangement types for funeral directors
export const REFERRAL_ARRANGEMENTS = ['none', 'informal', 'commission', 'preferred_partner'] as const;

// Memorial site types
export const MEMORIAL_SITE_TYPES = ['churchyard', 'crematorium', 'council_cemetery'] as const;

// Payment terms for suppliers
export const PAYMENT_TERMS = ['cod', 'net_7', 'net_14', 'net_30', 'net_60', 'net_90'] as const;

// Church denominations (for churchyard sites)
export const CHURCH_DENOMINATIONS = [
	'church_of_england',
	'catholic',
	'methodist',
	'baptist',
	'presbyterian',
	'quaker',
	'jewish',
	'muslim',
	'hindu',
	'sikh',
	'other',
] as const;

// Funeral Directors (referral partners)
export const funeralDirectors = pgTable('funeral_directors', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	businessName: text('business_name').notNull(),
	tradingName: text('trading_name'), // If different from legal name
	branchName: text('branch_name'), // For chains with multiple branches
	website: text('website'),
	referralArrangement: text('referral_arrangement').notNull().default('none'), // From REFERRAL_ARRANGEMENTS
	commissionRate: numeric('commission_rate', { precision: 5, scale: 2 }), // Percentage if commission-based
	notes: text('notes'),
	isActive: boolean('is_active').notNull().default(true),
	archivedAt: timestamp('archived_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Funeral Director <-> Contact Info join table
export const funeralDirectorContactInfo = pgTable(
	'funeral_director_contact_info',
	{
		funeralDirectorId: text('funeral_director_id')
			.notNull()
			.references(() => funeralDirectors.id, { onDelete: 'cascade' }),
		contactInfoId: text('contact_info_id')
			.notNull()
			.references(() => contactInfo.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.funeralDirectorId, table.contactInfoId] }),
	})
);

// Funeral Director <-> Addresses join table
export const funeralDirectorAddresses = pgTable(
	'funeral_director_addresses',
	{
		funeralDirectorId: text('funeral_director_id')
			.notNull()
			.references(() => funeralDirectors.id, { onDelete: 'cascade' }),
		addressId: text('address_id')
			.notNull()
			.references(() => addresses.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.funeralDirectorId, table.addressId] }),
	})
);

// Councils / Cemeteries (local authorities managing public cemeteries)
export const councils = pgTable('councils', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	councilName: text('council_name').notNull(), // e.g., "Chester City Council"
	cemeteryName: text('cemetery_name'), // Specific cemetery name
	department: text('department'), // e.g., "Bereavement Services"
	permitRequired: boolean('permit_required').notNull().default(true),
	permitFee: numeric('permit_fee', { precision: 10, scale: 2 }),
	foundationSpec: text('foundation_spec'), // Foundation requirements
	maxHeadstoneHeight: text('max_headstone_height'), // e.g., "3ft 6in"
	maxHeadstoneWidth: text('max_headstone_width'),
	approvedMaterials: text('approved_materials'), // Allowed stone types
	installationRules: text('installation_rules'), // Specific installation requirements
	notes: text('notes'),
	isActive: boolean('is_active').notNull().default(true),
	archivedAt: timestamp('archived_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Council <-> Contact Info join table
export const councilContactInfo = pgTable(
	'council_contact_info',
	{
		councilId: text('council_id')
			.notNull()
			.references(() => councils.id, { onDelete: 'cascade' }),
		contactInfoId: text('contact_info_id')
			.notNull()
			.references(() => contactInfo.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.councilId, table.contactInfoId] }),
	})
);

// Council <-> Addresses join table
export const councilAddresses = pgTable(
	'council_addresses',
	{
		councilId: text('council_id')
			.notNull()
			.references(() => councils.id, { onDelete: 'cascade' }),
		addressId: text('address_id')
			.notNull()
			.references(() => addresses.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.councilId, table.addressId] }),
	})
);

// Memorial Sites (churchyards, crematoria, council cemeteries - unified entity for burial/memorial locations)
export const memorialSites = pgTable('memorial_sites', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	name: text('name').notNull(), // e.g., "St Mary's Church" or "Blacon Crematorium"
	siteType: text('site_type').notNull(), // From MEMORIAL_SITE_TYPES: 'churchyard' | 'crematorium' | 'council_cemetery'
	// Churchyard-specific fields
	denomination: text('denomination'), // From CHURCH_DENOMINATIONS
	diocese: text('diocese'), // For CofE churches
	parish: text('parish'),
	churchyardOpen: boolean('churchyard_open'), // Accepting new burials?
	facultyRequired: boolean('faculty_required'), // Needs faculty application? (CofE)
	// Crematorium-specific fields
	operatorName: text('operator_name'), // e.g., "Dignity Funerals"
	hasMemorialGarden: boolean('has_memorial_garden'),
	plaquesOffered: boolean('plaques_offered'),
	memorialOptions: text('memorial_options'), // Available memorial types
	preferredSupplier: boolean('preferred_supplier'), // Are we a preferred supplier?
	// Council cemetery-specific fields
	councilName: text('council_name'), // e.g., "Chester City Council"
	cemeteryName: text('cemetery_name'), // Specific cemetery name within council
	department: text('department'), // e.g., "Bereavement Services"
	permitRequired: boolean('permit_required'), // Needs permit for memorial work?
	permitFee: numeric('permit_fee', { precision: 10, scale: 2 }),
	foundationSpec: text('foundation_spec'), // Foundation requirements
	maxHeadstoneHeight: text('max_headstone_height'), // e.g., "3ft 6in"
	maxHeadstoneWidth: text('max_headstone_width'),
	installationRules: text('installation_rules'), // Specific installation requirements
	// Common fields
	memorialRegulations: text('memorial_regulations'), // Specific rules/restrictions
	approvedMaterials: text('approved_materials'), // Allowed stone types
	notes: text('notes'),
	isActive: boolean('is_active').notNull().default(true),
	archivedAt: timestamp('archived_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Memorial Site <-> Contact Info join table
export const memorialSiteContactInfo = pgTable(
	'memorial_site_contact_info',
	{
		memorialSiteId: text('memorial_site_id')
			.notNull()
			.references(() => memorialSites.id, { onDelete: 'cascade' }),
		contactInfoId: text('contact_info_id')
			.notNull()
			.references(() => contactInfo.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.memorialSiteId, table.contactInfoId] }),
	})
);

// Memorial Site <-> Addresses join table
export const memorialSiteAddresses = pgTable(
	'memorial_site_addresses',
	{
		memorialSiteId: text('memorial_site_id')
			.notNull()
			.references(() => memorialSites.id, { onDelete: 'cascade' }),
		addressId: text('address_id')
			.notNull()
			.references(() => addresses.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.memorialSiteId, table.addressId] }),
	})
);

// Suppliers (companies that supply materials and products)
export const suppliers = pgTable('suppliers', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	businessName: text('business_name').notNull(),
	tradingName: text('trading_name'), // If different from legal name
	accountNumber: text('account_number'), // Tenant's account with this supplier
	website: text('website'),
	paymentTerms: text('payment_terms'), // From PAYMENT_TERMS
	defaultLeadTimeDays: integer('default_lead_time_days'), // Typical delivery time
	minimumOrderValue: numeric('minimum_order_value', { precision: 10, scale: 2 }), // Minimum order requirement
	notes: text('notes'),
	isActive: boolean('is_active').notNull().default(true),
	archivedAt: timestamp('archived_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Supplier <-> Contact Info join table
export const supplierContactInfo = pgTable(
	'supplier_contact_info',
	{
		supplierId: text('supplier_id')
			.notNull()
			.references(() => suppliers.id, { onDelete: 'cascade' }),
		contactInfoId: text('contact_info_id')
			.notNull()
			.references(() => contactInfo.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.supplierId, table.contactInfoId] }),
	})
);

// Supplier <-> Addresses join table
export const supplierAddresses = pgTable(
	'supplier_addresses',
	{
		supplierId: text('supplier_id')
			.notNull()
			.references(() => suppliers.id, { onDelete: 'cascade' }),
		addressId: text('address_id')
			.notNull()
			.references(() => addresses.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.supplierId, table.addressId] }),
	})
);

// ============================================
// PRODUCT CATALOG TABLES
// ============================================

// Product categories (tenant-scoped)
export const productCategories = pgTable('product_categories', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	imageUrl: text('image_url'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Products (tenant-scoped)
export const products = pgTable('products', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	categoryId: text('category_id').references(() => productCategories.id, {
		onDelete: 'set null',
	}),
	supplierId: text('supplier_id').references(() => suppliers.id, {
		onDelete: 'set null',
	}),
	sku: text('sku').notNull(),
	name: text('name').notNull(),
	description: text('description'),
	imageUrl: text('image_url'),
	basePrice: numeric('base_price', { precision: 10, scale: 2 }),
	isActive: boolean('is_active').notNull().default(true),
	archivedAt: timestamp('archived_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Product option types
export const PRODUCT_OPTION_TYPES = [
	'dimension',
	'stone_color',
	'flower_holes',
	'custom',
] as const;

// Fixed choices for flower holes option type
export const FLOWER_HOLE_CHOICES = [
	'None Required',
	'Left',
	'Center',
	'Right',
	'Left & Right',
	'Three Flower Holes',
] as const;

// Product options (configurable aspects of a product)
export const productOptions = pgTable('product_options', {
	id: text('id').primaryKey(),
	productId: text('product_id')
		.notNull()
		.references(() => products.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	type: text('type').notNull(), // 'dimension' | 'stone_color' | 'flower_holes' | 'custom'
	isRequired: boolean('is_required').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Option choices (specific selections within an option)
export const optionChoices = pgTable('option_choices', {
	id: text('id').primaryKey(),
	optionId: text('option_id')
		.notNull()
		.references(() => productOptions.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	priceAdjustment: numeric('price_adjustment', { precision: 10, scale: 2 })
		.notNull()
		.default('0'),
	imageUrl: text('image_url'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// PRODUCT COMPONENTS & DIMENSION COMBOS
// ============================================

// Product components (what components a product includes, e.g., headstone + base)
export const productComponents = pgTable('product_components', {
	id: text('id').primaryKey(),
	productId: text('product_id')
		.notNull()
		.references(() => products.id, { onDelete: 'cascade' }),
	componentType: text('component_type').notNull(), // From COMPONENT_TYPES constant
	name: text('name'), // Display name override (optional)
	quantity: integer('quantity').notNull().default(1), // e.g., "2 vases"
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Dimension combos (predefined size configurations for a product)
export const dimensionCombos = pgTable('dimension_combos', {
	id: text('id').primaryKey(),
	productId: text('product_id')
		.notNull()
		.references(() => products.id, { onDelete: 'cascade' }),
	name: text('name'), // Optional display name like "Small", "Large"
	priceAdjustment: numeric('price_adjustment', { precision: 10, scale: 2 })
		.notNull()
		.default('0'),
	isActive: boolean('is_active').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Dimension combo values (actual dimensions for each component in a combo)
export const dimensionComboValues = pgTable('dimension_combo_values', {
	id: text('id').primaryKey(),
	comboId: text('combo_id')
		.notNull()
		.references(() => dimensionCombos.id, { onDelete: 'cascade' }),
	productComponentId: text('product_component_id')
		.notNull()
		.references(() => productComponents.id, { onDelete: 'cascade' }),
	dimension1: numeric('dimension_1', { precision: 10, scale: 2 }).notNull(), // First dimension (inches)
	dimension2: numeric('dimension_2', { precision: 10, scale: 2 }).notNull(), // Second dimension
	dimension3: numeric('dimension_3', { precision: 10, scale: 2 }).notNull(), // Third dimension
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Dimension labels by component type (different components use different label names)
// e.g., headstone: Height × Width × Thickness, base: Thickness × Width × Depth
export const COMPONENT_DIMENSION_LABELS: Record<string, [string, string, string]> = {
	headstone: ['Height', 'Width', 'Thickness'],
	base: ['Thickness', 'Width', 'Depth'],
	vase: ['Height', 'Diameter', 'Depth'],
	kerb: ['Height', 'Width', 'Depth'],
	book: ['Height', 'Width', 'Thickness'],
	post: ['Height', 'Width', 'Depth'],
	column: ['Height', 'Width', 'Depth'],
	capping_piece: ['Height', 'Width', 'Depth'],
	rest: ['Height', 'Width', 'Depth'],
	cross: ['Height', 'Width', 'Thickness'],
	die: ['Height', 'Width', 'Thickness'],
	tablet: ['Height', 'Width', 'Thickness'],
	slab: ['Height', 'Width', 'Thickness'],
	desk: ['Height', 'Width', 'Depth'],
	heart: ['Height', 'Width', 'Thickness'],
	gate: ['Height', 'Width', 'Depth'],
	flat_tablet: ['Height', 'Width', 'Thickness'],
	candle_box: ['Height', 'Width', 'Depth'],
	riser: ['Height', 'Width', 'Depth'],
	filler: ['Height', 'Width', 'Depth'],
	wing: ['Height', 'Width', 'Thickness'],
	piece: ['Height', 'Width', 'Depth'],
	wedge: ['Height', 'Width', 'Depth'],
	desk_headstone: ['Height', 'Width', 'Thickness'],
	column_cap: ['Height', 'Width', 'Depth'],
	plaque: ['Height', 'Width', 'Thickness'],
	default: ['Height', 'Width', 'Depth'],
};

// ============================================
// TENANT SETTINGS TABLES
// ============================================

// Lettering techniques (tenant-scoped)
export const letteringTechniques = pgTable('lettering_techniques', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	isActive: boolean('is_active').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Lettering cost applies to options
export const LETTERING_COST_APPLIES_TO = ['new_memorial', 'refurbishment', 'both'] as const;

// Lettering costs (linked to techniques, tenant-scoped via technique)
export const letteringCosts = pgTable('lettering_costs', {
	id: text('id').primaryKey(),
	techniqueId: text('technique_id')
		.notNull()
		.references(() => letteringTechniques.id, { onDelete: 'cascade' }),
	appliesTo: text('applies_to').notNull(), // 'new_memorial' | 'refurbishment' | 'both'
	freeLetters: integer('free_letters').notNull().default(0),
	pricePerLetter: numeric('price_per_letter', { precision: 10, scale: 2 })
		.notNull()
		.default('0'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Lettering colors (tenant-scoped)
export const letteringColors = pgTable('lettering_colors', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
	isActive: boolean('is_active').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Sundries - add-on items like ceramic flowers, photo plaques (tenant-scoped)
export const sundries = pgTable('sundries', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	supplierId: text('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
	name: text('name').notNull(),
	description: text('description'),
	price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
	imageUrl: text('image_url'),
	isActive: boolean('is_active').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Service pricing types
export const SERVICE_PRICING_TYPES = ['fixed', 'quoted', 'hourly'] as const;

// Services - labor services like cleaning, installation (tenant-scoped)
export const services = pgTable('services', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	basePrice: numeric('base_price', { precision: 10, scale: 2 }),
	pricingType: text('pricing_type').notNull().default('fixed'), // 'fixed' | 'quoted' | 'hourly'
	isActive: boolean('is_active').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// MATERIALS & PRICING TABLES
// ============================================

// Tenant pricing settings (retail price = supplierCost × multiplier, then VAT)
export const tenantPricingSettings = pgTable('tenant_pricing_settings', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.unique()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	defaultMarkupPercent: numeric('default_markup_percent', { precision: 10, scale: 2 })
		.notNull()
		.default('100'), // 100 = 100% markup = 2x multiplier
	vatRate: numeric('vat_rate', { precision: 5, scale: 4 }).notNull().default('0'), // e.g., 0.20 for 20%
	defaultDepositPercent: numeric('default_deposit_percent', { precision: 5, scale: 2 })
		.notNull()
		.default('50'), // 50 = 50% deposit
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Material sections (tenant-managed color families like White, Black, Light Grey)
export const materialSections = pgTable('material_sections', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Materials (specific stones within sections, e.g., Carrara White, Nero Assoluto)
export const materials = pgTable('materials', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	sectionId: text('section_id')
		.notNull()
		.references(() => materialSections.id, { onDelete: 'cascade' }),
	supplierId: text('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
	name: text('name').notNull(),
	imageUrl: text('image_url'),
	supplierCost: numeric('supplier_cost', { precision: 10, scale: 2 }).notNull().default('0'),
	isActive: boolean('is_active').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Finishes (surface treatments like Polished, Honed, Flamed)
export const finishes = pgTable('finishes', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	isActive: boolean('is_active').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Component types for quotes (26 predefined types)
export const COMPONENT_TYPES = [
	'headstone',
	'base',
	'vase',
	'kerb',
	'book',
	'post',
	'column',
	'capping_piece',
	'rest',
	'cross',
	'die',
	'tablet',
	'slab',
	'desk',
	'heart',
	'gate',
	'flat_tablet',
	'candle_box',
	'riser',
	'filler',
	'wing',
	'piece',
	'wedge',
	'desk_headstone',
	'column_cap',
	'plaque',
] as const;

// ============================================
// QUOTE SYSTEM TABLES
// ============================================

// Quote status options
export const QUOTE_STATUSES = [
	'draft', // Being prepared
	'review', // Awaiting internal approval
	'ready', // Approved, ready to present to customer
	'presented', // Shown/sent to customer
	'accepted', // Customer accepted
	'rejected', // Customer declined
	'expired', // Validity period passed
] as const;

// Enquiry source options (how the customer contacted us)
export const ENQUIRY_SOURCES = [
	'walk_in', // Customer visited in person
	'phone', // Phone call
	'email', // Email enquiry
	'website', // Website contact form
	'facebook', // Facebook/Messenger
	'instagram', // Instagram DM
	'whatsapp', // WhatsApp message
	'referral', // Referred by another customer
	'other', // Other source
] as const;

// Quotes table (immutable with versioning)
export const quotes = pgTable('quotes', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	parentQuoteId: text('parent_quote_id'), // Self-reference for versioning (no FK constraint to avoid circular)
	version: integer('version').notNull().default(1),
	serviceId: text('service_id').references(() => services.id, { onDelete: 'set null' }), // Primary service this quote is for
	customerId: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
	productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
	dimensionComboId: text('dimension_combo_id').references(() => dimensionCombos.id, {
		onDelete: 'set null',
	}),
	// Linked records (where the memorial will be installed / who referred)
	funeralDirectorId: text('funeral_director_id').references(() => funeralDirectors.id, {
		onDelete: 'set null',
	}),
	councilId: text('council_id').references(() => councils.id, { onDelete: 'set null' }),
	memorialSiteId: text('memorial_site_id').references(() => memorialSites.id, { onDelete: 'set null' }),
	quoteNumber: text('quote_number').notNull(), // Tenant-unique: "Q-00001"
	status: text('status').notNull().default('draft'), // From QUOTE_STATUSES
	source: text('source'), // From ENQUIRY_SOURCES - how the customer contacted us
	subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
	vatAmount: numeric('vat_amount', { precision: 10, scale: 2 }).notNull().default('0'),
	total: numeric('total', { precision: 10, scale: 2 }).notNull().default('0'),
	totalCost: numeric('total_cost', { precision: 10, scale: 2 }).notNull().default('0'), // Sum of supplier costs
	vatRate: numeric('vat_rate', { precision: 5, scale: 4 }).notNull().default('0'), // Snapshot of tenant VAT rate
	notes: text('notes'), // Customer-visible notes
	internalNotes: text('internal_notes'), // Tenant-only notes (hidden from customer)
	flowerHoles: text('flower_holes'), // From FLOWER_HOLE_CHOICES
	proposedInscription: text('proposed_inscription'), // Full text of desired inscription
	validUntil: timestamp('valid_until'),
	// Customer email notification fields
	accessToken: text('access_token').unique(), // Secure token for public quote link
	accessTokenCreatedAt: timestamp('access_token_created_at'),
	customerFeedback: text('customer_feedback'), // Customer's free-form feedback
	customerFeedbackAt: timestamp('customer_feedback_at'),
	customerDecision: text('customer_decision'), // 'accepted' | 'rejected'
	customerDecisionAt: timestamp('customer_decision_at'),
	emailSentAt: timestamp('email_sent_at'), // Last email sent timestamp
	emailSentCount: integer('email_sent_count').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Quote components (stone pieces)
export const quoteComponents = pgTable('quote_components', {
	id: text('id').primaryKey(),
	quoteId: text('quote_id')
		.notNull()
		.references(() => quotes.id, { onDelete: 'cascade' }),
	componentType: text('component_type').notNull(), // From COMPONENT_TYPES
	materialId: text('material_id').references(() => materials.id, { onDelete: 'set null' }),
	finishId: text('finish_id').references(() => finishes.id, { onDelete: 'set null' }),
	// Dimensions
	height: numeric('height', { precision: 10, scale: 2 }),
	width: numeric('width', { precision: 10, scale: 2 }),
	depth: numeric('depth', { precision: 10, scale: 2 }),
	quantity: integer('quantity').notNull().default(1),
	// Price snapshots (captured at quote creation)
	supplierCost: numeric('supplier_cost', { precision: 10, scale: 2 }).notNull().default('0'),
	markupPercent: numeric('markup_percent', { precision: 10, scale: 2 }).notNull().default('100'), // 100 = 100% markup
	unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull().default('0'), // supplierCost × (1 + markupPercent/100)
	lineTotal: numeric('line_total', { precision: 10, scale: 2 }).notNull().default('0'), // unitPrice × quantity
	// Descriptive snapshots for historical accuracy
	materialName: text('material_name'),
	finishName: text('finish_name'),
	notes: text('notes'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Quote lettering (inscriptions)
export const quoteLettering = pgTable('quote_lettering', {
	id: text('id').primaryKey(),
	quoteId: text('quote_id')
		.notNull()
		.references(() => quotes.id, { onDelete: 'cascade' }),
	techniqueId: text('technique_id').references(() => letteringTechniques.id, {
		onDelete: 'set null',
	}),
	colorId: text('color_id').references(() => letteringColors.id, { onDelete: 'set null' }),
	text: text('text'), // The actual inscription text
	letterCount: integer('letter_count').notNull().default(0),
	appliesTo: text('applies_to'), // 'new_memorial' | 'refurbishment' | 'both'
	// Price snapshots
	supplierCost: numeric('supplier_cost', { precision: 10, scale: 2 }).notNull().default('0'), // Cost per letter
	markupPercent: numeric('markup_percent', { precision: 10, scale: 2 }).notNull().default('100'), // 100 = 100% markup
	unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull().default('0'), // supplierCost × (1 + markupPercent/100) per letter
	lineTotal: numeric('line_total', { precision: 10, scale: 2 }).notNull().default('0'), // unitPrice × letterCount
	// Descriptive snapshots
	techniqueName: text('technique_name'),
	colorName: text('color_name'),
	notes: text('notes'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Quote sundries (add-on items)
export const quoteSundries = pgTable('quote_sundries', {
	id: text('id').primaryKey(),
	quoteId: text('quote_id')
		.notNull()
		.references(() => quotes.id, { onDelete: 'cascade' }),
	sundryId: text('sundry_id').references(() => sundries.id, { onDelete: 'set null' }),
	quantity: integer('quantity').notNull().default(1),
	// Price snapshots
	supplierCost: numeric('supplier_cost', { precision: 10, scale: 2 }).notNull().default('0'), // Cost per unit
	markupPercent: numeric('markup_percent', { precision: 10, scale: 2 }).notNull().default('100'), // 100 = 100% markup
	unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull().default('0'), // supplierCost × (1 + markupPercent/100)
	lineTotal: numeric('line_total', { precision: 10, scale: 2 }).notNull().default('0'), // unitPrice × quantity
	// Descriptive snapshot
	sundryName: text('sundry_name'),
	notes: text('notes'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Quote services (labor)
export const quoteServices = pgTable('quote_services', {
	id: text('id').primaryKey(),
	quoteId: text('quote_id')
		.notNull()
		.references(() => quotes.id, { onDelete: 'cascade' }),
	serviceId: text('service_id').references(() => services.id, { onDelete: 'set null' }),
	quantity: integer('quantity').notNull().default(1),
	// Price snapshots
	supplierCost: numeric('supplier_cost', { precision: 10, scale: 2 }).notNull().default('0'), // Cost per unit (labor cost)
	markupPercent: numeric('markup_percent', { precision: 10, scale: 2 }).notNull().default('100'), // 100 = 100% markup
	unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull().default('0'), // supplierCost × (1 + markupPercent/100)
	lineTotal: numeric('line_total', { precision: 10, scale: 2 }).notNull().default('0'), // unitPrice × quantity
	// Descriptive snapshot
	serviceName: text('service_name'),
	notes: text('notes'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Quote line items (custom free-form charges like labor, adjustments)
export const quoteLineItems = pgTable('quote_line_items', {
	id: text('id').primaryKey(),
	quoteId: text('quote_id')
		.notNull()
		.references(() => quotes.id, { onDelete: 'cascade' }),
	description: text('description').notNull(), // e.g., "Installation Labor"
	price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'), // Flat price (no markup)
	vatExempt: boolean('vat_exempt').notNull().default(false), // True for items like church fees that are not subject to VAT
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// JOB SYSTEM TABLES
// ============================================

// Job status options (memorial workflow)
export const JOB_STATUSES = [
	'pending', // Job created, awaiting action
	'materials_ordered', // Materials have been ordered
	'in_production', // Work is in progress
	'ready_for_install', // Ready to be installed
	'installed', // Memorial has been installed
	'completed', // Job fully completed
] as const;

// Jobs table (created when quote is accepted)
export const jobs = pgTable('jobs', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	quoteId: text('quote_id')
		.notNull()
		.references(() => quotes.id, { onDelete: 'restrict' }),
	jobNumber: text('job_number').notNull(), // Tenant-unique: "J-00001"
	status: text('status').notNull().default('pending'), // From JOB_STATUSES
	installationDate: timestamp('installation_date'), // Scheduled installation date
	deadline: timestamp('deadline'), // Job deadline
	notes: text('notes'), // Job-specific notes
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Job payment schedule items (installment payments for a job)
export const jobPaymentScheduleItems = pgTable('job_payment_schedule_items', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	jobId: text('job_id')
		.notNull()
		.references(() => jobs.id, { onDelete: 'cascade' }),
	description: text('description').notNull(), // "Deposit", "Balance", or custom
	amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
	dueDate: timestamp('due_date'), // Nullable - user sets manually for balance
	paidAmount: numeric('paid_amount', { precision: 10, scale: 2 }).notNull().default('0'),
	paidAt: timestamp('paid_at'), // When fully paid
	paymentMethod: text('payment_method'), // "manual", "card", "bank_transfer" - for future Stripe integration
	externalPaymentId: text('external_payment_id'), // Stripe payment intent ID - for future
	sortOrder: integer('sort_order').notNull().default(0),
	notes: text('notes'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Job attachment categories
export const JOB_ATTACHMENT_CATEGORIES = ['artwork', 'proof', 'document'] as const;

// Job attachments (artwork, proofs, documents) - DEPRECATED: Use documents table instead
export const jobAttachments = pgTable('job_attachments', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	jobId: text('job_id')
		.notNull()
		.references(() => jobs.id, { onDelete: 'cascade' }),
	category: text('category').notNull(), // From JOB_ATTACHMENT_CATEGORIES
	filename: text('filename').notNull(), // Original filename for display
	s3Key: text('s3_key').notNull(), // Full S3 path
	contentType: text('content_type').notNull(), // MIME type
	size: integer('size'), // File size in bytes
	notes: text('notes'), // Optional description
	uploadedBy: text('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================
// UNIFIED DOCUMENT MANAGEMENT
// ============================================

// Entity types that can have documents attached (polymorphic pattern)
export const DOCUMENT_ENTITY_TYPES = [
	'customer',
	'quote',
	'job',
	'funeral_director',
	'supplier',
	'memorial_site',
	'product',
] as const;

// Documents table (unified, polymorphic document storage)
export const documents = pgTable('documents', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	// Polymorphic relationship
	entityType: text('entity_type').notNull(), // From DOCUMENT_ENTITY_TYPES
	entityId: text('entity_id').notNull(),
	// User-controlled metadata
	name: text('name').notNull(), // User-defined document name
	tags: text('tags'), // Comma-separated freeform tags
	notes: text('notes'), // Free-form notes
	// File information
	filename: text('filename').notNull(), // Original filename
	s3Key: text('s3_key').notNull(), // Full S3 path
	contentType: text('content_type').notNull(), // MIME type
	size: integer('size'), // File size in bytes
	// Audit
	uploadedBy: text('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// CALENDAR & TIME-OFF TABLES
// ============================================

// Calendar event types
export const CALENDAR_EVENT_TYPES = ['custom'] as const;

// Recurrence patterns for recurring events
export const RECURRENCE_PATTERNS = ['none', 'daily', 'weekly', 'monthly'] as const;

// Calendar events table (custom events)
export const calendarEvents = pgTable('calendar_events', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	createdById: text('created_by_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	// Event details
	title: text('title').notNull(),
	description: text('description'),
	startAt: timestamp('start_at').notNull(),
	endAt: timestamp('end_at'), // Nullable for all-day events
	isAllDay: boolean('is_all_day').notNull().default(false),
	// Event type
	eventType: text('event_type').notNull().default('custom'), // From CALENDAR_EVENT_TYPES
	// Optional links to other entities
	linkedQuoteId: text('linked_quote_id').references(() => quotes.id, { onDelete: 'cascade' }),
	linkedJobId: text('linked_job_id').references(() => jobs.id, { onDelete: 'cascade' }),
	linkedCustomerId: text('linked_customer_id').references(() => customers.id, { onDelete: 'set null' }),
	// Recurrence
	recurrencePattern: text('recurrence_pattern').notNull().default('none'), // From RECURRENCE_PATTERNS
	recurrenceEndDate: timestamp('recurrence_end_date'),
	recurrenceParentId: text('recurrence_parent_id'), // Self-reference for recurring instances
	// Soft delete
	archivedAt: timestamp('archived_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Time-off request statuses
export const TIME_OFF_STATUSES = ['pending', 'approved', 'rejected'] as const;

// Time-off requests table
export const timeOffRequests = pgTable('time_off_requests', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	// Request details
	startDate: timestamp('start_date').notNull(),
	endDate: timestamp('end_date').notNull(),
	reason: text('reason'),
	// Approval workflow
	status: text('status').notNull().default('pending'), // From TIME_OFF_STATUSES
	reviewedById: text('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
	reviewedAt: timestamp('reviewed_at'),
	reviewNotes: text('review_notes'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Calendar settings table (tenant-configurable colors)
export const calendarSettings = pgTable('calendar_settings', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.unique()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	// Event type colors (hex values)
	quoteValidUntilColor: text('quote_valid_until_color').notNull().default('#3B82F6'), // Blue
	jobInstallationColor: text('job_installation_color').notNull().default('#10B981'), // Green
	jobDeadlineColor: text('job_deadline_color').notNull().default('#F59E0B'), // Amber
	customEventColor: text('custom_event_color').notNull().default('#8B5CF6'), // Purple
	timeOffApprovedColor: text('time_off_approved_color').notNull().default('#6B7280'), // Gray
	timeOffPendingColor: text('time_off_pending_color').notNull().default('#EF4444'), // Red
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
