FROM node:20-alpine AS builder
LABEL maintainer="meta-agent-factory"
LABEL description="Factory Core - 11 Meta-Agents Container for MVS Architecture"

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY packages/meta-agents/ ./packages/meta-agents/
COPY rag-system/ ./rag-system/

RUN npm run build:factory

FROM node:20-alpine AS runtime

RUN addgroup -g 1001 -S nodejs
RUN adduser -S factory -u 1001

WORKDIR /app

COPY --from=builder --chown=factory:nodejs /app/dist ./dist
COPY --from=builder --chown=factory:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=factory:nodejs /app/package*.json ./

USER factory

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node dist/health-check.js || exit 1

CMD ["node", "dist/factory-core.js"]