import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import { tenants, addresses } from '@griffiths-crm/shared/db/schema';
import { getSignedImageUrl } from '../lib/s3';

// Validation schema for updating tenant settings
const updateSettingsSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	logoUrl: z.string().nullable().optional(),
	address: z
		.object({
			streetNumber: z.string().optional(),
			route: z.string().optional(),
			locality: z.string().optional(),
			administrativeAreaLevel1: z.string().optional(),
			administrativeAreaLevel2: z.string().optional(),
			postalCode: z.string().optional(),
			postalCodeSuffix: z.string().optional(),
			country: z.string().default('US'),
			formattedAddress: z.string().min(1, 'Formatted address is required'),
			placeId: z.string().optional(),
			latitude: z.string().optional(),
			longitude: z.string().optional(),
			label: z.string().optional(),
		})
		.optional()
		.nullable(),
});

// Create tenant settings routes
const tenantSettingsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// Get current tenant with address
	.get('/', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;

		// Get tenant
		const [tenant] = await db
			.select()
			.from(tenants)
			.where(eq(tenants.id, tenantId))
			.limit(1);

		if (!tenant) {
			return c.json({ error: 'Tenant not found' }, 404);
		}

		// Get address if exists
		let address = null;
		if (tenant.addressId) {
			const [addr] = await db
				.select()
				.from(addresses)
				.where(eq(addresses.id, tenant.addressId))
				.limit(1);
			address = addr || null;
		}

		const logoSignedUrl = await getSignedImageUrl(tenant.logoUrl);

		return c.json({
			tenant: {
				id: tenant.id,
				name: tenant.name,
				slug: tenant.slug,
				logoUrl: tenant.logoUrl,
				logoSignedUrl,
				address,
				createdAt: tenant.createdAt,
				updatedAt: tenant.updatedAt,
			},
		});
	})

	// Update tenant settings (name and/or address)
	.put('/', zValidator('json', updateSettingsSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { name, logoUrl, address } = c.req.valid('json');

		// Get current tenant
		const [tenant] = await db
			.select()
			.from(tenants)
			.where(eq(tenants.id, tenantId))
			.limit(1);

		if (!tenant) {
			return c.json({ error: 'Tenant not found' }, 404);
		}

		let addressId = tenant.addressId;

		// Handle address update
		if (address !== undefined) {
			if (address === null) {
				// Remove address
				if (tenant.addressId) {
					await db.delete(addresses).where(eq(addresses.id, tenant.addressId));
				}
				addressId = null;
			} else {
				// Create or update address
				if (tenant.addressId) {
					// Update existing address
					await db
						.update(addresses)
						.set({
							...address,
							updatedAt: new Date(),
						})
						.where(eq(addresses.id, tenant.addressId));
				} else {
					// Create new address
					const newAddressId = crypto.randomUUID();
					await db.insert(addresses).values({
						id: newAddressId,
						...address,
						isPrimary: true,
					});
					addressId = newAddressId;
				}
			}
		}

		// Update tenant
		const updateData: { name?: string; logoUrl?: string | null; addressId?: string | null; updatedAt: Date } = {
			updatedAt: new Date(),
		};

		if (name !== undefined) {
			updateData.name = name;
		}

		if (logoUrl !== undefined) {
			updateData.logoUrl = logoUrl;
		}

		if (addressId !== tenant.addressId) {
			updateData.addressId = addressId;
		}

		const [updated] = await db
			.update(tenants)
			.set(updateData)
			.where(eq(tenants.id, tenantId))
			.returning();

		// Fetch the address for response
		let updatedAddress = null;
		if (updated.addressId) {
			const [addr] = await db
				.select()
				.from(addresses)
				.where(eq(addresses.id, updated.addressId))
				.limit(1);
			updatedAddress = addr || null;
		}

		const updatedLogoSignedUrl = await getSignedImageUrl(updated.logoUrl);

		return c.json({
			tenant: {
				id: updated.id,
				name: updated.name,
				slug: updated.slug,
				logoUrl: updated.logoUrl,
				logoSignedUrl: updatedLogoSignedUrl,
				address: updatedAddress,
				createdAt: updated.createdAt,
				updatedAt: updated.updatedAt,
			},
		});
	});

export { tenantSettingsRoutes };
