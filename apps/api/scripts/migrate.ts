/**
 * Production Migration Script
 *
 * Runs database migrations programmatically using drizzle-orm's migrator.
 * This is the recommended approach for production deployments.
 *
 * References:
 * - https://orm.drizzle.team/docs/migrations
 * - https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/postgres-js/README.md
 * - https://www.codu.co/articles/running-migrations-in-drizzle-for-postgresql-fmybrgui
 *
 * Note: postgres.js requires { max: 1 } for migrations to work correctly.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('ERROR: DATABASE_URL environment variable is required');
	process.exit(1);
}

async function main() {
	console.log('Connecting to database...');

	// postgres.js requires max: 1 for migrations
	const migrationClient = postgres(DATABASE_URL, { max: 1 });
	const db = drizzle(migrationClient);

	console.log('Running migrations...');

	await migrate(db, {
		migrationsFolder: '/app/drizzle',
	});

	console.log('Migrations complete!');

	// Must close the connection or script will hang
	await migrationClient.end();
	process.exit(0);
}

main().catch((err) => {
	console.error('Migration failed:', err);
	process.exit(1);
});
