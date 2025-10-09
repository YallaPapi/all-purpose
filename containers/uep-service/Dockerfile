FROM node:20-alpine AS builder
LABEL maintainer="meta-agent-factory"
LABEL description="UEP Validation Service - Universal Execution Protocol Enforcement"

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm install --production

COPY src/ ./src/

RUN npm run build

FROM node:20-alpine AS runtime

RUN addgroup -g 1001 -S nodejs
RUN adduser -S uep -u 1001

WORKDIR /app

COPY --from=builder --chown=uep:nodejs /app/dist ./dist
COPY --from=builder --chown=uep:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=uep:nodejs /app/package*.json ./

USER uep

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node dist/health-check.js || exit 1

CMD ["node", "dist/uep-service.js"]