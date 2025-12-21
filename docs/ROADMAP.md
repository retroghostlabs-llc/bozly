# BOZLY Roadmap

**Build. OrganiZe. Link. Yield.**

*Last updated: December 19, 2025 (Session 40 - Logging integration complete, Sprint 1 100% done)*

---

## Current Status

**Phase:** 1 (Beta Development) - FOUNDATION COMPLETE
**Version:** 0.3.0-alpha.1
**Status:** Framework fully built with comprehensive logging, ready for Sprint 2 (Execution phase)

### What's Done (Sessions 33-40)

**Sessions 33-37: Core Implementation**
- ✅ TypeScript project structure (`src/cli/`, `src/core/`)
- ✅ package.json with npm/bin configuration
- ✅ tsconfig.json for compilation
- ✅ CLI entry point and 7 command implementations
- ✅ Core modules (vault, registry, context, commands, config, types)
- ✅ 4 vault templates (default, music, journal, content)
- ✅ 2 example vaults with .bozly/ structure
- ✅ TypeScript compilation fully working (63 unit tests passing)

**Session 38-40: Logging Infrastructure**
- ✅ Comprehensive logging system (400+ lines)
- ✅ Logging integrated into all 4 core modules
- ✅ CLI entry point logging with BOZLY_DEBUG support
- ✅ All 7 CLI commands enhanced with logging
- ✅ JSON structured logging with timestamps
- ✅ Async non-blocking file I/O for logs
- ✅ ~/.bozly/logs/ directory creation and management

### What's Next (Session 41+)

**Sprint 2 (Sessions 41-44): Execution**
1. Context loading and AI CLI integration
2. Command execution pipeline
3. `bozly run` fully functional
4. ~1500 lines of code

**Sprint 3 (Sessions 45-48): Patterns**
1. Domain models implementation (Pattern 7)
2. Session logging and transparency (Pattern 2)
3. Versioning system (Pattern 4)

**Sprint 4 (Sessions 49-52): Release**
1. Full test coverage (80%+)
2. Documentation and examples
3. npm/Homebrew publish
4. Beta 1 release (v0.3.0)

---

## Overview

BOZLY is an AI-agnostic framework for deploying domain-specific workspaces. It provides context management, session continuity, and vault orchestration across any AI provider (Claude, GPT, Gemini, local LLMs).

**Key Differentiator:** BOZLY is NOT a Claude plugin. It's an independent framework that works with ANY AI CLI.

---

## Tech Stack (Decided)

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | Matches Cline/Cursor ecosystem |
| Storage | JSON files | Simple, debuggable (SQLite later if needed) |
| AI Support | AI-agnostic | Works with any AI CLI |
| Platforms | macOS, Linux, WSL2 | Unix-native, no native Windows |
| Distribution | npm, Homebrew, git clone | Standard package managers |

---

## Phase 1: Beta (v0.3.0)

**Goal:** Minimal working product with core vault functionality + LogicFlows patterns

**Timeline:** Complete by end of Session 52

### LogicFlows Pattern Decisions (Session 36)

| Pattern | Decision | Status |
|---------|----------|--------|
| **7: Domain Models** | ✅ INCLUDE | `.bozly/models/` directory |
| **2: Transparency** | ✅ INCLUDE | Full session logging |
| **4: Versioning** | ✅ INCLUDE | Semver for models |
| **5: Schema Validation** | ❌ SKIP | Note for future |

See `SESSION-36-PATTERN-DECISIONS.md` for full rationale and examples.

### Core Features Status

#### Project Setup
- [x] TypeScript project structure
- [x] package.json configuration
- [x] tsconfig.json configuration
- [x] npm install + build working
- [x] CLI executable (`bozly` command)

#### CLI Commands (Implemented)
- [x] `bozly init` — Initialize vault (working)
- [x] `bozly list` — List vaults (working)
- [x] `bozly add` — Register vault (working)
- [x] `bozly status` — Show vault status (working)
- [x] `bozly context` — Generate context (working, --dry mode)
- [x] `bozly config` — Manage configuration (working)
- [ ] `bozly run` — Execute command (Sprint 2)
- [ ] `bozly logs` — View session logs (Sprint 3)
- [ ] `bozly diff` — Compare sessions (Sprint 3)
- [ ] `bozly version` — Manage model versions (Sprint 3)

#### Core Modules (Implemented)
- [x] types.ts — Type definitions
- [x] vault.ts — Vault operations
- [x] registry.ts — Registry management
- [x] context.ts — Context generation
- [x] commands.ts — Command operations
- [x] config.ts — Configuration management
- [x] logging.ts — Comprehensive logging (Session 38-40)
- [ ] models.ts — Model loading and management (Pattern 7, Sprint 3)
- [ ] sessions.ts — Transparency logging (Pattern 2, Sprint 3)
- [ ] versions.ts — Version management (Pattern 4, Sprint 3)

