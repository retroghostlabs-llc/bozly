# BOZLY

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Beta](https://img.shields.io/badge/Status-Beta-blue.svg)](#project-status)
[![npm version](https://img.shields.io/npm/v/bozly.svg)](https://www.npmjs.com/package/bozly)
[![Build Status](https://img.shields.io/github/actions/workflow/status/retroghostlabs-llc/bozly/test.yml?branch=main)](https://github.com/retroghostlabs-llc/bozly/actions)
[![Coverage Status](https://img.shields.io/codecov/c/github/retroghostlabs-llc/bozly/main)](https://codecov.io/github/retroghostlabs-llc/bozly)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)

> **Build. OrganiZe. Link. Yield.**

An AI-agnostic framework for deploying domain-specific workspaces. Use the same architecture patterns as Cursor and Cline, but for any life domain — music, content production, journaling, research, anything.

---

## Why BOZLY?

Everyone's using AI coding assistants like Cursor and Cline for software development. But what about music discovery, content production, life management, or research?

**BOZLY applies the same proven architecture patterns to any domain.**

### What Makes BOZLY Different

| Feature | Code Tools (Cursor/Cline) | BOZLY |
|---------|--------------------------|-------|
| Domains | Code only | Any domain |
| AI Lock-in | Some | None — works with any AI |
| Architecture | Proven | Same patterns, new domains |
| Storage | Tool-specific | AI-agnostic JSON |
| Context | Per-tool | Single source, any AI |

---

## Key Features

- **AI-Agnostic** — Works with Claude, GPT, Gemini, Ollama, any AI CLI
- **Multi-Vault** — Orchestrate multiple domain-specific workspaces
- **Non-Code Domains** — Music, journaling, content production, research
- **Cline/Cursor Patterns** — Task folders, session storage, hooks
- **Context Provider** — BOZLY prepares prompts, your AI executes
- **Unix-Native** — macOS, Linux, WSL2 (no native Windows)

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  USER runs: bozly run daily                                     │
├─────────────────────────────────────────────────────────────────┤
│  BOZLY:                                                         │
│  1. Loads vault context (.bozly/context.md)                     │
│  2. Loads command prompt (.bozly/commands/daily.md)             │
│  3. Combines context + prompt                                   │
│  4. Pipes to AI CLI (claude/gpt/gemini/ollama)                  │
│  5. Saves session to .bozly/sessions/                           │
└─────────────────────────────────────────────────────────────────┘
```

**Key Insight:** BOZLY is a "context provider" — it prepares the prompts, your AI executes them.

---

## Architecture

### Folder Structure

```
~/.bozly/                              ← GLOBAL
├── bozly-registry.json                ← All vault locations
├── bozly-config.json                  ← Global settings
├── commands/                          ← Global commands
└── templates/                         ← Starter templates

~/music-vault/.bozly/                  ← PER-VAULT
├── config.json                        ← Vault settings
├── context.md                         ← AI context file
├── index.json                         ← Task index
├── sessions/                          ← Session history
├── tasks/                             ← Task data (Cline-style)
├── commands/                          ← Vault commands
├── workflows/                         ← Multi-step processes
└── hooks/                             ← Automation triggers
```

### Three-Tier Update Safety

```
TIER 1: BOZLY CORE (Framework-Owned)
└── npm/brew install — BOZLY releases update this

TIER 2: GLOBAL USER CONFIG (User-Owned)
└── ~/.bozly/ — User edits, BOZLY never touches

TIER 3: VAULT CONFIG (Vault-Owned)
└── ~/vault/.bozly/ — User edits, BOZLY never touches
```

---

## Quick Start

### Requirements

- **macOS, Linux, or WSL2** (no native Windows)
- **Node.js 18+** (for npm install)
- **At least one AI CLI** installed:
  - Claude: `npm install -g @anthropic-ai/claude-code`
  - GPT: `pip install openai-cli`
  - Ollama: `brew install ollama`

### Installation

**Beta Status:** BOZLY 0.3.0-beta.1 is now available for public beta testing. All Phase 1 features are implemented and tested. [Report issues on GitHub](https://github.com/RetroGhostLabs/bozly/issues).

```bash
# npm (recommended - beta version)
npm install -g bozly@0.3.0-beta.1

# Or install latest beta automatically
npm install -g bozly

# Homebrew (coming soon for v1.0)
# brew tap retroghostlabs/bozly
# brew install bozly

# From source
git clone https://github.com/RetroGhostLabs/bozly.git
cd bozly && npm install && npm link
```

### Create Your First Vault

```bash
# Create a vault directory
mkdir ~/music-vault
cd ~/music-vault

# Initialize with BOZLY
bozly init --name "Music Discovery" --type music

# Run a command (with --dry to preview first)
bozly run daily --dry              # Preview the prompt
bozly run daily --ai claude        # Execute with Claude
```

### Configure Your AI Provider

BOZLY works with any AI CLI. Check what's available:

```bash
# See installed providers
bozly run --list-providers

# Try different providers
bozly run daily --ai claude        # Recommended if you have API key
bozly run daily --ai ollama        # Local/private (download from ollama.ai)
bozly run daily --ai gpt           # OpenAI (requires OPENAI_API_KEY env var)
```

**Full setup guide:** See [AI-PROVIDERS.md](docs/AI-PROVIDERS.md)

---

## Example Vaults

BOZLY includes example vaults to get you started:

### Music Discovery Vault
- Album reviews with custom scoring
- TRIPLE search strategy (Influence + Year + All-time)
- Weekly album selection
- **Commands:** `/daily`, `/weekly-roll`, `/complete-album`

### Journal Vault
- Daily entries with mood tracking
- Weekly reviews and reflection
- Template-based workflows
- **Commands:** `/daily-entry`, `/log-mood`, `/weekly-review`

### Content Production Vault
- Video production pipeline
- Script writing workflows
- Multi-camera recording notes
- **Commands:** `/new-outline`, `/write-script`, `/prep-production`

---

## Commands

### Vault Management

```bash
bozly init                    # Initialize vault in current directory
bozly add <path>              # Register an existing vault
bozly remove <name>           # Remove and optionally backup vault
bozly list                    # List all registered vaults
bozly status                  # Show current vault status
```

#### Remove Command Options

```bash
bozly remove my-vault                 # Remove vault (with confirmation)
bozly remove my-vault --force          # Skip confirmation prompt
bozly remove my-vault --backup         # Create backup before removing
bozly remove my-vault --keep-files     # Remove from registry only, keep files
bozly remove my-vault --backup --force # Backup + remove without confirmation
```

Backups are created in `~/.bozly/backups/` with timestamps.

### Core Commands

```bash
bozly context                 # Generate AI context from vault
bozly run <command>           # Run command with AI
bozly logs                    # View session history
bozly diff                    # Compare session executions
bozly version                 # Show framework version
```

### AI Selection

```bash
bozly run daily               # Use default AI
bozly run daily --ai claude   # Use Claude
bozly run daily --ai gpt      # Use GPT
bozly run daily --ai ollama   # Use local Ollama
```

### Configuration

```bash
bozly config                  # View all config
bozly config set ai.default claude
bozly config ai add gpt       # Add AI provider
```

See [CLI-DESIGN.md](docs/CLI-DESIGN.md) for full command reference.

---

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | Matches Cline/Cursor ecosystem |
| Storage | JSON files | Simple, debuggable |
| AI Support | AI-agnostic | Any CLI: claude, gpt, gemini, ollama |
| Platforms | Unix-only | macOS, Linux, WSL2 |
| Distribution | npm, Homebrew | Standard package managers |

---

## Project Status

**Current Phase:** Phase 1: Beta (Release Phase — 94% Complete)

**Progress:** 17 of 18 sessions complete | Sprint 1-3: ✅ 100% COMPLETE | Sprint 4: 🔄 IN PROGRESS (3 of 4 sessions)

**Timeline:** Beta ready Early Feb 2026 | v1.0 Public Launch June 2026

### Development Progress

**Phase 1: Beta (v0.3.0) — Sprint 1-4 (18 sessions, Sessions 37-59)**
```
Sprint 1: Foundation           ✅ 100% COMPLETE (Sessions 37-40)
  ✅ TypeScript CLI structure with 7 commands
  ✅ Core modules: vault, registry, config, context (3,000+ lines)
  ✅ Comprehensive logging system (400+ lines)
  ✅ 4 vault templates + 2 example vaults
  ✅ Unit tests (63 passing)

Sprint 2: Execution            ✅ 100% COMPLETE (Sessions 44-52)
  ✅ Session 44: Context loading & validation (context.ts)
  ✅ Session 45: Domain Models + Commands (models.ts 800+ lines) ⭐
  ✅ Session 46: AI CLI integration (providers.ts, 4 providers)
  ✅ Session 49: Manual framework walkthrough (Part 1)
  ✅ Session 50: Memory systems & n8n research (956 lines)
  ✅ Session 51: Ecosystem research consolidation
  ✅ Session 52: Session recording architecture design (500+ lines)
  ✅ Session 53: Session recording implementation (NEXT)
  Target: `bozly run daily` fully functional with session recording + audit trail

Sprint 3: Patterns             ✅ 100% COMPLETE (Sessions 53-55)
  ✅ Session 53: Session recording implementation (Part 2 final)
    ✅ recordSession(), loadSession(), querySessions(), diffSessions()
    ✅ bozly logs + bozly diff commands with filters
    ✅ Session files: multi-file architecture (6 files per session)
    ✅ Session hierarchy: vault/date/id organization
    ✅ 32 unit tests all passing
    ✅ SESSION-RECORDING-GUIDE.md documentation
  ✅ Session 54: Session transparency (Pattern 2) — Global operations
    ✅ querySessionsGlobal(), getSessionStatsGlobal(), archival functions
    ✅ bozly logs --global, --stats flags
    ✅ 6 new functions + 37 tests (6 new patterns tests)
    ✅ Multi-vault session monitoring enabled
  ✅ Session 55: Versioning System (Pattern 4) — Version Management
    ✅ versions.ts module with semantic versioning
    ✅ bozly version command with --vault, --model, --history flags
    ✅ Model version tracking integrated with loadModel()
    ✅ Context version tracking integrated with generateContext()
    ✅ 39 unit tests all passing
    ✅ VERSIONING-GUIDE.md (600+ lines documentation)

Sprint 4: Release              🔄 IN PROGRESS (Sessions 56-59)
  ✅ Session 56: CLAUDE.md Optimization & Timeline Updates (COMPLETE)
  ✅ Session 56b: ESLint Cleanup & vitest 4.0 Upgrade (COMPLETE)
  ✅ Session 57: Manual CLI Testing (COMPLETE - 36 test scenarios)
  ✅ Session 58: Vault Removal + Test Cleanup Infrastructure (COMPLETE)
  ⏳ Session 59: npm Publish & Beta Launch (NEXT)
```

**⭐ Key Completed Work (Sessions 44-52):**
- Context loading infrastructure + vault context generation
- Domain Models (Pattern 7): YAML-based definitions with 4 types (scoring, analysis, classification, prediction)
- AI Provider integration: Claude, ChatGPT, Gemini, Ollama detection and streaming execution
- Session recording architecture: Multi-file design (6 files/session) with vault/date/id hierarchy
- Manual framework validation: All CLI commands tested end-to-end, logger bug fixed
- Ecosystem research: Claude memory + n8n integration patterns fully documented (1,500+ lines)
- Combined 4,000+ lines of production code + 2,000+ lines of architecture documentation

**Phase 2: Polish (v0.4.0-0.5.0) — 6-8 weeks after Phase 1**
- [ ] Hooks system (session-start, session-end, post-tool)
- [ ] Workflows (multi-step processes)
- [ ] Cross-vault queries (`bozly search --all`)
- [ ] Session history viewer (`bozly history`)
- [ ] Task tracking (`bozly tasks`)

**Phase 3: Ecosystem (v1.0.0) — 8-12 weeks after Phase 2**
- [ ] Community vault registry
- [ ] `bozly search` / `bozly install`
- [ ] Vault publishing
- [ ] Obsidian plugin (paid)

See [ROADMAP.md](docs/ROADMAP.md) for full timeline and [progress tracking docs](../../MASTER-RELEASE-TIMELINE.md).

---

## Documentation

| Document | Purpose |
|----------|---------|
| [GETTING-STARTED.md](docs/GETTING-STARTED.md) | First vault setup |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical deep dive |
| [CLI-DESIGN.md](docs/CLI-DESIGN.md) | Command reference |
| [SESSION-RECORDING-GUIDE.md](docs/SESSION-RECORDING-GUIDE.md) | Session history & audit trail |
| [BUILDING-YOUR-VAULT.md](docs/BUILDING-YOUR-VAULT.md) | Custom vault creation |

---

## Migration from AI Vault Framework

If you used the previous AI Vault Framework (Python/Bash version):

| Old | New |
|-----|-----|
| `ai-vault-framework` | `bozly` |
| `.claude/` or `.ai-vault/` | `.bozly/` |
| `~/.ai-vault/` | `~/.bozly/` |
| Python/Bash scripts | TypeScript CLI |
| WORK-LOG.md (manual) | .bozly/sessions/ (automatic) |
| CLAUDE.md only | context.md (AI-agnostic) |

Run `bozly migrate` to convert existing vaults.

---

## Contributing

We welcome contributions:

- **Report bugs** — [Open an issue](https://github.com/RetroGhostLabs/bozly/issues)
- **Share your vault** — Create a repo and share in Discussions
- **Improve docs** — Submit a PR for typos or improvements
- **Contribute code** — See CONTRIBUTING.md

---

## License

MIT License — Use it for anything.

See [LICENSE](LICENSE) for details.

---

## Connect

- **GitHub:** [bozly](https://github.com/RetroGhostLabs/bozly)
- **Discussions:** [Ask questions & share vaults](https://github.com/RetroGhostLabs/bozly/discussions)
- **Issues:** [Report bugs & request features](https://github.com/RetroGhostLabs/bozly/issues)

---

**BOZLY:** Build. OrganiZe. Link. Yield.

*Built by [RetroGhostLabs](https://github.com/RetroGhostLabs) | MIT License*

*Last updated: 2025-12-21* | *Status: Phase 1 Beta (Sprints 1-3 Complete, Sprint 4: 3/4 Sessions) | Progress: 94% | Beta: Early Feb 2026 | v1.0: June 2026*

---

## 📊 Progress Tracking

**For detailed timeline, phases, and sprint breakdown, see private workspace docs:**
- [MASTER-RELEASE-TIMELINE.md](../../MASTER-RELEASE-TIMELINE.md) — Complete project timeline
- [TIMELINE-VISUAL.md](../../TIMELINE-VISUAL.md) — Visual timeline Dec 2025 → June 2026
- [WORK-LOG.md](../../WORK-LOG.md) — Session history (42+ sessions documented)
