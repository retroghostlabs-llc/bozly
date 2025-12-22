# Docker Testing Guide for BOZLY

This guide explains BOZLY's two-tier Docker testing approach and how to use each setup.

---

## Overview

BOZLY uses **two separate Docker configurations** to ensure code quality and package validity:

| Setup | Purpose | When to Use | Source |
|-------|---------|-------------|--------|
| **Dockerfile.test** | Local development testing | During development | Local `/src` code |
| **Dockerfile** | npm integration testing | Before publishing | npm package (`.tgz`) |

---

## 1. Local Development Testing (Dockerfile.test)

**Purpose:** Quick feedback loop while coding. Tests your source code directly.

**Use when:**
- Building features
- Debugging tests
- Making changes to code

### Run local tests in Docker:

```bash
# Test with Docker Compose (recommended)
cd release/bozly
docker compose -f docker-compose.test.yml up

# Or manually with Dockerfile.test
docker build -f Dockerfile.test -t bozly:test .
docker run -it bozly:test npm run test:coverage
```

**What it does:**
1. Copies your `/src` and `/tests` directories
2. Installs dependencies
3. Compiles TypeScript
4. Runs unit tests with coverage

**Output:** Test results in console, coverage reports

---

## 2. npm Integration Testing (Dockerfile)

**Purpose:** Verify the published npm package works in a clean environment (simulates real user experience).

**Use when:**
- Before publishing to npm
- Validating the exact package users will install
- CI/CD pre-publish checks

### Run npm integration tests:

```bash
# Run all integration tests (recommended before publish)
cd release/bozly
docker compose -f docker-compose.yml --profile test run all-tests

# Or run individual test stages:
docker compose -f docker-compose.yml --profile test run unit-tests
docker compose -f docker-compose.yml --profile test run test-install
docker compose -f docker-compose.yml --profile test run integration-tests
```

### The npm integration test stages:

**Stage 1: Unit Tests**
```bash
docker compose -f docker-compose.yml --profile test run unit-tests
```
- Runs code tests from compiled source
- Verifies TypeScript compilation works
- Coverage reporting

**Stage 2: Fresh Installation Test (CRITICAL)**
```bash
docker compose -f docker-compose.yml --profile test run test-install
```
- Simulates real user installing from npm
- Tests the `.tgz` package (created with `npm pack`)
- Verifies CLI entry point works: `npx bozly --version`
- Verifies help text: `npx bozly --help`
- Tests basic initialization: `npx bozly init test-vault`

**This is the most important test!** It catches:
- Missing build artifacts
- Broken bin entry point
- Missing dependencies in package.json
- `.gitignore` excluding needed files

**Stage 3: Integration Tests**
```bash
docker compose -f docker-compose.yml --profile test run integration-tests
```
- Tests all CLI commands end-to-end
- Tests vault operations
- Tests session recording
- Tests configuration management

### Pre-publish checklist:

Before running `npm publish`:

```bash
# 1. Run all Docker tests
docker compose -f docker-compose.yml --profile test run all-tests

# 2. Check npm pack contents
npm pack --dry-run

# 3. Verify package.json
cat package.json | grep -E '"version":|"name":|"main":|"bin":'

# 4. If all pass, publish
npm publish
```

---

## 3. Understanding the Dockerfile Stages

The main `Dockerfile` uses multi-stage builds:

### Stage 1: `dependencies`
```dockerfile
FROM node:22-alpine AS dependencies
# Installs npm dependencies
# Base for all other stages
```

### Stage 2: `builder`
```dockerfile
FROM dependencies AS builder
# Compiles TypeScript
# Creates npm package (.tgz)
```

### Stage 3: `unit-tests`
```dockerfile
FROM builder AS unit-tests
# Runs tests with coverage
# Persists results to /test-results
```

### Stage 4: `test-install` (Most Important)
```dockerfile
FROM node:22-alpine AS test-install
# Copies only the .tgz package (not source code)
# Installs with npm install (like a real user)
# Runs: npx bozly --version
# Runs: npx bozly --help
# Runs: npx bozly init
# ✅ Tests the actual distributed package
```

### Stage 5: `integration-tests`
```dockerfile
FROM builder AS integration-tests
# Tests all CLI commands and workflows
# Tests vault operations
# Tests session recording
```

### Stage 6: `production`
```dockerfile
FROM node:22-alpine AS production
# Minimal production runtime image
# Only includes built artifacts and production deps
# Creates non-root user for security
```

---

## 4. Docker Compose Services

The `docker-compose.yml` provides convenient services:

### Run individual services:

```bash
# Unit tests only
docker compose -f docker-compose.yml --profile test run unit-tests

# Fresh install test (most important for CLI)
docker compose -f docker-compose.yml --profile test run test-install

# Integration tests
docker compose -f docker-compose.yml --profile test run integration-tests

# All tests in sequence
docker compose -f docker-compose.yml --profile test run all-tests
```

### View test results:

```bash
# View coverage report
cat coverage/coverage-final.json

# View test results
ls -la test-results/

# View integration test output
docker compose -f docker-compose.yml --profile test logs integration-tests
```

### Clean up:

```bash
# Remove containers and networks
docker compose -f docker-compose.yml --profile test down --remove-orphans

# Remove built images
docker image rm bozly:test bozly:test-install
```

---

## 5. Troubleshooting

### Docker builds fail with "keychain" error on macOS

```bash
# Restart Docker
osascript -e 'quit app "Docker"'
sleep 3
open /Applications/Docker.app
sleep 10
```

### npm pack not working

```bash
# Verify package.json is valid
npm validate-npm-package-name

# Check what would be included
npm pack --dry-run

# Verify "files" field in package.json
cat package.json | grep -A 10 '"files":'
```

### CLI not accessible in test-install stage

Check that `package.json` has proper bin entry:

```bash
cat package.json | grep -A 2 '"bin":'
# Should show: "bozly": "./dist/cli/index.js"
```

Verify `dist/cli/index.js` exists with shebang:

```bash
head -1 dist/cli/index.js
# Should show: #!/usr/bin/env node
```

---

## 6. CI/CD Integration (GitHub Actions)

For automated testing before publish:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  docker-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose -f docker-compose.yml --profile test run all-tests
```

---

## 7. When to Use Each Docker Setup

| Scenario | Use |
|----------|-----|
| Making code changes | `Dockerfile.test` (fast local feedback) |
| Debugging a test failure | `Dockerfile.test` (edit and re-run) |
| Before git commit | `Dockerfile.test` (local verification) |
| Before npm publish | `Dockerfile` - `all-tests` (full verification) |
| In GitHub Actions | `Dockerfile` - `all-tests` (production simulation) |
| Teaching others | `Dockerfile` (shows real user experience) |

---

## 8. Industry Standards Reference

This setup follows proven patterns from:

- **Prisma** — Multi-stage Docker builds for package testing
- **AWS SDK** — Fresh install test verification
- **Docker Official** — Node.js Testing Best Practices
- **npm** — Package.json bin entry points and npm pack workflow

See the research document for detailed references.

---

## Summary

**Before publishing to npm:**

```bash
# 1. Build local tests (quick feedback)
docker compose -f docker-compose.test.yml up

# 2. Run full integration tests (pre-publish validation)
docker compose -f docker-compose.yml --profile test run all-tests

# 3. If all pass:
npm publish
```

**The critical test:** `test-install` stage verifies users can install and use bozly from npm.