### Folder Structure
```
~/.bozly/                              ← GLOBAL
├── bozly-registry.json                ← All vault locations
├── bozly-config.json                  ← Global settings
├── commands/                          ← Global commands
└── templates/                         ← Starter templates

~/my-vault/.bozly/                     ← PER-VAULT
├── config.json                        ← Vault settings
├── context.md                         ← AI context file
├── index.json                         ← Task index
├── sessions/                          ← Session history
├── tasks/                             ← Task data
├── commands/                          ← Vault commands
├── workflows/                         ← Multi-step processes
└── hooks/                             ← Automation triggers
```

### CLI Commands (Beta)
```bash
# Core
bozly init                    # Initialize vault in current directory
bozly list                    # List registered vaults
bozly add <path>              # Register existing vault
bozly status                  # Show vault status

# Context
bozly context                 # Generate context for AI
bozly context --ai claude     # Generate Claude-specific context
bozly context --ai gpt        # Generate GPT-specific context

# Execution (pipes to AI)
bozly run daily               # Run /daily command with default AI
bozly run daily --ai gpt      # Run with specific AI
bozly run weekly --dry        # Show what would be sent (no execution)
```

### Templates & Examples
- [x] Default template (basic vault)
- [x] Music Discovery template (album reviews, TRIPLE search)
- [x] Journal template (daily entries, mood tracking)
- [x] Content template (video production workflow)
- [x] Music Discovery example vault
- [x] Journal example vault
- [ ] Content example vault (optional)
- [ ] **GAD (Granular Action Decomposition) vault** — Project/task management using recursive decomposition + next-action methodology (GTD-style). See `planning/GAD/` for research.

### Documentation
- [x] README.md (quick start)
- [x] GETTING-STARTED.md (first vault)
- [x] CLI-DESIGN.md (command reference)
- [x] ARCHITECTURE.md (technical overview)
- [x] CONTRIBUTING.md (development guide)
- [x] REQUIREMENTS.md (prerequisites)
- [ ] COMMANDS.md (detailed command docs)

### Distribution
- [ ] npm package (`npm install -g bozly`)
- [ ] Homebrew formula (tap)
- [ ] GitHub releases (manual)

### Testing
- [ ] Unit tests for core modules (Sprint 4)
- [ ] Integration tests for CLI (Sprint 4)
- [ ] Manual testing checklist (Sprint 4)

---

## Phase 2: Polish (v0.4.0 - v0.5.0)

**Goal:** Production-ready with hooks and workflows

**Timeline:** 6-8 weeks after Phase 1

### Features
- [ ] Hooks system (session-start, session-end, post-tool)
- [ ] Workflows (multi-step processes)
- [ ] Cross-vault queries (`bozly search --all`)
- [ ] Session history viewer (`bozly history`)
- [ ] Task tracking (`bozly tasks`)

### Hooks
```typescript
// .bozly/hooks/session-start.ts
export default async function onSessionStart(vault: Vault) {
  // Load context, show recent tasks
}

// .bozly/hooks/session-end.ts
export default async function onSessionEnd(vault: Vault, session: Session) {
  // Save conversation, update index
}
```

### Quality
- [ ] Comprehensive test suite (Jest)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Error handling improvements
- [ ] Performance optimization

---

## Phase 3: Ecosystem (v1.0.0)

**Goal:** Community features and vault sharing

**Timeline:** 8-12 weeks after Phase 2

### Features
- [ ] Vault registry (community templates)
- [ ] `bozly search <query>` - Search community vaults
- [ ] `bozly install <vault>` - Install vault template
- [ ] Vault publishing (`bozly publish`)

### Registry Structure
```json
{
  "vaults": [
    {
      "name": "music-discovery",
      "description": "Album discovery and review system",
      "repo": "github.com/user/music-vault-bozly",
      "author": "retroghostlabs",
      "tags": ["music", "reviews", "discovery"],
      "version": "1.0.0"
    }
  ]
}
```

### SDK (Optional)
- [ ] Direct AI provider integration (no CLI pipe)
- [ ] Background task execution
- [ ] Programmatic vault access
- [ ] API key management

---

## Phase 4: Advanced (v2.0.0+)

**Goal:** Enterprise and power-user features

**Timeline:** Long-term roadmap

