# BOZLY TUI Migration Tasks

**Project:** Migrate BOZLY TUI from blessed (unmaintained v0.1.81) to unblessed, with architecture preparation for Ink.js integration.

**Planning:** [SESSION-123-HYBRID-TUI-MIGRATION-PLAN.md](./planning/current/SESSION-123-HYBRID-TUI-MIGRATION-PLAN.md)

**Timeline:** Sessions 124-125 (18-24 hours total)

---

## Session 124: Phase 1 Setup & Testing (10-14 hours)

### Task 1.1: Audit Current Blessed Usage
**Estimated Time:** 2 hours
**Status:** Pending

**Description:** Audit all blessed imports and usage across the codebase to understand current implementation.

**Checklist:**
- [ ] List all files using blessed (import statements)
- [ ] Document each blessed widget/method used
- [ ] Identify terminal capabilities being used (mouse, colors, borders, etc.)
- [ ] Check for custom blessed extensions or monkey-patching
- [ ] Create usage inventory spreadsheet

**Success Criteria:**
- Complete list of blessed usage
- No hidden blessed dependencies
- Clear understanding of required features

**Files to Check:**
- `src/cli/tui/core/app.ts`
- `src/cli/tui/core/screen.ts`
- `src/cli/tui/core/modal.ts`
- `src/cli/tui/screens/*.ts`
- `src/cli/tui/utils/server.ts`

---

### Task 1.2: Dependency & Type Definition Swap
**Estimated Time:** 1 hour
**Status:** Pending

**Description:** Replace blessed with unblessed in package.json and update type definitions.

**Checklist:**
- [ ] Update package.json: `"blessed": "^0.1.81"` → `"@unblessed/node": "^0.5.0"`
- [ ] Remove `@types/blessed` from devDependencies
- [ ] Install unblessed: `npm install @unblessed/node`
- [ ] Verify no type conflicts
- [ ] Check lock file updates

**Success Criteria:**
- No blessed package references in node_modules
- TypeScript knows about @unblessed/node types
- `npm list blessed` returns nothing

**Implementation Notes:**
- unblessed provides its own TypeScript types
- 100% API compatible with blessed v0.1.81
- No type mapping needed

---

### Task 1.3: Test Suite Audit & Updates
**Estimated Time:** 4-6 hours
**Status:** Pending

**Description:** Audit test suite and update for unblessed compatibility.

**Checklist - Part 1: Audit**
- [ ] Identify all TUI tests in `__tests__/`
- [ ] Document which tests import blessed directly
- [ ] Identify mocks for blessed widgets
- [ ] List test utilities and helpers
- [ ] Document terminal capability assumptions

**Checklist - Part 2: Update Imports**
- [ ] Replace all `blessed` imports with `@unblessed/node`
- [ ] Update mock definitions for blessed widgets
- [ ] Update test utilities to use unblessed
- [ ] Ensure type definitions are correct
- [ ] Fix any import path issues

**Checklist - Part 3: Fix Assertions**
- [ ] Run baseline test suite with unblessed
- [ ] Identify failing assertions
- [ ] Fix widget/method call assertions
- [ ] Update screen rendering assertions
- [ ] Verify API client mocks still work

**Checklist - Part 4: Comprehensive Testing**
- [ ] All unit tests passing (app, screen, modal, api-client)
- [ ] All integration tests passing
- [ ] Terminal UI rendering tests
- [ ] Keyboard input simulation tests
- [ ] Error handling tests

**Success Criteria:**
- All TUI tests passing with unblessed
- No blessed references in test suite
- Test coverage maintained (100% for core modules)
- No flaky tests introduced

**Test Files to Update:**
- `__tests__/cli/tui/core/app.test.ts`
- `__tests__/cli/tui/core/screen.test.ts`
- `__tests__/cli/tui/core/modal.test.ts`
- `__tests__/cli/tui/core/api-client.test.ts`
- `__tests__/cli/tui/screens/*.test.ts`

---

### Task 1.4: Core Library Migration
**Estimated Time:** 2 hours
**Status:** Pending

**Description:** Update all source files to use @unblessed/node instead of blessed.

**Checklist:**
- [ ] Update all import statements across TUI modules
- [ ] Replace `import blessed from "blessed"` with `import blessed from "@unblessed/node"`
- [ ] Verify blessed.screen() calls still work
- [ ] Verify blessed.box() calls still work
- [ ] Check for any blessed-specific features

**Success Criteria:**
- Zero blessed imports remaining
- All imports use @unblessed/node
- TypeScript compilation passes
- No import-time errors

**Files to Update:**
- `src/cli/tui/core/app.ts`
- `src/cli/tui/core/screen.ts`
- `src/cli/tui/core/modal.ts`
- `src/cli/tui/index.ts`
- All screen implementations

