/**
 * Bootstrap Admin Script
 *
 * Creates the initial application admin user.
 * Run AFTER database migrations.
 *
 * Usage (local development):
 *   bun run db:bootstrap
 *
 * Usage (production via ECS Exec):
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=securepass123 bun run scripts/bootstrap-admin.ts
 *
 * Environment variables:
 *   ADMIN_EMAIL    - Email for the admin user (required in production)
 *   ADMIN_PASSWORD - Password for the admin user (required in production)
 *   ADMIN_NAME     - Display name (optional, defaults to "System Administrator")
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env in development (production containers have env vars injected)
if (process.env.NODE_ENV !== 'production') {
	config({ path: resolve(import.meta.dir, '../../../.env') });
}

// Dynamic imports - must come AFTER dotenv config due to ESM hoisting
// In production, import from compiled dist; in development, import from source
const authModule =
	process.env.NODE_ENV === 'production'
		? await import('../dist/lib/auth.js')
		: await import('../src/lib/auth');
const { auth } = authModule;
const { createDb } = await import('@griffiths-crm/shared/db');
const { users } = await import('@griffiths-crm/shared/db/schema');
const { eq } = await import('drizzle-orm');

const db = createDb(process.env.DATABASE_URL!);

// Get admin credentials from environment or use development defaults
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@griffiths-crm.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'System Administrator';

// Validate production usage
if (process.env.NODE_ENV === 'production') {
	if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
		console.error('ERROR: In production, ADMIN_EMAIL and ADMIN_PASSWORD must be set');
		console.error('Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret bun run scripts/bootstrap-admin.ts');
		process.exit(1);
	}
	if (ADMIN_PASSWORD.length < 12) {
		console.error('ERROR: Production admin password must be at least 12 characters');
		process.exit(1);
	}
}

async function main() {
	console.log('Connecting to database...');

	// Check if admin already exists
	const existingUser = await db
		.select()
		.from(users)
		.where(eq(users.email, ADMIN_EMAIL))
		.limit(1);

	if (existingUser.length > 0) {
		console.log(`Admin user ${ADMIN_EMAIL} already exists. Skipping.`);
		process.exit(0);
	}

	console.log('Creating bootstrap admin user...');

	// Use Better Auth's createUser API (from admin plugin)
	// This ensures password is hashed with scrypt (Better Auth's secure default)
	const result = await auth.api.createUser({
		body: {
			email: ADMIN_EMAIL,
			password: ADMIN_PASSWORD,
			name: ADMIN_NAME,
			role: 'app_admin',
		},
	});

	if (!result) {
		throw new Error('Failed to create admin user');
	}

	// Mark admin as email verified (bootstrap users don't need to verify)
	await db
		.update(users)
		.set({ emailVerified: true })
		.where(eq(users.email, ADMIN_EMAIL));

	console.log('\n' + '='.repeat(50));
	console.log('Bootstrap admin created!');
	console.log('='.repeat(50));
	console.log(`\n  Email: ${ADMIN_EMAIL}`);
	console.log(`  Name:  ${ADMIN_NAME}`);
	if (process.env.NODE_ENV !== 'production') {
		console.log(`  Password: ${ADMIN_PASSWORD}`);
		console.log('\n  CHANGE THIS PASSWORD IMMEDIATELY!\n');
	} else {
		console.log('\n  Password was set from ADMIN_PASSWORD env var\n');
	}

	process.exit(0);
}

main().catch((e) => {
	console.error('Failed:', e);
	process.exit(1);
});
