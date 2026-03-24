import {
	brochureProducts,
	brochures,
	productCategories,
	products,
	tenants,
} from '@griffiths-crm/shared/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../lib/auth';
import { getSignedImageUrl } from '../lib/s3';

const publicBrochuresRoutes = new Hono()
	// Get brochure data for public view
	.get('/:token', async (c) => {
		const token = c.req.param('token');

		// Find brochure by access token
		const [brochure] = await db
			.select()
			.from(brochures)
			.where(eq(brochures.accessToken, token))
			.limit(1);

		if (!brochure) {
			return c.json({ error: 'Brochure not found or link is invalid' }, 404);
		}

		// Check expiry
		if (brochure.expiresAt && new Date(brochure.expiresAt) < new Date()) {
			return c.json({ error: 'This brochure has expired' }, 410);
		}

		// Check archived
		if (brochure.archivedAt) {
			return c.json({ error: 'This brochure is no longer available' }, 410);
		}

		// Get products with category info (LEFT JOIN to handle archived/deleted products)
		const items = await db
			.select({
				id: brochureProducts.id,
				productId: brochureProducts.productId,
				sortOrder: brochureProducts.sortOrder,
				isInterested: brochureProducts.isInterested,
				interestedAt: brochureProducts.interestedAt,
				productName: products.name,
				productDescription: products.description,
				productImageUrl: products.imageUrl,
				categoryName: productCategories.name,
			})
			.from(brochureProducts)
			.leftJoin(products, eq(brochureProducts.productId, products.id))
			.leftJoin(productCategories, eq(products.categoryId, productCategories.id))
			.where(eq(brochureProducts.brochureId, brochure.id))
			.orderBy(asc(brochureProducts.sortOrder));

		// Filter out products where the product has been deleted (LEFT JOIN returned null)
		const validItems = items.filter((item) => item.productName !== null);

		// Generate signed image URLs for products (public page can't call authenticated sign-url endpoints)
		const productsWithSignedUrls = await Promise.all(
			validItems.map(async (item) => {
				const signedImageUrl = await getSignedImageUrl(item.productImageUrl);
				return { ...item, productImageUrl: signedImageUrl };
			}),
		);

		// Get tenant branding
		const [tenant] = await db
			.select({ id: tenants.id, name: tenants.name, logoUrl: tenants.logoUrl })
			.from(tenants)
			.where(eq(tenants.id, brochure.tenantId))
			.limit(1);

		return c.json({
			brochure: {
				id: brochure.id,
				message: brochure.message,
				readyToDiscussAt: brochure.readyToDiscussAt,
				createdAt: brochure.createdAt,
				expiresAt: brochure.expiresAt,
			},
			products: productsWithSignedUrls,
			tenant: tenant ? { id: tenant.id, name: tenant.name, hasLogo: !!tenant.logoUrl } : null,
		});
	})

	// Toggle interest on a product
	.post('/:token/interest/:productId', async (c) => {
		const token = c.req.param('token');
		const productId = c.req.param('productId');

		// Find brochure by access token
		const [brochure] = await db
			.select()
			.from(brochures)
			.where(eq(brochures.accessToken, token))
			.limit(1);

		if (!brochure) {
			return c.json({ error: 'Brochure not found or link is invalid' }, 404);
		}

		// Check expiry
		if (brochure.expiresAt && new Date(brochure.expiresAt) < new Date()) {
			return c.json({ error: 'This brochure has expired' }, 410);
		}

		// Check archived
		if (brochure.archivedAt) {
			return c.json({ error: 'This brochure is no longer available' }, 410);
		}

		// Find the brochure_products row
		const [bp] = await db
			.select()
			.from(brochureProducts)
			.where(
				and(
					eq(brochureProducts.brochureId, brochure.id),
					eq(brochureProducts.productId, productId),
				),
			)
			.limit(1);

		if (!bp) {
			return c.json({ error: 'Product not found in this brochure' }, 404);
		}

		// Toggle interest
		const newInterested = !bp.isInterested;
		const now = new Date();

		await db
			.update(brochureProducts)
			.set({
				isInterested: newInterested,
				interestedAt: newInterested ? now : null,
			})
			.where(eq(brochureProducts.id, bp.id));

		return c.json({
			productId,
			isInterested: newInterested,
			interestedAt: newInterested ? now.toISOString() : null,
		});
	})

	// Mark "ready to discuss"
	.post('/:token/ready', async (c) => {
		const token = c.req.param('token');

		// Find brochure by access token
		const [brochure] = await db
			.select()
			.from(brochures)
			.where(eq(brochures.accessToken, token))
			.limit(1);

		if (!brochure) {
			return c.json({ error: 'Brochure not found or link is invalid' }, 404);
		}

		// Check expiry
		if (brochure.expiresAt && new Date(brochure.expiresAt) < new Date()) {
			return c.json({ error: 'This brochure has expired' }, 410);
		}

		// Check archived
		if (brochure.archivedAt) {
			return c.json({ error: 'This brochure is no longer available' }, 410);
		}

		// Idempotent: if already set, return existing timestamp
		if (brochure.readyToDiscussAt) {
			return c.json({
				readyToDiscussAt: brochure.readyToDiscussAt,
			});
		}

		// Set readyToDiscussAt
		const now = new Date();
		await db
			.update(brochures)
			.set({ readyToDiscussAt: now, updatedAt: now })
			.where(eq(brochures.id, brochure.id));

		return c.json({
			readyToDiscussAt: now.toISOString(),
		});
	});

export { publicBrochuresRoutes };
