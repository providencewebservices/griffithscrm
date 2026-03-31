/**
 * Backfill public-facing media from the private documents bucket into the
 * dedicated public media bucket, then update DB records to point at the new
 * delivery URL.
 *
 * Dry run by default:
 *   bun run --env-file .env --cwd apps/api scripts/backfill-public-media.ts
 *
 * Apply changes:
 *   APPLY=true bun run --env-file .env --cwd apps/api scripts/backfill-public-media.ts
 */

import { resolve } from 'node:path';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';

config({ path: resolve(import.meta.dir, '../../../.env') });

const { createDb } = await import('@griffiths-crm/shared/db');
const { materials, optionChoices, productCategories, products, tenants } = await import(
	'@griffiths-crm/shared/db/schema'
);
const {
	copyObjectToPublicMedia,
	extractKeyFromUrl,
	getPublicMediaUrlForKey,
	isDirectlyReadableUrl,
	isPublicMediaConfigured,
	isPublicMediaKey,
	isPublicMediaUrl,
	isS3Configured,
} = await import('../src/lib/s3');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('ERROR: DATABASE_URL environment variable is required');
	process.exit(1);
}

if (!isS3Configured()) {
	console.error('ERROR: S3_BUCKET is required to read legacy private media');
	process.exit(1);
}

if (!isPublicMediaConfigured()) {
	console.error(
		'ERROR: PUBLIC_MEDIA_BUCKET (and optionally PUBLIC_MEDIA_BASE_URL) are required to backfill public media',
	);
	process.exit(1);
}

const APPLY = process.env.APPLY === 'true';
const db = createDb(DATABASE_URL);

type MigrationCandidate = {
	label: string;
	currentUrl: string;
	key: string;
	nextUrl: string;
	update: () => Promise<void>;
};

function maybeCreateCandidate(
	label: string,
	currentUrl: string | null,
	update: (nextUrl: string) => Promise<void>,
): MigrationCandidate | null {
	if (!currentUrl) return null;
	if (isPublicMediaUrl(currentUrl)) return null;
	if (isDirectlyReadableUrl(currentUrl)) return null;

	const key = extractKeyFromUrl(currentUrl);
	if (!key || !isPublicMediaKey(key)) {
		console.warn(`Skipping ${label}: unsupported media URL "${currentUrl}"`);
		return null;
	}

	const nextUrl = getPublicMediaUrlForKey(key);

	return {
		label,
		currentUrl,
		key,
		nextUrl,
		update: () => update(nextUrl),
	};
}

const [tenantRows, categoryRows, productRows, optionChoiceRows, materialRows] = await Promise.all([
	db.select({ id: tenants.id, logoUrl: tenants.logoUrl }).from(tenants),
	db
		.select({ id: productCategories.id, imageUrl: productCategories.imageUrl })
		.from(productCategories),
	db.select({ id: products.id, imageUrl: products.imageUrl }).from(products),
	db.select({ id: optionChoices.id, imageUrl: optionChoices.imageUrl }).from(optionChoices),
	db.select({ id: materials.id, imageUrl: materials.imageUrl }).from(materials),
]);

const candidates = [
	...tenantRows
		.map((row) =>
			maybeCreateCandidate(`tenant:${row.id}`, row.logoUrl, async (nextUrl) => {
				await db
					.update(tenants)
					.set({ logoUrl: nextUrl, updatedAt: new Date() })
					.where(eq(tenants.id, row.id));
			}),
		)
		.filter((candidate): candidate is MigrationCandidate => candidate !== null),
	...categoryRows
		.map((row) =>
			maybeCreateCandidate(`product-category:${row.id}`, row.imageUrl, async (nextUrl) => {
				await db
					.update(productCategories)
					.set({ imageUrl: nextUrl, updatedAt: new Date() })
					.where(eq(productCategories.id, row.id));
			}),
		)
		.filter((candidate): candidate is MigrationCandidate => candidate !== null),
	...productRows
		.map((row) =>
			maybeCreateCandidate(`product:${row.id}`, row.imageUrl, async (nextUrl) => {
				await db
					.update(products)
					.set({ imageUrl: nextUrl, updatedAt: new Date() })
					.where(eq(products.id, row.id));
			}),
		)
		.filter((candidate): candidate is MigrationCandidate => candidate !== null),
	...optionChoiceRows
		.map((row) =>
			maybeCreateCandidate(`option-choice:${row.id}`, row.imageUrl, async (nextUrl) => {
				await db
					.update(optionChoices)
					.set({ imageUrl: nextUrl, updatedAt: new Date() })
					.where(eq(optionChoices.id, row.id));
			}),
		)
		.filter((candidate): candidate is MigrationCandidate => candidate !== null),
	...materialRows
		.map((row) =>
			maybeCreateCandidate(`material:${row.id}`, row.imageUrl, async (nextUrl) => {
				await db
					.update(materials)
					.set({ imageUrl: nextUrl, updatedAt: new Date() })
					.where(eq(materials.id, row.id));
			}),
		)
		.filter((candidate): candidate is MigrationCandidate => candidate !== null),
];

console.log(`Found ${candidates.length} media records to migrate`);

if (candidates.length === 0) {
	process.exit(0);
}

for (const candidate of candidates) {
	console.log(
		`${APPLY ? 'Migrating' : 'Would migrate'} ${candidate.label}\n  from: ${candidate.currentUrl}\n  to:   ${candidate.nextUrl}`,
	);

	if (!APPLY) {
		continue;
	}

	await copyObjectToPublicMedia(candidate.key);
	await candidate.update();
}

if (!APPLY) {
	console.log('\nDry run complete. Re-run with APPLY=true to copy objects and update records.');
}
