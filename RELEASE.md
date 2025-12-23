# BOZLY Release Guide

Complete step-by-step guide for releasing BOZLY to npm and GitHub.

---

## Overview

BOZLY uses **full automation** for releases:

```
Developer pushes release tag
         ↓
GitHub Actions starts release workflow
         ↓
Runs: Lint → Format → Build → Unit Tests → Docker npm Integration Tests
         ↓
If all pass:
  - npm publish
  - Create GitHub Release
  - Done! ✅

If any fail:
  - Release blocked automatically
  - Workflow logs show detailed error
  - Fix issues and try again
```

---

## Pre-Release Checklist

### 1. Ensure Main Branch is Clean

```bash
git status
```

**Expected output:** `nothing to commit, working tree clean`

If not clean:
```bash
git add .
git commit -m "your message"
git push origin main
```

### 2. Run Full Validation Locally

```bash
npm run validate
```

**What it does:**
- ESLint (code quality)
- Prettier (formatting)
- TypeScript compilation
- Unit tests with coverage

**Must pass:** All checks green ✅

If any fail:
```bash
npm run lint:fix      # Auto-fix linting errors
npm run format        # Auto-format code
npm run test:watch    # Debug test failures
```

### 3. Run Docker Integration Tests

**This is CRITICAL.** Validates the exact npm package users will receive.

```bash
cd release/bozly
docker compose -f docker-compose.yml --profile test up
```

**What it validates:**
- Creates actual npm package
- Tests fresh npm install (like real user)
- Verifies CLI commands work
- Runs integration tests

**Success indicators:**
- All stages complete without errors
- Final output shows: `✅ test-install: SUCCESS`
- `integration-tests` completes successfully

