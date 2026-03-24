import crypto from 'node:crypto';
import {
	contactInfo,
	customerContactInfo,
	customers,
	emailEntityLinks,
	funeralDirectorContactInfo,
	funeralDirectors,
	supplierContactInfo,
	suppliers,
} from '@griffiths-crm/shared/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from './auth';

/**
 * Collect all unique email addresses from thread messages.
 * Parses JSON-encoded toAddresses/ccAddresses fields.
 */
export function collectEmailAddresses(
	messages: { fromAddress: string | null; toAddresses: string; ccAddresses: string }[],
): string[] {
	const addresses = new Set<string>();

	for (const msg of messages) {
		if (msg.fromAddress) {
			addresses.add(msg.fromAddress.toLowerCase().trim());
		}

		for (const field of [msg.toAddresses, msg.ccAddresses]) {
			if (!field) continue;
			try {
				const parsed = JSON.parse(field);
				if (Array.isArray(parsed)) {
					for (const entry of parsed) {
						const addr = typeof entry === 'string' ? entry : entry?.address;
						if (addr) addresses.add(addr.toLowerCase().trim());
					}
				}
			} catch {
				// Skip malformed JSON
			}
		}
	}

	return Array.from(addresses);
}

/**
 * Auto-link a thread to CRM entities by matching email addresses
 * against contactInfo records. Uses ON CONFLICT DO NOTHING to avoid duplicates.
 */
export async function autoLinkThreadByEmail(
	threadId: string,
	tenantId: string,
	emailAddresses: string[],
): Promise<void> {
	if (emailAddresses.length === 0) return;

	// Find contactInfo records matching these email addresses
	const lowered = emailAddresses.map((a) => a.toLowerCase());
	const matchingContacts = await db
		.select({ id: contactInfo.id })
		.from(contactInfo)
		.where(and(eq(contactInfo.type, 'email'), sql`LOWER(${contactInfo.value}) IN ${lowered}`));

	if (matchingContacts.length === 0) return;

	const contactInfoIds = matchingContacts.map((c) => c.id);

	// Find entities that own these contact info records (tenant-scoped)
	const entityMatches: { entityType: string; entityId: string }[] = [];

	// Customers
	const customerMatches = await db
		.select({ entityId: customerContactInfo.customerId })
		.from(customerContactInfo)
		.innerJoin(customers, eq(customers.id, customerContactInfo.customerId))
		.where(
			and(
				inArray(customerContactInfo.contactInfoId, contactInfoIds),
				eq(customers.tenantId, tenantId),
			),
		);
	for (const m of customerMatches) {
		entityMatches.push({ entityType: 'customer', entityId: m.entityId });
	}

	// Funeral Directors
	const fdMatches = await db
		.select({ entityId: funeralDirectorContactInfo.funeralDirectorId })
		.from(funeralDirectorContactInfo)
		.innerJoin(
			funeralDirectors,
			eq(funeralDirectors.id, funeralDirectorContactInfo.funeralDirectorId),
		)
		.where(
			and(
				inArray(funeralDirectorContactInfo.contactInfoId, contactInfoIds),
				eq(funeralDirectors.tenantId, tenantId),
			),
		);
	for (const m of fdMatches) {
		entityMatches.push({ entityType: 'funeral_director', entityId: m.entityId });
	}

	// Suppliers
	const supplierMatches = await db
		.select({ entityId: supplierContactInfo.supplierId })
		.from(supplierContactInfo)
		.innerJoin(suppliers, eq(suppliers.id, supplierContactInfo.supplierId))
		.where(
			and(
				inArray(supplierContactInfo.contactInfoId, contactInfoIds),
				eq(suppliers.tenantId, tenantId),
			),
		);
	for (const m of supplierMatches) {
		entityMatches.push({ entityType: 'supplier', entityId: m.entityId });
	}

	if (entityMatches.length === 0) return;

	// Deduplicate
	const unique = new Map<string, { entityType: string; entityId: string }>();
	for (const match of entityMatches) {
		unique.set(`${match.entityType}:${match.entityId}`, match);
	}

	// Upsert links with ON CONFLICT DO NOTHING
	for (const match of unique.values()) {
		await db
			.insert(emailEntityLinks)
			.values({
				id: crypto.randomUUID(),
				tenantId,
				threadId,
				entityType: match.entityType,
				entityId: match.entityId,
				linkSource: 'auto_email_match',
			})
			.onConflictDoNothing({
				target: [emailEntityLinks.threadId, emailEntityLinks.entityType, emailEntityLinks.entityId],
			});
	}
}
