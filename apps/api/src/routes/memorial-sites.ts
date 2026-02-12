import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, like, isNull, isNotNull } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	memorialSites,
	contactInfo,
	addresses,
	memorialSiteContactInfo,
	memorialSiteAddresses,
	MEMORIAL_SITE_TYPES,
	MEMORIAL_SITE_PAYMENT_METHODS,
} from '@griffiths-crm/shared/db/schema';

// Validation schemas
const contactInfoSchema = z.object({
	type: z.enum(['email', 'phone', 'mobile', 'fax', 'other']),
	value: z.string().min(1, 'Value is required'),
	label: z.string().optional(),
	isPrimary: z.boolean().default(false),
});

const addressSchema = z.object({
	streetNumber: z.string().optional(),
	route: z.string().optional(),
	locality: z.string().optional(),
	administrativeAreaLevel1: z.string().optional(),
	administrativeAreaLevel2: z.string().optional(),
	postalCode: z.string().optional(),
	postalCodeSuffix: z.string().optional(),
	country: z.string().default('GB'),
	formattedAddress: z.string().min(1, 'Formatted address is required'),
	placeId: z.string().optional(),
	latitude: z.string().optional(),
	longitude: z.string().optional(),
	label: z.string().optional(),
	isPrimary: z.boolean().default(false),
});

const createMemorialSiteSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	siteType: z.enum(MEMORIAL_SITE_TYPES),
	preferredPaymentMethod: z.enum(MEMORIAL_SITE_PAYMENT_METHODS).nullable().optional(),
	paymentDetails: z.string().nullable().optional(),
	notes: z.string().optional(),
	contactInfo: z.array(contactInfoSchema).optional().default([]),
	addresses: z.array(addressSchema).optional().default([]),
});

const updateMemorialSiteSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	siteType: z.enum(MEMORIAL_SITE_TYPES).optional(),
	preferredPaymentMethod: z.enum(MEMORIAL_SITE_PAYMENT_METHODS).nullable().optional(),
	paymentDetails: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	contactInfo: z.array(contactInfoSchema).optional(),
	addresses: z.array(addressSchema).optional(),
});

const searchQuerySchema = z.object({
	q: z.string().optional(),
	siteType: z.enum(MEMORIAL_SITE_TYPES).optional(),
	archivedOnly: z.enum(['true', 'false']).optional().default('false'),
});

// Helper function to get memorial site with relations
async function getMemorialSiteWithRelations(id: string, tenantId: string) {
	const [site] = await db
		.select()
		.from(memorialSites)
		.where(and(eq(memorialSites.id, id), eq(memorialSites.tenantId, tenantId)))
		.limit(1);

	if (!site) return null;

	const contacts = await db
		.select({ contactInfo: contactInfo })
		.from(memorialSiteContactInfo)
		.innerJoin(contactInfo, eq(contactInfo.id, memorialSiteContactInfo.contactInfoId))
		.where(eq(memorialSiteContactInfo.memorialSiteId, id));

	const addrs = await db
		.select({ address: addresses })
		.from(memorialSiteAddresses)
		.innerJoin(addresses, eq(addresses.id, memorialSiteAddresses.addressId))
		.where(eq(memorialSiteAddresses.memorialSiteId, id));

	return {
		...site,
		contactInfo: contacts.map((c) => c.contactInfo),
		addresses: addrs.map((a) => a.address),
	};
}

const memorialSitesRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List memorial sites
	.get('/', zValidator('query', searchQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { q, siteType, archivedOnly } = c.req.valid('query');

		let baseConditions = [eq(memorialSites.tenantId, tenantId)];

		if (archivedOnly === 'true') {
			baseConditions.push(isNotNull(memorialSites.archivedAt));
		} else {
			baseConditions.push(isNull(memorialSites.archivedAt));
		}

		if (siteType) {
			baseConditions.push(eq(memorialSites.siteType, siteType));
		}

		const allSites = await db
			.select()
			.from(memorialSites)
			.where(and(...baseConditions))
			.orderBy(memorialSites.name);

		let filteredIds: string[] = allSites.map((s) => s.id);

		if (q && q.trim()) {
			const searchTerm = `%${q.trim().toLowerCase()}%`;

			const nameMatches = allSites
				.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
				.map((s) => s.id);

			const contactMatches = await db
				.select({ memorialSiteId: memorialSiteContactInfo.memorialSiteId })
				.from(memorialSiteContactInfo)
				.innerJoin(contactInfo, eq(contactInfo.id, memorialSiteContactInfo.contactInfoId))
				.where(like(contactInfo.value, searchTerm));

			const addressMatches = await db
				.select({ memorialSiteId: memorialSiteAddresses.memorialSiteId })
				.from(memorialSiteAddresses)
				.innerJoin(addresses, eq(addresses.id, memorialSiteAddresses.addressId))
				.where(like(addresses.formattedAddress, searchTerm));

			const allMatches = new Set([
				...nameMatches,
				...contactMatches.map((c) => c.memorialSiteId),
				...addressMatches.map((a) => a.memorialSiteId),
			]);

			filteredIds = [...allMatches];
		}

		const result = await Promise.all(
			allSites
				.filter((s) => filteredIds.includes(s.id))
				.map(async (site) => {
					const primaryEmail = await db
						.select({ contactInfo: contactInfo })
						.from(memorialSiteContactInfo)
						.innerJoin(contactInfo, eq(contactInfo.id, memorialSiteContactInfo.contactInfoId))
						.where(
							and(
								eq(memorialSiteContactInfo.memorialSiteId, site.id),
								eq(contactInfo.type, 'email'),
								eq(contactInfo.isPrimary, true)
							)
						)
						.limit(1);

					const primaryPhone = await db
						.select({ contactInfo: contactInfo })
						.from(memorialSiteContactInfo)
						.innerJoin(contactInfo, eq(contactInfo.id, memorialSiteContactInfo.contactInfoId))
						.where(
							and(
								eq(memorialSiteContactInfo.memorialSiteId, site.id),
								eq(contactInfo.type, 'phone'),
								eq(contactInfo.isPrimary, true)
							)
						)
						.limit(1);

					const primaryAddress = await db
						.select({ address: addresses })
						.from(memorialSiteAddresses)
						.innerJoin(addresses, eq(addresses.id, memorialSiteAddresses.addressId))
						.where(
							and(
								eq(memorialSiteAddresses.memorialSiteId, site.id),
								eq(addresses.isPrimary, true)
							)
						)
						.limit(1);

					return {
						...site,
						primaryEmail: primaryEmail[0]?.contactInfo || null,
						primaryPhone: primaryPhone[0]?.contactInfo || null,
						primaryAddress: primaryAddress[0]?.address || null,
					};
				})
		);

		return c.json({ memorialSites: result });
	})

	// Get single memorial site
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const memorialSite = await getMemorialSiteWithRelations(id, tenantId);

		if (!memorialSite) {
			return c.json({ error: 'Memorial site not found' }, 404);
		}

		return c.json({ memorialSite });
	})

	// Create memorial site
	.post('/', zValidator('json', createMemorialSiteSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		const id = crypto.randomUUID();
		const now = new Date();

		try {
			await db.insert(memorialSites).values({
				id,
				tenantId,
				name: data.name,
				siteType: data.siteType,
				preferredPaymentMethod: data.preferredPaymentMethod || null,
				paymentDetails: data.paymentDetails || null,
				notes: data.notes || null,
				createdAt: now,
				updatedAt: now,
			});

			for (const contact of data.contactInfo) {
				const contactId = crypto.randomUUID();
				await db.insert(contactInfo).values({
					id: contactId,
					type: contact.type,
					value: contact.value,
					label: contact.label || null,
					isPrimary: contact.isPrimary,
					createdAt: now,
					updatedAt: now,
				});
				await db.insert(memorialSiteContactInfo).values({
					memorialSiteId: id,
					contactInfoId: contactId,
					createdAt: now,
				});
			}

			for (const addr of data.addresses) {
				const addressId = crypto.randomUUID();
				await db.insert(addresses).values({
					id: addressId,
					streetNumber: addr.streetNumber || null,
					route: addr.route || null,
					locality: addr.locality || null,
					administrativeAreaLevel1: addr.administrativeAreaLevel1 || null,
					administrativeAreaLevel2: addr.administrativeAreaLevel2 || null,
					postalCode: addr.postalCode || null,
					postalCodeSuffix: addr.postalCodeSuffix || null,
					country: addr.country,
					formattedAddress: addr.formattedAddress,
					placeId: addr.placeId || null,
					latitude: addr.latitude || null,
					longitude: addr.longitude || null,
					label: addr.label || null,
					isPrimary: addr.isPrimary,
					createdAt: now,
					updatedAt: now,
				});
				await db.insert(memorialSiteAddresses).values({
					memorialSiteId: id,
					addressId,
					createdAt: now,
				});
			}

			const memorialSite = await getMemorialSiteWithRelations(id, tenantId);
			return c.json({ memorialSite }, 201);
		} catch (error) {
			console.error('Error creating memorial site:', error);
			return c.json({ error: 'Failed to create memorial site' }, 500);
		}
	})

	// Update memorial site
	.put('/:id', zValidator('json', updateMemorialSiteSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const updates = c.req.valid('json');

		const [existing] = await db
			.select()
			.from(memorialSites)
			.where(and(eq(memorialSites.id, id), eq(memorialSites.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Memorial site not found' }, 404);
		}

		const now = new Date();

		try {
			const updateData: Record<string, unknown> = { updatedAt: now };
			if (updates.name !== undefined) updateData.name = updates.name;
			if (updates.siteType !== undefined) updateData.siteType = updates.siteType;
			if (updates.preferredPaymentMethod !== undefined) updateData.preferredPaymentMethod = updates.preferredPaymentMethod;
			if (updates.paymentDetails !== undefined) updateData.paymentDetails = updates.paymentDetails;
			if (updates.notes !== undefined) updateData.notes = updates.notes;

			await db.update(memorialSites).set(updateData).where(eq(memorialSites.id, id));

			if (updates.contactInfo !== undefined) {
				const existingContacts = await db
					.select()
					.from(memorialSiteContactInfo)
					.where(eq(memorialSiteContactInfo.memorialSiteId, id));

				for (const ec of existingContacts) {
					await db.delete(contactInfo).where(eq(contactInfo.id, ec.contactInfoId));
				}
				await db.delete(memorialSiteContactInfo).where(eq(memorialSiteContactInfo.memorialSiteId, id));

				for (const contact of updates.contactInfo) {
					const contactId = crypto.randomUUID();
					await db.insert(contactInfo).values({
						id: contactId,
						type: contact.type,
						value: contact.value,
						label: contact.label || null,
						isPrimary: contact.isPrimary,
						createdAt: now,
						updatedAt: now,
					});
					await db.insert(memorialSiteContactInfo).values({
						memorialSiteId: id,
						contactInfoId: contactId,
						createdAt: now,
					});
				}
			}

			if (updates.addresses !== undefined) {
				const existingAddrs = await db
					.select()
					.from(memorialSiteAddresses)
					.where(eq(memorialSiteAddresses.memorialSiteId, id));

				for (const ea of existingAddrs) {
					await db.delete(addresses).where(eq(addresses.id, ea.addressId));
				}
				await db.delete(memorialSiteAddresses).where(eq(memorialSiteAddresses.memorialSiteId, id));

				for (const addr of updates.addresses) {
					const addressId = crypto.randomUUID();
					await db.insert(addresses).values({
						id: addressId,
						streetNumber: addr.streetNumber || null,
						route: addr.route || null,
						locality: addr.locality || null,
						administrativeAreaLevel1: addr.administrativeAreaLevel1 || null,
						administrativeAreaLevel2: addr.administrativeAreaLevel2 || null,
						postalCode: addr.postalCode || null,
						postalCodeSuffix: addr.postalCodeSuffix || null,
						country: addr.country,
						formattedAddress: addr.formattedAddress,
						placeId: addr.placeId || null,
						latitude: addr.latitude || null,
						longitude: addr.longitude || null,
						label: addr.label || null,
						isPrimary: addr.isPrimary,
						createdAt: now,
						updatedAt: now,
					});
					await db.insert(memorialSiteAddresses).values({
						memorialSiteId: id,
						addressId,
						createdAt: now,
					});
				}
			}

			const memorialSite = await getMemorialSiteWithRelations(id, tenantId);
			return c.json({ memorialSite });
		} catch (error) {
			console.error('Error updating memorial site:', error);
			return c.json({ error: 'Failed to update memorial site' }, 500);
		}
	})

	// Archive memorial site
	.post('/:id/archive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [existing] = await db
			.select()
			.from(memorialSites)
			.where(and(eq(memorialSites.id, id), eq(memorialSites.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Memorial site not found' }, 404);
		}

		if (existing.archivedAt) {
			return c.json({ error: 'Memorial site is already archived' }, 400);
		}

		const [updated] = await db
			.update(memorialSites)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(eq(memorialSites.id, id))
			.returning();

		return c.json({ memorialSite: updated });
	})

	// Unarchive memorial site
	.post('/:id/unarchive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [existing] = await db
			.select()
			.from(memorialSites)
			.where(and(eq(memorialSites.id, id), eq(memorialSites.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Memorial site not found' }, 404);
		}

		if (!existing.archivedAt) {
			return c.json({ error: 'Memorial site is not archived' }, 400);
		}

		const [updated] = await db
			.update(memorialSites)
			.set({ archivedAt: null, updatedAt: new Date() })
			.where(eq(memorialSites.id, id))
			.returning();

		return c.json({ memorialSite: updated });
	});

export { memorialSitesRoutes };
