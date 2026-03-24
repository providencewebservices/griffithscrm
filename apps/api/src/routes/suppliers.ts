import {
	addresses,
	contactInfo,
	materials,
	PAYMENT_TERMS,
	sundries,
	supplierAddresses,
	supplierContactInfo,
	suppliers,
} from '@griffiths-crm/shared/db/schema';
import { zValidator } from '@hono/zod-validator';
import { and, eq, isNotNull, isNull, like } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/auth';
import { requireAuth, requireTenant } from '../middleware/auth';

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

const createSupplierSchema = z.object({
	businessName: z.string().min(1, 'Business name is required'),
	tradingName: z.string().optional(),
	accountNumber: z.string().optional(),
	website: z.string().optional(),
	paymentTerms: z.enum(PAYMENT_TERMS).optional(),
	defaultLeadTimeDays: z.number().int().min(0).optional(),
	minimumOrderValue: z.number().min(0).optional(),
	notes: z.string().optional(),
	contactInfo: z.array(contactInfoSchema).optional().default([]),
	addresses: z.array(addressSchema).optional().default([]),
});

const updateSupplierSchema = z.object({
	businessName: z.string().min(1, 'Business name is required').optional(),
	tradingName: z.string().nullable().optional(),
	accountNumber: z.string().nullable().optional(),
	website: z.string().nullable().optional(),
	paymentTerms: z.enum(PAYMENT_TERMS).nullable().optional(),
	defaultLeadTimeDays: z.number().int().min(0).nullable().optional(),
	minimumOrderValue: z.number().min(0).nullable().optional(),
	notes: z.string().nullable().optional(),
	contactInfo: z.array(contactInfoSchema).optional(),
	addresses: z.array(addressSchema).optional(),
});

const searchQuerySchema = z.object({
	q: z.string().optional(),
	archivedOnly: z.enum(['true', 'false']).optional().default('false'),
});

// Helper function to get supplier with relations
async function getSupplierWithRelations(id: string, tenantId: string) {
	const [supplier] = await db
		.select()
		.from(suppliers)
		.where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
		.limit(1);

	if (!supplier) return null;

	const contacts = await db
		.select({ contactInfo: contactInfo })
		.from(supplierContactInfo)
		.innerJoin(contactInfo, eq(contactInfo.id, supplierContactInfo.contactInfoId))
		.where(eq(supplierContactInfo.supplierId, id));

	const addrs = await db
		.select({ address: addresses })
		.from(supplierAddresses)
		.innerJoin(addresses, eq(addresses.id, supplierAddresses.addressId))
		.where(eq(supplierAddresses.supplierId, id));

	return {
		...supplier,
		contactInfo: contacts.map((c) => c.contactInfo),
		addresses: addrs.map((a) => a.address),
	};
}

