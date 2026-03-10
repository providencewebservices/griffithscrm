import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, asc, sql, notExists, like, or, count } from 'drizzle-orm';
import crypto from 'crypto';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { sendEmail } from '../lib/email';
import {
	quotePackages,
	quotes,
	quoteComponents,
	quoteLettering,
	quoteSundries,
	quoteLineItems,
	customers,
	products,
	materials,
	finishes,
	letteringTechniques,
	letteringColors,
	letteringCosts,
	fonts,
	sundries,
	tenantPricingSettings,
	dimensionCombos,
	dimensionComboValues,
	productComponents,
	contactInfo,
	addresses,
	customerContactInfo,
	customerAddresses,
	tenants,
	jobs,
	jobPaymentScheduleItems,
	funeralDirectors,
	funeralDirectorContactInfo,
	councils,
	memorialSites,
	QUOTE_STATUSES,
	QUOTE_TYPES,
	COMPONENT_TYPES,
	LETTERING_COST_APPLIES_TO,
	FLOWER_HOLE_CHOICES,
	ENQUIRY_SOURCES,
	PAYER_TYPES,
} from '@griffiths-crm/shared/db/schema';
import { generateJobNumber } from './jobs';

// Status transition rules
const STATUS_TRANSITIONS: Record<string, string[]> = {
	draft: ['review', 'ready', 'presented'], // Can skip review/ready if needed
	review: ['draft', 'ready'], // Back to draft or forward to ready
	ready: ['draft', 'presented'], // Back to draft or present to customer
	presented: ['draft', 'accepted', 'rejected', 'expired'], // Customer decision or back to draft
	accepted: [], // Terminal state
	rejected: [], // Terminal state
	expired: [], // Terminal state
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function generateQuoteNumber(tenantId: string): Promise<string> {
	const result = await db
		.select({
			maxNum: sql<number>`MAX(CAST(SUBSTRING(${quotes.quoteNumber} FROM 3) AS INTEGER))`,
		})
		.from(quotes)
		.where(eq(quotes.tenantId, tenantId));

	const nextNum = (result[0]?.maxNum || 0) + 1;
	return `Q-${String(nextNum).padStart(5, '0')}`;
}

async function getTenantPricingSettings(tenantId: string) {
	let [settings] = await db
		.select()
		.from(tenantPricingSettings)
		.where(eq(tenantPricingSettings.tenantId, tenantId))
		.limit(1);

	// Create default settings if none exist
	if (!settings) {
		[settings] = await db
			.insert(tenantPricingSettings)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				defaultMarkupPercent: '100', // 100% markup = 2x retail price
				vatRate: '0',
			})
			.returning();
	}

	return {
		defaultMarkupPercent: parseFloat(settings.defaultMarkupPercent),
		vatRate: parseFloat(settings.vatRate),
	};
}

// Calculate retail price from supplier cost and markup percentage
// 100% markup means retail = supplierCost × 2
function calculateRetailPrice(supplierCost: number, markupPercent: number): number {
	return supplierCost * (1 + markupPercent / 100);
}

async function getQuoteWithLineItems(quoteId: string, tenantId: string) {
	// Get quote
	const [quote] = await db
		.select()
		.from(quotes)
		.where(and(eq(quotes.id, quoteId), eq(quotes.tenantId, tenantId)))
		.limit(1);

	if (!quote) return null;

	// Get all line items in parallel
	const [components, lettering, sundryItems, lineItems] = await Promise.all([
		db
			.select()
			.from(quoteComponents)
			.where(eq(quoteComponents.quoteId, quoteId))
			.orderBy(asc(quoteComponents.sortOrder)),
		db
			.select()
			.from(quoteLettering)
			.where(eq(quoteLettering.quoteId, quoteId))
			.orderBy(asc(quoteLettering.sortOrder)),
		db
			.select()
			.from(quoteSundries)
			.where(eq(quoteSundries.quoteId, quoteId))
			.orderBy(asc(quoteSundries.sortOrder)),
		db
			.select()
			.from(quoteLineItems)
			.where(eq(quoteLineItems.quoteId, quoteId))
			.orderBy(asc(quoteLineItems.sortOrder)),
	]);

	// Get customer if exists
	let customer = null;
	if (quote.customerId) {
		[customer] = await db
			.select()
			.from(customers)
			.where(eq(customers.id, quote.customerId))
			.limit(1);
	}

	// Get product if exists
	let product = null;
	if (quote.productId) {
		[product] = await db
			.select()
			.from(products)
			.where(eq(products.id, quote.productId))
			.limit(1);
	}

	// Get version history (walk up the chain)
	const versions = await getVersionHistory(quoteId, tenantId);

	return {
		...quote,
		customer,
		product,
		components,
		lettering,
		sundries: sundryItems,
		lineItems,
		versions,
	};
}

async function recalculateQuoteTotals(quoteId: string): Promise<void> {
	// Get all line items
	const [components, letteringItems, sundryItems, lineItems] = await Promise.all([
		db.select().from(quoteComponents).where(eq(quoteComponents.quoteId, quoteId)),
		db.select().from(quoteLettering).where(eq(quoteLettering.quoteId, quoteId)),
		db.select().from(quoteSundries).where(eq(quoteSundries.quoteId, quoteId)),
		db.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId)),
	]);

	// Get current quote for VAT rate
	const [quote] = await db
		.select({ vatRate: quotes.vatRate })
		.from(quotes)
		.where(eq(quotes.id, quoteId))
		.limit(1);

	if (!quote) return;

	// Calculate subtotal (sum of all line totals)
	const componentTotal = components.reduce((sum, c) => sum + parseFloat(c.lineTotal), 0);
	const letteringTotal = letteringItems.reduce((sum, l) => sum + parseFloat(l.lineTotal), 0);
	const sundryTotal = sundryItems.reduce((sum, s) => sum + parseFloat(s.lineTotal), 0);

	// Split line items into VAT-able and VAT-exempt
	const vatableLineItemTotal = lineItems
		.filter((li) => !li.vatExempt)
		.reduce((sum, li) => sum + parseFloat(li.price), 0);
	const vatExemptLineItemTotal = lineItems
		.filter((li) => li.vatExempt)
		.reduce((sum, li) => sum + parseFloat(li.price), 0);

	const subtotal = componentTotal + letteringTotal + sundryTotal + vatableLineItemTotal + vatExemptLineItemTotal;

	// Calculate total cost (sum of all supplier costs - line items are flat amounts with no cost tracking)
	const componentCost = components.reduce((sum, c) => sum + parseFloat(c.supplierCost) * c.quantity, 0);
	const letteringCost = letteringItems.reduce((sum, l) => sum + parseFloat(l.supplierCost) * l.letterCount, 0);
	const sundryCost = sundryItems.reduce((sum, s) => sum + parseFloat(s.supplierCost) * s.quantity, 0);
	const totalCost = componentCost + letteringCost + sundryCost;

	// Calculate VAT only on VAT-able amounts (components, lettering, sundries, and non-exempt line items)
	const vatRate = parseFloat(quote.vatRate);
	const vatableSubtotal = componentTotal + letteringTotal + sundryTotal + vatableLineItemTotal;
	const vatAmount = vatableSubtotal * vatRate;
	const total = subtotal + vatAmount;

	// Update quote totals
	await db
		.update(quotes)
		.set({
			subtotal: String(subtotal),
			vatAmount: String(vatAmount),
			total: String(total),
			totalCost: String(totalCost),
			updatedAt: new Date(),
		})
		.where(eq(quotes.id, quoteId));
}

async function getVersionHistory(quoteId: string, tenantId: string) {
	// First, find the root quote by walking up parentQuoteId chain
	let currentId: string | null = quoteId;
	let rootId = quoteId;

	while (currentId) {
		const [q] = await db
			.select({ id: quotes.id, parentQuoteId: quotes.parentQuoteId })
			.from(quotes)
			.where(and(eq(quotes.id, currentId), eq(quotes.tenantId, tenantId)))
			.limit(1);

		if (!q) break;
		rootId = q.id;
		currentId = q.parentQuoteId;
	}

	// Now get all versions with this quoteNumber
	const [rootQuote] = await db
		.select({ quoteNumber: quotes.quoteNumber })
		.from(quotes)
		.where(eq(quotes.id, rootId))
		.limit(1);

	if (!rootQuote) return [];

	const allVersions = await db
		.select({
			id: quotes.id,
			version: quotes.version,
			status: quotes.status,
			total: quotes.total,
			createdAt: quotes.createdAt,
		})
		.from(quotes)
		.where(and(eq(quotes.tenantId, tenantId), eq(quotes.quoteNumber, rootQuote.quoteNumber)))
		.orderBy(asc(quotes.version));

	return allVersions;
}

// ============================================
// PACKAGE HELPER FUNCTIONS
// ============================================

async function getPackageWithOptions(packageId: string, tenantId: string) {
	// Get package
	const [pkg] = await db
		.select()
		.from(quotePackages)
		.where(and(eq(quotePackages.id, packageId), eq(quotePackages.tenantId, tenantId)))
		.limit(1);

	if (!pkg) return null;

	// Get all quote options for this package with full line items
	const optionRows = await db
		.select()
		.from(quotes)
		.where(eq(quotes.packageId, packageId))
		.orderBy(asc(quotes.optionOrder), asc(quotes.createdAt));

	// Enrich each option with line items and product info
	const options = await Promise.all(
		optionRows.map(async (opt) => {
			const [components, lettering, sundryItems, lineItems] = await Promise.all([
				db.select().from(quoteComponents).where(eq(quoteComponents.quoteId, opt.id)).orderBy(asc(quoteComponents.sortOrder)),
				db.select().from(quoteLettering).where(eq(quoteLettering.quoteId, opt.id)).orderBy(asc(quoteLettering.sortOrder)),
				db.select().from(quoteSundries).where(eq(quoteSundries.quoteId, opt.id)).orderBy(asc(quoteSundries.sortOrder)),
				db.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, opt.id)).orderBy(asc(quoteLineItems.sortOrder)),
			]);

			let product = null;
			if (opt.productId) {
				[product] = await db.select().from(products).where(eq(products.id, opt.productId)).limit(1);
			}

			return {
				...opt,
				product,
				components,
				lettering,
				sundries: sundryItems,
				lineItems,
			};
		})
	);

	// Get related entities
	let customer = null;
	if (pkg.customerId) {
		[customer] = await db.select().from(customers).where(eq(customers.id, pkg.customerId)).limit(1);
	}

	let funeralDirector = null;
	if (pkg.funeralDirectorId) {
		[funeralDirector] = await db.select().from(funeralDirectors).where(eq(funeralDirectors.id, pkg.funeralDirectorId)).limit(1);
	}

	let council = null;
	if (pkg.councilId) {
		[council] = await db.select().from(councils).where(eq(councils.id, pkg.councilId)).limit(1);
	}

	let memorialSite = null;
	if (pkg.memorialSiteId) {
		[memorialSite] = await db.select().from(memorialSites).where(eq(memorialSites.id, pkg.memorialSiteId)).limit(1);
	}

	return {
		...pkg,
		customer,
		funeralDirector,
		council,
		memorialSite,
		options,
	};
}

