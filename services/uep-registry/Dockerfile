# Multi-stage build for UEP Registry Service
FROM node:20-alpine AS builder

LABEL maintainer="meta-agent-factory"
LABEL description="UEP Registry Service - Service Discovery and Agent Registration"

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install --production

# Install TypeScript and build dependencies
RUN npm install -g typescript@5.2.2
RUN npm install --save-dev @types/node

# Copy source code
COPY src/ ./src/

# Build the application (skip build for now as we don't have build script)
# RUN npm run build

# Production stage
FROM node:20-alpine AS runtime

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S uep-registry -u 1001

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy application source (no build for now)
COPY --from=builder --chown=uep-registry:nodejs /app/src ./src
COPY --from=builder --chown=uep-registry:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=uep-registry:nodejs /app/package*.json ./

# Create data directory
RUN mkdir -p /app/data && chown uep-registry:nodejs /app/data

# Switch to non-root user
USER uep-registry

# Expose ports
EXPOSE 3001 50051

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application (run directly with ts-node for now)
CMD ["npx", "ts-node", "src/main.ts"]