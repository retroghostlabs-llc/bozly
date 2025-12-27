# BOZLY Core Concepts

Understanding the fundamental ideas behind BOZLY.

**Last updated:** 2025-12-27 (Session 122)

---

## Table of Contents

1. [What is BOZLY?](#what-is-bozly)
2. [Nodes (Vaults)](#nodes-vaults)
3. [Context](#context)
4. [Commands](#commands)
5. [Sessions](#sessions)
6. [AI-Agnostic Design](#ai-agnostic-design)
7. [Three-Tier Architecture](#three-tier-architecture)

---

## What is BOZLY?

**BOZLY** is a **context provider for domain-specific AI work**.

### The Core Idea

Imagine Cursor or Cline, but for any domain — music, journaling, research, content creation.

These tools work so well for coding because they:
1. Know about your code (context)
2. Have specialized commands (run, debug, test)
3. Remember what you did (session history)
4. Integrate with your AI

**BOZLY brings these same patterns to any domain.**

### How It Works (In 30 Seconds)

```
You:        bozly run discover
BOZLY:      Load context + command → Pipe to AI → Save session
AI:         Process → Respond
BOZLY:      Save results → Done
```

---

## Nodes (Vaults)

A **node** is a domain-specific workspace. You also call it a "vault."

### What's a Node?

Think of a node as a directory that contains:
- Everything about a domain (music, journaling, projects)
- AI context for that domain
- Custom commands for that domain
- Session history for that domain

### Examples of Nodes

| Node | Domain | Purpose |
|------|--------|---------|
| `~/music` | Music | Album reviews, discovery, learning |
| `~/journal` | Journal | Daily reflection, tracking |
| `~/writing` | Content | Blog drafts, ideas, editing |
| `~/research` | Research | Paper notes, synthesis, summaries |
| `~/fitness` | Life | Workout planning, progress tracking |

### Creating a Node

```bash
mkdir ~/music
cd ~/music
bozly init
```

This creates a `.bozly/` folder with everything needed.

### What Gets Created

```
.bozly/
├── config.json        # Vault settings (name, type, AI provider)
├── context.md         # AI context for this vault
├── commands/          # Commands specific to this vault
├── workflows/         # Multi-step automations
├── tasks/             # Task management
├── hooks/             # Automation triggers
├── sessions/          # Session history (organized by date)
└── models.json        # AI model preferences (optional)
```

---

## Context

**Context** is the most important file: `.bozly/context.md`

It tells your AI everything about the node.

### Why Context Matters

Without context: "Analyze this album"
- AI has no idea about your music taste
- Generic, unhelpful analysis

With context: "Analyze this album (knowing I love 70s jazz fusion)"
- AI understands your taste
- Specific, relevant analysis

### What's in Context?

```markdown
# My Music Vault

## Purpose
Deep music discovery and analysis

## My Taste
- Favorite genres: Jazz, Soul, Hip-Hop
- Era preference: 60s-90s
- Artists I love: Miles Davis, D'Angelo, J. Dilla

## How I Work
- I want detailed production analysis
- I appreciate historical context
- I want 3-5 recommendations each time

## Files I Have
- listening-log.md: My complete history
- favorites.csv: Top 50 albums
```

### Using Context

When you run a command, BOZLY:
1. Loads your context
2. Loads your command
3. Pipes both to the AI

The AI uses the context to provide better results.

### Editing Context

```bash
bozly context edit        # Opens in your editor
bozly context view        # Display in terminal
```

---

## Commands

A **command** is an executable AI task defined in markdown.

### What's a Command?

```markdown
# Album Discovery

Based on my taste, find 5 albums I should hear.

Include:
- Artist & title
- Why I'd like it
- Key tracks
```

Save as: `.bozly/commands/discover.md`

Run: `bozly run discover`

### Where Commands Live

**Three levels of commands:**

```
┌─────────────────────────┐
│ Vault Commands          │  (highest priority)
│ .bozly/commands/        │  Override everything
└─────────────────────────┘
           ↓
┌─────────────────────────┐
│ Global Commands         │  (middle priority)
│ ~/.bozly/commands/      │  Shared across vaults
└─────────────────────────┘
           ↓
┌─────────────────────────┐
│ Builtin Commands        │  (lowest priority)
│ {npm}/default-commands/ │  BOZLY defaults
└─────────────────────────┘
```

### Command Examples

**Music Domain:**
- `album-review.md` — Deep dive analysis
- `discovery.md` — Find new music
- `artist-spotlight.md` — Learn about an artist

**Journal Domain:**
- `daily-reflection.md` — End-of-day journaling
- `weekly-review.md` — Week in review
- `mood-tracker.md` — Emotional check-in

**Project Domain:**
- `sprint-planning.md` — Plan next sprint
- `standup.md` — Daily sync
- `retrospective.md` — Sprint review

---

## Sessions

A **session** is a record of every command execution.

### What's Recorded?

Every time you run a command, BOZLY saves:

```
.bozly/sessions/{vault-id}/{YYYY}/{MM}/{DD}/{uuid}/
├── session.json        # Metadata (timing, provider, command)
├── context.md          # The context that was used
├── prompt.txt          # The combined prompt sent to AI
├── results.md          # The AI's response
└── execution.json      # Technical details (logs, timing)
```

### Why Sessions Matter

Sessions create an **audit trail**:
- See what you asked
- See what context was used
- See what the AI said
- Track progress over time
- Learn from previous interactions

### Viewing Sessions

```bash
# List recent sessions
bozly history

# View a specific session
bozly history view <SESSION_ID>

# Filter by date
bozly history --days 7      # Last 7 days

# Filter by vault
bozly history --vault music # Just music vault
```

### Session Storage

Sessions are organized by date:
```
sessions/
└── {vault-id}/
    └── 2025/
        └── 12/
            └── 27/
                ├── {uuid}/ → Session 1
                ├── {uuid}/ → Session 2
                └── {uuid}/ → Session 3
```

This makes it easy to:
- Archive old sessions
- Find sessions from a specific date
- Query by date range

---

## AI-Agnostic Design

BOZLY works with **any AI** — Claude, GPT, Gemini, Ollama, etc.

### Why This Matters

You're not locked into one vendor.

- Use Claude when you want deep analysis
- Use GPT for a different perspective
- Use Ollama for privacy-sensitive work
- Switch providers anytime

### How It Works

BOZLY pipes your prompt to your AI's CLI:

```bash
# BOZLY internally does:
cat combined_prompt.txt | claude

# Or:
cat combined_prompt.txt | gpt-cli

# Or:
cat combined_prompt.txt | ollama run llama2
```

### Switching Providers

**Run-time switch:**
```bash
bozly run discover              # Uses default
bozly run discover --ai gpt     # Use GPT
bozly run discover --ai ollama  # Use Ollama
```

**Change default:**
```bash
bozly config set ai.default gpt
```

### Supported Providers

- **Claude** — `@anthropic-ai/claude-code`
- **GPT** — OpenAI CLI or custom wrapper
- **Gemini** — Google's AI CLI
- **Ollama** — Local LLMs (Llama, Mistral, etc.)
- **Custom** — Any CLI-based AI

---

## Three-Tier Architecture

BOZLY separates **framework**, **global**, and **node** configuration.

### Why This Matters

Clear separation prevents:
- Accidentally overwriting framework defaults
- Configuration conflicts
- User data loss during updates

### The Three Tiers

```
┌─────────────────────────────────────────┐
│ TIER 1: BOZLY CORE (Framework-Owned)    │
│ Location: {npm-global}/bozly/           │
│ You Edit: NEVER                         │
│ Purpose: Framework code & defaults      │
└─────────────────────────────────────────┘
           ↓ (immutable boundary)
┌─────────────────────────────────────────┐
│ TIER 2: GLOBAL CONFIG (User-Owned)      │
│ Location: ~/.bozly/                     │
│ You Edit: ALWAYS                        │
│ Purpose: Your global settings & commands│
└─────────────────────────────────────────┘
           ↓ (immutable boundary)
┌─────────────────────────────────────────┐
│ TIER 3: NODE CONFIG (Node-Owned)        │
│ Location: ~/music/.bozly/               │
│ You Edit: ALWAYS                        │
│ Purpose: Node-specific config & commands│
└─────────────────────────────────────────┘
```

### Tier 1: BOZLY Core

**What it is:**
- Framework code
- Default commands
- Default templates
- Core functionality

**Why immutable:**
- Updates don't break your data
- Your config never auto-updates
- BOZLY release = clean upgrade

### Tier 2: Global Config

**What it is:**
- Global settings (`~/.bozly/bozly-config.json`)
- Global registry (`~/.bozly/bozly-registry.json`)
- Global commands (`~/.bozly/commands/`)
- Global templates (`~/.bozly/templates/`)

**Who edits:**
- You (directly or via `bozly config`)

**Scope:**
- Available to all nodes
- Override framework defaults

### Tier 3: Node Config

**What it is:**
- Node settings (`.bozly/config.json`)
- Node context (`.bozly/context.md`)
- Node commands (`.bozly/commands/`)
- Node workflows (`.bozly/workflows/`)
- Node sessions (`.bozly/sessions/`)

**Who edits:**
- You

**Scope:**
- Specific to this node only
- Override global settings

---

## The Complete Flow

```
User Input
    ↓
Parse Command
    ↓
Resolve (Vault → Global → Builtin)
    ↓
Load Context (.bozly/context.md)
    ↓
Load Command (.bozly/commands/*.md)
    ↓
Combine (Context + Command)
    ↓
Pipe to AI (claude/gpt/ollama)
    ↓
AI Processes & Responds
    ↓
Save Session
    ├── session.json (metadata)
    ├── context.md (what AI knew)
    ├── prompt.txt (what was sent)
    └── results.md (what AI said)
    ↓
Done
```

---

## Key Principles

### 1. Context Is King

Better context = better results. Spend time on `.bozly/context.md`.

### 2. Commands Are Reusable

Create once, use many times with consistent results.

### 3. Sessions Create Memory

Every execution is recorded. Learn from your history.

### 4. AI-Agnostic

Choose your AI per command, per vault, or globally.

### 5. Simple but Powerful

Core is simple (context + command + AI), but scales to complex workflows.

---

## Quick Mental Model

Think of BOZLY as a **context-aware command runner**:

```
Context (What the AI knows)
    +
Command (What you want)
    =
Prompt (Everything the AI sees)

Prompt → AI → Response → Session
```

Every time you run `bozly run X`:
1. BOZLY loads your context
2. BOZLY loads your command
3. BOZLY creates a combined prompt
4. BOZLY pipes to your AI
5. BOZLY saves everything

Simple, consistent, powerful.

---

## Next Steps

- **[GETTING-STARTED.md](GETTING-STARTED.md)** — Detailed walkthrough
- **[FOLDER-STRUCTURE.md](FOLDER-STRUCTURE.md)** — Understand the files
- **[COMMANDS-GUIDE.md](COMMANDS-GUIDE.md)** — Create awesome commands
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Deep system design

---

*BOZLY: Build. OrganiZe. Link. Yield.*

*Last updated: 2025-12-27 (Session 122)*