---

### Task 1.5: Build & Type Check
**Estimated Time:** 1 hour
**Status:** Pending

**Description:** Verify build succeeds with unblessed and no TypeScript errors.

**Checklist:**
- [ ] Run `npm run build`
- [ ] Zero TypeScript errors
- [ ] Zero compiler warnings
- [ ] ESLint passes: `npm run lint`
- [ ] No undefined type references
- [ ] Check dist/ output for blessed refs

**Success Criteria:**
- Build completes without errors
- Type checking clean
- ESLint clean
- dist/ properly generated

---

### Task 1.6: Manual TUI Testing (All 8 Screens)
**Estimated Time:** 4-6 hours
**Status:** Pending

**Description:** Comprehensive manual testing of all TUI screens with unblessed.

**Checklist - Home Screen**
- [ ] Screen loads without errors
- [ ] Dashboard displays stats
- [ ] Navigation menu shows
- [ ] All menu items selectable (1-8)
- [ ] Quit works (Q)
- [ ] Help works (?)

**Checklist - Vaults Screen**
- [ ] Vault list displays
- [ ] Can scroll through vaults
- [ ] Vault details load on select
- [ ] No rendering glitches
- [ ] Colors display correctly

**Checklist - Sessions Screen**
- [ ] Session list displays
- [ ] Sessions load from API
- [ ] Can view session details
- [ ] Pagination works (if implemented)
- [ ] Filter/search works

**Checklist - Memory Screen**
- [ ] Memory list displays
- [ ] Extraction status shows
- [ ] Memory items selectable
- [ ] View memory details works
- [ ] No truncation issues

**Checklist - Commands Screen**
- [ ] Command list displays
- [ ] Can view command details
- [ ] Command execution triggers
- [ ] Status updates show
- [ ] No command parsing errors

**Checklist - Workflows Screen**
- [ ] Workflow list displays
- [ ] Workflow status shows
- [ ] Can execute workflows
- [ ] Task chain displays correctly
- [ ] Status updates reflect changes

**Checklist - Config Screen**
- [ ] Config values display
- [ ] Can edit settings
- [ ] Changes persist
- [ ] Validation works
- [ ] No unhandled errors

**Checklist - Health Screen**
- [ ] Health status displays
- [ ] API stats show
- [ ] System resources display
- [ ] Real-time updates work
- [ ] All metrics present

**Checklist - General UI**
- [ ] Terminal resize handled
- [ ] Colors and styling consistent
- [ ] Mouse input works
- [ ] Keyboard navigation works
- [ ] No layout corruption

**Success Criteria:**
- All 8 screens fully functional
- No visual glitches
- All user interactions working
- API integration stable
- No degraded mode warnings

---

### Task 1.7: Test Suite Run & Fix
**Estimated Time:** 2-3 hours
**Status:** Pending

**Description:** Run complete test suite and fix any failing tests.

**Checklist:**
- [ ] Run `npm test` (full suite)
- [ ] Document failures
- [ ] Fix assertion failures
- [ ] Fix mock incompatibilities
- [ ] Update screen render tests
- [ ] Update widget creation tests
- [ ] Run test suite again until 100% pass
- [ ] Verify coverage metrics

**Success Criteria:**
- All tests passing (100% pass rate)
- Test coverage maintained or improved
- No timeout issues
- No flaky tests

---

### Task 1.8: Documentation Updates
**Estimated Time:** 1 hour
**Status:** Pending

**Description:** Update troubleshooting and development docs for unblessed.

**Checklist:**
- [ ] Update TROUBLESHOOTING.md with unblessed-specific issues
- [ ] Add unblessed configuration notes to docs
- [ ] Update TUI-DEVELOPMENT-GUIDE.md
- [ ] Add migration notes for future reference
- [ ] Update terminal compatibility section
- [ ] Add performance notes

**Success Criteria:**
- Documentation reflects unblessed reality
- New developers can understand changes
- Migration rationale documented

---

### Task 1.9: Phase 1 Completion Summary
**Estimated Time:** 1 hour
**Status:** Pending

**Description:** Document Phase 1 results and prepare for Phase 2.

**Checklist:**
- [ ] Document all changes made
- [ ] Performance comparison (blessed vs unblessed)
- [ ] Test results summary
- [ ] Any regressions or improvements noted
- [ ] Issues encountered and solutions
- [ ] Create Phase 1 summary doc
- [ ] Update CHANGELOG with Phase 1 notes

**Success Criteria:**
- Complete Phase 1 documentation
- Clear record of what changed
- Ready for Phase 2 planning

---

## Session 125: Phase 2 Architecture & Release (8-10 hours)

### Task 1.10: Extract Shared Hooks Architecture
**Estimated Time:** 4-5 hours
**Status:** Pending

