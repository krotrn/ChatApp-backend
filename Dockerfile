# Use Node.js official image with LTS version
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Copy package files for dependency installation
COPY package*.json ./

# Development stage
FROM base AS development
# Install all dependencies (including devDependencies)
RUN npm ci
# Copy source code
COPY . .
# Expose port
EXPOSE 8000
# Start development server with ES module support
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
# Install all dependencies
RUN npm ci
# Copy source code
COPY . .
# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install system dependencies for native modules (production)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application from build stage
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/public ./public

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start production server
CMD ["npm", "start"]
