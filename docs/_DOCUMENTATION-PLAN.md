# Documentation Reorganization Plan

**Date:** 2025-12-27 (Session 122)
**Status:** In Progress
**Target:** User-facing, complete, organized documentation

---

## Current State Audit

**Total Docs:** 21 markdown files
**Last Update:** Dec 22-25, 2025
**Issue:** Docs are scattered, some outdated, need better organization and comprehensive examples

### Existing Files
- AI-PROVIDERS.md
- ARCHITECTURE.md
- CLEANUP.md
- CLI-DESIGN.md
- COMMANDS.md
- CONTEXT-LOADING.md
- DOMAIN-MODELS.md
- ECOSYSTEM.md
- GETTING-STARTED.md
- HOOKS.md
- MEMORY.md
- N8N-INTEGRATION.md
- ROADMAP.md
- SEARCH.md
- SERVE.md
- SESSION-RECORDING-GUIDE.md
- SMART-ROUTING.md
- SUGGESTIONS.md
- TEMPLATES.md
- VERSIONING-GUIDE.md

---

## Proposed Documentation Structure

### 1. Getting Started (Gateway Docs)
Users start here to get running quickly.

**Files:**
- `GETTING-STARTED.md` - Installation & first vault setup (UPDATE - add more walkthrough)
- `QUICK-START.md` - NEW - 5-minute quick start with examples

**What needs:**
- Step-by-step installation walkthrough
- First vault creation with screenshots/visuals
- First command example
- Common use cases overview

### 2. Core Concepts (Understanding BOZLY)
Foundational understanding before using features.

**Files:**
- `ARCHITECTURE.md` - System design (UPDATE - add diagrams, simplify)
- `CONCEPTS.md` - NEW - Key concepts: nodes, commands, context, sessions
- `FOLDER-STRUCTURE.md` - NEW - Complete folder layout with explanations

**What needs:**
- How nodes work
- How context flows
- How sessions are recorded
- Folder organization explained
- Three-tier safety model
- AI-agnostic architecture

### 3. User Guides (How-To for Each Feature)
Step-by-step guides for each major feature. Each with multiple examples.

**Files to create/update:**
- `COMMANDS-GUIDE.md` - Creating and running commands (merge + enhance)
- `WORKFLOWS-GUIDE.md` - Multi-step automation
- `HOOKS-GUIDE.md` - Event triggers and automation
- `TEMPLATES-GUIDE.md` - Using templates effectively
- `CONTEXT-GUIDE.md` - Managing AI context
- `SESSIONS-GUIDE.md` - Session recording & history
- `MEMORY-GUIDE.md` - Memory extraction and injection
- `AI-PROVIDERS-GUIDE.md` - Configuring AI providers

**Each should have:**
- What & why
- Quick start
- Real-world examples (music, journal, project domains)
- Common patterns
- Troubleshooting
- Related features

### 4. Advanced Topics (Power User Features)
Advanced usage patterns and specialized features.

**Files to create/update:**
- `SEARCH-GUIDE.md` - Cross-node search
- `SMART-ROUTING.md` - Intelligent command routing
- `SUGGESTIONS-GUIDE.md` - AI-powered suggestions
- `CLEANUP-GUIDE.md` - Auto-cleanup rules
- `VERSIONING-GUIDE.md` - Version management
- `DOMAIN-MODELS-GUIDE.md` - Domain-specific models

### 5. Reference (Technical Docs)
Comprehensive reference for developers.

**Files to create/update:**
- `CLI-REFERENCE.md` - NEW - All 19 CLI commands with options and examples
- `API-REFERENCE.md` - NEW - TypeScript function reference
- `CONFIGURATION-REFERENCE.md` - NEW - All config options

**What needs:**
- Complete command listing
- All options and flags
- Type definitions
- Return values
- Error codes
- Usage examples

### 6. Infrastructure Docs
System admin and infrastructure.

**Files:**
- `SERVE.md` - Web server & dashboard (UPDATE)
- `N8N-INTEGRATION.md` - n8n orchestration (UPDATE)

### 7. Project Meta
Project-level documentation.

**Files:**
- `ROADMAP.md` - Feature roadmap (UPDATE to 2025-12-27)
- `ECOSYSTEM.md` - Integrations & ecosystem (UPDATE)

---

## Implementation Plan

### Phase 1: Foundation (Get Started Docs)
- [ ] Update `GETTING-STARTED.md` with detailed walkthrough
- [ ] Create `QUICK-START.md` with 5-minute example
- [ ] Create `CONCEPTS.md` with foundational knowledge
- [ ] Create `FOLDER-STRUCTURE.md` with complete layout

