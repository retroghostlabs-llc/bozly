# BOZLY Roadmap

**Build. OrganiZe. Link. Yield.**

*Last updated: December 22, 2025*

---

## Current Status

**Phase:** 1 Complete (Beta Released)
**Version:** 0.3.0-beta.1
**Status:** Framework production-ready, beta published to npm. Phase 2 planning in progress.

### What's Done (Sessions 37-61)

**Sprint 1 (Sessions 37-40): Foundation**
- TypeScript project structure (`src/cli/`, `src/core/`)
- package.json with npm/bin configuration
- CLI entry point and 11 command implementations
- Core modules (vault, registry, context, commands, config, types, logging)
- 4 node templates (default, music, journal, content)
- 2 example nodes with .bozly/ structure
- Comprehensive logging system (BOZLY_DEBUG support)

**Sprint 2 (Sessions 44-52): Execution**
- Session recording architecture (multi-file, vault/date/id hierarchy)
- AI provider integration (Claude, GPT, Gemini, Ollama)
- `bozly run` command with context piping
- Session storage and querying

**Sprint 3 (Sessions 53-55): LogicFlows Patterns**
- Pattern 7: Domain models (`.bozly/models/` with YAML/JSON support)
- Pattern 2: Session transparency (full audit trail, 6 files per session)
- Pattern 4: Semantic versioning (version history, changelog generation)

**Sprint 4 (Sessions 56-61): Release**
- 350+ tests passing (100% pass rate)
- GitHub Actions CI/CD (test + release workflows)
- Git hooks (husky + lint-staged + commitlint)
- npm publish preparation
- Beta v0.3.0-beta.1 released

### What's Next (Phase 2+)

- **Vault Server UI** (`bozly serve`) — Local web dashboard for visual node management
- **Smart Routing** — Per-vault/per-command AI provider routing with fallbacks
- **Auto-Cleanup** — Session retention, archival, and disk management
- **n8n Integration** — Workflow orchestration with 5 integration patterns
- **Session Memory** — Claude-style auto-extraction and cross-node knowledge

---

## Overview

BOZLY is an AI-agnostic framework for deploying domain-specific workspaces. It provides context management, session continuity, and vault orchestration across any AI provider (Claude, GPT, Gemini, local LLMs).

**Key Differentiator:** BOZLY is NOT a Claude plugin. It's an independent framework that works with ANY AI CLI.

---

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | Matches Cline/Cursor ecosystem |
| Storage | JSON files | Simple, debuggable (SQLite later if needed) |
| AI Support | AI-agnostic | Works with any AI CLI |
| Platforms | macOS, Linux, WSL2 | Unix-native, no native Windows |
| Distribution | npm, Homebrew, git clone | Standard package managers |

---

## Phase 1: Beta (v0.3.0) - COMPLETE

**Goal:** Minimal working product with core vault functionality + LogicFlows patterns

**Status:** 100% Complete (18 sessions)

### LogicFlows Pattern Implementation

| Pattern | Decision | Status |
|---------|----------|--------|
| **7: Domain Models** | INCLUDE | `.bozly/models/` directory |
| **2: Transparency** | INCLUDE | Full session logging (6 files per session) |
| **4: Versioning** | INCLUDE | Semver for models with history |
| **5: Schema Validation** | SKIP | Noted for Phase 3+ |

### CLI Commands (All Implemented)

```bash
# Core
bozly init # Initialize node in current directory
bozly list                    # List registered nodes
bozly add <path>              # Register existing node
bozly remove <vault>          # Remove vault (with backup)
bozly status                  # Show node status

# Context
bozly context                 # Generate context for AI
bozly context --ai claude     # Generate Claude-specific context

# Execution
bozly run daily               # Run command with default AI
bozly run daily --ai gpt      # Run with specific AI
bozly run weekly --dry        # Show prompt (no execution)

# Sessions
bozly logs                    # View session history
bozly logs --verbose          # Detailed session info
bozly diff <id1> <id2>        # Compare sessions

# Configuration
bozly config                  # View configuration
bozly config set <key> <val>  # Set config value
bozly version                 # Show version info
```

### Core Modules (All Implemented)

- types.ts — Type definitions
- vault.ts — Vault operations
- registry.ts — Registry management
- context.ts — Context generation
- commands.ts — Command operations
- config.ts — Configuration management
- logging.ts — Comprehensive logging
- models.ts — Domain model loading (Pattern 7)
- sessions.ts — Session recording (Pattern 2)
- versions.ts — Version management (Pattern 4)

### Testing & Quality

- 350+ unit tests passing
- 100% test pass rate
- GitHub Actions CI/CD
- ESLint + Prettier + Commitlint
- Vitest with coverage

### Distribution

- npm package: `npm install -g bozly`
- GitHub releases
- Homebrew formula (planned)

---

## Phase 2: Automation & Integrations (v0.4.0 - v0.5.0)

**Goal:** Smart routing + visual UI + n8n orchestration + session memory

**Timeline:** 6-8 weeks after Phase 1

### Vault Server UI (`bozly serve`)

Local web dashboard for visual node management:

```bash
bozly serve                   # Start local server (http://localhost:3847)
bozly serve --port 8080       # Custom port
```

**Features:**
- Vault selector and dashboard
- Session browser with filtering
- Command runner from UI
- Context editor
- Session diff viewer
- "Open in Obsidian" integration

**Implementation:** 3 phases, 18-26 hours total

### Smart Routing

Per-vault and per-command AI provider configuration:

