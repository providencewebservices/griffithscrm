import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, asc, sql, notExists, like } from 'drizzle-orm';
import crypto from 'crypto';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { sendEmail } from '../lib/email';
import {
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
	sundries,
	services,
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
	QUOTE_STATUSES,
	COMPONENT_TYPES,
	LETTERING_COST_APPLIES_TO,
	FLOWER_HOLE_CHOICES,
	ENQUIRY_SOURCES,
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

	// Get service if exists
	let service = null;
	if (quote.serviceId) {
		[service] = await db
			.select()
			.from(services)
			.where(eq(services.id, quote.serviceId))
			.limit(1);
	}

	// Get version history (walk up the chain)
	const versions = await getVersionHistory(quoteId, tenantId);

	return {
		...quote,
		customer,
		product,
		service,
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
	serviceId: z.string().min(1), // Required: the service this quote is for
	customerId: z.string().optional(),
	productId: z.string().optional(),
	dimensionComboId: z.string().optional(),
	source: z.enum(ENQUIRY_SOURCES).optional(), // How the customer contacted us
	flowerHoles: z.enum(FLOWER_HOLE_CHOICES).optional(),
	proposedInscription: z.string().optional(), // Full text of desired inscription
	notes: z.string().optional(), // Customer-visible notes
	internalNotes: z.string().optional(), // Tenant-only notes
	validUntil: z.string().datetime().optional(),
	components: z.array(componentInputSchema).optional().default([]),
	lettering: z.array(letteringInputSchema).optional().default([]),
	sundries: z.array(sundryInputSchema).optional().default([]),
	// For inline customer creation
	customerDetails: customerDetailsSchema.optional(),
});

const updateStatusSchema = z.object({
	status: z.enum(QUOTE_STATUSES),
});

const updateLineItemPricingSchema = z.object({
	supplierCost: z.number().min(0).optional(),
	markupPercent: z.number().min(0).optional(),
	quantity: z.number().int().min(1).optional(),
});

// Schema for custom line items
const lineItemInputSchema = z.object({
	description: z.string().min(1),
	price: z.number().min(0),
	vatExempt: z.boolean().optional().default(false),
	visibleToCustomer: z.boolean().optional().default(true),
});

const updateLineItemSchema = z.object({
	description: z.string().min(1).optional(),
	price: z.number().min(0).optional(),
	vatExempt: z.boolean().optional(),
	visibleToCustomer: z.boolean().optional(),
});

const listQuerySchema = z.object({
	status: z.enum(QUOTE_STATUSES).optional(),
	customerId: z.string().optional(),
	search: z.string().optional(),
	latestOnly: z.enum(['true', 'false']).optional().default('true'),
});

// ============================================
// ROUTES
// ============================================

const quotesRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List quotes
	.get('/', zValidator('query', listQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { status, customerId, search, latestOnly } = c.req.valid('query');

		// Base query with customer name join
		let baseQuery = db
			.select({
				id: quotes.id,
				tenantId: quotes.tenantId,
				parentQuoteId: quotes.parentQuoteId,
				version: quotes.version,
				customerId: quotes.customerId,
				productId: quotes.productId,
				quoteNumber: quotes.quoteNumber,
				status: quotes.status,
				subtotal: quotes.subtotal,
				vatAmount: quotes.vatAmount,
				total: quotes.total,
				vatRate: quotes.vatRate,
				notes: quotes.notes,
				validUntil: quotes.validUntil,
				createdAt: quotes.createdAt,
				updatedAt: quotes.updatedAt,
				customerFirstName: customers.firstName,
				customerLastName: customers.lastName,
			})
			.from(quotes)
			.leftJoin(customers, eq(quotes.customerId, customers.id))
			.where(eq(quotes.tenantId, tenantId))
			.$dynamic();

		// Apply filters
		const conditions = [eq(quotes.tenantId, tenantId)];

		if (status) {
			conditions.push(eq(quotes.status, status));
		}

		if (customerId) {
			conditions.push(eq(quotes.customerId, customerId));
		}

		if (search) {
			conditions.push(like(quotes.quoteNumber, `%${search}%`));
		}

		// For "latest only", filter out quotes that have a child version
		if (latestOnly === 'true') {
			// A quote is "latest" if no other quote references it as parentQuoteId
			const quotesWithChildren = db
				.select({ parentId: quotes.parentQuoteId })
				.from(quotes)
				.where(eq(quotes.tenantId, tenantId));

			// This is complex in Drizzle, so we'll filter in memory for now
			// In production, you'd want a proper subquery
		}

		const results = await db
			.select({
				id: quotes.id,
				tenantId: quotes.tenantId,
				parentQuoteId: quotes.parentQuoteId,
				version: quotes.version,
				customerId: quotes.customerId,
				productId: quotes.productId,
				quoteNumber: quotes.quoteNumber,
				status: quotes.status,
				subtotal: quotes.subtotal,
				vatAmount: quotes.vatAmount,
				total: quotes.total,
				vatRate: quotes.vatRate,
				notes: quotes.notes,
				validUntil: quotes.validUntil,
				createdAt: quotes.createdAt,
				updatedAt: quotes.updatedAt,
				customerFirstName: customers.firstName,
				customerLastName: customers.lastName,
			})
			.from(quotes)
			.leftJoin(customers, eq(quotes.customerId, customers.id))
			.where(and(...conditions))
			.orderBy(desc(quotes.createdAt));

		// Filter to latest versions if requested
		let filteredResults = results;
		if (latestOnly === 'true') {
			const parentIds = new Set(
				results.filter((q) => q.parentQuoteId).map((q) => q.parentQuoteId)
			);
			filteredResults = results.filter((q) => !parentIds.has(q.id));
		}

		// Format results
		const formattedResults = filteredResults.map((q) => ({
			...q,
			customerName:
				q.customerFirstName && q.customerLastName
					? `${q.customerFirstName} ${q.customerLastName}`
					: null,
		}));

		return c.json({ quotes: formattedResults });
	})

	// Get single quote with all line items
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const quote = await getQuoteWithLineItems(id, tenantId);

		if (!quote) {
			return c.json({ error: 'Quote not found' }, 404);
		}

		return c.json({ quote });
	})

	// Create new quote
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

		// Validate service (required)
		const [service] = await db
			.select()
			.from(services)
			.where(and(eq(services.id, data.serviceId), eq(services.tenantId, tenantId)))
			.limit(1);

		if (!service) {
			return c.json({ error: 'Service not found' }, 400);
		}

		// Get pricing settings
		const pricingSettings = await getTenantPricingSettings(tenantId);

		// Generate quote number
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

				const supplierCost = parseFloat(material.supplierCost);
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

		// Create quote and line items in a transaction-like manner
		const quoteId = crypto.randomUUID();

		const [createdQuote] = await db
			.insert(quotes)
			.values({
				id: quoteId,
				tenantId,
				parentQuoteId: null,
				version: 1,
				serviceId: data.serviceId,
				customerId,
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
				notes: data.notes || null,
				internalNotes: data.internalNotes || null,
				flowerHoles: data.flowerHoles || null,
				proposedInscription: data.proposedInscription || null,
				validUntil: data.validUntil ? new Date(data.validUntil) : null,
			})
			.returning();

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

		// Return full quote with line items
		const fullQuote = await getQuoteWithLineItems(quoteId, tenantId);
		return c.json({ quote: fullQuote }, 201);
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

		// Validate service (required)
		const [service] = await db
			.select()
			.from(services)
			.where(and(eq(services.id, data.serviceId), eq(services.tenantId, tenantId)))
			.limit(1);

		if (!service) {
			return c.json({ error: 'Service not found' }, 400);
		}

		// Merge data: use provided or fall back to original
		const mergedData = {
			serviceId: data.serviceId,
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

				const supplierCost = parseFloat(material.supplierCost);
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
			serviceId: mergedData.serviceId,
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

	// Update quote status
	.put('/:id/status', zValidator('json', updateStatusSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const { status: newStatus } = c.req.valid('json');

		// Get current quote
		const [quote] = await db
			.select()
			.from(quotes)
			.where(and(eq(quotes.id, id), eq(quotes.tenantId, tenantId)))
			.limit(1);

		if (!quote) {
			return c.json({ error: 'Quote not found' }, 404);
		}

		// Validate status transition
		const allowedTransitions = STATUS_TRANSITIONS[quote.status] || [];
		if (!allowedTransitions.includes(newStatus)) {
			return c.json(
				{
					error: `Cannot transition from '${quote.status}' to '${newStatus}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
				},
				400
			);
		}

		// Update status
		const [updated] = await db
			.update(quotes)
			.set({ status: newStatus, updatedAt: new Date() })
			.where(eq(quotes.id, id))
			.returning();

		// Auto-create job when quote is accepted
		if (newStatus === 'accepted') {
			const jobNumber = await generateJobNumber(tenantId);
			const jobId = crypto.randomUUID();

			// Create the job
			await db.insert(jobs).values({
				id: jobId,
				tenantId,
				quoteId: id,
				jobNumber,
				status: 'pending',
			});

			// Get tenant's deposit percentage setting
			let depositPercent = 50; // Default 50%
			const [pricingSettings] = await db
				.select()
				.from(tenantPricingSettings)
				.where(eq(tenantPricingSettings.tenantId, tenantId))
				.limit(1);

			if (pricingSettings?.defaultDepositPercent) {
				depositPercent = parseFloat(pricingSettings.defaultDepositPercent);
			}

			// Calculate deposit and balance amounts
			const total = parseFloat(quote.total);
			const depositAmount = (total * depositPercent) / 100;
			const balanceAmount = total - depositAmount;

			// Create payment schedule items
			const now = new Date();

			// Deposit - due immediately
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

			// Balance - no due date (user sets later)
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
		}

		return c.json({ quote: updated });
	})

	// Delete quote (draft only)
	.delete('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		// Get quote
		const [quote] = await db
			.select()
			.from(quotes)
			.where(and(eq(quotes.id, id), eq(quotes.tenantId, tenantId)))
			.limit(1);

		if (!quote) {
			return c.json({ error: 'Quote not found' }, 404);
		}

		// Only allow deleting draft quotes
		if (quote.status !== 'draft') {
			return c.json({ error: 'Can only delete draft quotes' }, 400);
		}

		// Delete (cascades to line items via FK)
		await db.delete(quotes).where(eq(quotes.id, id));

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

	// Send quote email to customer
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
			const quoteId = c.req.param('id');
			const { recipientEmail, customMessage } = c.req.valid('json');

			// Get quote
			const [quote] = await db
				.select()
				.from(quotes)
				.where(and(eq(quotes.id, quoteId), eq(quotes.tenantId, tenantId)))
				.limit(1);

			if (!quote) {
				return c.json({ error: 'Quote not found' }, 404);
			}

			// Validate status - should be in a presentable state
			if (!['ready', 'presented'].includes(quote.status)) {
				return c.json({ error: 'Quote must be in Ready or Presented status to send email' }, 400);
			}

			// Determine recipient email
			let toEmail = recipientEmail;

			if (!toEmail && quote.customerId) {
				// Get customer's primary email from contactInfo
				const primaryEmail = await db
					.select({ value: contactInfo.value })
					.from(customerContactInfo)
					.innerJoin(contactInfo, eq(contactInfo.id, customerContactInfo.contactInfoId))
					.where(
						and(
							eq(customerContactInfo.customerId, quote.customerId),
							eq(contactInfo.type, 'email'),
							eq(contactInfo.isPrimary, true)
						)
					)
					.limit(1);

				toEmail = primaryEmail[0]?.value;
			}

			if (!toEmail) {
				return c.json({ error: 'No email address available for this customer' }, 400);
			}

			// Generate secure access token
			const accessToken = crypto.randomBytes(32).toString('hex');

			// Get tenant info for email
			const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

			// Get customer name
			let customerName = 'Valued Customer';
			if (quote.customerId) {
				const [customer] = await db
					.select()
					.from(customers)
					.where(eq(customers.id, quote.customerId))
					.limit(1);
				if (customer) {
					customerName = `${customer.firstName} ${customer.lastName}`;
				}
			}

			// Build quote URL
			const baseUrl = process.env.APP_URL || 'http://localhost:5173';
			const quoteUrl = `${baseUrl}/quote/${accessToken}`;

			// Format validity date
			const validUntilFormatted = quote.validUntil
				? new Date(quote.validUntil).toLocaleDateString('en-GB', {
						day: 'numeric',
						month: 'long',
						year: 'numeric',
					})
				: null;

			// Format total
			const formattedTotal = new Intl.NumberFormat('en-GB', {
				style: 'currency',
				currency: 'GBP',
			}).format(parseFloat(quote.total));

			const tenantName = tenant?.name || 'Our Company';

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
    <h1 style="color: #1a1a1a; margin: 0 0 10px 0; font-size: 24px;">${tenantName}</h1>
    <p style="color: #666; margin: 0;">Quote Reference: <strong>${quote.quoteNumber}</strong></p>
  </div>

  <p>Dear ${customerName},</p>

  ${customMessage ? `<p>${customMessage}</p>` : ''}

  <p>We are pleased to provide you with a quote for your consideration.</p>

  <div style="background-color: #f0f7ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0;"><strong>Quote Total: ${formattedTotal}</strong></p>
    ${validUntilFormatted ? `<p style="margin: 0; color: #666;">Valid until: ${validUntilFormatted}</p>` : ''}
  </div>

  <p>To view the full details of your quote and respond, please click the button below:</p>

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
Quote Reference: ${quote.quoteNumber}

Dear ${customerName},

${customMessage ? `${customMessage}\n\n` : ''}We are pleased to provide you with a quote for your consideration.

Quote Total: ${formattedTotal}
${validUntilFormatted ? `Valid until: ${validUntilFormatted}` : ''}

To view the full details of your quote and respond, please visit:
${quoteUrl}

If you have any questions, please don't hesitate to contact us.

Kind regards,
${tenantName}
      `.trim();

			// Send email
			try {
				await sendEmail({
					to: toEmail,
					subject: `Your Quote ${quote.quoteNumber} from ${tenantName}`,
					text: emailText,
					html: emailHtml,
				});

				// Update quote with token and email sent timestamp
				const now = new Date();
				await db
					.update(quotes)
					.set({
						accessToken,
						accessTokenCreatedAt: now,
						emailSentAt: now,
						emailSentCount: (quote.emailSentCount || 0) + 1,
						status: quote.status === 'ready' ? 'presented' : quote.status, // Auto-advance to presented if ready
						updatedAt: now,
					})
					.where(eq(quotes.id, quoteId));

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
		'/:quoteId/line-items',
		zValidator('json', lineItemInputSchema),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const quoteId = c.req.param('quoteId');
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
				return c.json({ error: 'Can only add line items to draft quotes' }, 400);
			}

			// Get max sort order
			const [maxSort] = await db
				.select({ maxOrder: sql<number>`COALESCE(MAX(${quoteLineItems.sortOrder}), -1)` })
				.from(quoteLineItems)
				.where(eq(quoteLineItems.quoteId, quoteId));

			const sortOrder = (maxSort?.maxOrder ?? -1) + 1;

			// Create line item
			const [lineItem] = await db
				.insert(quoteLineItems)
				.values({
					id: crypto.randomUUID(),
					quoteId,
					description: data.description,
					price: String(data.price),
					vatExempt: data.vatExempt ?? false,
					visibleToCustomer: data.visibleToCustomer ?? true,
					sortOrder,
				})
				.returning();

			// Recalculate quote totals
			await recalculateQuoteTotals(quoteId);

			// Return updated quote
			const fullQuote = await getQuoteWithLineItems(quoteId, tenantId);
			return c.json({ quote: fullQuote, lineItem }, 201);
		}
	)

	// Update custom line item
	.put(
		'/:quoteId/line-items/:itemId',
		zValidator('json', updateLineItemSchema),
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
				return c.json({ error: 'Can only edit line items on draft quotes' }, 400);
			}

			// Get line item
			const [lineItem] = await db
				.select()
				.from(quoteLineItems)
				.where(and(eq(quoteLineItems.id, itemId), eq(quoteLineItems.quoteId, quoteId)))
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

			await db
				.update(quoteLineItems)
				.set(updateData)
				.where(eq(quoteLineItems.id, itemId));

			// Recalculate quote totals
			await recalculateQuoteTotals(quoteId);

			// Return updated quote
			const fullQuote = await getQuoteWithLineItems(quoteId, tenantId);
			return c.json({ quote: fullQuote });
		}
	)

	// Delete custom line item
	.delete('/:quoteId/line-items/:itemId', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const quoteId = c.req.param('quoteId');
		const itemId = c.req.param('itemId');

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
			return c.json({ error: 'Can only delete line items from draft quotes' }, 400);
		}

		// Get line item
		const [lineItem] = await db
			.select()
			.from(quoteLineItems)
			.where(and(eq(quoteLineItems.id, itemId), eq(quoteLineItems.quoteId, quoteId)))
			.limit(1);

		if (!lineItem) {
			return c.json({ error: 'Line item not found' }, 404);
		}

		// Delete line item
		await db.delete(quoteLineItems).where(eq(quoteLineItems.id, itemId));

		// Recalculate quote totals
		await recalculateQuoteTotals(quoteId);

		// Return updated quote
		const fullQuote = await getQuoteWithLineItems(quoteId, tenantId);
		return c.json({ quote: fullQuote });
	});

export { quotesRoutes };
