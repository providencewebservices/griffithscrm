import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, or, like, isNull, isNotNull } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	customers,
	contactInfo,
	addresses,
	customerContactInfo,
	customerAddresses,
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
	country: z.string().default('US'),
	formattedAddress: z.string().min(1, 'Formatted address is required'),
	placeId: z.string().optional(),
	latitude: z.string().optional(),
	longitude: z.string().optional(),
	label: z.string().optional(),
	isPrimary: z.boolean().default(false),
});

const createCustomerSchema = z.object({
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	contactInfo: z.array(contactInfoSchema).optional().default([]),
	addresses: z.array(addressSchema).optional().default([]),
});

const updateCustomerSchema = z.object({
	firstName: z.string().min(1, 'First name is required').optional(),
	lastName: z.string().min(1, 'Last name is required').optional(),
	contactInfo: z.array(contactInfoSchema).optional(),
	addresses: z.array(addressSchema).optional(),
});

const searchQuerySchema = z.object({
	q: z.string().optional(),
	archivedOnly: z.enum(['true', 'false']).optional().default('false'),
});

const updateCommunicationPreferencesSchema = z.object({
	preferredContactMethod: z.enum(['email', 'phone', 'mobile', 'post']).nullable().optional(),
	preferredContactTime: z.enum(['morning', 'afternoon', 'evening']).nullable().optional(),
	doNotCall: z.boolean().optional(),
	doNotEmail: z.boolean().optional(),
	doNotMail: z.boolean().optional(),
	communicationNotes: z.string().nullable().optional(),
});

// Helper function to get customer with relations
async function getCustomerWithRelations(customerId: string, tenantId: string) {
	// Get customer
	const [customer] = await db
		.select()
		.from(customers)
		.where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
		.limit(1);

	if (!customer) return null;

	// Get contact info
	const customerContacts = await db
		.select({ contactInfo: contactInfo })
		.from(customerContactInfo)
		.innerJoin(contactInfo, eq(contactInfo.id, customerContactInfo.contactInfoId))
		.where(eq(customerContactInfo.customerId, customerId));

	// Get addresses
	const customerAddrs = await db
		.select({ address: addresses })
		.from(customerAddresses)
		.innerJoin(addresses, eq(addresses.id, customerAddresses.addressId))
		.where(eq(customerAddresses.customerId, customerId));

	return {
		...customer,
		contactInfo: customerContacts.map((c) => c.contactInfo),
		addresses: customerAddrs.map((a) => a.address),
	};
}

