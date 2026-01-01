import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, like, isNull, isNotNull } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	councils,
	contactInfo,
	addresses,
	councilContactInfo,
	councilAddresses,
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

const createCouncilSchema = z.object({
	councilName: z.string().min(1, 'Council name is required'),
	cemeteryName: z.string().optional(),
	department: z.string().optional(),
	permitRequired: z.boolean().optional().default(true),
	permitFee: z.number().min(0).optional(),
	foundationSpec: z.string().optional(),
	maxHeadstoneHeight: z.string().optional(),
	maxHeadstoneWidth: z.string().optional(),
	approvedMaterials: z.string().optional(),
	installationRules: z.string().optional(),
	notes: z.string().optional(),
	contactInfo: z.array(contactInfoSchema).optional().default([]),
	addresses: z.array(addressSchema).optional().default([]),
});

const updateCouncilSchema = z.object({
	councilName: z.string().min(1, 'Council name is required').optional(),
	cemeteryName: z.string().nullable().optional(),
	department: z.string().nullable().optional(),
	permitRequired: z.boolean().optional(),
	permitFee: z.number().min(0).nullable().optional(),
	foundationSpec: z.string().nullable().optional(),
	maxHeadstoneHeight: z.string().nullable().optional(),
	maxHeadstoneWidth: z.string().nullable().optional(),
	approvedMaterials: z.string().nullable().optional(),
	installationRules: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	contactInfo: z.array(contactInfoSchema).optional(),
	addresses: z.array(addressSchema).optional(),
});

const searchQuerySchema = z.object({
	q: z.string().optional(),
	archivedOnly: z.enum(['true', 'false']).optional().default('false'),
});

// Helper function to get council with relations
async function getCouncilWithRelations(id: string, tenantId: string) {
	const [council] = await db
		.select()
		.from(councils)
		.where(and(eq(councils.id, id), eq(councils.tenantId, tenantId)))
		.limit(1);

	if (!council) return null;

	const contacts = await db
		.select({ contactInfo: contactInfo })
		.from(councilContactInfo)
		.innerJoin(contactInfo, eq(contactInfo.id, councilContactInfo.contactInfoId))
		.where(eq(councilContactInfo.councilId, id));

	const addrs = await db
		.select({ address: addresses })
		.from(councilAddresses)
		.innerJoin(addresses, eq(addresses.id, councilAddresses.addressId))
		.where(eq(councilAddresses.councilId, id));

	return {
		...council,
		contactInfo: contacts.map((c) => c.contactInfo),
		addresses: addrs.map((a) => a.address),
	};
}

const councilsRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List councils
	.get('/', zValidator('query', searchQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { q, archivedOnly } = c.req.valid('query');

		let baseConditions = [eq(councils.tenantId, tenantId)];

		if (archivedOnly === 'true') {
			baseConditions.push(isNotNull(councils.archivedAt));
		} else {
			baseConditions.push(isNull(councils.archivedAt));
		}

		const allCouncils = await db
			.select()
			.from(councils)
			.where(and(...baseConditions))
			.orderBy(councils.councilName);

		let filteredIds: string[] = allCouncils.map((c) => c.id);

		if (q && q.trim()) {
			const searchTerm = `%${q.trim().toLowerCase()}%`;

			const nameMatches = allCouncils
				.filter(
					(c) =>
						c.councilName.toLowerCase().includes(q.toLowerCase()) ||
						c.cemeteryName?.toLowerCase().includes(q.toLowerCase()) ||
						c.department?.toLowerCase().includes(q.toLowerCase())
				)
				.map((c) => c.id);

			const contactMatches = await db
				.select({ councilId: councilContactInfo.councilId })
				.from(councilContactInfo)
				.innerJoin(contactInfo, eq(contactInfo.id, councilContactInfo.contactInfoId))
				.where(like(contactInfo.value, searchTerm));

			const addressMatches = await db
				.select({ councilId: councilAddresses.councilId })
				.from(councilAddresses)
				.innerJoin(addresses, eq(addresses.id, councilAddresses.addressId))
				.where(like(addresses.formattedAddress, searchTerm));

			const allMatches = new Set([
				...nameMatches,
				...contactMatches.map((c) => c.councilId),
				...addressMatches.map((a) => a.councilId),
			]);

			filteredIds = [...allMatches];
		}

		const result = await Promise.all(
			allCouncils
				.filter((c) => filteredIds.includes(c.id))
				.map(async (council) => {
					const primaryEmail = await db
						.select({ contactInfo: contactInfo })
						.from(councilContactInfo)
						.innerJoin(contactInfo, eq(contactInfo.id, councilContactInfo.contactInfoId))
						.where(
							and(
								eq(councilContactInfo.councilId, council.id),
								eq(contactInfo.type, 'email'),
								eq(contactInfo.isPrimary, true)
							)
						)
						.limit(1);

					const primaryPhone = await db
						.select({ contactInfo: contactInfo })
						.from(councilContactInfo)
						.innerJoin(contactInfo, eq(contactInfo.id, councilContactInfo.contactInfoId))
						.where(
							and(
								eq(councilContactInfo.councilId, council.id),
								eq(contactInfo.type, 'phone'),
								eq(contactInfo.isPrimary, true)
							)
						)
						.limit(1);

					const primaryAddress = await db
						.select({ address: addresses })
						.from(councilAddresses)
						.innerJoin(addresses, eq(addresses.id, councilAddresses.addressId))
						.where(
							and(
								eq(councilAddresses.councilId, council.id),
								eq(addresses.isPrimary, true)
							)
						)
						.limit(1);

					return {
						...council,
						primaryEmail: primaryEmail[0]?.contactInfo || null,
						primaryPhone: primaryPhone[0]?.contactInfo || null,
						primaryAddress: primaryAddress[0]?.address || null,
					};
				})
		);

		return c.json({ councils: result });
	})

	// Get single council
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const council = await getCouncilWithRelations(id, tenantId);

		if (!council) {
			return c.json({ error: 'Council not found' }, 404);
		}

		return c.json({ council });
	})

	// Create council
	.post('/', zValidator('json', createCouncilSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		const id = crypto.randomUUID();
		const now = new Date();

		try {
			await db.insert(councils).values({
				id,
				tenantId,
				councilName: data.councilName,
				cemeteryName: data.cemeteryName || null,
				department: data.department || null,
				permitRequired: data.permitRequired,
				permitFee: data.permitFee?.toString() || null,
				foundationSpec: data.foundationSpec || null,
				maxHeadstoneHeight: data.maxHeadstoneHeight || null,
				maxHeadstoneWidth: data.maxHeadstoneWidth || null,
				approvedMaterials: data.approvedMaterials || null,
				installationRules: data.installationRules || null,
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
				await db.insert(councilContactInfo).values({
					councilId: id,
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
				await db.insert(councilAddresses).values({
					councilId: id,
					addressId,
					createdAt: now,
				});
			}

			const council = await getCouncilWithRelations(id, tenantId);
			return c.json({ council }, 201);
		} catch (error) {
			console.error('Error creating council:', error);
			return c.json({ error: 'Failed to create council' }, 500);
		}
	})

	// Update council
	.put('/:id', zValidator('json', updateCouncilSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const updates = c.req.valid('json');

		const [existing] = await db
			.select()
			.from(councils)
			.where(and(eq(councils.id, id), eq(councils.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Council not found' }, 404);
		}

		const now = new Date();

		try {
			const updateData: Record<string, unknown> = { updatedAt: now };
			if (updates.councilName !== undefined) updateData.councilName = updates.councilName;
			if (updates.cemeteryName !== undefined) updateData.cemeteryName = updates.cemeteryName;
			if (updates.department !== undefined) updateData.department = updates.department;
			if (updates.permitRequired !== undefined) updateData.permitRequired = updates.permitRequired;
			if (updates.permitFee !== undefined) updateData.permitFee = updates.permitFee?.toString() || null;
			if (updates.foundationSpec !== undefined) updateData.foundationSpec = updates.foundationSpec;
			if (updates.maxHeadstoneHeight !== undefined) updateData.maxHeadstoneHeight = updates.maxHeadstoneHeight;
			if (updates.maxHeadstoneWidth !== undefined) updateData.maxHeadstoneWidth = updates.maxHeadstoneWidth;
			if (updates.approvedMaterials !== undefined) updateData.approvedMaterials = updates.approvedMaterials;
			if (updates.installationRules !== undefined) updateData.installationRules = updates.installationRules;
			if (updates.notes !== undefined) updateData.notes = updates.notes;

			await db.update(councils).set(updateData).where(eq(councils.id, id));

			if (updates.contactInfo !== undefined) {
				const existingContacts = await db
					.select()
					.from(councilContactInfo)
					.where(eq(councilContactInfo.councilId, id));

				for (const ec of existingContacts) {
					await db.delete(contactInfo).where(eq(contactInfo.id, ec.contactInfoId));
				}
				await db.delete(councilContactInfo).where(eq(councilContactInfo.councilId, id));

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
					await db.insert(councilContactInfo).values({
						councilId: id,
						contactInfoId: contactId,
						createdAt: now,
					});
				}
			}

			if (updates.addresses !== undefined) {
				const existingAddrs = await db
					.select()
					.from(councilAddresses)
					.where(eq(councilAddresses.councilId, id));

				for (const ea of existingAddrs) {
					await db.delete(addresses).where(eq(addresses.id, ea.addressId));
				}
				await db.delete(councilAddresses).where(eq(councilAddresses.councilId, id));

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
					await db.insert(councilAddresses).values({
						councilId: id,
						addressId,
						createdAt: now,
					});
				}
			}

			const council = await getCouncilWithRelations(id, tenantId);
			return c.json({ council });
		} catch (error) {
			console.error('Error updating council:', error);
			return c.json({ error: 'Failed to update council' }, 500);
		}
	})

	// Archive council
	.post('/:id/archive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [existing] = await db
			.select()
			.from(councils)
			.where(and(eq(councils.id, id), eq(councils.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Council not found' }, 404);
		}

		if (existing.archivedAt) {
			return c.json({ error: 'Council is already archived' }, 400);
		}

		const [updated] = await db
			.update(councils)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(eq(councils.id, id))
			.returning();

		return c.json({ council: updated });
	})

	// Unarchive council
	.post('/:id/unarchive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [existing] = await db
			.select()
			.from(councils)
			.where(and(eq(councils.id, id), eq(councils.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Council not found' }, 404);
		}

		if (!existing.archivedAt) {
			return c.json({ error: 'Council is not archived' }, 400);
		}

		const [updated] = await db
			.update(councils)
			.set({ archivedAt: null, updatedAt: new Date() })
			.where(eq(councils.id, id))
			.returning();

		return c.json({ council: updated });
	});

export { councilsRoutes };
