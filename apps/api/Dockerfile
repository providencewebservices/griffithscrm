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

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["bun", "run", "dist/index.js"]
