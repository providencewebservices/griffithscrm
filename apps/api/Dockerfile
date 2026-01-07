# Build stage
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Build the application
WORKDIR /app/apps/api
RUN bun run build

# Production stage
FROM oven/bun:1.1-alpine AS production

WORKDIR /app

# Install curl for health checks and npm for drizzle-kit
RUN apk add --no-cache curl nodejs npm

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy migration files and config
COPY --from=builder /app/packages/shared/drizzle ./drizzle
COPY apps/api/drizzle.config.js ./drizzle.config.js
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh

# Install drizzle-kit globally for migrations
RUN npm install -g drizzle-kit

# Make entrypoint executable
RUN chmod +x ./docker-entrypoint.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run migrations then start application
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "run", "dist/index.js"]
