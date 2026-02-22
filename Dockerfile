# Multi-stage Dockerfile for MyCluster Server
# Usage:
#   docker build -t mycluster/server:latest .
#   docker run -p 3000:3000 -v mycluster-data:/root/.mycluster mycluster/server:latest

FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json package-lock.json pnpm-lock.yaml* ./
COPY packages/core/package.json packages/core/
COPY packages/storage-yaml/package.json packages/storage-yaml/
COPY packages/storage-sqlite/package.json packages/storage-sqlite/
COPY packages/server/package.json packages/server/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# Copy source code
COPY tsconfig.json ./
COPY packages/core packages/core
COPY packages/storage-yaml packages/storage-yaml
COPY packages/storage-sqlite packages/storage-sqlite
COPY packages/server packages/server

# Build all packages
RUN pnpm build:core
RUN pnpm build -w @mycluster/storage-yaml
RUN pnpm build -w @mycluster/storage-sqlite
RUN pnpm build -w @mycluster/server

# Production image
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S mycluster && \
    adduser -S mycluster -u 1001 -G mycluster

# Copy built packages from builder
COPY --from=builder --chown=mycluster:mycluster /app/packages/server/dist /app/packages/server/dist
COPY --from=builder --chown=mycluster:mycluster /app/packages/core/dist /app/packages/core/dist
COPY --from=builder --chown=mycluster:mycluster /app/packages/storage-yaml/dist /app/packages/storage-yaml/dist
COPY --from=builder --chown=mycluster:mycluster /app/packages/storage-sqlite/dist /app/packages/storage-sqlite/dist
COPY --from=builder --chown=mycluster:mycluster /app/node_modules /app/node_modules
COPY --from=builder --chown=mycluster:mycluster /app/packages/*/node_modules /app/packages/*/node_modules

# Copy package files for proper module resolution
COPY --from=builder --chown=mycluster:mycluster /app/package.json /app/package.json
COPY --from=builder --chown=mycluster:mycluster /app/packages/server/package.json /app/packages/server/package.json
COPY --from=builder --chown=mycluster:mycluster /app/packages/core/package.json /app/packages/core/package.json
COPY --from=builder --chown=mycluster:mycluster /app/packages/storage-yaml/package.json /app/packages/storage-yaml/package.json
COPY --from=builder --chown=mycluster:mycluster /app/packages/storage-sqlite/package.json /app/packages/storage-sqlite/package.json

# Create data directory
RUN mkdir -p /root/.mycluster && chown -R mycluster:mycluster /root/.mycluster

USER mycluster

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "packages/server/dist/cli.js", "--port", "3000", "--host", "0.0.0.0", "--data-dir", "/root/.mycluster"]
