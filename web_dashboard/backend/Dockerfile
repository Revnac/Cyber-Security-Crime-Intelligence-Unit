# web_dashboard/backend/Dockerfile
# Placeholder Dockerfile for Node.js Backend

# Stage 1: Build
# Use an official Node.js runtime as a parent image (LTS version)
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install app dependencies
# If you have a package-lock.json and use npm ci for reproducible builds:
RUN npm ci --only=production 
# Or, if just using npm install:
# RUN npm install --only=production

# Copy application source code
COPY . .

# Stage 2: Production
# Use a lighter-weight Node.js image for production
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy built application and node_modules from builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app ./

# Application metadata (optional)
LABEL maintainer="SAPS Intelligence Unit Development Team <contact@saps.gov.za>"
LABEL version="0.1.0"
LABEL description="Guardian AI Backend Service"

# Expose port (should match PORT environment variable, default 3001)
EXPOSE ${PORT:-3001}

# Healthcheck (optional, but good practice)
# HEALTHCHECK --interval=30s --timeout=10s --start-period=1m \
#   CMD node -e "require('http').get({host:'localhost', port:process.env.PORT || 3001, path:'/api/health'}, (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
# Note: The /api/health endpoint needs to be created in app.js if not already present.
# For now, we don't have a /api/health, but the main app.js has a /health for the Python service.
# Let's assume a /health endpoint for the Node.js service is at the root.
# A simple /health endpoint would need to be added to app.js: app.get('/health', (req, res) => res.status(200).send('OK'));

# Environment variable for Node environment (set to production)
ENV NODE_ENV=production
# PORT will be set by the runtime environment or defaults in app.js

# Command to run the application
CMD [ "node", "app.js" ]
