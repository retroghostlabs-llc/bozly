# BOZLY CLI Design

**Command Reference for the BOZLY Framework**

*Last updated: December 22, 2025*

---

## Overview

BOZLY is a command-line tool for managing AI-powered domain workspaces. It prepares context and prompts, then pipes them to your chosen AI CLI (Claude, GPT, Gemini, Ollama, etc.).

**Core Principle:** BOZLY is a "context provider" — it prepares the prompts, your AI executes them.

---

## Installation

```bash
# npm (recommended)
npm install -g bozly

# Homebrew
brew tap retroghostlabs/bozly
brew install bozly

# From source
git clone https://github.com/RetroGhostLabs/bozly.git
cd bozly && npm install && npm link
```

---

## Global Commands

### `bozly init`

Initialize a new BOZLY node in the current directory.

```bash
bozly init                          # Interactive setup
bozly init --name "My Vault"        # With name
bozly init --type music             # From template
bozly init --ai claude              # Set default AI
```

**Creates:**
```
.bozly/
├── config.json       ← Vault configuration
├── context.md        ← AI context file
├── index.json        ← Task index (empty)
├── commands/         ← Node-specific commands
├── workflows/        ← Multi-step processes
└── hooks/            ← Automation triggers
```

---

### `bozly list`

List all registered nodes.

```bash
bozly list                          # All nodes
bozly list --json                   # JSON output
bozly list --status                 # Include last activity
```

**Output:**
```
Registered Vaults (3):

  music       ~/nodes/music         active    2h ago
  journal     ~/nodes/journal       active    1d ago
  content-vault     ~/nodes/content       inactive  5d ago
```

---

### `bozly add <path>`

Register an existing node with BOZLY.

```bash
bozly add ~/my-vault                # Register vault
bozly add ~/my-vault --name "Work"  # Custom name
bozly add . --current               # Register current directory
```

---

### `bozly remove <name>`

Remove a node from the registry and optionally backup/delete files.

```bash
# Remove node with confirmation
bozly remove music            # Remove by name (with prompt)

# Remove with specific options
bozly remove music --backup    # Create timestamped backup first
bozly remove music --force     # Skip confirmation prompt
bozly remove music --keep-files # Remove from registry only, keep files
bozly remove music --backup --force # Backup + remove without prompt
```

**Flags:**
- `--backup, -b` — Create timestamped backup in `~/.bozly/backups/` before removing
- `--force, -f` — Skip confirmation prompt (use with caution)
- `--keep-files, -k` — Remove node from registry only, keep files on disk
- `--path` — Remove by file path instead of node name

**Backups:**
Backup files are stored in `~/.bozly/backups/` with format: `{node-name}-{ISO-timestamp}.tar.gz`

**Examples:**
```bash
# Remove node with confirmation prompt
bozly remove my-vault

# Backup then remove without prompt
bozly remove my-vault --backup --force

# Keep files, just unregister
bozly remove my-vault --keep-files

# Remove by path
bozly remove --path ~/my-vault --backup
```

---

### `bozly status`

Show status of current node or all nodes.

```bash
bozly status                        # Current node
bozly status --all                  # All nodes
bozly status music            # Specific node
```

**Output:**
```
Vault: music
Path:  ~/nodes/music
AI:    claude (default)
Tasks: 42 total, 3 active

Recent Sessions:
  2025-12-16 14:30  Complete album review for "Dark Side of the Moon"
  2025-12-16 10:15  Weekly roll selection
  2025-12-15 18:00  Update scoring system

Commands: 14 available (/daily, /weekly, /complete-album, ...)
```

---

## Context Commands

### `bozly context`

Generate context for AI consumption.

```bash
bozly context                       # Full context (stdout)
bozly context --minimal             # Minimal context
bozly context --ai claude           # Claude-specific format
bozly context --ai gpt              # GPT-specific format
bozly context > context.txt         # Save to file
```

**Use Case:** Feed context to AI manually
```bash
bozly context | claude -p "What should I do today?"
```

---

### `bozly context edit`

Open context.md in your editor.

```bash
bozly context edit                  # Open in $EDITOR
bozly context edit --vscode         # Open in VS Code
```

---

## Execution Commands

### `bozly run <command>`

Run a node command with AI.

```bash
bozly run daily                     # Run /daily with default AI
bozly run daily --ai gpt            # Run with GPT
bozly run daily --ai ollama         # Run with local Ollama
bozly run daily --dry               # Show prompt (no execution)
bozly run daily --verbose           # Show full context + prompt
```

**How it works:**
1. Loads node context
2. Loads command prompt from `.bozly/commands/daily.md`
3. Combines context + prompt
4. Pipes to AI CLI
5. Saves session to `.bozly/sessions/`

---

### `bozly run <workflow>`

Run a multi-step workflow.

```bash
bozly run complete-album            # Multi-step workflow
bozly run complete-album --step 2   # Resume from step 2
bozly run complete-album --dry      # Show all steps
```

---

### `bozly pipe <prompt>`

Pipe a custom prompt with node context to AI.

```bash
# Quick questions
bozly pipe "What albums should I review this week?"

# With specific AI
bozly pipe "Summarize my journal entries" --ai gpt

# From file
bozly pipe --file prompt.txt

# With context only (no node commands)
bozly pipe "Help me with this" --context-only
```

---

## Session Commands

### `bozly history`