const suppliersRoutes = new Hono()
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List suppliers
	.get('/', zValidator('query', searchQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { q, archivedOnly } = c.req.valid('query');

		const baseConditions = [eq(suppliers.tenantId, tenantId)];

		if (archivedOnly === 'true') {
			baseConditions.push(isNotNull(suppliers.archivedAt));
		} else {
			baseConditions.push(isNull(suppliers.archivedAt));
		}

		const allSuppliers = await db
			.select()
			.from(suppliers)
			.where(and(...baseConditions))
			.orderBy(suppliers.businessName);

		let filteredIds: string[] = allSuppliers.map((s) => s.id);

		if (q?.trim()) {
			const searchTerm = `%${q.trim().toLowerCase()}%`;

			const nameMatches = allSuppliers
				.filter(
					(s) =>
						s.businessName.toLowerCase().includes(q.toLowerCase()) ||
						s.tradingName?.toLowerCase().includes(q.toLowerCase()) ||
						s.accountNumber?.toLowerCase().includes(q.toLowerCase()),
				)
				.map((s) => s.id);

			const contactMatches = await db
				.select({ supplierId: supplierContactInfo.supplierId })
				.from(supplierContactInfo)
				.innerJoin(contactInfo, eq(contactInfo.id, supplierContactInfo.contactInfoId))
				.where(like(contactInfo.value, searchTerm));

			const addressMatches = await db
				.select({ supplierId: supplierAddresses.supplierId })
				.from(supplierAddresses)
				.innerJoin(addresses, eq(addresses.id, supplierAddresses.addressId))
				.where(like(addresses.formattedAddress, searchTerm));

			const allMatches = new Set([
				...nameMatches,
				...contactMatches.map((c) => c.supplierId),
				...addressMatches.map((a) => a.supplierId),
			]);

			filteredIds = [...allMatches];
		}

		const result = await Promise.all(
			allSuppliers
				.filter((s) => filteredIds.includes(s.id))
				.map(async (supplier) => {
					const primaryEmail = await db
						.select({ contactInfo: contactInfo })
						.from(supplierContactInfo)
						.innerJoin(contactInfo, eq(contactInfo.id, supplierContactInfo.contactInfoId))
						.where(
							and(
								eq(supplierContactInfo.supplierId, supplier.id),
								eq(contactInfo.type, 'email'),
								eq(contactInfo.isPrimary, true),
							),
						)
						.limit(1);

					const primaryPhone = await db
						.select({ contactInfo: contactInfo })
						.from(supplierContactInfo)
						.innerJoin(contactInfo, eq(contactInfo.id, supplierContactInfo.contactInfoId))
						.where(
							and(
								eq(supplierContactInfo.supplierId, supplier.id),
								eq(contactInfo.type, 'phone'),
								eq(contactInfo.isPrimary, true),
							),
						)
						.limit(1);

					const primaryAddress = await db
						.select({ address: addresses })
						.from(supplierAddresses)
						.innerJoin(addresses, eq(addresses.id, supplierAddresses.addressId))
						.where(
							and(eq(supplierAddresses.supplierId, supplier.id), eq(addresses.isPrimary, true)),
						)
						.limit(1);

					// Get counts
					const materialsCount = await db
						.select()
						.from(materials)
						.where(eq(materials.supplierId, supplier.id));

					const sundriesCount = await db
						.select()
						.from(sundries)
						.where(eq(sundries.supplierId, supplier.id));

					return {
						...supplier,
						primaryEmail: primaryEmail[0]?.contactInfo || null,
						primaryPhone: primaryPhone[0]?.contactInfo || null,
						primaryAddress: primaryAddress[0]?.address || null,
						materialsCount: materialsCount.length,
						sundriesCount: sundriesCount.length,
					};
				}),
		);

		return c.json({ suppliers: result });
	})

	// Get single supplier
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const supplier = await getSupplierWithRelations(id, tenantId);

		if (!supplier) {
			return c.json({ error: 'Supplier not found' }, 404);
		}

		return c.json({ supplier });
	})

	// Get materials for a supplier
	.get('/:id/materials', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [supplier] = await db
			.select()
			.from(suppliers)
			.where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
			.limit(1);

		if (!supplier) {
			return c.json({ error: 'Supplier not found' }, 404);
		}

		const supplierMaterials = await db
			.select()
			.from(materials)
			.where(eq(materials.supplierId, id))
			.orderBy(materials.name);

		return c.json({ materials: supplierMaterials });
	})

	// Get sundries for a supplier
	.get('/:id/sundries', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [supplier] = await db
			.select()
			.from(suppliers)
			.where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
			.limit(1);

		if (!supplier) {
			return c.json({ error: 'Supplier not found' }, 404);
		}

		const supplierSundries = await db
			.select()
			.from(sundries)
			.where(eq(sundries.supplierId, id))
			.orderBy(sundries.name);

		return c.json({ sundries: supplierSundries });
	})

	// Create supplier
	.post('/', zValidator('json', createSupplierSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const data = c.req.valid('json');

		const id = crypto.randomUUID();
		const now = new Date();

		try {
			await db.insert(suppliers).values({
				id,
				tenantId,
				businessName: data.businessName,
				tradingName: data.tradingName || null,
				accountNumber: data.accountNumber || null,
				website: data.website || null,
				paymentTerms: data.paymentTerms || null,
				defaultLeadTimeDays: data.defaultLeadTimeDays || null,
				minimumOrderValue: data.minimumOrderValue?.toString() || null,
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
				await db.insert(supplierContactInfo).values({
					supplierId: id,
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
				await db.insert(supplierAddresses).values({
					supplierId: id,
					addressId,
					createdAt: now,
				});
			}

			const supplier = await getSupplierWithRelations(id, tenantId);
			return c.json({ supplier }, 201);
		} catch (error) {
			console.error('Error creating supplier:', error);
			return c.json({ error: 'Failed to create supplier' }, 500);
		}
	})

	// Update supplier
	.put('/:id', zValidator('json', updateSupplierSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');
		const updates = c.req.valid('json');

		const [existing] = await db
			.select()
			.from(suppliers)
			.where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Supplier not found' }, 404);
		}

		const now = new Date();

		try {
			const updateData: Record<string, unknown> = { updatedAt: now };
			if (updates.businessName !== undefined) updateData.businessName = updates.businessName;
			if (updates.tradingName !== undefined) updateData.tradingName = updates.tradingName;
			if (updates.accountNumber !== undefined) updateData.accountNumber = updates.accountNumber;
			if (updates.website !== undefined) updateData.website = updates.website;
			if (updates.paymentTerms !== undefined) updateData.paymentTerms = updates.paymentTerms;
			if (updates.defaultLeadTimeDays !== undefined)
				updateData.defaultLeadTimeDays = updates.defaultLeadTimeDays;
			if (updates.minimumOrderValue !== undefined)
				updateData.minimumOrderValue = updates.minimumOrderValue?.toString() || null;
			if (updates.notes !== undefined) updateData.notes = updates.notes;

			await db.update(suppliers).set(updateData).where(eq(suppliers.id, id));

			if (updates.contactInfo !== undefined) {
				const existingContacts = await db
					.select()
					.from(supplierContactInfo)
					.where(eq(supplierContactInfo.supplierId, id));

				for (const ec of existingContacts) {
					await db.delete(contactInfo).where(eq(contactInfo.id, ec.contactInfoId));
				}
				await db.delete(supplierContactInfo).where(eq(supplierContactInfo.supplierId, id));

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
					await db.insert(supplierContactInfo).values({
						supplierId: id,
						contactInfoId: contactId,
						createdAt: now,
					});
				}
			}

			if (updates.addresses !== undefined) {
				const existingAddrs = await db
					.select()
					.from(supplierAddresses)
					.where(eq(supplierAddresses.supplierId, id));

				for (const ea of existingAddrs) {
					await db.delete(addresses).where(eq(addresses.id, ea.addressId));
				}
				await db.delete(supplierAddresses).where(eq(supplierAddresses.supplierId, id));

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
					await db.insert(supplierAddresses).values({
						supplierId: id,
						addressId,
						createdAt: now,
					});
				}
			}

			const supplier = await getSupplierWithRelations(id, tenantId);
			return c.json({ supplier });
		} catch (error) {
			console.error('Error updating supplier:', error);
			return c.json({ error: 'Failed to update supplier' }, 500);
		}
	})

	// Archive supplier
	.post('/:id/archive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [existing] = await db
			.select()
			.from(suppliers)
			.where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Supplier not found' }, 404);
		}

		if (existing.archivedAt) {
			return c.json({ error: 'Supplier is already archived' }, 400);
		}

		const [updated] = await db
			.update(suppliers)
			.set({ archivedAt: new Date(), updatedAt: new Date() })
			.where(eq(suppliers.id, id))
			.returning();

		return c.json({ supplier: updated });
	})

	// Unarchive supplier
	.post('/:id/unarchive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const id = c.req.param('id');

		const [existing] = await db
			.select()
			.from(suppliers)
			.where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Supplier not found' }, 404);
		}

		if (!existing.archivedAt) {
			return c.json({ error: 'Supplier is not archived' }, 400);
		}

		const [updated] = await db
			.update(suppliers)
			.set({ archivedAt: null, updatedAt: new Date() })
			.where(eq(suppliers.id, id))
			.returning();

		return c.json({ supplier: updated });
	});

export { suppliersRoutes };
