/**
 * Bootstrap Admin Script
 *
 * Creates the initial application admin user.
 * Run AFTER database migrations.
 *
 * Usage: bun run db:bootstrap
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dir, '../../../.env') });

// Dynamic imports - must come AFTER dotenv config due to ESM hoisting
const { auth } = await import('../src/lib/auth');
const { createDb } = await import('@griffiths-crm/shared/db');
const { users } = await import('@griffiths-crm/shared/db/schema');
const { eq } = await import('drizzle-orm');

const db = createDb(process.env.DATABASE_URL!);

const ADMIN_EMAIL = 'admin@griffiths-crm.local';
const ADMIN_PASSWORD = 'changeme123';
const ADMIN_NAME = 'System Administrator';

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

	console.log('\n' + '='.repeat(50));
	console.log('Bootstrap admin created!');
	console.log('='.repeat(50));
	console.log(`\n  Email:    ${ADMIN_EMAIL}`);
	console.log(`  Password: ${ADMIN_PASSWORD}`);
	console.log('\n  CHANGE THIS PASSWORD IMMEDIATELY!\n');

	process.exit(0);
}

main().catch((e) => {
	console.error('Failed:', e);
	process.exit(1);
});