View session history.

```bash
bozly history                       # Recent sessions
bozly history --limit 10            # Last 10 sessions
bozly history --date 2025-12-16     # Specific date
bozly history --json                # JSON output
```

---

### `bozly session <id>`

View a specific session.

```bash
bozly session abc123                # View session
bozly session abc123 --summary      # Summary only
bozly session abc123 --changes      # Files changed
```

---

### `bozly resume <id>`

Resume a previous session.

```bash
bozly resume abc123                 # Resume session
bozly resume last                   # Resume last session
bozly resume --ai gpt               # Resume with different AI
```

---

## Task Commands

### `bozly tasks`

View and manage tasks.

```bash
bozly tasks                         # List active tasks
bozly tasks --all                   # Include completed
bozly tasks --json                  # JSON output
```

---

### `bozly task <id>`

View task details.

```bash
bozly task abc123                   # View task
bozly task abc123 --sessions        # Related sessions
bozly task abc123 --files           # Files touched
```

---

## Configuration Commands

### `bozly config`

View or modify configuration.

```bash
bozly config                        # Show all config
bozly config --global               # Global config only
bozly config --vault                # Vault config only

# Set values
bozly config set ai.default claude  # Set default AI
bozly config set ai.model sonnet    # Set model
bozly config set editor.command vim # Set editor

# Get values
bozly config get ai.default         # Get specific value
```

---

### `bozly config ai`

Configure AI providers.

```bash
bozly config ai                     # Show AI settings
bozly config ai add gpt             # Add GPT provider
bozly config ai remove gemini       # Remove provider
bozly config ai default claude      # Set default
```

**AI Configuration:**
```json
{
  "ai": {
    "default": "claude",
    "providers": {
      "claude": {
        "command": "claude",
        "model": "sonnet"
      },
      "gpt": {
        "command": "gpt",
        "model": "gpt-4"
      },
      "ollama": {
        "command": "ollama run llama2",
        "model": "llama2"
      }
    }
  }
}
```

---

## Template Commands (Phase 3)

### `bozly search <query>`

Search community node templates.

```bash
bozly search music                  # Search for music nodes
bozly search --tag productivity     # By tag
bozly search --author retroghostlabs # By author
```

---

### `bozly install node>`

Install a vault template.

```bash
bozly install music-discovery       # Install template
bozly install node  # Custom path
bozly install --list                # List available templates
```

---

### `bozly publish`

Publish vault to community registry.

```bash
bozly publish                       # Publish current vault
bozly publish --dry                 # Validate only
```

---

## Utility Commands

### `bozly doctor`

Check BOZLY installation and vault health.

```bash
bozly doctor                        # Full health check
bozly doctor --fix                  # Auto-fix issues
```

**Output:**
```
BOZLY Health Check

✓ BOZLY installed correctly
✓ Global config found (~/.bozly/bozly-config.json)
✓ 3 nodes registered
✓ AI CLI found: claude (v2.0.70)

Warnings:
⚠ music: Last session 30+ days ago
⚠ No default AI configured (using claude)

Run 'bozly doctor --fix' to resolve issues.
```

---

### `bozly migrate`

Migrate from AI Vault Framework to BOZLY.

```bash
bozly migrate                       # Interactive migration
bozly migrate --dry                 # Show what would change
bozly migrate --backup              # Backup before migration
```

**Migration Process:**
1. Backup existing vault
2. Create `.bozly/` structure
3. Copy CLAUDE.md → .bozly/context.md
4. Convert WORK-LOG.md → .bozly/sessions/
5. Register vault in global registry

---

### `bozly version`

Show version information.

```bash
bozly version                       # Short version
bozly version --verbose             # Detailed info
```

---

### `bozly help`

Show help information.

```bash
bozly help                          # General help
bozly help init                     # Help for specific command
bozly help --all                    # All commands
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BOZLY_HOME` | Global config location | `~/.bozly` |
| `BOZLY_AI` | Default AI provider | `claude` |
| `BOZLY_EDITOR` | Editor for context files | `$EDITOR` |
| `BOZLY_DEBUG` | Enable debug output | `false` |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Vault not found |
| 4 | AI provider error |
| 5 | Configuration error |

---

## Examples

### Morning Workflow

```bash
# Check node status
bozly status --all

# Run daily planning
bozly run daily

# Quick question
bozly pipe "What's my priority today based on recent tasks?"
```

### Setting Up New Vault

```bash
# Create node directory
mkdir ~/nodes/project-vault
cd ~/nodes/project-vault

# Initialize with BOZLY
bozly init --name "Project Vault" --type journal

# Add custom command
echo "Review yesterday's progress and plan today" > .bozly/commands/daily.md

# Run first session
bozly run daily
```

### Multi-AI Workflow

```bash
# Use Claude for creative work
bozly run brainstorm --ai claude

# Use GPT for analysis
bozly run analyze --ai gpt

# Use local LLM for privacy-sensitive tasks
bozly run private-notes --ai ollama
```

---

## Related Documents

- [BOZLY-ROADMAP.md](BOZLY-ROADMAP.md) - Development roadmap
- [SESSION-31-ARCHITECTURE-DECISIONS.md](SESSION-31-ARCHITECTURE-DECISIONS.md) - Architecture decisions
- [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md) - Migration from AI Vault Framework

---

*BOZLY: Build. OrganiZe. Link. Yield.*
