import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, like, isNull, isNotNull } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	funeralDirectors,
	contactInfo,
	addresses,
	funeralDirectorContactInfo,
	funeralDirectorAddresses,
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

const createFuneralDirectorSchema = z.object({
	businessName: z.string().min(1, 'Business name is required'),
	tradingName: z.string().optional(),
	website: z.string().optional(),
	notes: z.string().optional(),
	contactInfo: z.array(contactInfoSchema).optional().default([]),
	addresses: z.array(addressSchema).optional().default([]),
});

const updateFuneralDirectorSchema = z.object({
	businessName: z.string().min(1, 'Business name is required').optional(),
	tradingName: z.string().nullable().optional(),
	website: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	contactInfo: z.array(contactInfoSchema).optional(),
	addresses: z.array(addressSchema).optional(),
});

const searchQuerySchema = z.object({
	q: z.string().optional(),
	archivedOnly: z.enum(['true', 'false']).optional().default('false'),
});

// Helper function to get funeral director with relations
async function getFuneralDirectorWithRelations(id: string, tenantId: string) {
	const [funeralDirector] = await db
		.select()
		.from(funeralDirectors)
		.where(and(eq(funeralDirectors.id, id), eq(funeralDirectors.tenantId, tenantId)))
		.limit(1);

	if (!funeralDirector) return null;

	const contacts = await db
		.select({ contactInfo: contactInfo })
		.from(funeralDirectorContactInfo)
		.innerJoin(contactInfo, eq(contactInfo.id, funeralDirectorContactInfo.contactInfoId))
		.where(eq(funeralDirectorContactInfo.funeralDirectorId, id));

	const addrs = await db
		.select({ address: addresses })
		.from(funeralDirectorAddresses)
		.innerJoin(addresses, eq(addresses.id, funeralDirectorAddresses.addressId))
		.where(eq(funeralDirectorAddresses.funeralDirectorId, id));

	return {
		...funeralDirector,
		contactInfo: contacts.map((c) => c.contactInfo),
		addresses: addrs.map((a) => a.address),
	};
}

const funeralDirectorsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List funeral directors
	.get('/', zValidator('query', searchQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { q, archivedOnly } = c.req.valid('query');

		let baseConditions = [eq(funeralDirectors.tenantId, tenantId)];

		if (archivedOnly === 'true') {
			baseConditions.push(isNotNull(funeralDirectors.archivedAt));
		} else {
			baseConditions.push(isNull(funeralDirectors.archivedAt));
		}

		const allDirectors = await db
			.select()
			.from(funeralDirectors)
			.where(and(...baseConditions))
			.orderBy(funeralDirectors.businessName);

		let filteredIds: string[] = allDirectors.map((d) => d.id);

		if (q && q.trim()) {
			const searchTerm = `%${q.trim().toLowerCase()}%`;

			const nameMatches = allDirectors
				.filter(
					(d) =>
						d.businessName.toLowerCase().includes(q.toLowerCase()) ||
						d.tradingName?.toLowerCase().includes(q.toLowerCase())
				)
				.map((d) => d.id);

			const contactMatches = await db
				.select({ funeralDirectorId: funeralDirectorContactInfo.funeralDirectorId })
				.from(funeralDirectorContactInfo)
				.innerJoin(contactInfo, eq(contactInfo.id, funeralDirectorContactInfo.contactInfoId))
				.where(like(contactInfo.value, searchTerm));

			const addressMatches = await db
				.select({ funeralDirectorId: funeralDirectorAddresses.funeralDirectorId })
				.from(funeralDirectorAddresses)
				.innerJoin(addresses, eq(addresses.id, funeralDirectorAddresses.addressId))
				.where(like(addresses.formattedAddress, searchTerm));

			const allMatches = new Set([
				...nameMatches,
				...contactMatches.map((c) => c.funeralDirectorId),
				...addressMatches.map((a) => a.funeralDirectorId),
			]);

			filteredIds = [...allMatches];
		}

		const result = await Promise.all(
			allDirectors
				.filter((d) => filteredIds.includes(d.id))
				.map(async (director) => {
					const primaryEmail = await db
						.select({ contactInfo: contactInfo })
						.from(funeralDirectorContactInfo)
						.innerJoin(contactInfo, eq(contactInfo.id, funeralDirectorContactInfo.contactInfoId))
						.where(
							and(
								eq(funeralDirectorContactInfo.funeralDirectorId, director.id),
								eq(contactInfo.type, 'email'),
								eq(contactInfo.isPrimary, true)
							)
						)
						.limit(1);

					const primaryPhone = await db
						.select({ contactInfo: contactInfo })
						.from(funeralDirectorContactInfo)
						.innerJoin(contactInfo, eq(contactInfo.id, funeralDirectorContactInfo.contactInfoId))
						.where(
							and(
								eq(funeralDirectorContactInfo.funeralDirectorId, director.id),
								eq(contactInfo.type, 'phone'),
								eq(contactInfo.isPrimary, true)
							)
						)
						.limit(1);

					const primaryAddress = await db
						.select({ address: addresses })
						.from(funeralDirectorAddresses)
						.innerJoin(addresses, eq(addresses.id, funeralDirectorAddresses.addressId))
						.where(
							and(
								eq(funeralDirectorAddresses.funeralDirectorId, director.id),
								eq(addresses.isPrimary, true)
							)
						)
						.limit(1);

					return {
						...director,
						primaryEmail: primaryEmail[0]?.contactInfo || null,
						primaryPhone: primaryPhone[0]?.contactInfo || null,
						primaryAddress: primaryAddress[0]?.address || null,
					};
				})
		);

		return c.json({ funeralDirectors: result });
	})

	// Get single funeral director
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const funeralDirector = await getFuneralDirectorWithRelations(id, tenantId);

		if (!funeralDirector) {
			return c.json({ error: 'Funeral director not found' }, 404);
		}

		return c.json({ funeralDirector });
	})

	// Create funeral director
	.post('/', zValidator('json', createFuneralDirectorSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		const id = crypto.randomUUID();
		const now = new Date();

		try {
			await db.insert(funeralDirectors).values({
				id,
				tenantId,
				businessName: data.businessName,
				tradingName: data.tradingName || null,
				website: data.website || null,
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
				await db.insert(funeralDirectorContactInfo).values({
					funeralDirectorId: id,
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
				await db.insert(funeralDirectorAddresses).values({
					funeralDirectorId: id,
					addressId,
					createdAt: now,
				});
			}

			const funeralDirector = await getFuneralDirectorWithRelations(id, tenantId);
			return c.json({ funeralDirector }, 201);
		} catch (error) {
			console.error('Error creating funeral director:', error);
			return c.json({ error: 'Failed to create funeral director' }, 500);
		}
	})

	// Update funeral director
	.put('/:id', zValidator('json', updateFuneralDirectorSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const updates = c.req.valid('json');

		const [existing] = await db
			.select()
			.from(funeralDirectors)
			.where(and(eq(funeralDirectors.id, id), eq(funeralDirectors.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Funeral director not found' }, 404);
		}

		const now = new Date();

		try {
			const updateData: Record<string, unknown> = { updatedAt: now };
			if (updates.businessName !== undefined) updateData.businessName = updates.businessName;
			if (updates.tradingName !== undefined) updateData.tradingName = updates.tradingName;
			if (updates.website !== undefined) updateData.website = updates.website;
			if (updates.notes !== undefined) updateData.notes = updates.notes;

			await db.update(funeralDirectors).set(updateData).where(eq(funeralDirectors.id, id));

			if (updates.contactInfo !== undefined) {
				const existingContacts = await db
					.select()
					.from(funeralDirectorContactInfo)
					.where(eq(funeralDirectorContactInfo.funeralDirectorId, id));

				for (const ec of existingContacts) {
					await db.delete(contactInfo).where(eq(contactInfo.id, ec.contactInfoId));
				}
				await db.delete(funeralDirectorContactInfo).where(eq(funeralDirectorContactInfo.funeralDirectorId, id));

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
					await db.insert(funeralDirectorContactInfo).values({
						funeralDirectorId: id,
						contactInfoId: contactId,
						createdAt: now,
					});
				}
			}

			if (updates.addresses !== undefined) {
				const existingAddrs = await db
					.select()
					.from(funeralDirectorAddresses)
					.where(eq(funeralDirectorAddresses.funeralDirectorId, id));

				for (const ea of existingAddrs) {
					await db.delete(addresses).where(eq(addresses.id, ea.addressId));
				}
				await db.delete(funeralDirectorAddresses).where(eq(funeralDirectorAddresses.funeralDirectorId, id));

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
					await db.insert(funeralDirectorAddresses).values({
						funeralDirectorId: id,
						addressId,
						createdAt: now,
					});
				}
			}

			const funeralDirector = await getFuneralDirectorWithRelations(id, tenantId);
			return c.json({ funeralDirector });
		} catch (error) {
			console.error('Error updating funeral director:', error);
			return c.json({ error: 'Failed to update funeral director' }, 500);
		}
	})

	// Archive funeral director
	.post('/:id/archive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [existing] = await db
			.select()
			.from(funeralDirectors)
			.where(and(eq(funeralDirectors.id, id), eq(funeralDirectors.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Funeral director not found' }, 404);
		}

		if (existing.archivedAt) {
			return c.json({ error: 'Funeral director is already archived' }, 400);
		}

		const [updated] = await db
			.update(funeralDirectors)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(eq(funeralDirectors.id, id))
			.returning();

		return c.json({ funeralDirector: updated });
	})

	// Unarchive funeral director
	.post('/:id/unarchive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [existing] = await db
			.select()
			.from(funeralDirectors)
			.where(and(eq(funeralDirectors.id, id), eq(funeralDirectors.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Funeral director not found' }, 404);
		}

		if (!existing.archivedAt) {
			return c.json({ error: 'Funeral director is not archived' }, 400);
		}

		const [updated] = await db
			.update(funeralDirectors)
			.set({ archivedAt: null, updatedAt: new Date() })
			.where(eq(funeralDirectors.id, id))
			.returning();

		return c.json({ funeralDirector: updated });
	});

export { funeralDirectorsRoutes };
