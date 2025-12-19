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
	quoteNumber: text('quote_number').notNull(), // Tenant-unique: "Q-00001"
	status: text('status').notNull().default('draft'), // From QUOTE_STATUSES
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

// Job attachments (artwork, proofs, documents)
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
