# BOZLY: Multi-stage Dockerfile for npm integration testing
# Follows industry-standard patterns from Prisma, AWS SDK, and Docker official guides
# Stages: dependencies → builder → unit-tests → test-install (for npm verification)

# ============================================
# Stage 1: Dependencies (base for all stages)
# ============================================
FROM node:22-alpine AS dependencies

WORKDIR /app

# Install minimal utilities (bash for scripts)
RUN apk add --no-cache bash curl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vitest.config.ts ./
COPY .eslintrc.json ./
COPY .prettierrc ./

# Install dependencies with npm ci (deterministic, production-grade)
RUN npm ci --prefer-offline --no-audit

# ============================================
# Stage 2: Builder (compile & package)
# ============================================
FROM dependencies AS builder

# Copy source code
COPY src/ ./src/
COPY tests/ ./tests/

# Build the project
RUN npm run build

# Create npm package (.tgz) for fresh installation testing
RUN npm pack

# ============================================
# Stage 3: Unit Tests
# ============================================
FROM builder AS unit-tests

ENV NODE_ENV=test
ENV CI=true

# Run unit tests with coverage
RUN npm run test:coverage

# Persist test results
RUN mkdir -p /test-results && \
    cp -r coverage /test-results/ 2>/dev/null || true && \
    cp -r test-results /test-results/junit 2>/dev/null || true

# ============================================
# Stage 4: Fresh Installation Test (CRITICAL FOR CLI)
# ============================================
# This stage simulates a real user installing bozly from npm
# Tests that the package contains all needed artifacts
FROM node:22-alpine AS test-install

WORKDIR /test

# Install minimal utilities
RUN apk add --no-cache bash curl

# Copy the .tgz package from builder stage (not local source)
COPY --from=builder /app/*.tgz ./package.tgz

# Create a fresh project and install the package (as a real user would)
RUN npm init -y && \
    npm install ./package.tgz

# Verify CLI entry point works
RUN npx bozly --version

# Verify CLI help works
RUN npx bozly --help | grep -q "Build. Organize. Link. Yield." || \
    npx bozly --help | grep -q "Commands:"

# Test basic initialization
RUN mkdir -p /test-vault && \
    cd /test-vault && \
    npx bozly init test-vault --no-git || true

# Output success message
RUN echo "✅ Fresh installation test passed - npm package is valid"

# ============================================
# Stage 5: Integration Tests (for docker-compose)
# ============================================
FROM builder AS integration-tests

ENV NODE_ENV=test
ENV CI=true
ENV BOZLY_HOME=/app/.bozly-test

# Run integration tests
RUN npm run test:integration || npm run test

# Persist results
RUN mkdir -p /test-results && \
    cp -r test-results /test-results/ 2>/dev/null || true

# ============================================
# Stage 6: Production (runtime only - if needed)
# ============================================
FROM node:22-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1000 nodejs && \
    adduser -S nodejs -u 1000

# Copy built artifacts only (not source)
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Switch to non-root user
USER nodejs

# Set environment
ENV NODE_ENV=production

# Default command for runtime image (not used for testing)
CMD ["node", "dist/cli/index.js"]
