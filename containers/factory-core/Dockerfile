FROM node:20-alpine AS base
LABEL maintainer="meta-agent-factory"
LABEL description="Factory Core - 11 Meta-Agents Container"

# Install necessary packages for building
RUN apk add --no-cache git python3 make g++

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Build stage
FROM base AS build

# Install dev dependencies for building
RUN npm ci --legacy-peer-deps

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Copy compiled JavaScript from build stage
COPY --from=build /app/dist ./dist

# Copy source files that are needed at runtime
COPY --from=build /app/src ./src

# Create directories for logs and data
RUN mkdir -p /app/logs /app/data

# Set proper permissions
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node dist/health-check.js || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV REDIS_URL=redis://redis:6379
ENV NATS_URL=nats://nats-broker:4222
ENV DOCKER_CONTAINER=true

# Run compiled JavaScript directly
CMD ["node", "dist/factory-core.js"]