### Features
- [ ] Shadow Git checkpoints (undo/rollback)
- [ ] Diff view (show changes before commit)
- [ ] SQLite storage (if needed at scale)
- [ ] Skills system (auto-invoke based on context)
- [ ] MCP integration recipes
- [ ] Full marketplace (if demand exists)
- [ ] Desktop app (Electron, if demand exists)

---

## Migration: AI Vault Framework → BOZLY

### What's Changing

| Old | New |
|-----|-----|
| `ai-vault-framework` | `bozly` |
| `.ai-vault/` | `.bozly/` |
| `~/.ai-vault/` | `~/.bozly/` |
| Python/Bash scripts | TypeScript CLI |
| WORK-LOG.md (manual) | .bozly/sessions/ (automatic) |
| CLAUDE.md only | context.md (AI-agnostic) |

### Migration Path
1. Existing vaults continue to work (CLAUDE.md still valid for Claude)
2. Run `bozly migrate` to convert to new structure
3. New vaults use `.bozly/` structure from start

### Backwards Compatibility
- CLAUDE.md files are still read by Claude Code directly
- BOZLY adds .bozly/context.md alongside (not instead of)
- Gradual migration, no forced changes

---

## Success Metrics

### Phase 1 (Beta)
- [ ] 10+ beta testers
- [ ] 3 working example vaults
- [ ] <5 min to first vault
- [ ] Works with 3+ AI providers

### Phase 2 (Polish)
- [ ] 100+ users
- [ ] 5+ community vaults
- [ ] 90%+ test coverage
- [ ] <2s context generation

### Phase 3 (Ecosystem)
- [ ] 1,000+ users
- [ ] 50+ community vaults
- [ ] 10+ contributors
- [ ] Active community

---

## Success Metrics

### Phase 1 (Beta)
- [ ] 10+ beta testers
- [ ] 3 working example vaults
- [ ] <5 min to first vault
- [ ] Works with 3+ AI providers
- [x] Comprehensive logging infrastructure
- [x] Sprint 1 foundation 100% complete

### Phase 2 (Polish)
- [ ] 100+ users
- [ ] 5+ community vaults
- [ ] 90%+ test coverage
- [ ] <2s context generation

### Phase 3 (Ecosystem)
- [ ] 1,000+ users
- [ ] 50+ community vaults
- [ ] 10+ contributors
- [ ] Active community

---

## Monetization Strategy

**Model:** Free software, paid integrations

The core BOZLY framework is free and open source. Revenue comes from premium integrations and curated content.

### Revenue Streams

| Stream | Type | Description |
|--------|------|-------------|
| **Premium Vault Packs** | One-time | Pre-built vaults ($15-50 each) |
| **Patreon/Subscription** | Recurring | Access to all vaults + early releases ($5-15/mo) |
| **Obsidian Plugin** | One-time | GUI integration for Obsidian ($20-40) |
| **Future Integrations** | One-time | VS Code, Raycast, other tool integrations |
| **Marketplace Cut** | Commission | 15-20% of community vault sales |

### Architecture for Paid Integrations

```
@bozly/core         ← Shared logic (FREE, open source)
    ↓
├── @bozly/cli           ← Terminal interface (FREE)
├── bozly-obsidian       ← Obsidian plugin (PAID)
├── bozly-vscode         ← VS Code extension (PAID, future)
└── bozly-raycast        ← Raycast extension (PAID, future)
```

### Premium Vault Examples

- **Music Producer Vault** — Album tracking, sample library management, release planning
- **Content Creator Vault** — Video pipeline, thumbnail system, analytics tracking
- **GTD/Productivity Vault** — GAD-style task decomposition, project management
- **Journal Pro Vault** — Advanced mood tracking, habit analysis, life review system

### Pricing Philosophy

- Framework = FREE forever (open source, community-driven)
- Convenience/Time-saving = PAID (pre-built vaults, GUI integrations)
- Expertise/Curation = PAID (domain-specific setups that take hours to build)

---

## Not Planned

These features are explicitly out of scope:

- ❌ Native Windows support (use WSL2)
- ❌ GUI-first approach (CLI-first, GUI optional later)
- ❌ Cloud sync (users manage own storage)
- ❌ Paid core framework (framework stays free, integrations can be paid)
- ❌ Mobile app (desktop CLI focus)

---

## Related Documents

- [SESSION-31-ARCHITECTURE-DECISIONS.md](../../planning/current/SESSION-31-ARCHITECTURE-DECISIONS.md) - All 21 architecture decisions
- [CLI-DESIGN.md](CLI-DESIGN.md) - Detailed CLI command reference
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture overview

---

*BOZLY: Build. OrganiZe. Link. Yield.*
