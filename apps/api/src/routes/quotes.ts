import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, asc, sql, notExists, like } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	quotes,
	quoteComponents,
	quoteLettering,
	quoteSundries,
	quoteServices,
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
	QUOTE_STATUSES,
	COMPONENT_TYPES,
	LETTERING_COST_APPLIES_TO,
	FLOWER_HOLE_CHOICES,
} from '@griffiths-crm/shared/db/schema';

// Status transition rules
const STATUS_TRANSITIONS: Record<string, string[]> = {
	draft: ['sent'],
	sent: ['accepted', 'rejected', 'expired'],
	accepted: [],
	rejected: [],
	expired: [],
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
				priceMultiplier: '1',
				priceFixedAmount: '0',
				vatRate: '0',
			})
			.returning();
	}

	return {
		priceMultiplier: parseFloat(settings.priceMultiplier),
		priceFixedAmount: parseFloat(settings.priceFixedAmount),
		vatRate: parseFloat(settings.vatRate),
	};
}

function calculateRetailPrice(
	supplierCost: number,
	multiplier: number,
	fixedAmount: number
): number {
	return supplierCost * multiplier + fixedAmount;
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
	const [components, lettering, sundryItems, serviceItems] = await Promise.all([
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
			.from(quoteServices)
			.where(eq(quoteServices.quoteId, quoteId))
			.orderBy(asc(quoteServices.sortOrder)),
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
		services: serviceItems,
		versions,
	};
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

const serviceInputSchema = z.object({
	serviceId: z.string().min(1),
	quantity: z.number().int().min(1).default(1),
	unitPrice: z.number().optional(), // Allow override for 'quoted' pricing type
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
	customerId: z.string().optional(),
	productId: z.string().optional(),
	dimensionComboId: z.string().optional(),
	flowerHoles: z.enum(FLOWER_HOLE_CHOICES).optional(),
	notes: z.string().optional(),
	validUntil: z.string().datetime().optional(),
	components: z.array(componentInputSchema).optional().default([]),
	lettering: z.array(letteringInputSchema).optional().default([]),
	sundries: z.array(sundryInputSchema).optional().default([]),
	services: z.array(serviceInputSchema).optional().default([]),
	// For inline customer creation
	customerDetails: customerDetailsSchema.optional(),
});

const updateStatusSchema = z.object({
	status: z.enum(QUOTE_STATUSES),
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
				const unitPrice = calculateRetailPrice(
					supplierCost,
					pricingSettings.priceMultiplier,
					pricingSettings.priceFixedAmount
				);
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

				// Get cost rule for this technique and appliesTo
				const [costRule] = await db
					.select()
					.from(letteringCosts)
					.where(
						and(
							eq(letteringCosts.techniqueId, lett.techniqueId),
							eq(letteringCosts.appliesTo, lett.appliesTo)
						)
					)
					.limit(1);

				// Also check for 'both' if specific rule not found
				let activeCostRule = costRule;
				if (!activeCostRule) {
					[activeCostRule] = await db
						.select()
						.from(letteringCosts)
						.where(
							and(eq(letteringCosts.techniqueId, lett.techniqueId), eq(letteringCosts.appliesTo, 'both'))
						)
						.limit(1);
				}

				let color = null;
				if (lett.colorId) {
					[color] = await db
						.select()
						.from(letteringColors)
						.where(and(eq(letteringColors.id, lett.colorId), eq(letteringColors.tenantId, tenantId)))
						.limit(1);
				}

				const letterCount = lett.text.replace(/\s/g, '').length; // Count non-space characters
				const freeLetters = activeCostRule?.freeLetters || 0;
				const pricePerLetter = parseFloat(activeCostRule?.pricePerLetter || '0');
				const billableLetters = Math.max(0, letterCount - freeLetters);
				const unitPrice = pricePerLetter;
				const lineTotal = billableLetters * pricePerLetter;

				return {
					id: crypto.randomUUID(),
					techniqueId: lett.techniqueId,
					colorId: lett.colorId || null,
					text: lett.text,
					letterCount,
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

				const unitPrice = parseFloat(sundry.price);
				const lineTotal = unitPrice * sund.quantity;

				return {
					id: crypto.randomUUID(),
					sundryId: sund.sundryId,
					quantity: sund.quantity,
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					sundryName: sundry.name,
					notes: sund.notes || null,
					sortOrder: index,
				};
			})
		);

		// Process services
		const processedServices = await Promise.all(
			data.services.map(async (serv, index) => {
				const [service] = await db
					.select()
					.from(services)
					.where(and(eq(services.id, serv.serviceId), eq(services.tenantId, tenantId)))
					.limit(1);

				if (!service) {
					throw new Error(`Service not found: ${serv.serviceId}`);
				}

				// Use provided price (for quoted services) or service's base price
				const unitPrice = serv.unitPrice ?? parseFloat(service.basePrice || '0');
				const lineTotal = unitPrice * serv.quantity;

				return {
					id: crypto.randomUUID(),
					serviceId: serv.serviceId,
					quantity: serv.quantity,
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					serviceName: service.name,
					notes: serv.notes || null,
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
		const serviceTotal = processedServices.reduce((sum, s) => sum + parseFloat(s.lineTotal), 0);
		const subtotal = componentTotal + letteringTotal + sundryTotal + serviceTotal;
		const vatAmount = subtotal * pricingSettings.vatRate;
		const total = subtotal + vatAmount;

		// Create quote and line items in a transaction-like manner
		const quoteId = crypto.randomUUID();

		const [createdQuote] = await db
			.insert(quotes)
			.values({
				id: quoteId,
				tenantId,
				parentQuoteId: null,
				version: 1,
				customerId,
				productId: data.productId || null,
				dimensionComboId: data.dimensionComboId || null,
				quoteNumber,
				status: 'draft',
				subtotal: String(subtotal),
				vatAmount: String(vatAmount),
				total: String(total),
				vatRate: String(pricingSettings.vatRate),
				notes: data.notes || null,
				flowerHoles: data.flowerHoles || null,
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

		if (processedServices.length > 0) {
			await db.insert(quoteServices).values(
				processedServices.map((s) => ({
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
			services:
				data.services.length > 0
					? data.services
					: original.services.map((s) => ({
							serviceId: s.serviceId!,
							quantity: s.quantity,
							unitPrice: parseFloat(s.unitPrice),
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
				const unitPrice = calculateRetailPrice(
					supplierCost,
					pricingSettings.priceMultiplier,
					pricingSettings.priceFixedAmount
				);
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

				const [costRule] = await db
					.select()
					.from(letteringCosts)
					.where(
						and(
							eq(letteringCosts.techniqueId, lett.techniqueId),
							eq(letteringCosts.appliesTo, lett.appliesTo)
						)
					)
					.limit(1);

				let activeCostRule = costRule;
				if (!activeCostRule) {
					[activeCostRule] = await db
						.select()
						.from(letteringCosts)
						.where(
							and(eq(letteringCosts.techniqueId, lett.techniqueId), eq(letteringCosts.appliesTo, 'both'))
						)
						.limit(1);
				}

				let color = null;
				if (lett.colorId) {
					[color] = await db
						.select()
						.from(letteringColors)
						.where(and(eq(letteringColors.id, lett.colorId), eq(letteringColors.tenantId, tenantId)))
						.limit(1);
				}

				const letterCount = lett.text.replace(/\s/g, '').length;
				const freeLetters = activeCostRule?.freeLetters || 0;
				const pricePerLetter = parseFloat(activeCostRule?.pricePerLetter || '0');
				const billableLetters = Math.max(0, letterCount - freeLetters);
				const unitPrice = pricePerLetter;
				const lineTotal = billableLetters * pricePerLetter;

				return {
					id: crypto.randomUUID(),
					techniqueId: lett.techniqueId,
					colorId: lett.colorId || null,
					text: lett.text,
					letterCount,
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

				const unitPrice = parseFloat(sundry.price);
				const lineTotal = unitPrice * sund.quantity;

				return {
					id: crypto.randomUUID(),
					sundryId: sund.sundryId,
					quantity: sund.quantity,
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					sundryName: sundry.name,
					notes: sund.notes || null,
					sortOrder: index,
				};
			})
		);

		const processedServices = await Promise.all(
			mergedData.services.map(async (serv, index) => {
				const [service] = await db
					.select()
					.from(services)
					.where(and(eq(services.id, serv.serviceId), eq(services.tenantId, tenantId)))
					.limit(1);

				if (!service) {
					throw new Error(`Service not found: ${serv.serviceId}`);
				}

				const unitPrice = serv.unitPrice ?? parseFloat(service.basePrice || '0');
				const lineTotal = unitPrice * serv.quantity;

				return {
					id: crypto.randomUUID(),
					serviceId: serv.serviceId,
					quantity: serv.quantity,
					unitPrice: String(unitPrice),
					lineTotal: String(lineTotal),
					serviceName: service.name,
					notes: serv.notes || null,
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
		const serviceTotal = processedServices.reduce((sum, s) => sum + parseFloat(s.lineTotal), 0);
		const subtotal = componentTotal + letteringTotal + sundryTotal + serviceTotal;
		const vatAmount = subtotal * pricingSettings.vatRate;
		const total = subtotal + vatAmount;

		// Create new quote version
		const quoteId = crypto.randomUUID();

		await db.insert(quotes).values({
			id: quoteId,
			tenantId,
			parentQuoteId: originalId,
			version,
			customerId: mergedData.customerId || null,
			productId: mergedData.productId || null,
			dimensionComboId: data.dimensionComboId ?? original.dimensionComboId ?? null,
			quoteNumber,
			status: 'draft',
			subtotal: String(subtotal),
			vatAmount: String(vatAmount),
			total: String(total),
			vatRate: String(pricingSettings.vatRate),
			notes: mergedData.notes || null,
			flowerHoles: data.flowerHoles ?? original.flowerHoles ?? null,
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

		if (processedServices.length > 0) {
			await db.insert(quoteServices).values(
				processedServices.map((s) => ({
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
	});

export { quotesRoutes };
