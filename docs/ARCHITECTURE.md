# BOZLY - Architecture

**Build. OrganiZe. Link. Yield.**

---

## Overview

BOZLY is an AI-agnostic framework for deploying domain-specific workspaces. It provides context management, session storage, and command orchestration that works with ANY AI provider (Claude, GPT, Gemini, Ollama, local LLMs).

**Key Insight:** BOZLY is a "context provider" — it prepares prompts and context, your AI CLI executes them.

---

## Core Concepts

### What is a Node?

A **node** is a self-contained AI workspace for a specific domain or project. Each node:
- Has its own `.bozly/` configuration folder
- Defines domain-specific commands and workflows
- Has a `context.md` file explaining the system to AI
- Tracks sessions and tasks automatically
- Registers with the global BOZLY registry

**Examples:**
- Music Discovery Node → Album recommendation system
- Content Production Node → Multi-camera video workflow
- Journal Node → Daily entries and mood tracking
- Your Domain → Whatever you want to build

### The Context Provider Model

BOZLY doesn't execute AI directly. Instead:

```
┌─────────────────────────────────────────────────────────────────┐
│  USER runs: bozly run daily                                     │
├─────────────────────────────────────────────────────────────────┤
│  BOZLY:                                                         │
│  1. Loads node context (.bozly/context.md)                     │
│  2. Loads command prompt (.bozly/commands/daily.md)             │
│  3. Combines context + prompt                                   │
│  4. Pipes to AI CLI (claude/gpt/gemini/ollama)                  │
│  5. Saves session to .bozly/sessions/                           │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Works with ANY AI CLI (Claude, GPT, Gemini, Ollama, etc.)
- No API keys stored in BOZLY (your AI CLI handles auth)
- Switch AIs anytime: `bozly run daily --ai gpt`
- AI-agnostic session storage (not tied to any provider)

---

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | **TypeScript** | Matches Cline/Cursor ecosystem |
| Storage | **JSON files** | Simple, debuggable (SQLite later if needed) |
| AI Support | **AI-agnostic** | Any AI CLI: claude, gpt, gemini, ollama |
| Platforms | **Unix-only** | macOS, Linux, WSL2 (no native Windows) |
| Distribution | **npm, Homebrew** | Standard package managers |

---

## Three-Tier Architecture

BOZLY uses a three-tier safety model that keeps framework code, user config, and node data completely separate:

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 1: BOZLY CORE (Framework-Owned)                           │
│  Location: npm/brew install or ~/.bozly/core/                   │
│  Updated by: BOZLY releases (npm update -g bozly)               │
│  User edits: NEVER                                              │
│                                                                 │
│  Contains:                                                      │
│  • CLI binary (bozly command)                                   │
│  • Core TypeScript modules                                      │
│  • Default templates                                            │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 2: GLOBAL USER CONFIG (User-Owned)                        │
│  Location: ~/.bozly/                                            │
│  Updated by: USER only                                          │
│  BOZLY touches: NEVER (reads only)                              │
│                                                                 │
│  Contains:                                                      │
│  • bozly-registry.json (all node locations)                    │
│  • bozly-config.json (global settings, AI providers)            │
│  • commands/ (global commands)                                  │
│  • workflows/ (global workflows)                                │
│  • templates/ (custom templates)                                │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 3: NODE CONFIG (Node-Owned)                              │
│  Location: ~/music/.bozly/                                   │
│  Updated by: USER only                                          │
│  BOZLY touches: NEVER (reads only, writes to sessions/)         │
│                                                                 │
│  Contains:                                                      │
│  • config.json (node settings)                                 │
│  • context.md (AI context file)                                 │
│  • index.json (task index)                                      │
│  • sessions/ (session history)                                  │
│  • tasks/ (task data)                                           │
│  • commands/ (node commands)                                   │
│  • workflows/ (node workflows)                                 │
│  • hooks/ (automation triggers)                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why This Matters:**
- Framework updates NEVER overwrite your config or node data
- Your customizations survive any upgrade
- Clear ownership: you control your data, BOZLY controls its code

---

## Folder Structure

### Global Config (`~/.bozly/`)

```
~/.bozly/
├── bozly-registry.json        ← All node locations
├── bozly-config.json          ← Global settings
│   └── {
│         "ai": {
│           "default": "claude",
│           "providers": {
│             "claude": { "command": "claude", "model": "sonnet" },
│             "gpt": { "command": "gpt", "model": "gpt-4" },
│             "ollama": { "command": "ollama run llama2" }
│           }
│         }
│       }
├── commands/                  ← Global commands
│   ├── status.md
│   └── list.md
├── workflows/                 ← Global workflows
├── hooks/                     ← Global hooks
└── templates/                 ← Vault templates
    ├── music/
    ├── journal/
    └── content/
```

### Per-Node Config (`~/music/.bozly`)/`)