// Create customer routes
const customerRoutes = new Hono()
	// Apply auth and tenant middleware to all customer routes
	.use('*', requireAuth)
	.use('*', requireTenant)

	// List customers with search
	.get('/', zValidator('query', searchQuerySchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { q, archivedOnly } = c.req.valid('query');

		// Build base query
		let baseConditions = [eq(customers.tenantId, tenantId)];

		// Filter by archived status
		if (archivedOnly === 'true') {
			baseConditions.push(isNotNull(customers.archivedAt));
		} else {
			baseConditions.push(isNull(customers.archivedAt));
		}

		// Get all customers for this tenant
		const allCustomers = await db
			.select()
			.from(customers)
			.where(and(...baseConditions))
			.orderBy(customers.lastName, customers.firstName);

		// If search query provided, filter and include contact/address search
		let filteredCustomerIds: string[] = allCustomers.map((c) => c.id);

		if (q && q.trim()) {
			const searchTerm = `%${q.trim().toLowerCase()}%`;

			// Search in customer names
			const nameMatches = allCustomers
				.filter(
					(c) =>
						c.firstName.toLowerCase().includes(q.toLowerCase()) ||
						c.lastName.toLowerCase().includes(q.toLowerCase()) ||
						`${c.firstName} ${c.lastName}`.toLowerCase().includes(q.toLowerCase())
				)
				.map((c) => c.id);

			// Search in contact info
			const contactMatches = await db
				.select({ customerId: customerContactInfo.customerId })
				.from(customerContactInfo)
				.innerJoin(contactInfo, eq(contactInfo.id, customerContactInfo.contactInfoId))
				.where(like(contactInfo.value, searchTerm));

			// Search in addresses
			const addressMatches = await db
				.select({ customerId: customerAddresses.customerId })
				.from(customerAddresses)
				.innerJoin(addresses, eq(addresses.id, customerAddresses.addressId))
				.where(like(addresses.formattedAddress, searchTerm));

			// Combine all matches
			const allMatches = new Set([
				...nameMatches,
				...contactMatches.map((c) => c.customerId),
				...addressMatches.map((a) => a.customerId),
			]);

			filteredCustomerIds = [...allMatches];
		}

		// Get customers with primary contact info
		const result = await Promise.all(
			allCustomers
				.filter((c) => filteredCustomerIds.includes(c.id))
				.map(async (customer) => {
					// Get primary email
					const primaryEmail = await db
						.select({ contactInfo: contactInfo })
						.from(customerContactInfo)
						.innerJoin(contactInfo, eq(contactInfo.id, customerContactInfo.contactInfoId))
						.where(
							and(
								eq(customerContactInfo.customerId, customer.id),
								eq(contactInfo.type, 'email'),
								eq(contactInfo.isPrimary, true)
							)
						)
						.limit(1);

					// Get primary phone (any phone type)
					const primaryPhone = await db
						.select({ contactInfo: contactInfo })
						.from(customerContactInfo)
						.innerJoin(contactInfo, eq(contactInfo.id, customerContactInfo.contactInfoId))
						.where(
							and(
								eq(customerContactInfo.customerId, customer.id),
								or(
									eq(contactInfo.type, 'phone'),
									eq(contactInfo.type, 'mobile')
								),
								eq(contactInfo.isPrimary, true)
							)
						)
						.limit(1);

					// Get primary address
					const primaryAddress = await db
						.select({ address: addresses })
						.from(customerAddresses)
						.innerJoin(addresses, eq(addresses.id, customerAddresses.addressId))
						.where(
							and(
								eq(customerAddresses.customerId, customer.id),
								eq(addresses.isPrimary, true)
							)
						)
						.limit(1);

					return {
						...customer,
						primaryEmail: primaryEmail[0]?.contactInfo || null,
						primaryPhone: primaryPhone[0]?.contactInfo || null,
						primaryAddress: primaryAddress[0]?.address || null,
					};
				})
		);

		return c.json({ customers: result });
	})

	// Get a single customer with all relations
	.get('/:id', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const customerId = c.req.param('id');

		const customer = await getCustomerWithRelations(customerId, tenantId);

		if (!customer) {
			return c.json({ error: 'Customer not found' }, 404);
		}

		return c.json({ customer });
	})

	// Create a new customer
	.post('/', zValidator('json', createCustomerSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const { firstName, lastName, contactInfo: contacts, addresses: addrs } = c.req.valid('json');

		const customerId = crypto.randomUUID();
		const now = new Date();

		try {
			// Create customer
			await db.insert(customers).values({
				id: customerId,
				firstName,
				lastName,
				tenantId,
				createdAt: now,
				updatedAt: now,
			});

			// Create contact info entries
			for (const contact of contacts) {
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
				await db.insert(customerContactInfo).values({
					customerId,
					contactInfoId: contactId,
					createdAt: now,
				});
			}

			// Create address entries
			for (const addr of addrs) {
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
				await db.insert(customerAddresses).values({
					customerId,
					addressId,
					createdAt: now,
				});
			}

			// Return the created customer with relations
			const customer = await getCustomerWithRelations(customerId, tenantId);
			return c.json({ customer }, 201);
		} catch (error) {
			console.error('Error creating customer:', error);
			return c.json({ error: 'Failed to create customer' }, 500);
		}
	})

	// Update a customer
	.put('/:id', zValidator('json', updateCustomerSchema), async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const customerId = c.req.param('id');
		const updates = c.req.valid('json');

		// Check if customer exists and belongs to tenant
		const [existing] = await db
			.select()
			.from(customers)
			.where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Customer not found' }, 404);
		}

		const now = new Date();

		try {
			// Update customer basic info
			if (updates.firstName || updates.lastName) {
				await db
					.update(customers)
					.set({
						...(updates.firstName && { firstName: updates.firstName }),
						...(updates.lastName && { lastName: updates.lastName }),
						updatedAt: now,
					})
					.where(eq(customers.id, customerId));
			}

			// Update contact info if provided
			if (updates.contactInfo !== undefined) {
				// Delete existing contact info
				const existingContacts = await db
					.select()
					.from(customerContactInfo)
					.where(eq(customerContactInfo.customerId, customerId));

				for (const ec of existingContacts) {
					await db.delete(contactInfo).where(eq(contactInfo.id, ec.contactInfoId));
				}
				await db.delete(customerContactInfo).where(eq(customerContactInfo.customerId, customerId));

				// Create new contact info
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
					await db.insert(customerContactInfo).values({
						customerId,
						contactInfoId: contactId,
						createdAt: now,
					});
				}
			}

			// Update addresses if provided
			if (updates.addresses !== undefined) {
				// Delete existing addresses
				const existingAddrs = await db
					.select()
					.from(customerAddresses)
					.where(eq(customerAddresses.customerId, customerId));

				for (const ea of existingAddrs) {
					await db.delete(addresses).where(eq(addresses.id, ea.addressId));
				}
				await db.delete(customerAddresses).where(eq(customerAddresses.customerId, customerId));

				// Create new addresses
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
					await db.insert(customerAddresses).values({
						customerId,
						addressId,
						createdAt: now,
					});
				}
			}

			// Return updated customer with relations
			const customer = await getCustomerWithRelations(customerId, tenantId);
			return c.json({ customer });
		} catch (error) {
			console.error('Error updating customer:', error);
			return c.json({ error: 'Failed to update customer' }, 500);
		}
	})

	// Archive a customer
	.post('/:id/archive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const customerId = c.req.param('id');

		// Check if customer exists and belongs to tenant
		const [existing] = await db
			.select()
			.from(customers)
			.where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Customer not found' }, 404);
		}

		if (existing.archivedAt) {
			return c.json({ error: 'Customer is already archived' }, 400);
		}

		const [updated] = await db
			.update(customers)
			.set({
				archivedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(customers.id, customerId))
			.returning();

		return c.json({ customer: updated });
	})

	// Unarchive a customer
	.post('/:id/unarchive', async (c) => {
		const currentUser = c.get('user');
		const tenantId = currentUser.tenantId!;
		const customerId = c.req.param('id');

		// Check if customer exists and belongs to tenant
		const [existing] = await db
			.select()
			.from(customers)
			.where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
			.limit(1);

		if (!existing) {
			return c.json({ error: 'Customer not found' }, 404);
		}

		if (!existing.archivedAt) {
			return c.json({ error: 'Customer is not archived' }, 400);
		}

		const [updated] = await db
			.update(customers)
			.set({
				archivedAt: null,
				updatedAt: new Date(),
			})
			.where(eq(customers.id, customerId))
			.returning();

		return c.json({ customer: updated });
	})

	// Update communication preferences
	.patch(
		'/:id/preferences',
		zValidator('json', updateCommunicationPreferencesSchema),
		async (c) => {
			const currentUser = c.get('user');
			const tenantId = currentUser.tenantId!;
			const customerId = c.req.param('id');
			const preferences = c.req.valid('json');

			// Check if customer exists and belongs to tenant
			const [existing] = await db
				.select()
				.from(customers)
				.where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
				.limit(1);

			if (!existing) {
				return c.json({ error: 'Customer not found' }, 404);
			}

			try {
				const [updated] = await db
					.update(customers)
					.set({
						...(preferences.preferredContactMethod !== undefined && {
							preferredContactMethod: preferences.preferredContactMethod,
						}),
						...(preferences.preferredContactTime !== undefined && {
							preferredContactTime: preferences.preferredContactTime,
						}),
						...(preferences.doNotCall !== undefined && {
							doNotCall: preferences.doNotCall,
						}),
						...(preferences.doNotEmail !== undefined && {
							doNotEmail: preferences.doNotEmail,
						}),
						...(preferences.doNotMail !== undefined && {
							doNotMail: preferences.doNotMail,
						}),
						...(preferences.communicationNotes !== undefined && {
							communicationNotes: preferences.communicationNotes,
						}),
						updatedAt: new Date(),
					})
					.where(eq(customers.id, customerId))
					.returning();

				return c.json({ customer: updated });
			} catch (error) {
				console.error('Error updating communication preferences:', error);
				return c.json({ error: 'Failed to update communication preferences' }, 500);
			}
		}
	);

export { customerRoutes };
