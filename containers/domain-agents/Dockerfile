FROM node:20-alpine AS builder
LABEL maintainer="meta-agent-factory"
LABEL description="Domain Agents - 5 Specialist Agents Container for MVS Architecture"

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm install

COPY src/ ./src/
COPY apps/ ./apps/
COPY lib/ ./lib/

RUN npm run build

FROM node:20-alpine AS runtime

RUN addgroup -g 1001 -S nodejs
RUN adduser -S agents -u 1001

WORKDIR /app

COPY --from=builder --chown=agents:nodejs /app/dist ./dist
COPY --from=builder --chown=agents:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=agents:nodejs /app/package*.json ./

USER agents

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node dist/health-check.js || exit 1

CMD ["node", "dist/domain-agents.js"]