```
~/music/.bozly/
├── config.json                ← Node settings
│   └── {
│         "name": "Music Discovery",
│         "type": "music",
│         "ai": { "default": "claude" },
│         "created": "2025-12-16"
│       }
├── context.md                 ← AI context file (like CLAUDE.md)
├── index.json                 ← Task index
│   └── {
│         "tasks": [
│           { "id": "abc123", "name": "Review Dark Side", "status": "completed" }
│         ],
│         "lastUpdated": "2025-12-16T10:30:00Z"
│       }
├── sessions/                  ← Session history (AI-agnostic)
│   ├── 2025-12-16-abc123.json
│   └── 2025-12-16-def456.json
├── tasks/                     ← Task data (Cline-style)
│   └── abc123/
│       ├── session.json       ← AI conversation
│       ├── context.json       ← Decisions, outcomes
│       └── changes.json       ← Files modified
├── commands/                  ← Node commands
│   ├── daily.md
│   ├── weekly-roll.md
│   └── complete-album.md
├── workflows/                 ← Multi-step workflows
│   └── full-review.md
└── hooks/                     ← Automation triggers
    ├── session-start.ts
    └── session-end.ts
```

---

## Key Design Patterns

### Pattern 1: Cline-Style Task Folders

Inspired by Cline's proven architecture, BOZLY organizes data by task:

```
.bozly/tasks/<task-id>/
├── session.json       ← AI conversation history
├── context.json       ← Task metadata, decisions, outcomes
└── changes.json       ← Files modified during task
```

**Benefits:**
- Everything for a task in one folder (portable)
- Easy to review what happened
- AI-agnostic storage format
- Works with any provider

### Pattern 2: AI-Agnostic Storage

BOZLY stores its own conversation history, not depending on any AI provider:

```json
// .bozly/sessions/2025-12-16-abc123.json
{
  "id": "abc123",
  "node": "music-discovery",
  "ai": "claude",
  "model": "sonnet",
  "started": "2025-12-16T10:00:00Z",
  "ended": "2025-12-16T10:30:00Z",
  "messages": [
    { "role": "user", "content": "Run daily review" },
    { "role": "assistant", "content": "Starting daily review..." }
  ],
  "task": "daily-review",
  "outcome": "completed"
}
```

**Why Own Storage:**
- Works with Claude, GPT, Gemini, Ollama, any AI
- You control your data (not locked to a provider)
- Can migrate between AIs without losing history
- Enables cross-node queries and analytics

### Pattern 3: Single Context File

Each node has ONE context file (`.bozly/context.md`) that works with any AI:

```markdown
# Music Discovery Node

## Purpose
Rate albums using triple-scoring system (Shaun + Objective + Emotional).

## Commands
| Command | Purpose |
|---------|---------|
| /daily | Daily listening log |
| /weekly-roll | Select album for the week |
| /complete-album | Finalize album review |

## Workflow
1. Roll album → 2. Listen → 3. Score → 4. Review
```

**Not AI-Specific:**
- No CLAUDE.md, GEMINI.md, etc.
- BOZLY prepares context, pipes to your chosen AI
- Same node works with any provider
- Switch AIs: `bozly run daily --ai gpt`

### Pattern 4: Commands, Workflows, Hooks

BOZLY organizes automation into three types:

| Type | Definition | Example |
|------|------------|---------|
| **Command** | Single action, user-invoked | `/daily` |
| **Workflow** | Multi-step process, may prompt | `/complete-album` |
| **Hook** | Automatic trigger, no user action | `session-start` |

```
.bozly/
├── commands/          ← Simple user-invoked actions
├── workflows/         ← Multi-step processes
└── hooks/             ← Automatic triggers
```

---

## Command Resolution

When you run `bozly run daily`, BOZLY looks for commands in this order:

1. **Node commands** (`.bozly/commands/daily.md`) — highest priority
2. **Global commands** (`~/.bozly/commands/daily.md`) — fallback

This allows:
- Node-specific commands to override global ones
- Shared commands across all nodes
- Customization where needed

---

## Registry System

BOZLY maintains a registry of all nodes:

```json
// ~/.bozly/bozly-registry.json
{
  "nodes": [
    {
      "id": "music-discovery",
      "name": "Music Discovery",
      "path": "/Users/you/music",
      "type": "music",
      "status": "active",
      "lastActivity": "2025-12-16T10:30:00Z"
    },
    {
      "id": "journal",
      "name": "Daily Journal",
      "path": "/Users/you/journal",
      "type": "journal",
      "status": "active",
      "lastActivity": "2025-12-16T08:00:00Z"
    }
  ]
}
```

**Commands:**
- `bozly list` — Show all registered nodes
- `bozly add <path>` — Register existing node
- `bozly status` — Show node status and activity

---

## Hooks System

Hooks automate actions at key moments:

