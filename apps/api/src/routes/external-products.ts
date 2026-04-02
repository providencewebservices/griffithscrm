import {
	dimensionCombos,
	dimensionComboValues,
	finishes,
	materialSections,
	materials,
	optionChoices,
	productCategories,
	productComponents,
	productOptions,
	products,
	sundries,
	tenants,
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { db } from '../lib/auth';
import { resolvePublicMediaUrl } from '../lib/s3';

const externalProductsRoutes = new Hono();

// Open CORS for external consumption (any origin)
externalProductsRoutes.use('*', cors({ origin: '*' }));

// Cache-control on all responses
externalProductsRoutes.use('*', async (c, next) => {
	await next();
	c.header('Cache-Control', 'public, max-age=300');
});

// Tenant slug resolution middleware
externalProductsRoutes.use('/:slug/*', async (c, next) => {
	const slug = c.req.param('slug');

	const [tenant] = await db
		.select({ id: tenants.id })
		.from(tenants)
		.where(eq(tenants.slug, slug))
		.limit(1);

	if (!tenant) {
		return c.json({ error: 'Not found' }, 404);
	}

	c.set('externalTenantId', tenant.id);
	await next();
});

// GET /:slug/categories — list product categories for tenant
externalProductsRoutes.get('/:slug/categories', async (c) => {
	const tenantId = c.get('externalTenantId');

	const categories = await db
		.select({
			id: productCategories.id,
			name: productCategories.name,
			description: productCategories.description,
			imageUrl: productCategories.imageUrl,
			sortOrder: productCategories.sortOrder,
		})
		.from(productCategories)
		.where(eq(productCategories.tenantId, tenantId))
		.orderBy(asc(productCategories.sortOrder));

	return c.json({
		categories: categories.map((category) => ({
			...category,
			imageUrl: resolvePublicMediaUrl(category.imageUrl),
		})),
	});
});

// GET /:slug/products — list products with pagination
const productsQuerySchema = z.object({
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	categoryId: z.string().optional(),
});

const sundriesQuerySchema = z.object({
	page: z.coerce.number().min(1).optional().default(1),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
});

externalProductsRoutes.get(
	'/:slug/products',
	zValidator('query', productsQuerySchema),
	async (c) => {
		const tenantId = c.get('externalTenantId');
		const { page, limit, categoryId } = c.req.valid('query');

		const conditions = [
			eq(products.tenantId, tenantId),
			eq(products.isActive, true),
			isNull(products.archivedAt),
			...(categoryId ? [eq(products.categoryId, categoryId)] : []),
		];

		const offset = (page - 1) * limit;

		const [productList, [totalResult]] = await Promise.all([
			db
				.select({
					id: products.id,
					sku: products.sku,
					name: products.name,
					description: products.description,
					imageUrl: products.imageUrl,
					requiresCustomerPhotoUpload: products.requiresCustomerPhotoUpload,
					customerPhotoUploadInstructions: products.customerPhotoUploadInstructions,
					categoryId: products.categoryId,
					categoryName: productCategories.name,
				})
				.from(products)
				.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
				.where(and(...conditions))
				.orderBy(desc(products.createdAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: count() })
				.from(products)
				.where(and(...conditions)),
		]);

		const total = Number(totalResult.count);

		const mappedProducts = productList.map((p) => ({
			id: p.id,
			sku: p.sku,
			name: p.name,
			description: p.description,
			imageUrl: resolvePublicMediaUrl(p.imageUrl),
			requiresCustomerPhotoUpload: p.requiresCustomerPhotoUpload,
			customerPhotoUploadInstructions: p.customerPhotoUploadInstructions,
			category: p.categoryId ? { id: p.categoryId, name: p.categoryName } : null,
		}));

		return c.json({
			products: mappedProducts,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	},
);

// GET /:slug/products/:productId — product detail with options and choices
externalProductsRoutes.get('/:slug/products/:productId', async (c) => {
	const tenantId = c.get('externalTenantId');
	const productId = c.req.param('productId');

	const [product] = await db
		.select({
			id: products.id,
			sku: products.sku,
			name: products.name,
			description: products.description,
			imageUrl: products.imageUrl,
			requiresCustomerPhotoUpload: products.requiresCustomerPhotoUpload,
			customerPhotoUploadInstructions: products.customerPhotoUploadInstructions,
			categoryId: products.categoryId,
			categoryName: productCategories.name,
			isActive: products.isActive,
			archivedAt: products.archivedAt,
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
		.limit(1);

	if (!product || !product.isActive || product.archivedAt) {
		return c.json({ error: 'Not found' }, 404);
	}

	// Fetch options with choices (matching getProductWithRelations pattern)
	const options = await db
		.select({
			id: productOptions.id,
			name: productOptions.name,
			type: productOptions.type,
			isRequired: productOptions.isRequired,
			sortOrder: productOptions.sortOrder,
		})
		.from(productOptions)
		.where(eq(productOptions.productId, productId))
		.orderBy(asc(productOptions.sortOrder), asc(productOptions.name));

	const optionsWithChoices = await Promise.all(
		options.map(async (option) => {
			const choices = await db
				.select({
					id: optionChoices.id,
					name: optionChoices.name,
					priceAdjustment: optionChoices.priceAdjustment,
					imageUrl: optionChoices.imageUrl,
					sortOrder: optionChoices.sortOrder,
				})
				.from(optionChoices)
				.where(eq(optionChoices.optionId, option.id))
				.orderBy(asc(optionChoices.sortOrder), asc(optionChoices.name));

			return {
				...option,
				choices: choices.map((choice) => ({
					...choice,
					imageUrl: resolvePublicMediaUrl(choice.imageUrl),
				})),
			};
		}),
	);

	// Fetch product components
	const components = await db
		.select({
			id: productComponents.id,
			componentType: productComponents.componentType,
			name: productComponents.name,
			quantity: productComponents.quantity,
			sortOrder: productComponents.sortOrder,
		})
		.from(productComponents)
		.where(eq(productComponents.productId, productId))
		.orderBy(asc(productComponents.sortOrder));

	// Fetch active dimension combos with values
	const activeCombos = await db
		.select({
			id: dimensionCombos.id,
			name: dimensionCombos.name,
			priceAdjustment: dimensionCombos.priceAdjustment,
			sortOrder: dimensionCombos.sortOrder,
		})
		.from(dimensionCombos)
		.where(and(eq(dimensionCombos.productId, productId), eq(dimensionCombos.isActive, true)))
		.orderBy(asc(dimensionCombos.sortOrder));

	const dimensionCombosWithValues = await Promise.all(
		activeCombos.map(async (combo) => {
			const values = await db
				.select({
					componentId: dimensionComboValues.productComponentId,
					componentType: productComponents.componentType,
					componentName: productComponents.name,
					dimension1: dimensionComboValues.dimension1,
					dimension2: dimensionComboValues.dimension2,
					dimension3: dimensionComboValues.dimension3,
				})
				.from(dimensionComboValues)
				.innerJoin(
					productComponents,
					eq(productComponents.id, dimensionComboValues.productComponentId),
				)
				.where(eq(dimensionComboValues.comboId, combo.id))
				.orderBy(asc(productComponents.sortOrder));

			return { ...combo, values };
		}),
	);

	return c.json({
		product: {
			id: product.id,
			sku: product.sku,
			name: product.name,
			description: product.description,
			imageUrl: resolvePublicMediaUrl(product.imageUrl),
			requiresCustomerPhotoUpload: product.requiresCustomerPhotoUpload,
			customerPhotoUploadInstructions: product.customerPhotoUploadInstructions,
			category: product.categoryId ? { id: product.categoryId, name: product.categoryName } : null,
			options: optionsWithChoices,
			components,
			dimensionCombos: dimensionCombosWithValues,
		},
	});
});

// GET /:slug/sundries — list active sundries with pagination
externalProductsRoutes.get(
	'/:slug/sundries',
	zValidator('query', sundriesQuerySchema),
	async (c) => {
		const tenantId = c.get('externalTenantId');
		const { page, limit } = c.req.valid('query');

		const conditions = [eq(sundries.tenantId, tenantId), eq(sundries.isActive, true)];
		const offset = (page - 1) * limit;

		const [sundryList, [totalResult]] = await Promise.all([
			db
				.select({
					id: sundries.id,
					name: sundries.name,
					description: sundries.description,
					price: sundries.price,
					imageUrl: sundries.imageUrl,
				})
				.from(sundries)
				.where(and(...conditions))
				.orderBy(asc(sundries.sortOrder), asc(sundries.name))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: count() })
				.from(sundries)
				.where(and(...conditions)),
		]);

		const total = Number(totalResult.count);

		return c.json({
			sundries: sundryList.map((sundry) => ({
				...sundry,
				imageUrl: resolvePublicMediaUrl(sundry.imageUrl),
			})),
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	},
);

// GET /:slug/sundries/:sundryId — sundry detail
externalProductsRoutes.get('/:slug/sundries/:sundryId', async (c) => {
	const tenantId = c.get('externalTenantId');
	const sundryId = c.req.param('sundryId');

	const [sundry] = await db
		.select({
			id: sundries.id,
			name: sundries.name,
			description: sundries.description,
			price: sundries.price,
			imageUrl: sundries.imageUrl,
			isActive: sundries.isActive,
		})
		.from(sundries)
		.where(and(eq(sundries.id, sundryId), eq(sundries.tenantId, tenantId)))
		.limit(1);

	if (!sundry || !sundry.isActive) {
		return c.json({ error: 'Not found' }, 404);
	}

	return c.json({
		sundry: {
			id: sundry.id,
			name: sundry.name,
			description: sundry.description,
			price: sundry.price,
			imageUrl: resolvePublicMediaUrl(sundry.imageUrl),
		},
	});
});

// GET /:slug/materials — material sections with active materials
externalProductsRoutes.get('/:slug/materials', async (c) => {
	const tenantId = c.get('externalTenantId');

	const allSections = await db
		.select({
			id: materialSections.id,
			name: materialSections.name,
			sortOrder: materialSections.sortOrder,
		})
		.from(materialSections)
		.where(eq(materialSections.tenantId, tenantId))
		.orderBy(asc(materialSections.sortOrder));

	const sectionsWithMaterials = await Promise.all(
		allSections.map(async (section) => {
			const sectionMaterials = await db
				.select({
					id: materials.id,
					name: materials.name,
					imageUrl: materials.imageUrl,
					sortOrder: materials.sortOrder,
				})
				.from(materials)
				.where(and(eq(materials.sectionId, section.id), eq(materials.isActive, true)))
				.orderBy(asc(materials.sortOrder));

			return {
				...section,
				materials: sectionMaterials.map((material) => ({
					...material,
					imageUrl: resolvePublicMediaUrl(material.imageUrl),
				})),
			};
		}),
	);

	// Exclude sections with no active materials
	const sections = sectionsWithMaterials.filter((s) => s.materials.length > 0);

	return c.json({ sections });
});

// GET /:slug/finishes — list active finishes for tenant
externalProductsRoutes.get('/:slug/finishes', async (c) => {
	const tenantId = c.get('externalTenantId');

	const finishList = await db
		.select({
			id: finishes.id,
			name: finishes.name,
			sortOrder: finishes.sortOrder,
		})
		.from(finishes)
		.where(and(eq(finishes.tenantId, tenantId), eq(finishes.isActive, true)))
		.orderBy(asc(finishes.sortOrder));

	return c.json({ finishes: finishList });
});

export { externalProductsRoutes };
