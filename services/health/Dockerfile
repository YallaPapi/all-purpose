# UEP Health Monitoring Service Dockerfile
# 
# Multi-stage Docker build for Node.js TypeScript health monitoring service
# Based on research best practices for 2024 Node.js containerization
# - Uses node:20-alpine for minimal production image
# - Multi-stage build for optimized image size
# - Non-root user for security
# - Production environment configuration

ARG NODE_VERSION=20

# Stage 1: Build stage
FROM node:${NODE_VERSION}-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production stage
FROM node:${NODE_VERSION}-alpine AS production

# Create app user for security (non-root)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S uephealth -u 1001

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=uephealth:nodejs /app/dist ./dist

# Copy configuration files
COPY --chown=uephealth:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create logs directory
RUN mkdir -p logs && chown uephealth:nodejs logs

# Set environment variables
ENV NODE_ENV=production \
    PORT=3001 \
    CONSUL_HOST=consul \
    CONSUL_PORT=8500 \
    HEALTH_MONITORING_PORT=3001 \
    LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE ${PORT}

# Switch to non-root user
USER uephealth

# Start the application
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/UEPHealthMonitoringService.js"]