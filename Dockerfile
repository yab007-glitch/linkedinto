# LinkedInto - Automated LinkedIn Content Platform

## Production Deployment

FROM node:20-alpine AS base

# Install dependencies (including dev dependencies for build)
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev for vite build)
RUN npm ci && npm cache clean --force

# Build stage - build the frontend
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build frontend
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 linkedinto

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Copy necessary files
COPY --from=builder --chown=linkedinto:nodejs /app/dist ./dist
COPY --from=builder --chown=linkedinto:nodejs /app/server.js ./
COPY --from=builder --chown=linkedinto:nodejs /app/services ./services
COPY --from=builder --chown=linkedinto:nodejs /app/config ./config
COPY --from=builder --chown=linkedinto:nodejs /app/middleware ./middleware

# Create data directory for persistent storage
RUN mkdir -p /app/data && chown linkedinto:nodejs /app/data

# Copy database files (with write permissions) to data directory
# Note: In production with a volume mounted to /app/data, these will be hidden
# if the volume in Railway is not initialized with them. 
# The app handles missing files by creating defaults.
COPY --chown=linkedinto:nodejs automation-db.json /app/data/automation-db.json
COPY --chown=linkedinto:nodejs db.json /app/data/db.json

# Switch to non-root user
USER linkedinto

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server.js"]