**Description:** Extract platform-agnostic business logic into React hooks for code sharing between CLI (unblessed) and web (Ink.js).

**Checklist:**
- [ ] Create `/src/shared/hooks/` directory structure
- [ ] Create `useVaults()` hook (load, filter, sort vaults)
- [ ] Create `useSessions()` hook (load, filter session history)
- [ ] Create `useMemory()` hook (load, filter memory entries)
- [ ] Create `useCommands()` hook (load, filter, search commands)
- [ ] Create `useWorkflows()` hook (load, execute, monitor workflows)
- [ ] Create `useHealth()` hook (fetch and update system health)
- [ ] Create `useAPIClient()` hook (reusable API integration)
- [ ] Create custom hook utilities (useFetch, usePolling, useDebounce)
- [ ] Update all TUI screens to use hooks instead of direct API calls
- [ ] Verify tests still pass with hook refactoring

**Architecture:**
```typescript
// /src/shared/hooks/useVaults.ts
export function useVaults() {
  return {
    vaults: Vault[],
    loading: boolean,
    error: Error | null,
    refresh: () => Promise<void>,
    filter: (query: string) => Vault[],
    // No UI rendering logic
  }
}
```

**Success Criteria:**
- 8+ shared hooks created
- All screen data logic extracted
- UI-agnostic implementation
- Tests still passing
- Ready for Ink.js reuse in Phase 2 (April 2026)

---

### Task 1.11: Shared State Management with Zustand
**Estimated Time:** 2-3 hours
**Status:** Pending

**Description:** Create shared state management layer for global app state.

**Checklist:**
- [ ] Create `/src/shared/state/` directory
- [ ] Create AppStore with Zustand (global app state)
- [ ] Store current screen/mode
- [ ] Store user preferences
- [ ] Store API connection status
- [ ] Store cache metadata
- [ ] Create TypeScript types for store
- [ ] Update TUI app to use store
- [ ] Add store persistence (localStorage for future web UI)
- [ ] Verify tests work with store

**Success Criteria:**
- Centralized state management
- Type-safe store
- Ready for web UI reuse
- No prop drilling in screens

---

### Task 1.12: Update TUI Screens to Use Hooks
**Estimated Time:** 2-3 hours
**Status:** Pending

**Description:** Refactor all screen implementations to use shared hooks instead of direct API calls.

**Checklist:**
- [ ] Update HomeScreen to use hooks
- [ ] Update VaultsScreen to use useVaults()
- [ ] Update SessionsScreen to use useSessions()
- [ ] Update MemoryScreen to use useMemory()
- [ ] Update CommandsScreen to use useCommands()
- [ ] Update WorkflowsScreen to use useWorkflows()
- [ ] Update ConfigScreen for state management
- [ ] Update HealthScreen to use useHealth()
- [ ] Remove duplicated API logic
- [ ] Run tests after each screen update

**Success Criteria:**
- All screens using shared hooks
- No duplicate API logic
- All tests passing
- Screens only handle rendering (unblessed widgets)

---

### Task 1.13: Ink.js Integration Preparation
**Estimated Time:** 2-3 hours
**Status:** Pending

**Description:** Document Ink.js integration points and prepare architecture for Phase 2.

**Checklist:**
- [ ] Document shared hook signatures
- [ ] Identify UI-specific screen components (blessed widgets)
- [ ] Plan Ink.js component structure
- [ ] Create Ink.js screen skeleton
- [ ] Document state management mapping
- [ ] List breaking changes to avoid
- [ ] Create integration guide for Ink.js
- [ ] Note any additional hooks needed

**Success Criteria:**
- Clear integration plan for Ink.js
- Shared hooks documented and stable
- No refactoring needed before Ink.js phase

---

### Task 1.14: Performance Benchmarking
**Estimated Time:** 1-2 hours
**Status:** Pending

**Description:** Compare performance metrics between blessed and unblessed.

**Checklist:**
- [ ] Measure startup time (before/after)
- [ ] Measure screen rendering time
- [ ] Measure memory usage
- [ ] Measure API response latency
- [ ] Test with large data sets (100+ vaults, sessions)
- [ ] Document CPU usage during polling
- [ ] Compare degraded mode behavior
- [ ] Create performance report

**Success Criteria:**
- Performance data collected
- No significant regressions
- Any improvements noted
- Baseline established for future versions

---

### Task 1.15: Final Test Suite Run
**Estimated Time:** 1 hour
**Status:** Pending

**Description:** Comprehensive final test run before release.

**Checklist:**
- [ ] Run full test suite: `npm test`
- [ ] Verify 100% test pass rate
- [ ] Check coverage: `npm run test:coverage`
- [ ] Run linter: `npm run lint`
- [ ] Run type check: `npx tsc --noEmit`
- [ ] Build release: `npm run build`
- [ ] Verify dist/ output
- [ ] Document any edge cases

