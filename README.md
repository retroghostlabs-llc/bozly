# BOZLY

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Beta](https://img.shields.io/badge/Status-Beta-blue.svg)](#project-status)
[![npm version](https://img.shields.io/npm/v/@retroghostlabs/bozly.svg)](https://www.npmjs.com/package/@retroghostlabs/bozly)
[![Build Status](https://img.shields.io/github/actions/workflow/status/RetroGhostLabs/bozly/test.yml?branch=main)](https://github.com/RetroGhostLabs/bozly/actions)
[![Coverage](https://codecov.io/gh/RetroGhostLabs/bozly/branch/main/graph/badge.svg)](https://codecov.io/gh/RetroGhostLabs/bozly)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org/)

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
- **Multi-Node** — Orchestrate multiple domain-specific workspaces
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
│  1. Loads node context (.bozly/context.md)                      │
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
├── bozly-registry.json                ← All node locations
├── bozly-config.json                  ← Global settings
├── commands/                          ← Global commands
└── templates/                         ← Starter templates

~/music/.bozly/                        ← PER-NODE
├── config.json                        ← Node settings
├── context.md                         ← AI context file
├── index.json                         ← Task index
├── sessions/                          ← Session history
├── tasks/                             ← Task data (Cline-style)
├── commands/                          ← Node commands
├── workflows/                         ← Multi-step processes
└── hooks/                             ← Automation triggers
```

### Three-Tier Update Safety

```
TIER 1: BOZLY CORE (Framework-Owned)
└── npm/brew install — BOZLY releases update this

TIER 2: GLOBAL USER CONFIG (User-Owned)
└── ~/.bozly/ — User edits, BOZLY never touches

TIER 3: NODE CONFIG (Node-Owned)
└── ~/music/.bozly/ — User edits, BOZLY never touches
```

---

## Quick Start

### Requirements

- **macOS, Linux, or WSL2** (no native Windows)
- **Node.js 20+** (for npm install) — tested on Node 20.x and 22.x
- **At least one AI CLI** installed:
  - Claude: `npm install -g @anthropic-ai/claude-code`
  - GPT: `pip install openai-cli`
  - Ollama: `brew install ollama`

### Installation

**Current Release:** BOZLY v0.6.0-beta.1 is available with full Phase 2 automation and integration features. All Phase 1 & 2 features are implemented, tested, and production-ready. [Report issues on GitHub](https://github.com/RetroGhostLabs/bozly/issues).

```bash
# npm (recommended)
npm install -g @retroghostlabs/bozly@0.6.0-beta.1

# Or install latest version
npm install -g @retroghostlabs/bozly

# Homebrew (coming soon for v1.0)
# brew tap retroghostlabs/bozly
# brew install bozly

# From source
git clone https://github.com/RetroGhostLabs/bozly.git
cd bozly && npm install && npm link
```

### Create Your First Node

```bash
# Create a node directory
mkdir ~/music
cd ~/music

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

## Example Nodes

BOZLY includes example nodes to get you started:

### Music Discovery Node
- Album reviews with custom scoring
- TRIPLE search strategy (Influence + Year + All-time)
- Weekly album selection
- **Commands:** `/daily`, `/weekly-roll`, `/complete-album`

### Journal Node
- Daily entries with mood tracking
- Weekly reviews and reflection
- Template-based workflows
- **Commands:** `/daily-entry`, `/log-mood`, `/weekly-review`

### Content Production Node
- Video production pipeline
- Script writing workflows
- Multi-camera recording notes
- **Commands:** `/new-outline`, `/write-script`, `/prep-production`

---

## Commands

### Node Management

```bash
bozly init                    # Initialize node in current directory
bozly add <path>              # Register an existing node
bozly remove <name>           # Remove and optionally backup node
bozly list                    # List all registered nodes
bozly status                  # Show current node status
```

#### Remove Command Options

```bash
bozly remove my-node                 # Remove node (with confirmation)
bozly remove my-node --force          # Skip confirmation prompt
bozly remove my-node --backup         # Create backup before removing
bozly remove my-node --keep-files     # Remove from registry only, keep files
bozly remove my-node --backup --force # Backup + remove without confirmation
```

Backups are created in `~/.bozly/backups/` with timestamps.

### Core Commands

```bash
bozly context                 # Generate AI context from node
bozly run <command>           # Run command with AI
bozly logs                    # View session history
bozly diff                    # Compare session executions
bozly version                 # Show framework version
```

### Dashboard & Analytics

```bash
bozly serve                   # Start interactive web dashboard (http://localhost:3847)
bozly serve --port 3000       # Start on custom port
bozly serve --host 0.0.0.0    # Make accessible on network
bozly serve --no-open         # Don't auto-open browser
```

**Dashboard Features:**
- 📊 **Session Browser** — View all sessions with filtering and pagination
- 📋 **Session Details** — Full 6-tab view (metadata, context, prompt, results, execution, changes)
- 🔍 **Search & Filter** — Find sessions by command, status, or provider
- 📈 **Analytics** — Session stats, success rates, provider breakdown
- 🎯 **Command Browser** — Browse and inspect all commands

**Full Documentation:** See [SERVE.md](docs/SERVE.md)

### Terminal UI (TUI)

**Interactive terminal interface for BOZLY system management.**

```bash
# Terminal 1: Start the API server
bozly serve                # Runs on http://localhost:3000

# Terminal 2: Launch the TUI
bozly tui                  # Connect to API, launch interactive UI
bozly tui --api-url http://localhost:8000/api  # Custom API URL
bozly tui --refresh 10000  # Custom refresh interval (ms)
```

**TUI Features:**
- 🖥️ **8 Main Screens** — Home, Vaults, Sessions, Commands, Workflows, Memory, Config, Health
- ⌨️ **Keyboard-Driven Navigation** — vim-style (hjkl, gg, G, /) + number keys for direct screen access
- 🔄 **Real-Time Updates** — Auto-refresh with configurable intervals
- 🎯 **Full CRUD Operations** — Create, read, update, delete vaults, commands, sessions
- 📊 **Session Management** — View history, compare sessions, analyze patterns
- 🔐 **Configuration Management** — Edit settings, manage providers
- 🖱️ **Mouse Support** — Click navigation (optional, keyboard is primary)

**Screen Reference:**
| Screen | Key | Function |
|--------|-----|----------|
| Home | H | Dashboard overview & system status |
| Vaults | V | Browse and manage registered vaults |
| Sessions | S | View command execution history |
| Commands | C | Browse available commands |
| Workflows | W | View and manage multi-step processes |
| Memory | M | Browse extracted knowledge |
| Config | O | System configuration & settings |
| Health | H | API server health & statistics |

**Keyboard Shortcuts:**
- **Navigation:** `hjkl` or arrow keys, `gg`/`G` for start/end, `PgUp`/`PgDn`
- **Actions:** `Enter` select, `e` edit, `d` delete, `r` run, `/` search, `y` copy
- **Global:** `R` refresh, `q` quit, `Tab` next screen, `1-8` jump to screen

**Full Documentation:** See [TUI-USER-GUIDE.md](docs/TUI-USER-GUIDE.md) and [TUI-DEVELOPMENT-GUIDE.md](docs/TUI-DEVELOPMENT-GUIDE.md)

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

**Current Phase:** ✅ Phase 1: Beta (100% Complete) | ✅ Phase 2: Automation & Integrations (100% Complete) | 📋 Phase 3: Ecosystem & Community (Ready for v1.0)

**Latest Release:** v0.6.0-beta.1 (Dec 26, 2025) — Full Phase 2 with web dashboard, REST APIs, smart routing, AI-assisted commands, and advanced memory system

**Available Versions:** v0.3.0 (Phase 1) | v0.4.0 (Hooks/Workflows) | v0.4.1 (Memory/Search) | v0.4.2 (Smart Execution) | v0.5.0 (Web UI) | v0.6.0 (Dashboard & APIs)

**Testing:** 1,642/1,642 tests passing (100%) | Coverage: 80.06% | Next: v1.0 Public Launch (May 2026)

### Development Progress

**Phase 1: Beta (v0.3.0-beta.1) — ✅ COMPLETE**
```
Sprint 1: Foundation           ✅ COMPLETE
  ✅ 15 CLI commands fully working (init, add, remove, list, status, context, run, logs, diff, config, version, command, template, cleanup, workflow)
  ✅ Core modules: node, registry, config, context (3,000+ lines)
  ✅ Comprehensive logging system with BOZLY_DEBUG
  ✅ 4 node templates + 2 example nodes
  ✅ 1,186+ unit tests passing (100% success rate)

Sprint 2: Execution            ✅ COMPLETE
  ✅ Context loading & validation
  ✅ Domain models (Pattern 7, 800+ lines, YAML support)
  ✅ AI provider integration (Claude, ChatGPT, Gemini, Ollama)
  ✅ Session recording architecture & implementation

Sprint 3: Patterns             ✅ COMPLETE
  ✅ Session recording implementation (multi-file, hierarchical)
  ✅ Session transparency - Pattern 2 (audit trail, change tracking)
  ✅ Versioning system - Pattern 4 (semantic versioning, history)

Sprint 4: Release              ✅ COMPLETE
  ✅ Memory system (extraction, indexing, injection)
  ✅ Hooks system (4 trigger points: session-start/end, pre/post-execution)
  ✅ Workflows with task chains and conditions
  ✅ Auto-cleanup with duration parsing and storage monitoring
  ✅ npm publish & beta release
```

**Key Features Implemented (Phase 1):**
- 15 CLI commands fully working (all Phase 1 features)
- Multi-file session recording with full audit trail (hierarchical organization)
- Semantic versioning and version history
- Domain models integration (YAML-based)
- AI-agnostic provider support (4 providers: Claude, GPT, Gemini, Ollama)
- Memory system with extraction, indexing, injection
- Hooks system (4 trigger points)
- Workflows with task chains and conditions
- Auto-cleanup with duration parsing and storage monitoring
- Node removal with backup support

**Phase 2: Automation & Integrations (v0.4.0-v0.6.0) — ✅ 100% COMPLETE (11/11 sub-phases)**

**Completed (v0.4.0-beta.1 through v0.6.0-beta.1):**
- ✅ Hooks system (4 trigger points: session-start, pre-execution, post-execution, session-end)
- ✅ Workflows (multi-step processes with task chains, context passing, conditions)
- ✅ Auto-Cleanup (duration parsing, storage monitoring, disk management with policies)
- ✅ Templates system (variable substitution, template tooling, prompt templates)
- ✅ Commands tooling (command discovery, creation, metadata, 5 default commands)
- ✅ Memory system (extraction, indexing, injection, cross-node search)
- ✅ Smart routing (per-node/command AI provider config, fallback chains)
- ✅ Command Suggestions (AI-powered improvements, pattern detection, user approval)
- ✅ Cross-Node Search (search across all nodes, session filtering, export)
- ✅ CLI Visual Polish (gradient banner, formatted tables, graceful degradation)
- ✅ Server UI (`bozly serve`) — Full web dashboard with REST API (15 endpoints)

**Phase 3: Ecosystem & Community (v1.0.0) — 35-55 hours (May 2026)**
- [ ] Community node registry
- [ ] `bozly search` / `bozly install` node publishing
- [ ] MCP server integration
- [ ] Obsidian plugin
- [ ] Public launch with marketing

See [ROADMAP.md](docs/ROADMAP.md) for full timeline.

---

## Documentation

### User Guides

| Document | Purpose |
|----------|---------|
| [GETTING-STARTED.md](docs/GETTING-STARTED.md) | First node setup & quick start guide |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical deep dive & design patterns |
| [CLI-DESIGN.md](docs/CLI-DESIGN.md) | Complete command reference |
| [SESSION-RECORDING-GUIDE.md](docs/SESSION-RECORDING-GUIDE.md) | Session history, audit trail & queries |
| [VERSIONING-GUIDE.md](docs/VERSIONING-GUIDE.md) | Version management & node upgrades |
| [AI-PROVIDERS.md](docs/AI-PROVIDERS.md) | Setting up Claude, GPT, Ollama, Gemini |
| [DOMAIN-MODELS.md](docs/DOMAIN-MODELS.md) | YAML model definitions for nodes |
| [ECOSYSTEM.md](docs/ECOSYSTEM.md) | Integration patterns & extensions |

### Developer Guides

| Document | Purpose |
|----------|---------|
| [IDE-SETUP.md](IDE-SETUP.md) | IntelliJ setup, run configurations & workflow |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Development standards, testing, CI/CD |
| [RELEASE.md](RELEASE.md) | Complete release workflow & automation |
| [DOCKER-TESTING.md](DOCKER-TESTING.md) | Docker testing setup & usage |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines & process |

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

Run `bozly migrate` to convert existing nodes.

---

## Contributing

We welcome contributions:

- **Report bugs** — [Open an issue](https://github.com/RetroGhostLabs/bozly/issues)
- **Share your node** — Create a repo and share in Discussions
- **Improve docs** — Submit a PR for typos or improvements
- **Contribute code** — See CONTRIBUTING.md

---

## License

MIT License — Use it for anything.

See [LICENSE](LICENSE) for details.

---

## Connect

- **GitHub:** [bozly](https://github.com/RetroGhostLabs/bozly)
- **Discussions:** [Ask questions & share nodes](https://github.com/RetroGhostLabs/bozly/discussions)
- **Issues:** [Report bugs & request features](https://github.com/RetroGhostLabs/bozly/issues)

---

**BOZLY:** Build. OrganiZe. Link. Yield.

*Built by [RetroGhostLabs](https://github.com/RetroGhostLabs) | MIT License*

*Last updated: 2025-12-27 (Session 122 - Release Cleanup)* | *Phase 1 ✅ (100%) | Phase 2 ✅ (100%) | v0.6.0-beta.1 Released | Tests: 1,642/1,642 (100%) | v1.0 Target: May 2026*

---

## 📊 Progress Tracking

**Phase 1 Beta: ✅ COMPLETE** — v0.3.0-beta.1 released December 21, 2025

**Phase 2 Automation & Integrations: ✅ 100% COMPLETE**
- v0.4.0-beta.1: Hooks, Workflows, Auto-Cleanup, Templates
- v0.4.1-beta.1: Memory System, Cross-Node Search
- v0.4.2-beta.1: Smart Routing, Command Suggestions
- v0.5.0-beta.1: Web Dashboard UI
- v0.6.0-beta.1: REST APIs, Dashboard Server, AI-Assisted Commands

**Phase 3: Ecosystem & Community** — 📋 Ready for v1.0 (Planning stage)

See the project repository for issue tracking and feature requests.