| Hook | Trigger | Use Case |
|------|---------|----------|
| `session-start` | Session begins | Load context, show recent tasks |
| `session-end` | Session ends | Save conversation, update index |
| `post-tool` | After tool runs | Track file changes |

**Example Hook:**
```typescript
// .bozly/hooks/session-start.ts
export default async function onSessionStart(vault: Vault) {
  // Load recent tasks
  const tasks = await node.getTasks({ limit: 5, status: 'active' });

  // Show context
  console.log(`Recent tasks: ${tasks.map(t => t.name).join(', ')}`);
}
```

---

## Multi-AI Workflow

**Scenario: Start with Claude, switch to GPT**

```bash
# Morning: Use Claude for creative work
$ bozly run brainstorm --ai claude
# BOZLY pipes prompt to: claude

# Afternoon: Use GPT for analysis
$ bozly run analyze --ai gpt
# BOZLY pipes prompt to: gpt

# Evening: Use local LLM for private notes
$ bozly run journal --ai ollama
# BOZLY pipes prompt to: ollama run llama2
```

**What's Shared:**
- Same node context (`.bozly/context.md`)
- Same commands (`.bozly/commands/`)
- Same session storage (`.bozly/sessions/`)

**What Changes:**
- Only the AI CLI executing the prompt

---

## Comparison to Other Tools

### vs. Cursor/Cline (Code-Only)
| Feature | Cursor/Cline | BOZLY |
|---------|--------------|-------|
| Domains | Code only | Any domain |
| Architecture | Proven | Same patterns |
| AI Lock-in | Some | None |

### vs. Single-Node Tools
| Feature | Single-Node | BOZLY |
|---------|--------------|-------|
| Vaults | One | Unlimited |
| Shared Commands | No | Yes (global layer) |
| Registry | No | Yes |

### vs. AI-Specific Tools
| Feature | AI-Specific | BOZLY |
|---------|-------------|-------|
| Provider | One (Claude, GPT, etc.) | Any |
| Storage | Provider-specific | AI-agnostic |
| Migration | Hard | Easy |

---

## Roadmap

### Phase 1: Beta
- TypeScript CLI (`bozly` command)
- Node initialization and management
- Context generation and AI piping
- JSON storage

### Phase 2: Polish
- Hooks system
- Workflows (multi-step)
- Cross-node queries
- Session history viewer

### Phase 3: Ecosystem
- Community node registry
- `bozly search` / `bozly install`
- Node publishing

### Phase 4: Advanced
- Shadow Git checkpoints (undo/rollback)
- SQLite storage (if needed at scale)
- Skills system (auto-invoke)
- Full marketplace

See [BOZLY-ROADMAP.md](../BOZLY-ROADMAP.md) for detailed timeline.

---

## Philosophy

### 1. Leverage Don't Reinvent
Use proven patterns from Cline/Cursor. Don't rebuild session management — focus on domain orchestration.

### 2. AI-Agnostic First
Never lock users to a provider. BOZLY prepares context, any AI executes.

### 3. User Owns Data
Three-tier safety: framework code, user config, and node data are completely separate. Your data survives any upgrade.

### 4. CLI-First
No GUI required. Everything works from the command line. GUI is optional later.

---

## Technical Details

### context.md Format

```markdown
# Vault Name

## Purpose
One-sentence description of what this vault does.

## Commands
| Command | Purpose |
|---------|---------|
| /command | Description |

## Key Files
| File | Purpose |
|------|---------|
| file.md | Description |

## Workflow
1. Step one
2. Step two
3. Step three

## Rules
- MUST: Do this
- NEVER: Don't do this
```

### Session JSON Format

```json
{
  "id": "session-id",
  "node": "node-id",
  "ai": "claude",
  "model": "sonnet",
  "started": "ISO-timestamp",
  "ended": "ISO-timestamp",
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "task": "task-id",
  "outcome": "completed|abandoned|error"
}
```

### Config JSON Format

```json
{
  "ai": {
    "default": "claude",
    "providers": {
      "claude": { "command": "claude", "model": "sonnet" },
      "gpt": { "command": "gpt", "model": "gpt-4" },
      "ollama": { "command": "ollama run llama2", "model": "llama2" }
    }
  },
  "hooks": {
    "sessionStart": true,
    "sessionEnd": true,
    "postTool": false
  }
}
```

---

## Contributing

BOZLY is open-source (MIT License). Contributions welcome:

- **Report bugs** — [GitHub Issues](https://github.com/RetroGhostLabs/bozly/issues)
- **Share nodes** — Create repos and share in Discussions
- **Improve docs** — Submit PRs
- **Contribute code** — See CONTRIBUTING.md

---

*BOZLY: Build. OrganiZe. Link. Yield.*

*Last updated: 2025-12-19 (Session 40 - Logging integration complete)*