**Success Criteria:**
- All tests passing
- Coverage maintained
- Zero type errors
- Build successful

---

### Task 1.16: Update CHANGELOG & Version
**Estimated Time:** 1 hour
**Status:** Pending

**Description:** Document changes for v0.7.0-beta.1 release.

**Checklist:**
- [ ] Update CHANGELOG.md with Phase 1 summary
  - Blessed → unblessed migration
  - Performance improvements
  - Architecture preparation for Ink.js
  - Bug fixes and improvements
- [ ] List breaking changes (if any)
- [ ] Update version: v0.6.0 → v0.7.0-beta.1
- [ ] Update package.json version
- [ ] Update docs version references
- [ ] Create summary of changes

**Success Criteria:**
- CHANGELOG reflects all changes
- Version bumped correctly
- Release notes clear

---

### Task 1.17: Create Migration Summary Commit
**Estimated Time:** 30 minutes
**Status:** Pending

**Description:** Create detailed commit documenting Phase 1 migration.

**Checklist:**
- [ ] Stage all changes: `git add -A`
- [ ] Create detailed commit message with migration summary
- [ ] Include before/after metrics
- [ ] Reference SESSION-123 planning doc
- [ ] Document breaking changes (if any)
- [ ] Sign commit if using GPG

**Commit Message Template:**
```
feat: Migrate TUI from blessed to unblessed (Phase 1 complete)

Migration Summary:
- Replaced blessed v0.1.81 (unmaintained) with @unblessed/node v0.5.0
- 100% API compatible, zero refactoring needed
- All 8 TUI screens fully functional
- All tests passing (1,642+ tests)
- Performance: [comparison data]

Architecture Improvements:
- Extracted 8+ shared hooks for web/CLI code reuse
- Centralized state management with Zustand
- Prepared for Ink.js integration (Phase 2, April 2026)
- Improved type safety and test coverage

Related:
- Fixes recurring terminal compatibility issues
- Resolves blessed maintenance risk
- Enables future multi-platform UI support

BREAKING CHANGES: None

🚀 Ready for bozly.io web UI integration (Phase 2)
```

**Success Criteria:**
- Commit created and ready to push
- Message documents entire migration

---

### Task 1.18: Release v0.7.0-beta.1
**Estimated Time:** 30 minutes
**Status:** Pending

**Description:** Merge Phase 1 work and create release.

**Checklist:**
- [ ] Review all commits since v0.6.0
- [ ] Verify test suite: `npm test`
- [ ] Merge migration branch to main (if using feature branch)
- [ ] Tag release: `git tag -a v0.7.0-beta.1 -m "TUI migration complete"`
- [ ] Push: `git push origin main --tags`
- [ ] Update GitHub releases
- [ ] Publish npm package: `npm publish --tag beta`
- [ ] Create release notes on GitHub

**Success Criteria:**
- v0.7.0-beta.1 released on GitHub
- Package available on npm
- All assets published

---

## Success Metrics

**Phase 1 (Session 124):**
- ✅ All 9 tasks completed (10-14 hours)
- ✅ All tests passing
- ✅ All 8 screens functional
- ✅ Zero blessed dependencies
- ✅ Documentation updated

**Phase 2 (Session 125):**
- ✅ All 9 tasks completed (8-10 hours)
- ✅ Shared hooks extracted
- ✅ State management centralized
- ✅ Ink.js integration prepared
- ✅ Performance benchmarked
- ✅ v0.7.0-beta.1 released

**Total:** 18-24 hours across 2 sessions

---

## Risk Management

**Identified Risks:**
1. **unblessed API incompatibility** → Mitigation: 100% API compatible, quick fallback to blessed if needed
2. **Test failures** → Mitigation: Comprehensive audit in Task 1.3, systematic fixes
3. **Performance regression** → Mitigation: Benchmarking in Task 1.14, baselines established
4. **Terminal compatibility issues** → Mitigation: Test on macOS, Linux, WSL2

**Rollback Plan:**
- If unblessed fails, revert to blessed (1 hour)
- All changes tracked in git, easy to revert
- Tests provide safety net

---

## Related Documentation

- [SESSION-123-HYBRID-TUI-MIGRATION-PLAN.md](./planning/current/SESSION-123-HYBRID-TUI-MIGRATION-PLAN.md) — Strategic planning
- [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) — Terminal issues guide
- [TUI-DEVELOPMENT-GUIDE.md](./docs/TUI-DEVELOPMENT-GUIDE.md) — Development reference
- [BOZLY-ROADMAP.md](./planning/current/BOZLY-ROADMAP.md) — Overall project roadmap
