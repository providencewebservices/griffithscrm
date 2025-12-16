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

// Tenant pricing settings (retail price = (supplierCost × multiplier) + fixedAmount, then VAT)
export const tenantPricingSettings = pgTable('tenant_pricing_settings', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.unique()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	priceMultiplier: numeric('price_multiplier', { precision: 10, scale: 4 })
		.notNull()
		.default('1'),
	priceFixedAmount: numeric('price_fixed_amount', { precision: 10, scale: 2 })
		.notNull()
		.default('0'),
	vatRate: numeric('vat_rate', { precision: 5, scale: 4 }).notNull().default('0'), // e.g., 0.20 for 20%
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
export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;

// Quotes table (immutable with versioning)
export const quotes = pgTable('quotes', {
	id: text('id').primaryKey(),
	tenantId: text('tenant_id')
		.notNull()
		.references(() => tenants.id, { onDelete: 'cascade' }),
	parentQuoteId: text('parent_quote_id'), // Self-reference for versioning (no FK constraint to avoid circular)
	version: integer('version').notNull().default(1),
	customerId: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
	productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
	dimensionComboId: text('dimension_combo_id').references(() => dimensionCombos.id, {
		onDelete: 'set null',
	}),
	quoteNumber: text('quote_number').notNull(), // Tenant-unique: "Q-00001"
	status: text('status').notNull().default('draft'), // From QUOTE_STATUSES
	subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
	vatAmount: numeric('vat_amount', { precision: 10, scale: 2 }).notNull().default('0'),
	total: numeric('total', { precision: 10, scale: 2 }).notNull().default('0'),
	vatRate: numeric('vat_rate', { precision: 5, scale: 4 }).notNull().default('0'), // Snapshot of tenant VAT rate
	notes: text('notes'),
	flowerHoles: text('flower_holes'), // From FLOWER_HOLE_CHOICES
	validUntil: timestamp('valid_until'),
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
	unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull().default('0'),
	lineTotal: numeric('line_total', { precision: 10, scale: 2 }).notNull().default('0'),
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
	// Price snapshots
	unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull().default('0'), // Per letter
	lineTotal: numeric('line_total', { precision: 10, scale: 2 }).notNull().default('0'),
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
	unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull().default('0'),
	lineTotal: numeric('line_total', { precision: 10, scale: 2 }).notNull().default('0'),
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
	unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull().default('0'),
	lineTotal: numeric('line_total', { precision: 10, scale: 2 }).notNull().default('0'),
	// Descriptive snapshot
	serviceName: text('service_name'),
	notes: text('notes'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
