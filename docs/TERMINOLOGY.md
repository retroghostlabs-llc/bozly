# BOZLY Terminology Guide

Understanding the terms used in BOZLY and how they relate to other tools.

**Last updated:** 2025-12-30 (Session 148)

---

## CLI Shorthand

BOZLY provides a short alias for faster typing:

```bash
# These are identical:
bozly --version
bz --version

# Use whichever you prefer:
bozly run daily
bz run daily

bozly list
bz list
```

**`bz`** is the official shorthand for **`bozly`** — use it everywhere!

---

## Quick Reference

| Term | Definition | Also Known As |
|------|------------|---------------|
| **Vault** | A domain-specific workspace managed by BOZLY | Node |
| **Node** | Internal term for a vault | Vault |
| **Command** | An executable AI task defined in markdown | Prompt template |
| **Context** | Domain knowledge provided to the AI | System prompt |
| **Session** | A record of a single command execution | Run, execution |
| **Provider** | An AI service (Claude, GPT, etc.) | AI, model |

---

## Nodes and Vaults: The Same Thing

> **For Obsidian users:** A BOZLY vault is conceptually similar to an Obsidian vault — it's a directory containing your domain-specific content and configuration.

In BOZLY, **"node"** and **"vault"** refer to the same thing:

- A **directory** containing domain-specific content
- A **`.bozly/`** folder with configuration, commands, and sessions
- A **workspace** for a specific domain (music, journaling, projects, etc.)

### Why Two Terms?

| Term | Origin | Best For |
|------|--------|----------|
| **Vault** | Obsidian users | User-facing contexts, documentation |
| **Node** | Graph/network theory | Technical contexts, internal code |

**You can use either term interchangeably.** BOZLY understands both.

### Examples

```bash
# These are equivalent:
bozly init              # Initialize a vault in current directory
bozly list              # List all registered vaults

# Internal code uses "node" but you see "vault" in output:
# "Vault registered successfully!"
# "Vault Status: music"
```

---

## For Obsidian Users

If you're coming from Obsidian, here's how BOZLY concepts map:

| Obsidian | BOZLY | Notes |
|----------|-------|-------|
| Vault | Vault (Node) | Same concept! |
| Vault folder | `.bozly/` folder | Configuration lives here |
| Templates | Commands | AI-powered instead of static |
| Daily notes | `bozly run daily` | Commands can create notes |
| Plugins | Hooks, Workflows | Automation and customization |

### Using BOZLY with Obsidian

BOZLY works great alongside Obsidian:

1. **Same directory:** Initialize BOZLY in your Obsidian vault
2. **Non-destructive:** BOZLY only uses `.bozly/` folder
3. **Complementary:** Obsidian for notes, BOZLY for AI assistance

```bash
# In your Obsidian vault directory
cd ~/my-obsidian-vault
bozly init --type journal

# Now you have both:
# - Obsidian managing your markdown files
# - BOZLY providing AI-powered commands
```

---

## Core Concepts Glossary

### Vault / Node

A domain-specific workspace containing:
- **Context** (`.bozly/context.md`) — What the AI knows about your domain
- **Commands** (`.bozly/commands/`) — Executable AI tasks
- **Sessions** (`.bozly/sessions/`) — History of all executions
- **Config** (`.bozly/config.json`) — Settings for this vault

**Example vaults:**
- `~/music` — Music discovery and album reviews
- `~/journal` — Daily journaling and reflection
- `~/projects` — Project management and planning

### Command

A markdown file that defines an AI task:

```markdown
---
description: Discover new albums based on my taste
provider: claude
---

Based on my listening history and preferences, suggest 5 albums...
```

Commands can specify:
- **Description** — What the command does
- **Provider** — Which AI to use (optional override)
- **Model** — Which domain model to reference (optional)

### Context

The `.bozly/context.md` file tells the AI about your domain:

```markdown
# My Music Vault

## My Taste
- Favorite genres: Jazz, Soul, Hip-Hop
- Era preference: 60s-90s

## How I Work
- I want detailed production analysis
- I appreciate historical context
```

Context is automatically included when running commands.

### Session

A complete record of a command execution:

```
.bozly/sessions/{vault-id}/2025/12/30/{uuid}/
├── session.json     # Metadata (timing, provider, status)
├── context.md       # What the AI knew
├── prompt.txt       # What was sent to the AI
├── results.md       # What the AI responded
└── execution.json   # Technical details
```

Sessions create an audit trail and enable learning from past interactions.

### Provider

An AI service that executes commands:

| Provider | Service | CLI |
|----------|---------|-----|
| `claude` | Anthropic Claude | `claude` |
| `gpt` | OpenAI GPT | `gpt-cli` |
| `gemini` | Google Gemini | `gemini` |
| `ollama` | Local LLMs | `ollama` |

BOZLY is **AI-agnostic** — it works with any provider.

---

## Internal vs User-Facing

For developers and contributors:

| Context | Term Used | Example |
|---------|-----------|---------|
| User messages | "vault" | "Vault registered successfully" |
| CLI help | "vault" | "Initialize a new vault" |
| Documentation | "vault" (primary) | "Create a vault for..." |
| TypeScript types | "node" | `NodeInfo`, `NodeConfig` |
| Variable names | "node" | `const node = await getNode()` |
| JSON fields | "node" | `{ "nodeId": "music" }` |

This separation keeps the codebase consistent while making the user experience welcoming for Obsidian users.

---

## See Also

- [CONCEPTS.md](CONCEPTS.md) — Core concepts in depth
- [GETTING-STARTED.md](GETTING-STARTED.md) — Quick start guide
- [FOLDER-STRUCTURE.md](FOLDER-STRUCTURE.md) — Directory layout
- [CLI-REFERENCE.md](CLI-REFERENCE.md) — All CLI commands

---

*BOZLY: Build. OrganiZe. Link. Yield.*