function calculatePriceRange(options: { total: string }[]) {
	if (options.length === 0) {
		return { minPrice: '0', maxPrice: '0' };
	}
	const totals = options.map((o) => parseFloat(o.total));
	return {
		minPrice: String(Math.min(...totals)),
		maxPrice: String(Math.max(...totals)),
	};
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const componentInputSchema = z.object({
	componentType: z.enum(COMPONENT_TYPES),
	materialId: z.string().min(1),
	finishId: z.string().optional(),
	height: z.number().optional(),
	width: z.number().optional(),
	depth: z.number().optional(),
	quantity: z.number().int().min(1).default(1),
	notes: z.string().optional(),
});

const letteringInputSchema = z.object({
	techniqueId: z.string().min(1),
	colorId: z.string().optional(),
	fontId: z.string().optional(),
	text: z.string().min(1),
	appliesTo: z.enum(LETTERING_COST_APPLIES_TO).default('new_memorial'),
	notes: z.string().optional(),
});

const sundryInputSchema = z.object({
	sundryId: z.string().min(1),
	quantity: z.number().int().min(1).default(1),
	notes: z.string().optional(),
});

// Customer details for inline customer creation
const customerDetailsSchema = z.object({
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	address: z
		.object({
			line1: z.string().min(1),
			line2: z.string().optional(),
			city: z.string().min(1),
			county: z.string().optional(),
			postcode: z.string().min(1),
			country: z.string().default('United Kingdom'),
		})
		.optional(),
});

const createQuoteSchema = z.object({
	// Package-level fields (shared context)
	quoteType: z.enum(QUOTE_TYPES).optional().default('new_memorial'),
	// Payer fields - determines who gets billed
	payerId: z.string().optional(), // ID of customer or funeral director
	payerType: z.enum(PAYER_TYPES).optional(), // 'customer' | 'funeral_director'
	referralFuneralDirectorId: z.string().optional(), // Only when payer is customer
	relationToDeceased: z.string().optional(),
	// Legacy field for backwards compatibility (deprecated, use payerId + payerType instead)
	customerId: z.string().optional(),
	funeralDirectorId: z.string().optional(), // Memorial context (deprecated)
	councilId: z.string().optional(),
	memorialSiteId: z.string().optional(),
	memorialLocation: z.string().optional(), // Freeform description of location at memorial site
	source: z.enum(ENQUIRY_SOURCES).optional(), // How the customer contacted us
	proposedInscription: z.string().optional(), // Full text of desired inscription (shared)
	notes: z.string().optional(), // Customer-visible notes
	internalNotes: z.string().optional(), // Tenant-only notes
	validUntil: z.string().datetime().optional(),
	existingMemorialDescription: z.string().optional(), // For refurbishment quotes
	relatedJobId: z.string().optional(),
	// For inline customer creation
	customerDetails: customerDetailsSchema.optional(),
	// First option fields (per-option)
	productId: z.string().optional(),
	dimensionComboId: z.string().optional(),
	flowerHoles: z.enum(FLOWER_HOLE_CHOICES).optional(),
	// First option line items
	components: z.array(componentInputSchema).optional().default([]),
	lettering: z.array(letteringInputSchema).optional().default([]),
	sundries: z.array(sundryInputSchema).optional().default([]),
});

// Schema for adding a new option to an existing package
const addOptionSchema = z.object({
	optionLabel: z.string().optional(),
	copyFromOptionId: z.string().optional(), // Clone from existing option
	productId: z.string().optional(),
	dimensionComboId: z.string().optional(),
	flowerHoles: z.enum(FLOWER_HOLE_CHOICES).optional(),
	components: z.array(componentInputSchema).optional().default([]),
	lettering: z.array(letteringInputSchema).optional().default([]),
	sundries: z.array(sundryInputSchema).optional().default([]),
});

const updateStatusSchema = z.object({
	status: z.enum(QUOTE_STATUSES),
});

const updateLineItemPricingSchema = z.object({
	supplierCost: z.number().min(0).optional(),
	markupPercent: z.number().min(0).optional(),
	quantity: z.number().int().min(1).optional(),
});

// Schema for adding a new lettering item
const addLetteringItemSchema = z.object({
	techniqueId: z.string().min(1),
	colorId: z.string().optional(),
	fontId: z.string().optional(),
	text: z.string().min(1),
	appliesTo: z.enum(LETTERING_COST_APPLIES_TO).optional().default('new_memorial'),
	notes: z.string().optional(),
});

// Schema for updating a lettering item (extends pricing schema)
const updateLetteringItemSchema = z.object({
	// Pricing fields (existing)
	supplierCost: z.number().min(0).optional(),
	markupPercent: z.number().min(0).optional(),
	// Content fields (new)
	techniqueId: z.string().min(1).optional(),
	colorId: z.string().optional().nullable(),
	fontId: z.string().optional().nullable(),
	text: z.string().min(1).optional(),
	appliesTo: z.enum(LETTERING_COST_APPLIES_TO).optional(),
	notes: z.string().optional().nullable(),
});

// Schema for custom line items
const lineItemInputSchema = z.object({
	description: z.string().min(1),
	price: z.number().min(0),
	vatExempt: z.boolean().optional().default(false),
	visibleToCustomer: z.boolean().optional().default(true),
	priceVisibleToCustomer: z.boolean().optional().default(true),
});

const updateLineItemSchema = z.object({
	description: z.string().min(1).optional(),
	price: z.number().min(0).optional(),
	vatExempt: z.boolean().optional(),
	visibleToCustomer: z.boolean().optional(),
	priceVisibleToCustomer: z.boolean().optional(),
});

const listQuerySchema = z.object({
	status: z.enum(QUOTE_STATUSES).optional(),
	quoteType: z.enum(QUOTE_TYPES).optional(),
	customerId: z.string().optional(),
	search: z.string().optional(),
	latestOnly: z.enum(['true', 'false']).optional().default('true'),
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
});

// ============================================
// ROUTES
// ============================================

const quotesRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List packages (each package contains quote options)
	.get('/', zValidator('query', listQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { status, quoteType, customerId, search, page, limit } = c.req.valid('query');

		// Build filter conditions for packages
		const conditions: ReturnType<typeof eq>[] = [eq(quotePackages.tenantId, tenantId)];

		if (status) {
			conditions.push(eq(quotePackages.status, status));
		}

		if (quoteType) {
			conditions.push(eq(quotePackages.quoteType, quoteType));
		}

		if (customerId) {
			conditions.push(eq(quotePackages.customerId, customerId));
		}

		// Search filter at SQL level - search by quote number or customer name
		if (search && search.trim()) {
			const searchTerm = `%${search.trim().toLowerCase()}%`;
			conditions.push(
				or(
					sql`EXISTS (SELECT 1 FROM ${quotes} WHERE ${quotes.packageId} = ${quotePackages.id} AND LOWER(${quotes.quoteNumber}) LIKE ${searchTerm})`,
					sql`LOWER(CONCAT(COALESCE(${customers.firstName}, ''), ' ', COALESCE(${customers.lastName}, ''))) LIKE ${searchTerm}`
				)!
			);
		}

		// Get total count
		const [totalResult] = await db
			.select({ count: count() })
			.from(quotePackages)
			.leftJoin(customers, eq(quotePackages.customerId, customers.id))
			.where(and(...conditions));
		const total = Number(totalResult.count);

		// Get paginated packages with customer and funeral director info
		const offset = (page - 1) * limit;
		const packages = await db
			.select({
				id: quotePackages.id,
				tenantId: quotePackages.tenantId,
				customerId: quotePackages.customerId,
				payerType: quotePackages.payerType,
				funeralDirectorId: quotePackages.funeralDirectorId,
				quoteType: quotePackages.quoteType,
				status: quotePackages.status,
				notes: quotePackages.notes,
				validUntil: quotePackages.validUntil,
				createdAt: quotePackages.createdAt,
				updatedAt: quotePackages.updatedAt,
				customerFirstName: customers.firstName,
				customerLastName: customers.lastName,
				funeralDirectorBusinessName: funeralDirectors.businessName,
				funeralDirectorTradingName: funeralDirectors.tradingName,
			})
			.from(quotePackages)
			.leftJoin(customers, eq(quotePackages.customerId, customers.id))
			.leftJoin(funeralDirectors, eq(quotePackages.funeralDirectorId, funeralDirectors.id))
			.where(and(...conditions))
			.orderBy(desc(quotePackages.createdAt))
			.limit(limit)
			.offset(offset);

		// Get options for each package and calculate price ranges
		const packagesWithOptions = await Promise.all(
			packages.map(async (pkg) => {
				// Get all options (quotes) for this package
				const options = await db
					.select({
						id: quotes.id,
						quoteNumber: quotes.quoteNumber,
						total: quotes.total,
						optionOrder: quotes.optionOrder,
					})
					.from(quotes)
					.where(eq(quotes.packageId, pkg.id))
					.orderBy(asc(quotes.optionOrder));

				const optionCount = options.length;
				const priceRange = calculatePriceRange(options);

				// Get first quote number for display
				const firstQuoteNumber = options[0]?.quoteNumber || null;

				return {
					...pkg,
					customerName:
						pkg.customerFirstName && pkg.customerLastName
							? `${pkg.customerFirstName} ${pkg.customerLastName}`
							: null,
					optionCount,
					firstQuoteNumber,
					priceRange,
				};
			})
		);

		return c.json({
			packages: packagesWithOptions,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	})

	// Get billable entities (combined customers and funeral directors for payer selection)
	.get('/billable-entities', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		// Get all active/non-archived customers
		const customerRows = await db
			.select({
				id: customers.id,
				firstName: customers.firstName,
				lastName: customers.lastName,
			})
			.from(customers)
			.where(and(eq(customers.tenantId, tenantId), sql`${customers.archivedAt} IS NULL`))
			.orderBy(asc(customers.firstName), asc(customers.lastName));

		// Get all active/non-archived funeral directors
		const funeralDirectorRows = await db
			.select({
				id: funeralDirectors.id,
				businessName: funeralDirectors.businessName,
				tradingName: funeralDirectors.tradingName,
			})
			.from(funeralDirectors)
			.where(
				and(
					eq(funeralDirectors.tenantId, tenantId),
					eq(funeralDirectors.isActive, true),
					sql`${funeralDirectors.archivedAt} IS NULL`
				)
			)
			.orderBy(asc(funeralDirectors.businessName));

		// Transform to common format
		const entities = [
			...customerRows.map((c) => ({
				id: c.id,
				displayName: `${c.firstName} ${c.lastName}`,
				entityType: 'customer' as const,
				firstName: c.firstName,
				lastName: c.lastName,
			})),
			...funeralDirectorRows.map((fd) => ({
				id: fd.id,
				displayName: fd.tradingName || fd.businessName,
				entityType: 'funeral_director' as const,
				businessName: fd.businessName,
				tradingName: fd.tradingName,
			})),
		];

		// Sort alphabetically by displayName
		entities.sort((a, b) => a.displayName.localeCompare(b.displayName));

		return c.json({ entities });
	})

	// Get single package with all options and their line items
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const pkg = await getPackageWithOptions(id, tenantId);

		if (!pkg) {
			return c.json({ error: 'Package not found' }, 404);
		}

		return c.json({ package: pkg });
	})

	// Create new package with first option
	.post('/', zValidator('json', createQuoteSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		// Handle inline customer creation
		let customerId = data.customerId || null;
		if (!customerId && data.customerDetails) {
			const { customerDetails } = data;
			const newCustomerId = crypto.randomUUID();

			// Create customer
			await db.insert(customers).values({
				id: newCustomerId,
				tenantId,
				firstName: customerDetails.firstName,
				lastName: customerDetails.lastName,
			});

			// Create contact info (email and phone)
			if (customerDetails.email) {
				const emailId = crypto.randomUUID();
				await db.insert(contactInfo).values({
					id: emailId,
					type: 'email',
					value: customerDetails.email,
					isPrimary: true,
				});
				await db.insert(customerContactInfo).values({
					customerId: newCustomerId,
					contactInfoId: emailId,
				});
			}

			if (customerDetails.phone) {
				const phoneId = crypto.randomUUID();
				await db.insert(contactInfo).values({
					id: phoneId,
					type: 'phone',
					value: customerDetails.phone,
					isPrimary: !customerDetails.email, // Primary if no email
				});
				await db.insert(customerContactInfo).values({
					customerId: newCustomerId,
					contactInfoId: phoneId,
				});
			}

			// Create address
			if (customerDetails.address) {
				const addr = customerDetails.address;
				const addressId = crypto.randomUUID();
				const formattedAddress = [
					addr.line1,
					addr.line2,
					addr.city,
					addr.county,
					addr.postcode,
					addr.country,
				]
					.filter(Boolean)
					.join(', ');

				await db.insert(addresses).values({
					id: addressId,
					route: addr.line1,
					locality: addr.city,
					administrativeAreaLevel2: addr.county || null,
					postalCode: addr.postcode,
					country: addr.country,
					formattedAddress,
					isPrimary: true,
				});
				await db.insert(customerAddresses).values({
					customerId: newCustomerId,
					addressId,
				});
			}

			customerId = newCustomerId;
		}

		// Determine customerId and funeralDirectorId based on payer fields
		// New approach: payerId + payerType determines who gets billed
		// - When payerType = 'funeral_director', funeralDirectorId is the billing entity
		// - When payerType = 'customer' or null, customerId is the billing entity
		// - referralFuneralDirectorId can still be set as referral source when payer is customer
		let finalCustomerId = customerId;
		let finalFuneralDirectorId = data.funeralDirectorId || null;
		let payerType = data.payerType || null;

		if (data.payerId && data.payerType) {
			if (data.payerType === 'funeral_director') {
				// Funeral director is the payer - they get billed
				finalCustomerId = null;
				finalFuneralDirectorId = data.payerId;
				payerType = 'funeral_director';
			} else if (data.payerType === 'customer') {
				// Customer is the payer
				finalCustomerId = data.payerId;
				// If there's a referral funeral director, use that for the FD field
				finalFuneralDirectorId = data.referralFuneralDirectorId || null;
				payerType = 'customer';
			}
		}

		// Validate dimension combo if provided
		if (data.dimensionComboId) {
			const [combo] = await db
				.select()
				.from(dimensionCombos)
				.where(eq(dimensionCombos.id, data.dimensionComboId))
				.limit(1);

			if (!combo) {
				return c.json({ error: 'Dimension combo not found' }, 400);
			}
		}

		// Get pricing settings
		const pricingSettings = await getTenantPricingSettings(tenantId);

		// Generate quote number for the first option
		const quoteNumber = await generateQuoteNumber(tenantId);

		// Process components and calculate prices
		const processedComponents = await Promise.all(
			data.components.map(async (comp, index) => {
				const [material] = await db
					.select()
					.from(materials)
					.where(and(eq(materials.id, comp.materialId), eq(materials.tenantId, tenantId)))
					.limit(1);

				if (!material) {
					throw new Error(`Material not found: ${comp.materialId}`);
				}

				let finish = null;
				if (comp.finishId) {
					[finish] = await db
						.select()
						.from(finishes)
						.where(and(eq(finishes.id, comp.finishId), eq(finishes.tenantId, tenantId)))
						.limit(1);
				}

				const supplierCost = 0;
				const markupPercent = pricingSettings.defaultMarkupPercent;
				const unitPrice = calculateRetailPrice(supplierCost, markupPercent);
				const lineTotal = unitPrice * comp.quantity;

				return {
					id: crypto.randomUUID(),
					componentType: comp.componentType,
					materialId: comp.materialId,
					finishId: comp.finishId || null,
					height: comp.height ? String(comp.height) : null,
					width: comp.width ? String(comp.width) : null,
					depth: comp.depth ? String(comp.depth) : null,
					quantity: comp.quantity,
					supplierCost: String(supplierCost),
					markupPercent: String(markupPercent),
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					materialName: material.name,
					finishName: finish?.name || null,
					notes: comp.notes || null,
					sortOrder: index,
				};
			})
		);

		// Process lettering
		const processedLettering = await Promise.all(
			data.lettering.map(async (lett, index) => {
				const [technique] = await db
					.select()
					.from(letteringTechniques)
					.where(
						and(eq(letteringTechniques.id, lett.techniqueId), eq(letteringTechniques.tenantId, tenantId))
					)
					.limit(1);

				if (!technique) {
					throw new Error(`Lettering technique not found: ${lett.techniqueId}`);
				}

				// Get color if specified
				let color = null;
				if (lett.colorId) {
					[color] = await db
						.select()
						.from(letteringColors)
						.where(and(eq(letteringColors.id, lett.colorId), eq(letteringColors.tenantId, tenantId)))
						.limit(1);
				}

				// Get font if specified
				let font = null;
				if (lett.fontId) {
					[font] = await db
						.select()
						.from(fonts)
						.where(and(eq(fonts.id, lett.fontId), eq(fonts.tenantId, tenantId)))
						.limit(1);
				}

				// Find cost rule using priority: specific color + appliesTo > specific color + 'both' > default + appliesTo > default + 'both'
				let activeCostRule = null;

				// 1. Try specific color + specific appliesTo
				if (lett.colorId) {
					[activeCostRule] = await db
						.select()
						.from(letteringCosts)
						.where(
							and(
								eq(letteringCosts.techniqueId, lett.techniqueId),
								eq(letteringCosts.colorId, lett.colorId),
								eq(letteringCosts.appliesTo, lett.appliesTo)
							)
						)
						.limit(1);

					// 2. Try specific color + 'both'
					if (!activeCostRule) {
						[activeCostRule] = await db
							.select()
							.from(letteringCosts)
							.where(
								and(
									eq(letteringCosts.techniqueId, lett.techniqueId),
									eq(letteringCosts.colorId, lett.colorId),
									eq(letteringCosts.appliesTo, 'both')
								)
							)
							.limit(1);
					}
				}

				// 3. Fall back to default (no color) + specific appliesTo
				if (!activeCostRule) {
					const defaultRules = await db
						.select()
						.from(letteringCosts)
						.where(
							and(
								eq(letteringCosts.techniqueId, lett.techniqueId),
								eq(letteringCosts.appliesTo, lett.appliesTo)
							)
						);
					// Find the one with colorId = null (default)
					activeCostRule = defaultRules.find((r) => r.colorId === null) || null;
				}

				// 4. Fall back to default (no color) + 'both'
				if (!activeCostRule) {
					const bothRules = await db
						.select()
						.from(letteringCosts)
						.where(
							and(eq(letteringCosts.techniqueId, lett.techniqueId), eq(letteringCosts.appliesTo, 'both'))
						);
					// Find the one with colorId = null (default)
					activeCostRule = bothRules.find((r) => r.colorId === null) || null;
				}

				const letterCount = lett.text.replace(/\s/g, '').length; // Count non-space characters
				const freeLetters = activeCostRule?.freeLetters || 0;
				const supplierCostPerLetter = parseFloat(activeCostRule?.pricePerLetter || '0');
				const billableLetters = Math.max(0, letterCount - freeLetters);
				const markupPercent = pricingSettings.defaultMarkupPercent;
				const unitPrice = calculateRetailPrice(supplierCostPerLetter, markupPercent);
				const lineTotal = billableLetters * unitPrice;

				return {
					id: crypto.randomUUID(),
					techniqueId: lett.techniqueId,
					colorId: lett.colorId || null,
					fontId: font?.id || null,
					fontName: font?.name || null,
					fontS3Key: font?.s3Key || null,
					text: lett.text,
					letterCount,
					appliesTo: lett.appliesTo,
					supplierCost: String(supplierCostPerLetter),
					markupPercent: String(markupPercent),
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					techniqueName: technique.name,
					colorName: color?.name || null,
					notes: lett.notes || null,
					sortOrder: index,
				};
			})
		);

		// Process sundries
		const processedSundries = await Promise.all(
			data.sundries.map(async (sund, index) => {
				const [sundry] = await db
					.select()
					.from(sundries)
					.where(and(eq(sundries.id, sund.sundryId), eq(sundries.tenantId, tenantId)))
					.limit(1);

				if (!sundry) {
					throw new Error(`Sundry not found: ${sund.sundryId}`);
				}

				// Sundry.price is treated as supplier cost
				const supplierCost = parseFloat(sundry.price);
				const markupPercent = pricingSettings.defaultMarkupPercent;
				const unitPrice = calculateRetailPrice(supplierCost, markupPercent);
				const lineTotal = unitPrice * sund.quantity;

				return {
					id: crypto.randomUUID(),
					sundryId: sund.sundryId,
					quantity: sund.quantity,
					supplierCost: String(supplierCost),
					markupPercent: String(markupPercent),
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					sundryName: sundry.name,
					notes: sund.notes || null,
					sortOrder: index,
				};
			})
		);

		// Calculate totals for the first option
		const componentTotal = processedComponents.reduce(
			(sum, c) => sum + parseFloat(c.lineTotal),
			0
		);
		const letteringTotal = processedLettering.reduce(
			(sum, l) => sum + parseFloat(l.lineTotal),
			0
		);
		const sundryTotal = processedSundries.reduce((sum, s) => sum + parseFloat(s.lineTotal), 0);
		const subtotal = componentTotal + letteringTotal + sundryTotal;

		// Calculate VAT and total
		const vatAmount = subtotal * pricingSettings.vatRate;
		const total = subtotal + vatAmount;

		// Calculate total cost (sum of all supplier costs)
		const componentCost = processedComponents.reduce(
			(sum, c) => sum + parseFloat(c.supplierCost) * c.quantity,
			0
		);
		const letteringCost = processedLettering.reduce(
			(sum, l) => sum + parseFloat(l.supplierCost) * l.letterCount,
			0
		);
		const sundryCost = processedSundries.reduce(
			(sum, s) => sum + parseFloat(s.supplierCost) * s.quantity,
			0
		);
		const totalCost = componentCost + letteringCost + sundryCost;

		// Step 1: Create the package (shared context)
		const packageId = crypto.randomUUID();
		await db.insert(quotePackages).values({
			id: packageId,
			tenantId,
			packageNumber: quoteNumber, // Use first quote number as package identifier
			customerId: finalCustomerId,
			relationToDeceased: data.relationToDeceased || null,
			payerType,
			quoteType: data.quoteType,
			source: data.source || null,
			status: 'draft',
			notes: data.notes || null,
			internalNotes: data.internalNotes || null,
			validUntil: data.validUntil ? new Date(data.validUntil) : null,
			proposedInscription: data.proposedInscription || null,
			existingMemorialDescription: data.existingMemorialDescription || null,
			relatedJobId: data.relatedJobId || null,
			funeralDirectorId: finalFuneralDirectorId,
			councilId: data.councilId || null,
			memorialSiteId: data.memorialSiteId || null,
			memorialLocation: data.memorialLocation || null,
		});

		// Step 2: Create the first quote option linked to the package
		const quoteId = crypto.randomUUID();
		await db.insert(quotes).values({
			id: quoteId,
			tenantId,
			packageId,
			optionOrder: 0,
			optionLabel: 'Option A',
			parentQuoteId: null,
			version: 1,
			quoteType: data.quoteType,
			customerId: finalCustomerId,
			productId: data.productId || null,
			dimensionComboId: data.dimensionComboId || null,
			source: data.source || null,
			quoteNumber,
			status: 'draft',
			subtotal: String(subtotal),
			vatAmount: String(vatAmount),
			total: String(total),
			totalCost: String(totalCost),
			vatRate: String(pricingSettings.vatRate),
			notes: null, // Notes are at package level now
			internalNotes: null,
			flowerHoles: data.flowerHoles || null,
			proposedInscription: null, // Shared at package level
			existingMemorialDescription: null,
			relatedJobId: null,
			validUntil: null,
		});

		// Step 3: Insert line items for the first option
		if (processedComponents.length > 0) {
			await db.insert(quoteComponents).values(
				processedComponents.map((c) => ({
					...c,
					quoteId,
				}))
			);
		}

		if (processedLettering.length > 0) {
			await db.insert(quoteLettering).values(
				processedLettering.map((l) => ({
					...l,
					quoteId,
				}))
			);
		}

		if (processedSundries.length > 0) {
			await db.insert(quoteSundries).values(
				processedSundries.map((s) => ({
					...s,
					quoteId,
				}))
			);
		}

		// Return full package with options
		const fullPackage = await getPackageWithOptions(packageId, tenantId);
		return c.json({ package: fullPackage }, 201);
	})

	// Create revision of existing quote
	.post('/:id/revise', zValidator('json', createQuoteSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const originalId = c.req.param('id');
		const data = c.req.valid('json');

		// Get original quote
		const original = await getQuoteWithLineItems(originalId, tenantId);
		if (!original) {
			return c.json({ error: 'Quote not found' }, 404);
		}

		// Get pricing settings
		const pricingSettings = await getTenantPricingSettings(tenantId);

		// Use original's quote number but increment version
		const quoteNumber = original.quoteNumber;
		const version = original.version + 1;

		// Merge data: use provided or fall back to original
		const mergedData = {
			customerId: data.customerId ?? original.customerId,
			productId: data.productId ?? original.productId,
			notes: data.notes ?? original.notes,
			validUntil: data.validUntil ?? original.validUntil?.toISOString(),
			components:
				data.components.length > 0
					? data.components
					: original.components.map((c) => ({
							componentType: c.componentType as (typeof COMPONENT_TYPES)[number],
							materialId: c.materialId!,
							finishId: c.finishId || undefined,
							height: c.height ? parseFloat(c.height) : undefined,
							width: c.width ? parseFloat(c.width) : undefined,
							depth: c.depth ? parseFloat(c.depth) : undefined,
							quantity: c.quantity,
							notes: c.notes || undefined,
						})),
			lettering:
				data.lettering.length > 0
					? data.lettering
					: original.lettering.map((l) => ({
							techniqueId: l.techniqueId!,
							colorId: l.colorId || undefined,
							text: l.text!,
							appliesTo: 'new_memorial' as const,
							notes: l.notes || undefined,
						})),
			sundries:
				data.sundries.length > 0
					? data.sundries
					: original.sundries.map((s) => ({
							sundryId: s.sundryId!,
							quantity: s.quantity,
							notes: s.notes || undefined,
						})),
		};

		// Process all line items (same as create)
		const processedComponents = await Promise.all(
			mergedData.components.map(async (comp, index) => {
				const [material] = await db
					.select()
					.from(materials)
					.where(and(eq(materials.id, comp.materialId), eq(materials.tenantId, tenantId)))
					.limit(1);

				if (!material) {
					throw new Error(`Material not found: ${comp.materialId}`);
				}

				let finish = null;
				if (comp.finishId) {
					[finish] = await db
						.select()
						.from(finishes)
						.where(and(eq(finishes.id, comp.finishId), eq(finishes.tenantId, tenantId)))
						.limit(1);
				}

				const supplierCost = 0;
				const markupPercent = pricingSettings.defaultMarkupPercent;
				const unitPrice = calculateRetailPrice(supplierCost, markupPercent);
				const lineTotal = unitPrice * comp.quantity;

				return {
					id: crypto.randomUUID(),
					componentType: comp.componentType,
					materialId: comp.materialId,
					finishId: comp.finishId || null,
					height: comp.height ? String(comp.height) : null,
					width: comp.width ? String(comp.width) : null,
					depth: comp.depth ? String(comp.depth) : null,
					quantity: comp.quantity,
					supplierCost: String(supplierCost),
					markupPercent: String(markupPercent),
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					materialName: material.name,
					finishName: finish?.name || null,
					notes: comp.notes || null,
					sortOrder: index,
				};
			})
		);

		const processedLettering = await Promise.all(
			mergedData.lettering.map(async (lett, index) => {
				const [technique] = await db
					.select()
					.from(letteringTechniques)
					.where(
						and(eq(letteringTechniques.id, lett.techniqueId), eq(letteringTechniques.tenantId, tenantId))
					)
					.limit(1);

				if (!technique) {
					throw new Error(`Lettering technique not found: ${lett.techniqueId}`);
				}

				// Get color if specified
				let color = null;
				if (lett.colorId) {
					[color] = await db
						.select()
						.from(letteringColors)
						.where(and(eq(letteringColors.id, lett.colorId), eq(letteringColors.tenantId, tenantId)))
						.limit(1);
				}

				// Get font if specified
				let font = null;
				if (lett.fontId) {
					[font] = await db
						.select()
						.from(fonts)
						.where(and(eq(fonts.id, lett.fontId), eq(fonts.tenantId, tenantId)))
						.limit(1);
				}

				// Find cost rule using priority: specific color + appliesTo > specific color + 'both' > default + appliesTo > default + 'both'
				let activeCostRule = null;

				// 1. Try specific color + specific appliesTo
				if (lett.colorId) {
					[activeCostRule] = await db
						.select()
						.from(letteringCosts)
						.where(
							and(
								eq(letteringCosts.techniqueId, lett.techniqueId),
								eq(letteringCosts.colorId, lett.colorId),
								eq(letteringCosts.appliesTo, lett.appliesTo)
							)
						)
						.limit(1);

					// 2. Try specific color + 'both'
					if (!activeCostRule) {
						[activeCostRule] = await db
							.select()
							.from(letteringCosts)
							.where(
								and(
									eq(letteringCosts.techniqueId, lett.techniqueId),
									eq(letteringCosts.colorId, lett.colorId),
									eq(letteringCosts.appliesTo, 'both')
								)
							)
							.limit(1);
					}
				}

				// 3. Fall back to default (no color) + specific appliesTo
				if (!activeCostRule) {
					const defaultRules = await db
						.select()
						.from(letteringCosts)
						.where(
							and(
								eq(letteringCosts.techniqueId, lett.techniqueId),
								eq(letteringCosts.appliesTo, lett.appliesTo)
							)
						);
					// Find the one with colorId = null (default)
					activeCostRule = defaultRules.find((r) => r.colorId === null) || null;
				}

				// 4. Fall back to default (no color) + 'both'
				if (!activeCostRule) {
					const bothRules = await db
						.select()
						.from(letteringCosts)
						.where(
							and(eq(letteringCosts.techniqueId, lett.techniqueId), eq(letteringCosts.appliesTo, 'both'))
						);
					// Find the one with colorId = null (default)
					activeCostRule = bothRules.find((r) => r.colorId === null) || null;
				}

				const letterCount = lett.text.replace(/\s/g, '').length;
				const freeLetters = activeCostRule?.freeLetters || 0;
				const supplierCostPerLetter = parseFloat(activeCostRule?.pricePerLetter || '0');
				const billableLetters = Math.max(0, letterCount - freeLetters);
				const markupPercent = pricingSettings.defaultMarkupPercent;
				const unitPrice = calculateRetailPrice(supplierCostPerLetter, markupPercent);
				const lineTotal = billableLetters * unitPrice;

				return {
					id: crypto.randomUUID(),
					techniqueId: lett.techniqueId,
					colorId: lett.colorId || null,
					fontId: font?.id || null,
					fontName: font?.name || null,
					fontS3Key: font?.s3Key || null,
					text: lett.text,
					letterCount,
					appliesTo: lett.appliesTo,
					supplierCost: String(supplierCostPerLetter),
					markupPercent: String(markupPercent),
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					techniqueName: technique.name,
					colorName: color?.name || null,
					notes: lett.notes || null,
					sortOrder: index,
				};
			})
		);

		const processedSundries = await Promise.all(
			mergedData.sundries.map(async (sund, index) => {
				const [sundry] = await db
					.select()
					.from(sundries)
					.where(and(eq(sundries.id, sund.sundryId), eq(sundries.tenantId, tenantId)))
					.limit(1);

				if (!sundry) {
					throw new Error(`Sundry not found: ${sund.sundryId}`);
				}

				const supplierCost = parseFloat(sundry.price);
				const markupPercent = pricingSettings.defaultMarkupPercent;
				const unitPrice = calculateRetailPrice(supplierCost, markupPercent);
				const lineTotal = unitPrice * sund.quantity;

				return {
					id: crypto.randomUUID(),
					sundryId: sund.sundryId,
					quantity: sund.quantity,
					supplierCost: String(supplierCost),
					markupPercent: String(markupPercent),
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					sundryName: sundry.name,
					notes: sund.notes || null,
					sortOrder: index,
				};
			})
		);

		// Calculate totals
		const componentTotal = processedComponents.reduce(
			(sum, c) => sum + parseFloat(c.lineTotal),
			0
		);
		const letteringTotal = processedLettering.reduce(
			(sum, l) => sum + parseFloat(l.lineTotal),
			0
		);
		const sundryTotal = processedSundries.reduce((sum, s) => sum + parseFloat(s.lineTotal), 0);
		const subtotal = componentTotal + letteringTotal + sundryTotal;

		// Calculate VAT and total (fixed amount is now per line item, not quote level)
		const vatAmount = subtotal * pricingSettings.vatRate;
		const total = subtotal + vatAmount;

		// Calculate total cost
		const componentCost = processedComponents.reduce(
			(sum, c) => sum + parseFloat(c.supplierCost) * c.quantity,
			0
		);
		const letteringCost = processedLettering.reduce(
			(sum, l) => sum + parseFloat(l.supplierCost) * l.letterCount,
			0
		);
		const sundryCost = processedSundries.reduce(
			(sum, s) => sum + parseFloat(s.supplierCost) * s.quantity,
			0
		);
		const totalCost = componentCost + letteringCost + sundryCost;

		// Create new quote version
		const quoteId = crypto.randomUUID();

		await db.insert(quotes).values({
			id: quoteId,
			tenantId,
			parentQuoteId: originalId,
			version,
			quoteType: data.quoteType ?? original.quoteType ?? 'new_memorial',
			customerId: mergedData.customerId || null,
			productId: mergedData.productId || null,
			dimensionComboId: data.dimensionComboId ?? original.dimensionComboId ?? null,
			source: data.source ?? original.source ?? null,
			quoteNumber,
			status: 'draft',
			subtotal: String(subtotal),
			vatAmount: String(vatAmount),
			total: String(total),
			totalCost: String(totalCost),
			vatRate: String(pricingSettings.vatRate),
			notes: mergedData.notes || null,
			internalNotes: data.internalNotes ?? original.internalNotes ?? null,
			flowerHoles: data.flowerHoles ?? original.flowerHoles ?? null,
			proposedInscription: data.proposedInscription ?? original.proposedInscription ?? null,
			existingMemorialDescription: data.existingMemorialDescription ?? original.existingMemorialDescription ?? null,
			relatedJobId: data.relatedJobId ?? original.relatedJobId ?? null,
			validUntil: mergedData.validUntil ? new Date(mergedData.validUntil) : null,
		});

		// Insert line items
		if (processedComponents.length > 0) {
			await db.insert(quoteComponents).values(
				processedComponents.map((c) => ({
					...c,
					quoteId,
				}))
			);
		}

		if (processedLettering.length > 0) {
			await db.insert(quoteLettering).values(
				processedLettering.map((l) => ({
					...l,
					quoteId,
				}))
			);
		}

		if (processedSundries.length > 0) {
			await db.insert(quoteSundries).values(
				processedSundries.map((s) => ({
					...s,
					quoteId,
				}))
			);
		}

		const fullQuote = await getQuoteWithLineItems(quoteId, tenantId);
		return c.json({ quote: fullQuote }, 201);
	})

	// Update package status (statuses are at package level)
	.put('/:id/status', zValidator('json', updateStatusSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const { status: newStatus } = c.req.valid('json');

		// Get current package
		const [pkg] = await db
			.select()
			.from(quotePackages)
			.where(and(eq(quotePackages.id, id), eq(quotePackages.tenantId, tenantId)))
			.limit(1);

		if (!pkg) {
			return c.json({ error: 'Package not found' }, 404);
		}

		// Validate status transition
		const allowedTransitions = STATUS_TRANSITIONS[pkg.status] || [];
		if (!allowedTransitions.includes(newStatus)) {
			return c.json(
				{
					error: `Cannot transition from '${pkg.status}' to '${newStatus}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
				},
				400
			);
		}

		// Update package status
		await db
			.update(quotePackages)
			.set({ status: newStatus, updatedAt: new Date() })
			.where(eq(quotePackages.id, id));

		// Also update all options to match the package status
		await db
			.update(quotes)
			.set({ status: newStatus, updatedAt: new Date() })
			.where(eq(quotes.packageId, id));

		// Return updated package
		const fullPackage = await getPackageWithOptions(id, tenantId);
		return c.json({ package: fullPackage });
	})

	// Delete package (draft only)
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Get package
		const [pkg] = await db
			.select()
			.from(quotePackages)
			.where(and(eq(quotePackages.id, id), eq(quotePackages.tenantId, tenantId)))
			.limit(1);

		if (!pkg) {
			return c.json({ error: 'Package not found' }, 404);
		}

		// Only allow deleting draft packages
		if (pkg.status !== 'draft') {
			return c.json({ error: 'Can only delete draft packages' }, 400);
		}

		// Delete all options first (cascades to line items via FK)
		await db.delete(quotes).where(eq(quotes.packageId, id));

		// Delete the package
		await db.delete(quotePackages).where(eq(quotePackages.id, id));

		return c.json({ success: true });
	})

	// Update component pricing
	.put(
		'/:quoteId/components/:itemId',
		zValidator('json', updateLineItemPricingSchema),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const quoteId = c.req.param('quoteId');
			const itemId = c.req.param('itemId');
			const data = c.req.valid('json');

			// Get quote and validate
			const [quote] = await db
				.select()
				.from(quotes)
				.where(and(eq(quotes.id, quoteId), eq(quotes.tenantId, tenantId)))
				.limit(1);

			if (!quote) {
				return c.json({ error: 'Quote not found' }, 404);
			}

			if (quote.status !== 'draft') {
				return c.json({ error: 'Can only edit draft quotes' }, 400);
			}

			// Get component
			const [component] = await db
				.select()
				.from(quoteComponents)
				.where(and(eq(quoteComponents.id, itemId), eq(quoteComponents.quoteId, quoteId)))
				.limit(1);

			if (!component) {
				return c.json({ error: 'Component not found' }, 404);
			}

			// Calculate new values
			const supplierCost = data.supplierCost ?? parseFloat(component.supplierCost);
			const markupPercent = data.markupPercent ?? parseFloat(component.markupPercent);
			const quantity = data.quantity ?? component.quantity;
			const unitPrice = calculateRetailPrice(supplierCost, markupPercent);
			const lineTotal = unitPrice * quantity;

			// Update component
			await db
				.update(quoteComponents)
				.set({
					supplierCost: String(supplierCost),
					markupPercent: String(markupPercent),
					quantity,
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					updatedAt: new Date(),
				})
				.where(eq(quoteComponents.id, itemId));

			// Recalculate quote totals
			await recalculateQuoteTotals(quoteId);

			// Return updated quote
			const fullQuote = await getQuoteWithLineItems(quoteId, tenantId);
			return c.json({ quote: fullQuote });
		}
	)

	// Update lettering pricing
	.put(
		'/:quoteId/lettering/:itemId',
		zValidator('json', updateLineItemPricingSchema),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const quoteId = c.req.param('quoteId');
			const itemId = c.req.param('itemId');
			const data = c.req.valid('json');

			// Get quote and validate
			const [quote] = await db
				.select()
				.from(quotes)
				.where(and(eq(quotes.id, quoteId), eq(quotes.tenantId, tenantId)))
				.limit(1);

			if (!quote) {
				return c.json({ error: 'Quote not found' }, 404);
			}

			if (quote.status !== 'draft') {
				return c.json({ error: 'Can only edit draft quotes' }, 400);
			}

			// Get lettering item
			const [lettering] = await db
				.select()
				.from(quoteLettering)
				.where(and(eq(quoteLettering.id, itemId), eq(quoteLettering.quoteId, quoteId)))
				.limit(1);

			if (!lettering) {
				return c.json({ error: 'Lettering item not found' }, 404);
			}

			// Calculate new values (lettering uses letterCount for quantity)
			const supplierCost = data.supplierCost ?? parseFloat(lettering.supplierCost);
			const markupPercent = data.markupPercent ?? parseFloat(lettering.markupPercent);
			const unitPrice = calculateRetailPrice(supplierCost, markupPercent);
			const lineTotal = unitPrice * lettering.letterCount;

			// Update lettering
			await db
				.update(quoteLettering)
				.set({
					supplierCost: String(supplierCost),
					markupPercent: String(markupPercent),
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					updatedAt: new Date(),
				})
				.where(eq(quoteLettering.id, itemId));

			// Recalculate quote totals
			await recalculateQuoteTotals(quoteId);

			// Return updated quote
			const fullQuote = await getQuoteWithLineItems(quoteId, tenantId);
			return c.json({ quote: fullQuote });
		}
	)

	// Update sundry pricing
	.put(
		'/:quoteId/sundries/:itemId',
		zValidator('json', updateLineItemPricingSchema),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const quoteId = c.req.param('quoteId');
			const itemId = c.req.param('itemId');
			const data = c.req.valid('json');

			// Get quote and validate
			const [quote] = await db
				.select()
				.from(quotes)
				.where(and(eq(quotes.id, quoteId), eq(quotes.tenantId, tenantId)))
				.limit(1);

			if (!quote) {
				return c.json({ error: 'Quote not found' }, 404);
			}

			if (quote.status !== 'draft') {
				return c.json({ error: 'Can only edit draft quotes' }, 400);
			}

			// Get sundry item
			const [sundry] = await db
				.select()
				.from(quoteSundries)
				.where(and(eq(quoteSundries.id, itemId), eq(quoteSundries.quoteId, quoteId)))
				.limit(1);

			if (!sundry) {
				return c.json({ error: 'Sundry item not found' }, 404);
			}

			// Calculate new values
			const supplierCost = data.supplierCost ?? parseFloat(sundry.supplierCost);
			const markupPercent = data.markupPercent ?? parseFloat(sundry.markupPercent);
			const quantity = data.quantity ?? sundry.quantity;
			const unitPrice = calculateRetailPrice(supplierCost, markupPercent);
			const lineTotal = unitPrice * quantity;

			// Update sundry
			await db
				.update(quoteSundries)
				.set({
					supplierCost: String(supplierCost),
					markupPercent: String(markupPercent),
					quantity,
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					updatedAt: new Date(),
				})
				.where(eq(quoteSundries.id, itemId));

			// Recalculate quote totals
			await recalculateQuoteTotals(quoteId);

			// Return updated quote
			const fullQuote = await getQuoteWithLineItems(quoteId, tenantId);
			return c.json({ quote: fullQuote });
		}
	)

	// Send package email to customer (with all options)
	.post(
		'/:id/send-email',
		requireAuth,
		requireTenant,
		zValidator(
			'json',
			z.object({
				recipientEmail: z.string().email().optional(),
				customMessage: z.string().optional(),
			})
		),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const packageId = c.req.param('id');
			const { recipientEmail, customMessage } = c.req.valid('json');

			// Get package
			const [pkg] = await db
				.select()
				.from(quotePackages)
				.where(and(eq(quotePackages.id, packageId), eq(quotePackages.tenantId, tenantId)))
				.limit(1);

			if (!pkg) {
				return c.json({ error: 'Package not found' }, 404);
			}

			// Validate status - should be in a presentable state
			if (!['ready', 'presented'].includes(pkg.status)) {
				return c.json({ error: 'Quote must be in Ready or Presented status to send email' }, 400);
			}

			// Get options for price info
			const options = await db
				.select({ quoteNumber: quotes.quoteNumber, total: quotes.total })
				.from(quotes)
				.where(eq(quotes.packageId, packageId))
				.orderBy(asc(quotes.optionOrder));

			if (options.length === 0) {
				return c.json({ error: 'No quote options found' }, 400);
			}

			const firstQuoteNumber = options[0].quoteNumber;
			const priceRange = calculatePriceRange(options);

			// Determine recipient email
			let toEmail = recipientEmail;

			if (!toEmail && pkg.customerId) {
				// Get customer's primary email from contactInfo
				const primaryEmail = await db
					.select({ value: contactInfo.value })
					.from(customerContactInfo)
					.innerJoin(contactInfo, eq(contactInfo.id, customerContactInfo.contactInfoId))
					.where(
						and(
							eq(customerContactInfo.customerId, pkg.customerId),
							eq(contactInfo.type, 'email'),
							eq(contactInfo.isPrimary, true)
						)
					)
					.limit(1);

				toEmail = primaryEmail[0]?.value;
			}

			// Fall back to funeral director's email
			if (!toEmail && pkg.funeralDirectorId) {
				const fdEmail = await db
					.select({ value: contactInfo.value })
					.from(funeralDirectorContactInfo)
					.innerJoin(contactInfo, eq(contactInfo.id, funeralDirectorContactInfo.contactInfoId))
					.where(
						and(
							eq(funeralDirectorContactInfo.funeralDirectorId, pkg.funeralDirectorId),
							eq(contactInfo.type, 'email'),
							eq(contactInfo.isPrimary, true)
						)
					)
					.limit(1);

				toEmail = fdEmail[0]?.value;
			}

			if (!toEmail) {
				return c.json({ error: 'No email address available for this customer or funeral director' }, 400);
			}

			// Generate secure access token
			const accessToken = crypto.randomBytes(32).toString('hex');

			// Get tenant info for email
			const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

			// Get recipient name
			let customerName = 'Valued Customer';
			if (pkg.customerId) {
				const [customer] = await db
					.select()
					.from(customers)
					.where(eq(customers.id, pkg.customerId))
					.limit(1);
				if (customer) {
					customerName = `${customer.firstName} ${customer.lastName}`;
				}
			} else if (pkg.funeralDirectorId) {
				const [fd] = await db
					.select()
					.from(funeralDirectors)
					.where(eq(funeralDirectors.id, pkg.funeralDirectorId))
					.limit(1);
				if (fd) {
					customerName = fd.tradingName || fd.businessName;
				}
			}

			// Build quote URL
			const baseUrl = process.env.APP_URL || 'http://localhost:5173';
			const quoteUrl = `${baseUrl}/quote/${accessToken}`;

			// Format validity date
			const validUntilFormatted = pkg.validUntil
				? new Date(pkg.validUntil).toLocaleDateString('en-GB', {
						day: 'numeric',
						month: 'long',
						year: 'numeric',
					})
				: null;

			// Format price display (range if multiple options)
			const formatCurrency = (val: string) =>
				new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(parseFloat(val));
			const priceDisplay =
				options.length === 1
					? formatCurrency(priceRange.minPrice)
					: `${formatCurrency(priceRange.minPrice)} - ${formatCurrency(priceRange.maxPrice)}`;
			const optionsText = options.length > 1 ? ` (${options.length} options)` : '';

			const tenantName = tenant?.name || 'Our Company';
			const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
			const logoHtml = tenant?.logoUrl
				? `<img src="${apiBaseUrl}/api/logo/${tenantId}" alt="${tenantName}" style="max-height: 60px; max-width: 200px; margin-bottom: 10px;" /><br>`
				: '';

			// Build email HTML
			const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quote from ${tenantName}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    ${logoHtml}<h1 style="color: #1a1a1a; margin: 0 0 10px 0; font-size: 24px;">${tenantName}</h1>
    <p style="color: #666; margin: 0;">Quote Reference: <strong>${firstQuoteNumber}${optionsText}</strong></p>
  </div>

  <p>Dear ${customerName},</p>

  ${customMessage ? `<p>${customMessage}</p>` : ''}

  <p>We are pleased to provide you with ${options.length > 1 ? 'quote options' : 'a quote'} for your consideration.</p>

  <div style="background-color: #f0f7ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0;"><strong>Quote ${options.length > 1 ? 'Range' : 'Total'}: ${priceDisplay}</strong></p>
    ${validUntilFormatted ? `<p style="margin: 0; color: #666;">Valid until: ${validUntilFormatted}</p>` : ''}
  </div>

  <p>To view the full details of your quote${options.length > 1 ? ' options' : ''} and respond, please click the button below:</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${quoteUrl}" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Your Quote</a>
  </div>

  <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
  <p style="color: #0066cc; font-size: 14px; word-break: break-all;">${quoteUrl}</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p>If you have any questions, please don't hesitate to contact us.</p>

  <p>Kind regards,<br><strong>${tenantName}</strong></p>
</body>
</html>
      `.trim();

			// Build plain text email
			const emailText = `
${tenantName}
Quote Reference: ${firstQuoteNumber}${optionsText}

Dear ${customerName},

${customMessage ? `${customMessage}\n\n` : ''}We are pleased to provide you with ${options.length > 1 ? 'quote options' : 'a quote'} for your consideration.

Quote ${options.length > 1 ? 'Range' : 'Total'}: ${priceDisplay}
${validUntilFormatted ? `Valid until: ${validUntilFormatted}` : ''}

To view the full details of your quote${options.length > 1 ? ' options' : ''} and respond, please visit:
${quoteUrl}

If you have any questions, please don't hesitate to contact us.

Kind regards,
${tenantName}
      `.trim();

			// Send email
			try {
				await sendEmail({
					to: toEmail,
					subject: `Your Quote ${firstQuoteNumber} from ${tenantName}`,
					text: emailText,
					html: emailHtml,
				});

				// Update package with token and email sent timestamp
				const now = new Date();
				await db
					.update(quotePackages)
					.set({
						accessToken,
						accessTokenCreatedAt: now,
						emailSentAt: now,
						emailSentCount: (pkg.emailSentCount || 0) + 1,
						status: pkg.status === 'ready' ? 'presented' : pkg.status, // Auto-advance to presented if ready
						updatedAt: now,
					})
					.where(eq(quotePackages.id, packageId));

				// Also update all options status
				if (pkg.status === 'ready') {
					await db
						.update(quotes)
						.set({ status: 'presented', updatedAt: now })
						.where(eq(quotes.packageId, packageId));
				}

				return c.json({
					success: true,
					message: 'Quote email sent successfully',
					sentTo: toEmail,
				});
			} catch (error) {
				console.error('Failed to send quote email:', error);
				return c.json({ error: 'Failed to send email' }, 500);
			}
		}
	)

	// Add custom line item
	.post(
		'/:id/options/:optionId/line-items',
		zValidator('json', lineItemInputSchema),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const packageId = c.req.param('id');
			const optionId = c.req.param('optionId');
			const data = c.req.valid('json');

			// Get package and validate
			const [pkg] = await db
				.select()
				.from(quotePackages)
				.where(and(eq(quotePackages.id, packageId), eq(quotePackages.tenantId, tenantId)))
				.limit(1);

			if (!pkg) {
				return c.json({ error: 'Package not found' }, 404);
			}

			if (pkg.status !== 'draft') {
				return c.json({ error: 'Can only add line items to draft quotes' }, 400);
			}

			// Verify option exists and belongs to this package
			const [option] = await db
				.select()
				.from(quotes)
				.where(and(eq(quotes.id, optionId), eq(quotes.packageId, packageId)))
				.limit(1);

			if (!option) {
				return c.json({ error: 'Option not found in this package' }, 404);
			}

			// Get max sort order
			const [maxSort] = await db
				.select({ maxOrder: sql<number>`COALESCE(MAX(${quoteLineItems.sortOrder}), -1)` })
				.from(quoteLineItems)
				.where(eq(quoteLineItems.quoteId, optionId));

			const sortOrder = (maxSort?.maxOrder ?? -1) + 1;

			// Create line item
			const [lineItem] = await db
				.insert(quoteLineItems)
				.values({
					id: crypto.randomUUID(),
					quoteId: optionId,
					description: data.description,
					price: String(data.price),
					vatExempt: data.vatExempt ?? false,
					visibleToCustomer: data.visibleToCustomer ?? true,
					priceVisibleToCustomer: data.priceVisibleToCustomer ?? true,
					sortOrder,
				})
				.returning();

			// Recalculate quote totals
			await recalculateQuoteTotals(optionId);

			// Return updated package
			const fullPackage = await getPackageWithOptions(packageId, tenantId);
			return c.json({ package: fullPackage, lineItem }, 201);
		}
	)

	// Update custom line item
	.put(
		'/:id/options/:optionId/line-items/:itemId',
		zValidator('json', updateLineItemSchema),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const packageId = c.req.param('id');
			const optionId = c.req.param('optionId');
			const itemId = c.req.param('itemId');
			const data = c.req.valid('json');

			// Get package and validate
			const [pkg] = await db
				.select()
				.from(quotePackages)
				.where(and(eq(quotePackages.id, packageId), eq(quotePackages.tenantId, tenantId)))
				.limit(1);

			if (!pkg) {
				return c.json({ error: 'Package not found' }, 404);
			}

			if (pkg.status !== 'draft') {
				return c.json({ error: 'Can only edit line items on draft quotes' }, 400);
			}

			// Verify option exists and belongs to this package
			const [option] = await db
				.select()
				.from(quotes)
				.where(and(eq(quotes.id, optionId), eq(quotes.packageId, packageId)))
				.limit(1);

			if (!option) {
				return c.json({ error: 'Option not found in this package' }, 404);
			}

			// Get line item
			const [lineItem] = await db
				.select()
				.from(quoteLineItems)
				.where(and(eq(quoteLineItems.id, itemId), eq(quoteLineItems.quoteId, optionId)))
				.limit(1);

			if (!lineItem) {
				return c.json({ error: 'Line item not found' }, 404);
			}

			// Update line item
			const updateData: Record<string, unknown> = { updatedAt: new Date() };
			if (data.description !== undefined) updateData.description = data.description;
			if (data.price !== undefined) updateData.price = String(data.price);
			if (data.vatExempt !== undefined) updateData.vatExempt = data.vatExempt;
			if (data.visibleToCustomer !== undefined) updateData.visibleToCustomer = data.visibleToCustomer;
			if (data.priceVisibleToCustomer !== undefined) updateData.priceVisibleToCustomer = data.priceVisibleToCustomer;

			await db
				.update(quoteLineItems)
				.set(updateData)
				.where(eq(quoteLineItems.id, itemId));

			// Recalculate quote totals
			await recalculateQuoteTotals(optionId);

			// Return updated package
			const fullPackage = await getPackageWithOptions(packageId, tenantId);
			return c.json({ package: fullPackage });
		}
	)

	// Delete custom line item
	.delete('/:id/options/:optionId/line-items/:itemId', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const packageId = c.req.param('id');
		const optionId = c.req.param('optionId');
		const itemId = c.req.param('itemId');

		// Get package and validate
		const [pkg] = await db
			.select()
			.from(quotePackages)
			.where(and(eq(quotePackages.id, packageId), eq(quotePackages.tenantId, tenantId)))
			.limit(1);

		if (!pkg) {
			return c.json({ error: 'Package not found' }, 404);
		}

		if (pkg.status !== 'draft') {
			return c.json({ error: 'Can only delete line items from draft quotes' }, 400);
		}

		// Verify option exists and belongs to this package
		const [option] = await db
			.select()
			.from(quotes)
			.where(and(eq(quotes.id, optionId), eq(quotes.packageId, packageId)))
			.limit(1);

		if (!option) {
			return c.json({ error: 'Option not found in this package' }, 404);
		}

		// Get line item
		const [lineItem] = await db
			.select()
			.from(quoteLineItems)
			.where(and(eq(quoteLineItems.id, itemId), eq(quoteLineItems.quoteId, optionId)))
			.limit(1);

		if (!lineItem) {
			return c.json({ error: 'Line item not found' }, 404);
		}

		// Delete line item
		await db.delete(quoteLineItems).where(eq(quoteLineItems.id, itemId));

		// Recalculate quote totals
		await recalculateQuoteTotals(optionId);

		// Return updated package
		const fullPackage = await getPackageWithOptions(packageId, tenantId);
		return c.json({ package: fullPackage });
	})

	// ============================================
	// OPTION MANAGEMENT ENDPOINTS
	// ============================================

	// Add new option to a package
	.post('/:id/options', zValidator('json', addOptionSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const packageId = c.req.param('id');
		const data = c.req.valid('json');

		// Get package
		const [pkg] = await db
			.select()
			.from(quotePackages)
			.where(and(eq(quotePackages.id, packageId), eq(quotePackages.tenantId, tenantId)))
			.limit(1);

		if (!pkg) {
			return c.json({ error: 'Package not found' }, 404);
		}

		if (pkg.status !== 'draft') {
			return c.json({ error: 'Can only add options to draft packages' }, 400);
		}

		// Get existing options to determine order and label
		const existingOptions = await db
			.select({ optionOrder: quotes.optionOrder })
			.from(quotes)
			.where(eq(quotes.packageId, packageId))
			.orderBy(desc(quotes.optionOrder))
			.limit(1);

		const nextOrder = (existingOptions[0]?.optionOrder ?? -1) + 1;
		const optionLabel = data.optionLabel || `Option ${String.fromCharCode(65 + nextOrder)}`; // A, B, C...

		// Get pricing settings
		const pricingSettings = await getTenantPricingSettings(tenantId);

		// If cloning from existing option
		let sourceOption = null;
		if (data.copyFromOptionId) {
			sourceOption = await getQuoteWithLineItems(data.copyFromOptionId, tenantId);
			if (!sourceOption || sourceOption.packageId !== packageId) {
				return c.json({ error: 'Source option not found in this package' }, 400);
			}
		}

		// Generate quote number
		const quoteNumber = await generateQuoteNumber(tenantId);

		// Process components (from source or from data)
		const componentsInput = sourceOption?.components?.map((c) => ({
			componentType: c.componentType as (typeof COMPONENT_TYPES)[number],
			materialId: c.materialId!,
			finishId: c.finishId || undefined,
			height: c.height ? parseFloat(c.height) : undefined,
			width: c.width ? parseFloat(c.width) : undefined,
			depth: c.depth ? parseFloat(c.depth) : undefined,
			quantity: c.quantity,
			notes: c.notes || undefined,
		})) || data.components;

		const processedComponents = await Promise.all(
			componentsInput.map(async (comp, index) => {
				const [material] = await db
					.select()
					.from(materials)
					.where(and(eq(materials.id, comp.materialId), eq(materials.tenantId, tenantId)))
					.limit(1);

				if (!material) {
					throw new Error(`Material not found: ${comp.materialId}`);
				}

				let finish = null;
				if (comp.finishId) {
					[finish] = await db
						.select()
						.from(finishes)
						.where(and(eq(finishes.id, comp.finishId), eq(finishes.tenantId, tenantId)))
						.limit(1);
				}

				const supplierCost = 0;
				const markupPercent = pricingSettings.defaultMarkupPercent;
				const unitPrice = calculateRetailPrice(supplierCost, markupPercent);
				const lineTotal = unitPrice * comp.quantity;

				return {
					id: crypto.randomUUID(),
					componentType: comp.componentType,
					materialId: comp.materialId,
					finishId: comp.finishId || null,
					height: comp.height ? String(comp.height) : null,
					width: comp.width ? String(comp.width) : null,
					depth: comp.depth ? String(comp.depth) : null,
					quantity: comp.quantity,
					supplierCost: String(supplierCost),
					markupPercent: String(markupPercent),
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					materialName: material.name,
					finishName: finish?.name || null,
					notes: comp.notes || null,
					sortOrder: index,
				};
			})
		);

		// Process lettering
		const letteringInput = sourceOption?.lettering?.map((l) => ({
			techniqueId: l.techniqueId!,
			colorId: l.colorId || undefined,
			fontId: l.fontId || undefined,
			text: l.text!,
			appliesTo: (l.appliesTo as (typeof LETTERING_COST_APPLIES_TO)[number]) || 'new_memorial',
			notes: l.notes || undefined,
		})) || data.lettering;

		const processedLettering = await Promise.all(
			letteringInput.map(async (lett, index) => {
				const [technique] = await db
					.select()
					.from(letteringTechniques)
					.where(
						and(eq(letteringTechniques.id, lett.techniqueId), eq(letteringTechniques.tenantId, tenantId))
					)
					.limit(1);

				if (!technique) {
					throw new Error(`Lettering technique not found: ${lett.techniqueId}`);
				}

				let color = null;
				if (lett.colorId) {
					[color] = await db
						.select()
						.from(letteringColors)
						.where(and(eq(letteringColors.id, lett.colorId), eq(letteringColors.tenantId, tenantId)))
						.limit(1);
				}

				// Get font if specified
				let font = null;
				if (lett.fontId) {
					[font] = await db
						.select()
						.from(fonts)
						.where(and(eq(fonts.id, lett.fontId), eq(fonts.tenantId, tenantId)))
						.limit(1);
				}

				// Find cost rule (simplified - use default)
				const [activeCostRule] = await db
					.select()
					.from(letteringCosts)
					.where(eq(letteringCosts.techniqueId, lett.techniqueId))
					.limit(1);

				const letterCount = lett.text.replace(/\s/g, '').length;
				const freeLetters = activeCostRule?.freeLetters || 0;
				const supplierCostPerLetter = parseFloat(activeCostRule?.pricePerLetter || '0');
				const billableLetters = Math.max(0, letterCount - freeLetters);
				const markupPercent = pricingSettings.defaultMarkupPercent;
				const unitPrice = calculateRetailPrice(supplierCostPerLetter, markupPercent);
				const lineTotal = billableLetters * unitPrice;

				return {
					id: crypto.randomUUID(),
					techniqueId: lett.techniqueId,
					colorId: lett.colorId || null,
					fontId: font?.id || null,
					fontName: font?.name || null,
					fontS3Key: font?.s3Key || null,
					text: lett.text,
					letterCount,
					appliesTo: lett.appliesTo,
					supplierCost: String(supplierCostPerLetter),
					markupPercent: String(markupPercent),
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					techniqueName: technique.name,
					colorName: color?.name || null,
					notes: lett.notes || null,
					sortOrder: index,
				};
			})
		);

		// Process sundries
		const sundriesInput = sourceOption?.sundries?.map((s) => ({
			sundryId: s.sundryId!,
			quantity: s.quantity,
			notes: s.notes || undefined,
		})) || data.sundries;

		const processedSundries = await Promise.all(
			sundriesInput.map(async (sund, index) => {
				const [sundry] = await db
					.select()
					.from(sundries)
					.where(and(eq(sundries.id, sund.sundryId), eq(sundries.tenantId, tenantId)))
					.limit(1);

				if (!sundry) {
					throw new Error(`Sundry not found: ${sund.sundryId}`);
				}

				const supplierCost = parseFloat(sundry.price);
				const markupPercent = pricingSettings.defaultMarkupPercent;
				const unitPrice = calculateRetailPrice(supplierCost, markupPercent);
				const lineTotal = unitPrice * sund.quantity;

				return {
					id: crypto.randomUUID(),
					sundryId: sund.sundryId,
					quantity: sund.quantity,
					supplierCost: String(supplierCost),
					markupPercent: String(markupPercent),
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					sundryName: sundry.name,
					notes: sund.notes || null,
					sortOrder: index,
				};
			})
		);

		// Calculate totals
		const componentTotal = processedComponents.reduce((sum, c) => sum + parseFloat(c.lineTotal), 0);
		const letteringTotal = processedLettering.reduce((sum, l) => sum + parseFloat(l.lineTotal), 0);
		const sundryTotal = processedSundries.reduce((sum, s) => sum + parseFloat(s.lineTotal), 0);
		const subtotal = componentTotal + letteringTotal + sundryTotal;
		const vatAmount = subtotal * pricingSettings.vatRate;
		const total = subtotal + vatAmount;

		const componentCost = processedComponents.reduce((sum, c) => sum + parseFloat(c.supplierCost) * c.quantity, 0);
		const letteringCost = processedLettering.reduce((sum, l) => sum + parseFloat(l.supplierCost) * l.letterCount, 0);
		const sundryCost = processedSundries.reduce((sum, s) => sum + parseFloat(s.supplierCost) * s.quantity, 0);
		const totalCost = componentCost + letteringCost + sundryCost;

		// Create the new option
		const quoteId = crypto.randomUUID();
		await db.insert(quotes).values({
			id: quoteId,
			tenantId,
			packageId,
			optionOrder: nextOrder,
			optionLabel,
			parentQuoteId: null,
			version: 1,
			quoteType: pkg.quoteType,
			customerId: pkg.customerId,
			productId: sourceOption?.productId || data.productId || null,
			dimensionComboId: sourceOption?.dimensionComboId || data.dimensionComboId || null,
			source: pkg.source,
			quoteNumber,
			status: 'draft',
			subtotal: String(subtotal),
			vatAmount: String(vatAmount),
			total: String(total),
			totalCost: String(totalCost),
			vatRate: String(pricingSettings.vatRate),
			notes: null,
			internalNotes: null,
			flowerHoles: sourceOption?.flowerHoles || data.flowerHoles || null,
			proposedInscription: null,
			existingMemorialDescription: null,
			relatedJobId: null,
			validUntil: null,
		});

		// Insert line items
		if (processedComponents.length > 0) {
			await db.insert(quoteComponents).values(
				processedComponents.map((c) => ({ ...c, quoteId }))
			);
		}

		if (processedLettering.length > 0) {
			await db.insert(quoteLettering).values(
				processedLettering.map((l) => ({ ...l, quoteId }))
			);
		}

		if (processedSundries.length > 0) {
			await db.insert(quoteSundries).values(
				processedSundries.map((s) => ({ ...s, quoteId }))
			);
		}

		// Return updated package
		const fullPackage = await getPackageWithOptions(packageId, tenantId);
		return c.json({ package: fullPackage }, 201);
	})

	// Clone an existing option
	.post('/:id/options/:optionId/clone', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const packageId = c.req.param('id');
		const optionId = c.req.param('optionId');

		// Forward to options endpoint with copyFromOptionId
		const newRequest = new Request(c.req.url.replace(`/${optionId}/clone`, ''), {
			method: 'POST',
			headers: c.req.raw.headers,
			body: JSON.stringify({ copyFromOptionId: optionId }),
		});

		// Re-use the add option logic
		const [pkg] = await db
			.select()
			.from(quotePackages)
			.where(and(eq(quotePackages.id, packageId), eq(quotePackages.tenantId, tenantId)))
			.limit(1);

		if (!pkg) {
			return c.json({ error: 'Package not found' }, 404);
		}

		if (pkg.status !== 'draft') {
			return c.json({ error: 'Can only clone options on draft packages' }, 400);
		}

		// Get source option
		const sourceOption = await getQuoteWithLineItems(optionId, tenantId);
		if (!sourceOption || sourceOption.packageId !== packageId) {
			return c.json({ error: 'Option not found in this package' }, 400);
		}

		// Get existing options to determine order
		const existingOptions = await db
			.select({ optionOrder: quotes.optionOrder })
			.from(quotes)
			.where(eq(quotes.packageId, packageId))
			.orderBy(desc(quotes.optionOrder))
			.limit(1);

		const nextOrder = (existingOptions[0]?.optionOrder ?? -1) + 1;
		const optionLabel = `Option ${String.fromCharCode(65 + nextOrder)}`;

		// Get pricing settings
		const pricingSettings = await getTenantPricingSettings(tenantId);

		// Generate new quote number
		const quoteNumber = await generateQuoteNumber(tenantId);

		// Clone components
		const processedComponents = sourceOption.components.map((c, index) => ({
			id: crypto.randomUUID(),
			componentType: c.componentType,
			materialId: c.materialId,
			finishId: c.finishId,
			height: c.height,
			width: c.width,
			depth: c.depth,
			quantity: c.quantity,
			supplierCost: c.supplierCost,
			markupPercent: c.markupPercent,
			unitPrice: c.unitPrice,
			lineTotal: c.lineTotal,
			materialName: c.materialName,
			finishName: c.finishName,
			notes: c.notes,
			sortOrder: index,
		}));

		// Clone lettering
		const processedLettering = sourceOption.lettering.map((l, index) => ({
			id: crypto.randomUUID(),
			techniqueId: l.techniqueId,
			colorId: l.colorId,
			fontId: l.fontId,
			fontName: l.fontName,
			fontS3Key: l.fontS3Key,
			text: l.text,
			letterCount: l.letterCount,
			appliesTo: l.appliesTo,
			supplierCost: l.supplierCost,
			markupPercent: l.markupPercent,
			unitPrice: l.unitPrice,
			lineTotal: l.lineTotal,
			techniqueName: l.techniqueName,
			colorName: l.colorName,
			notes: l.notes,
			sortOrder: index,
		}));

		// Clone sundries
		const processedSundries = sourceOption.sundries.map((s, index) => ({
			id: crypto.randomUUID(),
			sundryId: s.sundryId,
			quantity: s.quantity,
			supplierCost: s.supplierCost,
			markupPercent: s.markupPercent,
			unitPrice: s.unitPrice,
			lineTotal: s.lineTotal,
			sundryName: s.sundryName,
			notes: s.notes,
			sortOrder: index,
		}));

		// Create new option
		const quoteId = crypto.randomUUID();
		await db.insert(quotes).values({
			id: quoteId,
			tenantId,
			packageId,
			optionOrder: nextOrder,
			optionLabel,
			parentQuoteId: null,
			version: 1,
			quoteType: sourceOption.quoteType,
			customerId: sourceOption.customerId,
			productId: sourceOption.productId,
			dimensionComboId: sourceOption.dimensionComboId,
			source: sourceOption.source,
			quoteNumber,
			status: 'draft',
			subtotal: sourceOption.subtotal,
			vatAmount: sourceOption.vatAmount,
			total: sourceOption.total,
			totalCost: sourceOption.totalCost,
			vatRate: sourceOption.vatRate,
			notes: null,
			internalNotes: null,
			flowerHoles: sourceOption.flowerHoles,
			proposedInscription: null,
			existingMemorialDescription: null,
			relatedJobId: null,
			validUntil: null,
		});

		// Insert line items
		if (processedComponents.length > 0) {
			await db.insert(quoteComponents).values(
				processedComponents.map((c) => ({ ...c, quoteId }))
			);
		}

		if (processedLettering.length > 0) {
			await db.insert(quoteLettering).values(
				processedLettering.map((l) => ({ ...l, quoteId }))
			);
		}

		if (processedSundries.length > 0) {
			await db.insert(quoteSundries).values(
				processedSundries.map((s) => ({ ...s, quoteId }))
			);
		}

		// Return updated package
		const fullPackage = await getPackageWithOptions(packageId, tenantId);
		return c.json({ package: fullPackage }, 201);
	})

	// Delete an option (only if >1 option exists)
	.delete('/:id/options/:optionId', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const packageId = c.req.param('id');
		const optionId = c.req.param('optionId');

		// Get package
		const [pkg] = await db
			.select()
			.from(quotePackages)
			.where(and(eq(quotePackages.id, packageId), eq(quotePackages.tenantId, tenantId)))
			.limit(1);

		if (!pkg) {
			return c.json({ error: 'Package not found' }, 404);
		}

		if (pkg.status !== 'draft') {
			return c.json({ error: 'Can only delete options from draft packages' }, 400);
		}

		// Get option count
		const optionCount = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(quotes)
			.where(eq(quotes.packageId, packageId));

		if (optionCount[0].count <= 1) {
			return c.json({ error: 'Cannot delete the last option. Delete the package instead.' }, 400);
		}

		// Verify option exists and belongs to this package
		const [option] = await db
			.select()
			.from(quotes)
			.where(and(eq(quotes.id, optionId), eq(quotes.packageId, packageId)))
			.limit(1);

		if (!option) {
			return c.json({ error: 'Option not found in this package' }, 404);
		}

		// Delete option (cascades to line items via FK)
		await db.delete(quotes).where(eq(quotes.id, optionId));

		// Return updated package
		const fullPackage = await getPackageWithOptions(packageId, tenantId);
		return c.json({ package: fullPackage });
	})

	// ============================================
	// LETTERING ITEM CRUD ENDPOINTS
	// ============================================

	// Add a new lettering item to an option
	.post(
		'/:id/options/:optionId/lettering',
		zValidator('json', addLetteringItemSchema),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const packageId = c.req.param('id');
			const optionId = c.req.param('optionId');
			const data = c.req.valid('json');

			// Get package and validate
			const [pkg] = await db
				.select()
				.from(quotePackages)
				.where(and(eq(quotePackages.id, packageId), eq(quotePackages.tenantId, tenantId)))
				.limit(1);

			if (!pkg) {
				return c.json({ error: 'Package not found' }, 404);
			}

			if (pkg.status !== 'draft') {
				return c.json({ error: 'Can only add lettering to draft quotes' }, 400);
			}

			// Verify option exists and belongs to this package
			const [option] = await db
				.select()
				.from(quotes)
				.where(and(eq(quotes.id, optionId), eq(quotes.packageId, packageId)))
				.limit(1);

			if (!option) {
				return c.json({ error: 'Option not found in this package' }, 404);
			}

			// Get technique
			const [technique] = await db
				.select()
				.from(letteringTechniques)
				.where(
					and(eq(letteringTechniques.id, data.techniqueId), eq(letteringTechniques.tenantId, tenantId))
				)
				.limit(1);

			if (!technique) {
				return c.json({ error: 'Lettering technique not found' }, 404);
			}

			// Get color if specified
			let color = null;
			if (data.colorId) {
				[color] = await db
					.select()
					.from(letteringColors)
					.where(and(eq(letteringColors.id, data.colorId), eq(letteringColors.tenantId, tenantId)))
					.limit(1);
			}

			// Get font if specified
			let font = null;
			if (data.fontId) {
				[font] = await db
					.select()
					.from(fonts)
					.where(and(eq(fonts.id, data.fontId), eq(fonts.tenantId, tenantId)))
					.limit(1);
			}

			// Find cost rule using priority
			let activeCostRule = null;

			// 1. Try specific color + specific appliesTo
			if (data.colorId) {
				[activeCostRule] = await db
					.select()
					.from(letteringCosts)
					.where(
						and(
							eq(letteringCosts.techniqueId, data.techniqueId),
							eq(letteringCosts.colorId, data.colorId),
							eq(letteringCosts.appliesTo, data.appliesTo)
						)
					)
					.limit(1);

				// 2. Try specific color + 'both'
				if (!activeCostRule) {
					[activeCostRule] = await db
						.select()
						.from(letteringCosts)
						.where(
							and(
								eq(letteringCosts.techniqueId, data.techniqueId),
								eq(letteringCosts.colorId, data.colorId),
								eq(letteringCosts.appliesTo, 'both')
							)
						)
						.limit(1);
				}
			}

			// 3. Fall back to default (no color) + specific appliesTo
			if (!activeCostRule) {
				const defaultRules = await db
					.select()
					.from(letteringCosts)
					.where(
						and(
							eq(letteringCosts.techniqueId, data.techniqueId),
							eq(letteringCosts.appliesTo, data.appliesTo)
						)
					);
				activeCostRule = defaultRules.find((r) => r.colorId === null) || null;
			}

			// 4. Fall back to default (no color) + 'both'
			if (!activeCostRule) {
				const bothRules = await db
					.select()
					.from(letteringCosts)
					.where(
						and(eq(letteringCosts.techniqueId, data.techniqueId), eq(letteringCosts.appliesTo, 'both'))
					);
				activeCostRule = bothRules.find((r) => r.colorId === null) || null;
			}

			// Get pricing settings
			const pricingSettings = await getTenantPricingSettings(tenantId);

			// Calculate pricing
			const letterCount = data.text.replace(/\s/g, '').length;
			const freeLetters = activeCostRule?.freeLetters || 0;
			const supplierCostPerLetter = parseFloat(activeCostRule?.pricePerLetter || '0');
			const billableLetters = Math.max(0, letterCount - freeLetters);
			const markupPercent = pricingSettings.defaultMarkupPercent;
			const unitPrice = calculateRetailPrice(supplierCostPerLetter, markupPercent);
			const lineTotal = billableLetters * unitPrice;

			// Get current max sort order
			const [maxSortOrder] = await db
				.select({ maxOrder: sql<number>`COALESCE(MAX(${quoteLettering.sortOrder}), -1)` })
				.from(quoteLettering)
				.where(eq(quoteLettering.quoteId, optionId));

			// Insert new lettering item
			const letteringId = crypto.randomUUID();
			await db.insert(quoteLettering).values({
				id: letteringId,
				quoteId: optionId,
				techniqueId: data.techniqueId,
				colorId: data.colorId || null,
				fontId: font?.id || null,
				fontName: font?.name || null,
				fontS3Key: font?.s3Key || null,
				text: data.text,
				letterCount,
				appliesTo: data.appliesTo,
				supplierCost: String(supplierCostPerLetter),
				markupPercent: String(markupPercent),
				unitPrice: String(unitPrice),
				lineTotal: String(lineTotal),
				techniqueName: technique.name,
				colorName: color?.name || null,
				notes: data.notes || null,
				sortOrder: (maxSortOrder.maxOrder ?? -1) + 1,
			});

			// Recalculate quote totals
			await recalculateQuoteTotals(optionId);

			// Return updated package
			const fullPackage = await getPackageWithOptions(packageId, tenantId);
			return c.json({ package: fullPackage }, 201);
		}
	)

	// Update a lettering item (technique, color, text, pricing)
	.put(
		'/:id/options/:optionId/lettering/:itemId',
		zValidator('json', updateLetteringItemSchema),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const packageId = c.req.param('id');
			const optionId = c.req.param('optionId');
			const itemId = c.req.param('itemId');
			const data = c.req.valid('json');

			// Get package and validate
			const [pkg] = await db
				.select()
				.from(quotePackages)
				.where(and(eq(quotePackages.id, packageId), eq(quotePackages.tenantId, tenantId)))
				.limit(1);

			if (!pkg) {
				return c.json({ error: 'Package not found' }, 404);
			}

			if (pkg.status !== 'draft') {
				return c.json({ error: 'Can only edit lettering on draft quotes' }, 400);
			}

			// Verify option exists and belongs to this package
			const [option] = await db
				.select()
				.from(quotes)
				.where(and(eq(quotes.id, optionId), eq(quotes.packageId, packageId)))
				.limit(1);

			if (!option) {
				return c.json({ error: 'Option not found in this package' }, 404);
			}

			// Get existing lettering item
			const [existing] = await db
				.select()
				.from(quoteLettering)
				.where(and(eq(quoteLettering.id, itemId), eq(quoteLettering.quoteId, optionId)))
				.limit(1);

			if (!existing) {
				return c.json({ error: 'Lettering item not found' }, 404);
			}

			// Determine final values
			const techniqueId = data.techniqueId ?? existing.techniqueId;
			const colorId = data.colorId !== undefined ? data.colorId : existing.colorId;
			const text = data.text ?? existing.text;
			const appliesTo = data.appliesTo ?? existing.appliesTo;
			const notes = data.notes !== undefined ? data.notes : existing.notes;

			// If technique, color, or text changed, recalculate pricing from cost rules
			const contentChanged = data.techniqueId !== undefined || data.colorId !== undefined || data.text !== undefined;

			let techniqueName = existing.techniqueName;
			let colorName = existing.colorName;
			let fontId = data.fontId !== undefined ? data.fontId : existing.fontId;
			let fontName = existing.fontName;
			let fontS3Key = existing.fontS3Key;
			let supplierCost = data.supplierCost ?? parseFloat(existing.supplierCost);
			let markupPercent = data.markupPercent ?? parseFloat(existing.markupPercent);
			const letterCount = text?.replace(/\s/g, '').length || 0;

			if (contentChanged) {
				// Get technique name if changed
				if (data.techniqueId) {
					const [technique] = await db
						.select()
						.from(letteringTechniques)
						.where(
							and(eq(letteringTechniques.id, data.techniqueId), eq(letteringTechniques.tenantId, tenantId))
						)
						.limit(1);
					if (!technique) {
						return c.json({ error: 'Lettering technique not found' }, 404);
					}
					techniqueName = technique.name;
				}

				// Get color name if changed
				if (data.colorId !== undefined) {
					if (data.colorId) {
						const [color] = await db
							.select()
							.from(letteringColors)
							.where(and(eq(letteringColors.id, data.colorId), eq(letteringColors.tenantId, tenantId)))
							.limit(1);
						colorName = color?.name || null;
					} else {
						colorName = null;
					}
				}

				// Only recalculate supplier cost from rules if not explicitly provided
				if (data.supplierCost === undefined) {
					// Find cost rule using priority
					let activeCostRule = null;

					// 1. Try specific color + specific appliesTo
					if (colorId) {
						[activeCostRule] = await db
							.select()
							.from(letteringCosts)
							.where(
								and(
									eq(letteringCosts.techniqueId, techniqueId!),
									eq(letteringCosts.colorId, colorId),
									eq(letteringCosts.appliesTo, appliesTo!)
								)
							)
							.limit(1);

						// 2. Try specific color + 'both'
						if (!activeCostRule) {
							[activeCostRule] = await db
								.select()
								.from(letteringCosts)
								.where(
									and(
										eq(letteringCosts.techniqueId, techniqueId!),
										eq(letteringCosts.colorId, colorId),
										eq(letteringCosts.appliesTo, 'both')
									)
								)
								.limit(1);
						}
					}

					// 3. Fall back to default (no color) + specific appliesTo
					if (!activeCostRule) {
						const defaultRules = await db
							.select()
							.from(letteringCosts)
							.where(
								and(
									eq(letteringCosts.techniqueId, techniqueId!),
									eq(letteringCosts.appliesTo, appliesTo!)
								)
							);
						activeCostRule = defaultRules.find((r) => r.colorId === null) || null;
					}

					// 4. Fall back to default (no color) + 'both'
					if (!activeCostRule) {
						const bothRules = await db
							.select()
							.from(letteringCosts)
							.where(
								and(eq(letteringCosts.techniqueId, techniqueId!), eq(letteringCosts.appliesTo, 'both'))
							);
						activeCostRule = bothRules.find((r) => r.colorId === null) || null;
					}

					supplierCost = parseFloat(activeCostRule?.pricePerLetter || '0');
				}
			}

			// Get font snapshot if fontId changed
			if (data.fontId !== undefined) {
				if (data.fontId) {
					const [fontRecord] = await db
						.select()
						.from(fonts)
						.where(and(eq(fonts.id, data.fontId), eq(fonts.tenantId, tenantId)))
						.limit(1);
					fontName = fontRecord?.name || null;
					fontS3Key = fontRecord?.s3Key || null;
				} else {
					fontId = null;
					fontName = null;
					fontS3Key = null;
				}
			}

			// Calculate new pricing
			const unitPrice = calculateRetailPrice(supplierCost, markupPercent);
			const lineTotal = letterCount * unitPrice;

			// Update lettering item
			await db
				.update(quoteLettering)
				.set({
					techniqueId,
					colorId,
					fontId,
					fontName,
					fontS3Key,
					text,
					letterCount,
					appliesTo,
					notes,
					techniqueName,
					colorName,
					supplierCost: String(supplierCost),
					markupPercent: String(markupPercent),
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					updatedAt: new Date(),
				})
				.where(eq(quoteLettering.id, itemId));

			// Recalculate quote totals
			await recalculateQuoteTotals(optionId);

			// Return updated package
			const fullPackage = await getPackageWithOptions(packageId, tenantId);
			return c.json({ package: fullPackage });
		}
	)

	// Delete a lettering item
	.delete('/:id/options/:optionId/lettering/:itemId', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const packageId = c.req.param('id');
		const optionId = c.req.param('optionId');
		const itemId = c.req.param('itemId');

		// Get package and validate
		const [pkg] = await db
			.select()
			.from(quotePackages)
			.where(and(eq(quotePackages.id, packageId), eq(quotePackages.tenantId, tenantId)))
			.limit(1);

		if (!pkg) {
			return c.json({ error: 'Package not found' }, 404);
		}

		if (pkg.status !== 'draft') {
			return c.json({ error: 'Can only delete lettering from draft quotes' }, 400);
		}

		// Verify option exists and belongs to this package
		const [option] = await db
			.select()
			.from(quotes)
			.where(and(eq(quotes.id, optionId), eq(quotes.packageId, packageId)))
			.limit(1);

		if (!option) {
			return c.json({ error: 'Option not found in this package' }, 404);
		}

		// Verify lettering item exists
		const [lettering] = await db
			.select()
			.from(quoteLettering)
			.where(and(eq(quoteLettering.id, itemId), eq(quoteLettering.quoteId, optionId)))
			.limit(1);

		if (!lettering) {
			return c.json({ error: 'Lettering item not found' }, 404);
		}

		// Delete the lettering item
		await db.delete(quoteLettering).where(eq(quoteLettering.id, itemId));

		// Recalculate quote totals
		await recalculateQuoteTotals(optionId);

		// Return updated package
		const fullPackage = await getPackageWithOptions(packageId, tenantId);
		return c.json({ package: fullPackage });
	})

	// Accept a specific option (creates job, sets package status to accepted)
	.post('/:id/accept/:optionId', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const packageId = c.req.param('id');
		const optionId = c.req.param('optionId');

		// Get package
		const [pkg] = await db
			.select()
			.from(quotePackages)
			.where(and(eq(quotePackages.id, packageId), eq(quotePackages.tenantId, tenantId)))
			.limit(1);

		if (!pkg) {
			return c.json({ error: 'Package not found' }, 404);
		}

		// Validate status - should be in presented state
		if (pkg.status !== 'presented') {
			return c.json({ error: 'Package must be in Presented status to accept' }, 400);
		}

		// Get the option being accepted
		const [option] = await db
			.select()
			.from(quotes)
			.where(and(eq(quotes.id, optionId), eq(quotes.packageId, packageId)))
			.limit(1);

		if (!option) {
			return c.json({ error: 'Option not found in this package' }, 404);
		}

		// Update package status and record accepted option
		const now = new Date();
		await db
			.update(quotePackages)
			.set({
				status: 'accepted',
				acceptedOptionId: optionId,
				customerDecisionAt: now,
				updatedAt: now,
			})
			.where(eq(quotePackages.id, packageId));

		// Update all options status to accepted
		await db
			.update(quotes)
			.set({ status: 'accepted', updatedAt: now })
			.where(eq(quotes.packageId, packageId));

		// Create job from the accepted option
		const jobNumber = await generateJobNumber(tenantId);
		const jobId = crypto.randomUUID();

		await db.insert(jobs).values({
			id: jobId,
			tenantId,
			quoteId: optionId, // Link to the specific accepted option
			jobNumber,
			status: 'pending',
		});

		// Get tenant's deposit percentage setting
		let depositPercent = 50; // Default 50%
		const [pricingSettingsRow] = await db
			.select()
			.from(tenantPricingSettings)
			.where(eq(tenantPricingSettings.tenantId, tenantId))
			.limit(1);

		if (pricingSettingsRow?.defaultDepositPercent) {
			depositPercent = parseFloat(pricingSettingsRow.defaultDepositPercent);
		}

		// Calculate deposit and balance amounts
		const total = parseFloat(option.total);
		const depositAmount = (total * depositPercent) / 100;
		const balanceAmount = total - depositAmount;

		// Create payment schedule items
		await db.insert(jobPaymentScheduleItems).values({
			id: crypto.randomUUID(),
			tenantId,
			jobId,
			description: 'Deposit',
			amount: depositAmount.toFixed(2),
			dueDate: now,
			paidAmount: '0',
			sortOrder: 0,
		});

		await db.insert(jobPaymentScheduleItems).values({
			id: crypto.randomUUID(),
			tenantId,
			jobId,
			description: 'Balance',
			amount: balanceAmount.toFixed(2),
			dueDate: null,
			paidAmount: '0',
			sortOrder: 1,
		});

		// Return updated package
		const fullPackage = await getPackageWithOptions(packageId, tenantId);
		return c.json({ package: fullPackage, jobId, jobNumber });
	});

export { quotesRoutes };
