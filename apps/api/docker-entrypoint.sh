#!/bin/sh
set -e

echo "Running database migrations..."
npx drizzle-kit migrate --config=/app/drizzle.config.js

echo "Starting application..."
exec "$@"
