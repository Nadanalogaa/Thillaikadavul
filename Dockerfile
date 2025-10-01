# Multi-stage build for Nadanaloga application
FROM node:18-alpine AS frontend-builder

# Cache bust arguments to force rebuild
ARG CACHE_BUST
ARG FORCE_REBUILD
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

RUN echo "Cache bust: $CACHE_BUST"
RUN echo "Force rebuild: $FORCE_REBUILD"
RUN echo "SSL FIX SHOULD BE INCLUDED NOW"

WORKDIR /app

# Copy package files for frontend
COPY package*.json ./
RUN npm ci

# Copy frontend source
COPY . .

# Set environment variables for Vite build
# These need to be set at build time for Vite to embed them in the frontend
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-https://ojuybeasovauzkntbydd.supabase.co}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdXliZWFzb3ZhdXprbnRieWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNzMwNjQsImV4cCI6MjA3MTk0OTA2NH0.UlGxceKspC5mDgQkENV19hhppEGaNB8iAZQMnkL1Mag}

# Build frontend
RUN npm run build

# Backend stage
FROM node:18-alpine AS backend-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./
RUN npm ci --only=production

# Final production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nadanaloga -u 1001

# Copy backend dependencies and code
COPY --from=backend-builder /app/server/node_modules ./server/node_modules
COPY --from=backend-builder /app/server/package*.json ./server/
COPY server/server.js ./server/

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Set ownership
RUN chown -R nadanaloga:nodejs /app
USER nadanaloga

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/server.js"]