### Phase 2: Core Guides (How-To Docs)
- [ ] Create/Update `COMMANDS-GUIDE.md` (comprehensive with examples)
- [ ] Create `WORKFLOWS-GUIDE.md` (with real examples)
- [ ] Create `HOOKS-GUIDE.md` (with real examples)
- [ ] Create `TEMPLATES-GUIDE.md` (complete guide)
- [ ] Create `CONTEXT-GUIDE.md` (best practices)
- [ ] Create `SESSIONS-GUIDE.md` (exploring history)
- [ ] Create `MEMORY-GUIDE.md` (extraction & injection)
- [ ] Create `AI-PROVIDERS-GUIDE.md` (configuration)

### Phase 3: Reference Docs
- [ ] Create `CLI-REFERENCE.md` (all 19 commands documented)
- [ ] Create `API-REFERENCE.md` (TypeScript API)
- [ ] Create `CONFIGURATION-REFERENCE.md` (all config options)

### Phase 4: Advanced & Meta
- [ ] Update `SEARCH-GUIDE.md`
- [ ] Update `SMART-ROUTING.md`
- [ ] Update `SUGGESTIONS-GUIDE.md`
- [ ] Update `CLEANUP-GUIDE.md`
- [ ] Update `SERVE.md`
- [ ] Update `ROADMAP.md` (Session 122, 2025-12-27)
- [ ] Update `ARCHITECTURE.md`
- [ ] Update timestamps on all files

### Phase 5: Organization & Index
- [ ] Create `README.md` for docs folder with TOC
- [ ] Create navigation structure
- [ ] Update all cross-references
- [ ] Verify all links work

---

## Content Guidelines

### For Every Guide
1. **What & Why** - What is this feature? Why use it?
2. **Quick Start** - Get running in 2-3 steps
3. **Real Examples** - At least 3 domain examples:
   - Music vault
   - Journal vault
   - Project vault
4. **Common Patterns** - How people typically use it
5. **Troubleshooting** - Common issues & solutions
6. **See Also** - Related features

### Examples to Include
- **Music Domain** - Album reviews, discovery sessions, listening tracking
- **Journal Domain** - Daily reflection, mood tracking, goal progress
- **Project Domain** - Sprint planning, standup, retrospective
- **General** - Quick note, brainstorm, summarize

### Technical Accuracy
- All commands tested
- All options accurate
- All examples executable
- All config options verified
- Test against actual code

---

## Success Criteria

- ✅ All 19 CLI commands documented with examples
- ✅ All major features have how-to guides
- ✅ Getting started is walkthrough-based
- ✅ Architecture explained clearly
- ✅ Every file dated 2025-12-27
- ✅ Clear navigation and cross-references
- ✅ Real-world examples in each domain
- ✅ No broken links or references
- ✅ Consistent formatting throughout
- ✅ TypeScript API documented

---

## File Count Target

| Section | Count | Status |
|---------|-------|--------|
| Getting Started | 2 | ⚪ New |
| Core Concepts | 3 | ⚪ New/Update |
| User Guides | 8 | ⚪ New/Update |
| Advanced Topics | 6 | ⚪ New/Update |
| Reference | 3 | ⚪ New |
| Infrastructure | 2 | ⚪ Update |
| Project Meta | 2 | ⚪ Update |
| **Total** | **26** | ⚪ In Progress |

---

## Session Timeline

- **Session 122:** Planning & outline (THIS SESSION)
- **Session 122-123:** Getting Started & Concepts
- **Session 123-124:** Core Guides (Commands, Workflows, Hooks)
- **Session 124-125:** More Guides (Templates, Context, Sessions, Memory)
- **Session 125-126:** Reference (CLI, API, Config)
- **Session 126:** Advanced Topics & Meta
- **Session 126:** Organization, links, verification

---

**Next Step:** Start with Phase 1 - Getting Started docs

---

## See Also

- [DOCUMENTATION-STATUS.md](DOCUMENTATION-STATUS.md) — Current progress tracking
- [DOCUMENTATION-COMPLETION-SESSION-122.md](DOCUMENTATION-COMPLETION-SESSION-122.md) — Session 122 completion report
- [README.md](README.md) — Documentation navigation hub
- [GETTING-STARTED.md](GETTING-STARTED.md) — Getting started with BOZLY

*Last updated: 2025-12-27 (Session 122)*
