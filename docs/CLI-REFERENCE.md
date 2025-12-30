# BOZLY CLI Reference

Complete reference for all 20 BOZLY commands.

**Last updated:** 2025-12-27 (Session 123)

---

## Table of Contents

1. [Command Overview](#command-overview)
2. [Vault Commands](#vault-commands)
3. [Vault Status Commands](#vault-status-commands)
4. [Configuration Commands](#configuration-commands)
5. [Session Commands](#session-commands)
6. [Workflow Commands](#workflow-commands)
7. [Server Commands](#server-commands)
8. [Utility Commands](#utility-commands)
9. [Global Options](#global-options)

---

## Command Overview

### All 20 Commands

| Command | Category | Purpose |
|---------|----------|---------|
| `init` | Setup | Initialize a new vault |
| `add` | Setup | Add/register a vault |
| `remove` | Setup | Remove a vault |
| `list` | Query | List all vaults |
| `status` | Query | Check vault status |
| `run` | Execution | Run a command |
| `command` | Commands | Manage commands |
| `template` | Templates | Create from templates |
| `context` | Context | Manage AI context |
| `config` | Config | Manage settings |
| `history` | History | View session history |
| `diff` | Analysis | Compare sessions |
| `logs` | Debugging | View execution logs |
| `search` | Query | Search across vaults |
| `cleanup` | Maintenance | Clean old sessions |
| `suggest` | Intelligence | Get AI suggestions |
| `workflows` | Automation | Manage workflows |
| `serve` | Server | Start web dashboard |
| `tui` | UI | Launch Terminal Dashboard |
| `version` | Info | Show version info |

---

## Vault Commands

### bozly init

Initialize a new vault.

**Syntax:**
```bash
bozly init [OPTIONS]
```

**Options:**
```
--name <name>              Vault name (interactive if not provided)
--type <type>              Vault type: music, journal, project, content, research, personal, other
--path <path>              Vault directory (default: current directory)
--ai <provider>            Default AI provider: claude, gpt, gemini, ollama
--template <template>      Use a template
--no-example              Skip example context
--quiet                   Suppress prompts, use defaults
```

**Examples:**

```bash
# Interactive setup
bozly init

# Specific type
bozly init --type music

# With template
bozly init --type music --template music-discovery

# Non-interactive
bozly init --name "My Journal" --type journal --ai claude --quiet

# Specific path
bozly init --path ~/my-vault --type project
```

**Output:**
```
✓ Vault initialized: My Music
  Location: /Users/you/music
  Type: music
  AI: claude
  Context: .bozly/context.md
  Sessions: .bozly/sessions/

Next steps:
  bozly context edit        # Customize your context
  bozly run <command>       # Run a command
```

---

### bozly add

Register an existing directory as a vault.

**Syntax:**
```bash
bozly add <path> [OPTIONS]
```

**Options:**
```
--name <name>              Vault name (derived from path if not provided)
--type <type>              Vault type
--ai <provider>            Default AI provider
--force                    Overwrite if already registered
```

**Examples:**

```bash
# Register existing vault
bozly add ~/music --type music

# With all options
bozly add ~/music --name "Music" --type music --ai claude
```

**Output:**
```
✓ Vault registered: My Music
  ID: music-vault-abc123
  Path: /Users/you/music
```

---

### bozly remove

Unregister a vault (doesn't delete files).

**Syntax:**
```bash
bozly remove <vault-name|path> [OPTIONS]
```

**Options:**
```
--force                    Skip confirmation
--delete-data             Also delete .bozly folder (careful!)
```

**Examples:**

```bash
# Remove registration
bozly remove music

# Confirm before deleting
bozly remove ~/music --delete-data

# Force without confirmation
bozly remove music --force
```

---

### bozly list

List all registered vaults.

**Syntax:**
```bash
bozly list [OPTIONS]
```

**Options:**
```
--json                     JSON output format
--type <type>              Filter by type
--sort <field>             Sort by: name, type, created, activity
--details                  Show detailed information
```

**Examples:**

```bash
# List all vaults
bozly list

# With details
bozly list --details

# JSON format
bozly list --json

# Filter by type
bozly list --type music

# Sort by last activity
bozly list --sort activity
```

**Output:**
```
Registered Vaults (2):

1. My Music Discovery
   Type: music
   Path: /Users/you/music
   Created: 2025-12-01
   Last Activity: 2025-12-27 14:22
   Sessions: 42

2. My Journal
   Type: journal
   Path: /Users/you/journal
   Created: 2025-11-15
   Last Activity: 2025-12-26 22:15
   Sessions: 89
```

---

## Vault Status Commands

### bozly status

Check vault status and configuration.

**Syntax:**
```bash
bozly status [OPTIONS]
```

**Options:**
```
--vault <name>             Check specific vault (default: current)
--json                     JSON output format
--brief                    Show minimal info
```

**Examples:**

```bash
# Current vault status
bozly status

# Specific vault
bozly status --vault music

# JSON format
bozly status --json
```

**Output:**
```
Vault: My Music Discovery
Path: /Users/you/music
Type: music
AI Provider: claude
AI Model: claude-3-5-sonnet-20241022
Timezone: America/New_York
Created: 2025-12-01 10:30:00
Last Activity: 2025-12-27 14:22:00

Sessions: 42
Last Command: discovery
Last Status: success

Context: Updated 2025-12-27
Commands: 5 vault + 3 global
Workflows: 2 active
```

---

## Execution Commands

### bozly run

Run a command with your AI.

**Syntax:**
```bash
bozly run <command> [OPTIONS]
```

**Options:**
```
--ai <provider>            Override default AI provider
--model <model>            Specific model to use
--input <text>             Provide input directly (no interactive)
--output <file>            Save output to file
--quiet                    Suppress formatting, raw output
--no-save                  Don't save session
--verbose                  Show all details
```

**Examples:**

```bash
# Run a command
bozly run album-review

# Use different AI
bozly run album-review --ai gpt

# Provide input directly
bozly run summarize --input "Paste your text here"

# Save to file
bozly run album-review --output results.md

# Raw output
bozly run album-review --quiet
```

**Output:**
```
Running: album-review
Provider: Claude
Model: claude-3-5-sonnet-20241022
Tokens: Input 2,450 | Output 1,240 | Total 3,690
Time: 3.2s
Cost: $0.88

[Command output...]

Session saved: .bozly/sessions/.../{uuid}
```

---

### bozly pipe

Quick one-off question with vault context.

**Syntax:**
```bash
bozly pipe [OPTIONS] <question>
```

**Options:**
```
--ai <provider>            Override AI provider
--model <model>            Specific model
--vault <name>             Use specific vault
--no-context               Don't use vault context
--output <file>            Save to file
```

**Examples:**

```bash
# Quick question
bozly pipe "What are some good jazz albums?"

# Different AI
bozly pipe "Explain this concept" --ai gpt

# No context
bozly pipe "What is machine learning?" --no-context

# Save output
bozly pipe "How do I improve my music taste?" --output advice.md
```

**Output:**
```
Q: What are some good jazz albums?

A: [AI's response]

Session saved: .bozly/sessions/.../uuid/
```

---

## Command Management

### bozly command

Manage custom commands.

**Syntax:**
```bash
bozly command <subcommand> [OPTIONS]
```

**Subcommands:**

#### list
List available commands.

```bash
bozly command list [--vault <name>] [--json]
```

Output:
```
Vault Commands:
  album-review         Deep dive album analysis
  discovery            Find new music
  artist-spotlight     Learn about an artist

Global Commands:
  quick-note          Capture ideas with AI
  brainstorm          Generate creative ideas
  summarize           Extract key points

Built-in Commands:
  status-check        Daily standup
  weekly-review       Week review
```

#### create
Create a new command (interactive).

```bash
bozly command create [--name <name>] [--type <type>] [--global]
```

Creates command in `.bozly/commands/` or `~/.bozly/commands/` (if --global).

#### edit
Edit an existing command.

```bash
bozly command edit <command-name>
```

Opens in your editor.

#### delete
Delete a command.

```bash
bozly command delete <command-name> [--force]
```

#### view
View a command's contents.

```bash
bozly command view <command-name>
```

#### validate
Check command syntax.

```bash
bozly command validate <command-name>
```

**Examples:**

```bash
bozly command list
bozly command list --json
bozly command list --vault music

bozly command create
bozly command create --name "new-command"

bozly command edit album-review
bozly command view discovery
bozly command delete old-command --force

bozly command validate discovery
```

---

## Template Management

### bozly template

Manage vault templates.

**Syntax:**
```bash
bozly template <subcommand> [OPTIONS]
```

**Subcommands:**

#### list
List available templates.

```bash
bozly template list [--json]
```

#### create
Create template from existing vault.

```bash
bozly template create <vault-name> <template-name>
```

#### init
Initialize vault from template.

```bash
bozly init --template <template-name>
```

**Examples:**

```bash
bozly template list
bozly template create music my-music-template
bozly init --template my-music-template
```

---

## Configuration Commands

### bozly context

Manage vault AI context.

**Syntax:**
```bash
bozly context <subcommand> [OPTIONS]
```

**Subcommands:**

#### view
Display context.

```bash
bozly context view [--vault <name>] [--raw]
```

#### edit
Edit context in your editor.

```bash
bozly context edit [--vault <name>]
```

#### reset
Reset to default context.

```bash
bozly context reset [--vault <name>] [--force]
```

#### validate
Check context syntax.

```bash
bozly context validate [--vault <name>]
```

**Examples:**

```bash
bozly context view
bozly context edit
bozly context edit --vault music
bozly context reset
bozly context validate
```

---

### bozly config

Manage configuration.

**Syntax:**
```bash
bozly config <subcommand> [OPTIONS]
```

**Subcommands:**

#### view/get
View configuration.

```bash
bozly config view
bozly config get [key]
```

#### set
Change configuration.

```bash
bozly config set <key> <value>
```

#### reset
Reset to defaults.

```bash
bozly config reset [--force]
```

**Options:**
```
--global              Global config (~/.bozly/)
--vault               Vault config (.bozly/)
--json                JSON format
```

**Examples:**

```bash
bozly config view
bozly config get ai.default
bozly config set ai.default gpt
bozly config set timezone "America/Los_Angeles"
bozly config reset --force
bozly config view --json
```

---

## Session Management

### bozly history

View session history.

**Syntax:**
```bash
bozly history [OPTIONS]
```

**Options:**
```
--vault <name>             Filter by vault
--days <num>               Last N days (default: all)
--limit <num>              Show last N sessions (default: 10)
--command <name>           Filter by command
--status <status>          Filter by status: success, error, running
--json                     JSON format
--sort <field>             Sort by: date, command, duration
```

**Examples:**

```bash
bozly history
bozly history --vault music
bozly history --days 7
bozly history --command album-review
bozly history --limit 20
bozly history --json
```

**Output:**
```
Recent Sessions (10):

1. 2025-12-27 14:22:00   discovery      success   2.1s   2,450 tokens
2. 2025-12-27 13:45:00   album-review   success   3.2s   3,690 tokens
3. 2025-12-27 09:30:00   quick-note     success   1.5s   1,200 tokens
...
```

#### view
View specific session details.

```bash
bozly history view <session-id>
```

Shows:
- Session metadata
- Context used
- Prompt sent
- Results received
- Execution details

**Example:**

```bash
bozly history view abc123def456
```

---

### bozly diff

Compare two sessions or versions.

**Syntax:**
```bash
bozly diff <session-1> <session-2> [OPTIONS]
```

**Options:**
```
--context               Compare context used
--prompt                Compare prompts
--results              Compare results
--all                  Compare everything
```

**Examples:**

```bash
bozly diff session-1 session-2
bozly diff session-1 session-2 --context
bozly diff session-1 session-2 --all
```

---

## Search & Analysis

### bozly search

Search across all sessions.

**Syntax:**
```bash
bozly search [OPTIONS] <query>
```

**Options:**
```
--vault <name>             Limit to vault
--command <cmd>            Limit to command
--days <num>               Last N days
--limit <num>              Max results (default: 10)
--content                  Search in results (default: metadata)
--regex                    Use regex pattern
--json                     JSON format
```

**Examples:**

```bash
bozly search "jazz fusion"
bozly search "album review" --content
bozly search "2024" --vault music
bozly search "^Miles Davis" --regex
bozly search "improvement" --days 30 --limit 20
```

---

### bozly suggest

Get AI-powered suggestions.

**Syntax:**
```bash
bozly suggest [OPTIONS] [context]
```

**Options:**
```
--type <type>              Suggestion type: command, optimization, next-step
--vault <name>             Analyze specific vault
--recent <num>             Analyze last N sessions
--ai <provider>            Use specific AI
```

**Examples:**

```bash
bozly suggest
bozly suggest --type command
bozly suggest --vault music --recent 10
bozly suggest --type optimization
```

**Output:**
```
Based on your usage patterns:

1. Suggested Command: artist-timeline
   Why: You frequently ask about artists' evolution
   Template: Ready to create

2. Optimization: Use templates
   Why: Similar workflows repeated 5+ times
   Suggestion: Create workflow for album analysis chain

3. Next Step: Try workflows
   Why: You're running 2-3 commands in sequence
   Benefit: Automate with single command
```

---

## Workflow Commands

### bozly workflows

Manage multi-step automations.

**Syntax:**
```bash
bozly workflows <subcommand> [OPTIONS]
```

**Subcommands:**

#### list
List workflows.

```bash
bozly workflows list [--json]
```

#### create
Create new workflow.

```bash
bozly workflows create [--name <name>]
```

#### run
Run a workflow.

```bash
bozly workflows run <workflow-name> [OPTIONS]
```

#### edit
Edit workflow.

```bash
bozly workflows edit <workflow-name>
```

#### delete
Delete workflow.

```bash
bozly workflows delete <workflow-name> [--force]
```

#### validate
Validate workflow syntax.

```bash
bozly workflows validate <workflow-name>
```

**Examples:**

```bash
bozly workflows list
bozly workflows create --name "weekly-discovery"
bozly workflows run weekly-discovery
bozly workflows edit weekly-discovery
bozly workflows validate weekly-discovery
```

---

## Maintenance Commands

### bozly cleanup

Clean old sessions and optimize storage.

**Syntax:**
```bash
bozly cleanup [OPTIONS]
```

**Options:**
```
--days <num>               Delete sessions older than N days
--vault <name>             Clean specific vault
--dry-run                  Show what would be deleted
--archive <path>           Archive before deleting
--force                    Don't ask for confirmation
```

**Examples:**

```bash
# See what would be deleted
bozly cleanup --days 90 --dry-run

# Archive and delete
bozly cleanup --days 90 --archive ~/archive/sessions

# Clean specific vault
bozly cleanup --vault music --days 90

# Force without confirmation
bozly cleanup --days 180 --force
```

**Output:**
```
Sessions to clean (older than 90 days):
  2025-09-27: 12 sessions, ~5.2 MB
  2025-09-26: 8 sessions, ~3.1 MB
  2025-09-25: 15 sessions, ~6.8 MB

Total: 35 sessions, ~15.1 MB

Archive to: ~/archive/sessions/ (y/n)
```

---

### bozly logs

View execution logs (debugging).

**Syntax:**
```bash
bozly logs [OPTIONS]
```

**Options:**
```
--vault <name>             Show vault logs
--command <cmd>            Filter by command
--days <num>               Last N days
--level <level>            Filter by: debug, info, warning, error
--follow                   Follow logs in real-time
--raw                      Raw output without formatting
```

**Examples:**

```bash
bozly logs
bozly logs --vault music
bozly logs --level error
bozly logs --follow
bozly logs --days 7 --level warning
```

---

## Server Commands

### bozly serve

Start web dashboard and API server.

**Syntax:**
```bash
bozly serve [OPTIONS]
```

**Options:**
```
--port <port>              Server port (default: 3000)
--host <host>              Host (default: localhost)
--open                     Open in browser
--no-cache                 Disable caching
--verbose                  Debug logging
--api-only                 Only start API, no UI
```

**Examples:**

```bash
# Start on default port
bozly serve

# Custom port
bozly serve --port 8080

# Open in browser
bozly serve --open

# API only
bozly serve --api-only --port 3001
```

**Output:**
```
BOZLY Dashboard
===============

Web UI: http://127.0.0.1:3847
API: http://127.0.0.1:3847/api

Vaults loaded: 2
Sessions indexed: 131

Press Ctrl+C to stop
```

---

### bozly tui

Launch Terminal UI Dashboard for interactive vault management.

**Syntax:**
```bash
bozly tui [OPTIONS]
```

**Options:**
```
--api-url <url>            API server URL (default: http://127.0.0.1:3847/api, or configured BOZLY_PORT)
--refresh <ms>             Refresh interval in milliseconds (default: 5000)
```

**Prerequisites:**
```bash
# First, start the API server in another terminal
bozly serve

# Then, in another terminal, launch the TUI
bozly tui
```

**Examples:**

```bash
# Launch with default settings
bozly tui

# Custom API server
bozly tui --api-url http://192.168.1.100:3847/api

# Faster refresh interval (500ms)
bozly tui --refresh 500

# Custom server with faster refresh
bozly tui --api-url http://localhost:8080/api --refresh 2000
```

**Features:**
- 📊 **Home Screen**: Dashboard with overall statistics and quick actions
- 🏠 **Vaults Screen**: Browse and manage all registered vaults
- 📋 **Sessions Screen**: View and filter session history
- 📝 **Commands Screen**: List and explore available commands
- 💾 **Memory Screen**: Browse vault intelligence and stored context
- ⚙️ **Config Screen**: View and manage settings
- 🏥 **Health Screen**: System diagnostics and stats

**Key Bindings:**

| Key | Action |
|-----|--------|
| `j` / `↓` | Scroll down / Next item |
| `k` / `↑` | Scroll up / Previous item |
| `n` | Create new session |
| `r` | Refresh current screen |
| `q` / `Esc` | Quit TUI |
| `Tab` | Switch screens |
| `Enter` | Select/Expand item |

**Output:**
```
╔════════════════════════════════════════════════════════════════╗
║           BOZLY Terminal UI Dashboard                         ║
║                                                                ║
║  HOME  VAULTS  SESSIONS  COMMANDS  MEMORY  CONFIG  HEALTH     ║
║────────────────────────────────────────────────────────────────║
║                                                                ║
║  Total Vaults: 3                                              ║
║  Total Sessions: 47                                           ║
║  Total Commands: 18                                           ║
║  Uptime: 2d 5h 32m                                            ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

**Troubleshooting:**
- If TUI won't connect, ensure `bozly serve` is running on the specified port
- Check with `bozly status` to verify vaults are registered
- Use `--api-url http://127.0.0.1:3847/api` to match the serve command (or set BOZLY_PORT environment variable)

**See Also:**
- [TUI Quick Start](./TUI-QUICKSTART.md)
- [TUI Usage Guide](./TUI-USAGE.md)
- [TUI Keybindings](./TUI-KEYBINDINGS.md)

---

## Utility Commands

### bozly version

Show version information.

**Syntax:**
```bash
bozly version [OPTIONS]
```

**Options:**
```
--json                     JSON format
--all                      Show detailed version info
```

**Examples:**

```bash
bozly version
bozly version --json
bozly version --all
```

**Output:**
```
BOZLY v0.6.0

Installation: /usr/local/lib/node_modules/@retroghostlabs/bozly
Node.js: v20.10.0
npm: 10.2.4

Latest available: v0.6.0 (up to date)
```

---

## Global Options

Options available to all commands.

```
--help, -h                 Show help for command
--version, -v              Show version
--verbose                  Verbose output
--quiet, -q                Suppress output
--json                     JSON format output
--color, --no-color        Color output
--debug                    Debug mode
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Command not found |
| 64 | Invalid argument |
| 65 | Input data error |
| 66 | No input |
| 69 | Unavailable resource |
| 70 | Software error |
| 71 | System error |
| 74 | I/O error |

---

## Tips & Tricks

### Tab Completion

Add to your `.bashrc` or `.zshrc`:

```bash
eval "$(bozly completion)"
```

### Piping Output

```bash
# Save output
bozly run album-review > results.txt

# Pipe to less
bozly run album-review | less

# Pipe to grep
bozly history | grep "2025-12"
```

### Aliasing Commands

```bash
# In ~/.bashrc or ~/.zshrc
alias br="bozly run"
alias bh="bozly history"
alias bs="bozly status"
```

Then:
```bash
br discovery
bh --days 7
bs --vault music
```

### Script Integration

```bash
#!/bin/bash

# Run multiple commands
bozly run morning-standup
bozly run priority-review

# Save session IDs
SESSION=$(bozly run discovery --quiet | tail -1)
echo "Saved as: $SESSION"
```

---

## Troubleshooting

### Command Not Found

```bash
# Check if installed
which bozly

# Reinstall
npm install -g @retroghostlabs/bozly
```

### Help Not Showing

```bash
# Detailed help
bozly <command> --help

# General help
bozly --help
```

### Wrong Vault

```bash
# Check current status
bozly status

# Show all vaults
bozly list

# Navigate to correct vault
cd ~/music
```

---

## Next Steps

- **[GETTING-STARTED.md](GETTING-STARTED.md)** — See commands in action
- **[COMMANDS-GUIDE.md](COMMANDS-GUIDE.md)** — Create custom commands
- **[QUICK-START.md](QUICK-START.md)** — Quick reference

---

*BOZLY: Build. OrganiZe. Link. Yield.*

*Last updated: 2025-12-27 (Session 122)*
