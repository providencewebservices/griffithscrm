#!/bin/sh
set -e

echo "Running database migrations..."
bun run /app/scripts/migrate.ts

echo "Starting application..."
exec "$@"