```yaml
# .bozly/config.json
{
  "routing": {
    "default": "claude",
    "commands": {
      "quick-task": "ollama/llama3",
      "code-review": "claude"
    },
    "fallback": ["ollama", "gpt"]
  }
}
```

### Auto-Cleanup & Disk Management

Prevent session bloat with automatic cleanup:

```bash
bozly cleanup --preview       # Show what would be cleaned
bozly cleanup --older-than 90d  # Clean old sessions
bozly status --storage        # View storage usage
```

**Features:**
- Session retention policy (configurable, default 90 days)
- Session archival (compress to .tar.gz)
- Storage monitoring and warnings
- Auto-cleanup when exceeding thresholds

### n8n Workflow Orchestration

External workflow automation:

- File system monitoring (`.bozly/sessions/`)
- Webhook endpoints for triggers
- CLI-based execution from n8n
- Session automation pipelines

### Template & Command Tooling (Design Complete)

- `bozly command create` — Interactive wizard for creating commands
- `bozly commands` — List all commands (vault + global) with source
- `bozly template create` — Interactive wizard for creating templates
- `bozly template list` — List available templates
- Default global commands (3-5 starters shipped with BOZLY)
- User templates equal to built-in (no namespacing)

### Core Automation Features

- Hooks system (session-start, session-end, post-execution)
- Workflows (multi-step processes with conditional logic)
- Cross-node queries (`bozly search --all`)
- Session history viewer (`bozly history`)
- Task tracking (`bozly tasks`)

---

## Phase 2.5: AI-Assisted Creation (v0.5.0)

**Goal:** AI helps users create templates and commands

### Features

- `bozly template from-vault` — AI reverse-engineers vault into template
- `bozly command create --ai` — AI generates command content
- `bozly command suggest` — AI suggests commands based on session history

---

## Phase 3: Ecosystem & Community (v1.0.0)

**Goal:** Community features and vault sharing

**Timeline:** 8-12 weeks after Phase 2

### Features

- **Community Registry (GitHub-only)** — JSON file + GitHub repos
- `bozly search <query>` — Search community nodes
- `bozly install <vault>` — Install vault template
- `bozly publish` — Publish vault to registry (via PR)
- `bozly update` — Check for template updates (selective merge)
- MCP server integration (UniFi, Slack, Discord, GitHub)
- Obsidian plugin

### Phase 3.5: Community Website

- bozly.dev for template discovery and browsing
- Better UX for non-developers
- Template previews and documentation

### Registry Structure

```json
{
  "nodes": [
    {
      "name": "music-discovery",
      "description": "Album discovery and review system",
      "repo": "github.com/user/music-bozly",
      "author": "retroghostlabs",
      "tags": ["music", "reviews", "discovery"],
      "version": "1.0.0"
    }
  ]
}
```

---

## Phase 4: Advanced (v2.0.0+)

**Goal:** Enterprise and power-user features

**Timeline:** Long-term roadmap

### Features

- **Full Marketplace** (only if community demand proves it)
  - Custom backend, user accounts
  - Paid templates (Stripe integration)
  - Reviews, ratings, author dashboards
- Shadow Git checkpoints (undo/rollback)
- Diff view (show changes before commit)
- SQLite storage (if needed at scale)
- Skills system (auto-invoke based on context)
- MCP integration recipes
- Desktop app (Electron wrapper for `bozly serve`)

---

## Folder Structure

```
~/.bozly/                              <- GLOBAL
├── bozly-registry.json                <- All node locations
├── bozly-config.json                  <- Global settings
├── commands/                          <- Global commands
└── templates/                         <- Starter templates

~/music/.bozly/                     <- PER-NODE
├── config.json                        <- Node settings
├── context.md                         <- AI context file
├── index.json                         <- Task index
├── sessions/{vault}/{year}/{month}/{day}/{uuid}/
│   ├── session.json                   <- Metadata
│   ├── context.md                     <- What AI knew
│   ├── prompt.txt                     <- Raw prompt
│   ├── execution.json                 <- Technical details
│   ├── results.md                     <- AI output
│   └── changes.json                   <- File modifications
├── models/                            <- Domain models (Pattern 7)
├── commands/                          <- Node commands
├── workflows/                         <- Multi-step processes
└── hooks/                             <- Automation triggers
```

---

## Success Metrics

### Phase 1 (Beta) - ACHIEVED
- [x] 10+ beta testers
- [x] 3 working example nodes
- [x] <5 min to first vault
- [x] Works with 3+ AI providers
- [x] 350+ tests passing
- [x] npm installable

### Phase 2 (Polish)
- [ ] 100+ users
- [ ] 5+ community nodes
- [ ] 90%+ test coverage
- [ ] <2s context generation

### Phase 3 (Ecosystem)
- [ ] 1,000+ users
- [ ] 50+ community nodes
- [ ] 10+ contributors
- [ ] Active community

---

## Not Planned

These features are explicitly out of scope:

- Native Windows support (use WSL2)
- GUI-first approach (CLI-first, GUI optional via `bozly serve`)
- Cloud sync (users manage own storage)
- Paid core framework (framework stays free)
- Mobile app (desktop CLI focus)

---

## Related Documents

- [CLI-DESIGN.md](CLI-DESIGN.md) — Detailed CLI command reference
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technical architecture overview
- [SESSION-RECORDING-GUIDE.md](SESSION-RECORDING-GUIDE.md) — Session transparency docs
- [VERSIONING-GUIDE.md](VERSIONING-GUIDE.md) — Version management docs
- [AI-PROVIDERS.md](AI-PROVIDERS.md) — AI provider integration

---

*BOZLY: Build. OrganiZe. Link. Yield.*
