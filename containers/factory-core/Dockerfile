FROM node:20-alpine
LABEL maintainer="meta-agent-factory"
LABEL description="Factory Core - 11 Meta-Agents Container"

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Create directories for logs and data
RUN mkdir -p /app/logs /app/data

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node dist/health-check.js || exit 1

# Set environment
ENV NODE_ENV=development
ENV PORT=3000
ENV REDIS_URL=redis://redis:6379
ENV NATS_URL=nats://nats-broker:4222

# Run compiled JavaScript directly
CMD ["node", "dist/factory-core.js"]