**If Docker tests fail:**
1. Check the error logs (they're detailed)
2. Fix the issue in code
3. Commit the fix
4. Re-run Docker tests
5. Don't proceed to release until Docker tests pass

### 4. Update Changelog (if needed)

If this is a significant release:

```bash
# Edit CHANGELOG.md
vim CHANGELOG.md
```

Add section for the new version at the top:

```markdown
## v0.3.1 (December 22, 2025)

### Features
- Docker npm integration tests in CI/CD
- Automated release workflow

### Fixes
- Fixed CLI executable permissions on npm install

### Documentation
- Added complete RELEASE.md guide
- Updated DEVELOPMENT.md with Docker/CI documentation
```

Commit if changed:
```bash
git add CHANGELOG.md
git commit -m "docs: Update changelog for v0.3.1"
git push origin main
```

---

## Release Steps

### Step 1: Update Version

Use `npm version` to update package.json and create a git tag:

```bash
# Choose one:
npm version patch        # 0.3.0 → 0.3.1 (bug fixes)
npm version minor        # 0.3.0 → 0.4.0 (new features)
npm version major        # 0.3.0 → 1.0.0 (breaking changes)
```

**What this does:**
- Updates version in `package.json`
- Updates version in `package-lock.json`
- Creates git commit with message `vX.Y.Z`
- Creates git tag for the version
- Local changes only (not yet pushed)

**Example:**
```bash
$ npm version patch
npm WARN bozly@0.3.1 package.json

> retroghostlabs-bozly@0.3.1 preversion
> npm run validate

# ... validation runs ...

# Creates:
# - Commit: "0.3.1"
# - Tag: "v0.3.1"
```

### Step 2: Verify the Tag

```bash
git tag -l | head -5        # List latest tags
git log --oneline -3        # Verify commit message

# Expected output:
# 24a2381 0.3.1
# abc1234 Previous commit
```

### Step 3: Push Tag to GitHub

```bash
git push origin main        # Push commits to main
git push --tags             # Push all tags
```

**Or combined:**
```bash
git push origin main --tags
```

### Step 4: GitHub Actions Automatically Takes Over

Once you push the tag:

1. GitHub Actions detects the push
2. Release workflow starts automatically
3. **You can watch progress in GitHub:**

   ```
   GitHub → Your repo → Actions tab
   → Look for "Release" workflow
   → Watch it progress through each step
   ```

4. Workflow will:
   - Run lint/format/build (5-10 seconds)
   - Run unit tests (30-45 seconds)
   - Run Docker npm integration tests (3-5 minutes)
   - Publish to npm (10-20 seconds)
   - Create GitHub Release (5 seconds)

5. **Workflow completes successfully:**
   - ✅ All checks pass
   - ✅ Package published to npm
   - ✅ GitHub Release created

### Step 5: Verify Release

Once workflow completes:

#### Check npm

```bash
npm view @retroghostlabs/bozly versions
```

Should show your new version in the list.

Or visit: https://www.npmjs.com/package/@retroghostlabs/bozly

#### Check GitHub

1. Go to: https://github.com/RetroGhostLabs/bozly/releases
2. New release should be at the top
3. Should have auto-generated release notes

#### Test Fresh Install

In a temporary directory:

```bash
mkdir /tmp/bozly-test && cd /tmp/bozly-test
npm init -y
npm install @retroghostlabs/bozly
npx bozly --version

# Should show: bozly 0.3.1 (or your version)
```

---

## Troubleshooting

### GitHub Actions Release Workflow Failed

**Check the error:**
1. Go to GitHub Actions tab
2. Click on failed "Release" workflow
3. Look for the failed step
4. Read the error message (usually very detailed)

**Common failures:**

#### Docker tests failed
- Something is wrong with the package
- Fix the issue in code
- Push fix to main: `git push origin main`
- Re-run workflow (manual trigger or new tag)

#### npm publish failed
- Usually means `NPM_TOKEN` secret is missing or expired
- Contact maintainer to check GitHub secrets

#### Tag was created but workflow didn't start
- GitHub Actions might be disabled
- Check: Settings → Actions → General → Workflow Permissions

### Need to Cancel Release

If you pushed a tag by mistake:

```bash
# Delete local tag
git tag -d v0.3.1

# Delete remote tag
git push origin --delete v0.3.1

# GitHub Actions will stop if it hasn't started yet
# (If already running, let it finish or manually cancel)
```

### Released Wrong Version

If you published the wrong version (rare):

```bash
# Deprecate on npm
npm deprecate @retroghostlabs/bozly@0.3.1 "Use version 0.3.2 instead"

# Then release the correct version
```

---

## Automated Release Workflow Details

### What GitHub Actions Does

**File:** `.github/workflows/release.yml`

**Trigger:** Push tag matching `v*` (e.g., `v0.3.1`, `v1.0.0`)

**Steps:**

1. **Setup** (10 seconds)
   - Checkout code
   - Setup Node.js 22.x
   - Cache npm dependencies

2. **Lint** (5 seconds)
   - Run ESLint
   - Fails if code quality issues found

3. **Format Check** (3 seconds)
   - Verify Prettier formatting
   - Fails if code not properly formatted

4. **Build** (15 seconds)
   - Compile TypeScript → dist/
   - Fails if compilation errors

5. **Unit Tests** (30 seconds)
   - Run full test suite with coverage
   - Generates coverage reports
   - Fails if any test fails

6. **Docker npm Integration Tests** (3-5 minutes)
   - Create npm package
   - Test fresh npm install (critical!)
   - Verify CLI commands work
   - Run integration tests
   - Fails if package is broken

7. **npm Publish** (15 seconds)
   - Authenticate with NPM_TOKEN secret
   - Publish package to npm
   - Only runs if all tests pass

8. **Create GitHub Release** (5 seconds)
   - Creates release page on GitHub
   - Auto-generates release notes from commits
   - Links to npm package

### Secrets Required

For release workflow to work, GitHub repo needs:

- **NPM_TOKEN** - npm authentication token (set in GitHub secrets)
- **GITHUB_TOKEN** - Auto-provided by GitHub Actions

If `NPM_TOKEN` is missing:
1. Create npm token: https://www.npmjs.com/settings/your-username/tokens
2. Add to GitHub repo secrets: Settings → Secrets and variables → Actions
3. Name it: `NPM_TOKEN`
4. Re-run workflow

---

## Release Workflow Summary

| Step | Command | Time | Can Fail? |
|------|---------|------|-----------|
| Local validation | `npm run validate` | 2 min | Yes |
| Docker tests | `docker compose ... up` | 5 min | Yes |
| Version bump | `npm version patch` | 5 sec | No |
| Push tag | `git push --tags` | 5 sec | No |
| GitHub Actions | (automatic) | 5 min | Yes |
| Publish to npm | (automatic) | 15 sec | Yes |
| Create Release | (automatic) | 5 sec | No |

**Total time (after push):** ~5 minutes

---

## Quick Reference

### Release a new version:

```bash
# 1. Ensure everything is clean and tested
npm run validate
docker compose -f docker-compose.yml --profile test up

# 2. Bump version and create tag
npm version patch   # or minor/major

# 3. Push to GitHub (releases automatically)
git push origin main --tags

# 4. Wait for GitHub Actions (watch Actions tab)
# 5. Verify at npm registry
npm view @retroghostlabs/bozly versions
```

### Manual GitHub Actions Trigger

If you need to manually trigger the release workflow:

1. Go to: GitHub → Actions tab
2. Select "Release" workflow on the left
3. Click "Run workflow" button
4. Enter tag name (e.g., `v0.3.1`)
5. Click "Run workflow"

---

## History

| Version | Date | Notes |
|---------|------|-------|
| 0.3.0-beta.1 | 2025-12-21 | First beta release |
| 0.3.0-rc.1 | 2025-12-22 | Release candidate |

---

**For more details on testing, see:** `DOCKER-TESTING.md` and `DEVELOPMENT.md`

**For CLI usage, see:** `README.md` and `docs/`

---

*Last updated: 2025-12-22*
