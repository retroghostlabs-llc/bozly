# Complete BOZLY Folder Structure

A detailed guide to every folder and file in BOZLY.

**Last updated:** 2025-12-27 (Session 122)

---

## Table of Contents

1. [Global Structure (~/.bozly/)](#global-structure)
2. [Node Structure (.bozly/)](#node-structure)
3. [Sessions Structure](#sessions-structure)
4. [Commands Structure](#commands-structure)
5. [Example Layouts](#example-layouts)

---

## Global Structure

### Directory: `~/.bozly/`

Your **global BOZLY home**. Contains settings shared across all nodes.

```
~/.bozly/
├── bozly-config.json       ← Global configuration
├── bozly-registry.json     ← All registered node locations
├── commands/               ← Global commands (all nodes can use)
├── templates/              ← Starter templates for new nodes
└── hooks/                  ← Global hooks (optional)
```

### bozly-config.json

Global BOZLY settings.

**What it contains:**
```json
{
  "version": "0.6.0",
  "ai": {
    "default": "claude",
    "providers": {
      "claude": {
        "command": "claude",
        "enabled": true
      },
      "gpt": {
        "command": "gpt-cli",
        "enabled": false
      }
    }
  },
  "timezone": "America/New_York",
  "defaultTemplate": "music",
  "sessionRetention": {
    "enabled": true,
    "daysToKeep": 365
  }
}
```

**Edit with:**
```bash
bozly config view
bozly config set ai.default gpt
```

### bozly-registry.json

Maps all your registered nodes to their locations.

**What it contains:**
```json
{
  "nodes": [
    {
      "id": "music-vault-abc123",
      "name": "My Music",
      "type": "music",
      "path": "/Users/you/music",
      "createdAt": "2024-12-01T10:30:00Z",
      "lastActivity": "2025-12-27T14:22:00Z"
    },
    {
      "id": "journal-vault-def456",
      "name": "My Journal",
      "type": "journal",
      "path": "/Users/you/journal",
      "createdAt": "2024-11-15T09:00:00Z",
      "lastActivity": "2025-12-26T22:15:00Z"
    }
  ]
}
```

**View with:**
```bash
bozly list              # List all nodes
bozly list --json      # JSON format
```

### commands/

Global commands available to all nodes.

**Structure:**
```
~/.bozly/commands/
├── quick-note.md
├── brainstorm.md
├── summarize.md
├── weekly-review.md
└── my-custom-command.md
```

**What it's for:**
- Commands you want to use across multiple nodes
- Defaults that come with BOZLY
- Commands everyone in your setup should have

**Create with:**
```bash
bozly command create    # Creates in ~/.bozly/commands/
```

**Use from any node:**
```bash
cd ~/music
bozly run quick-note    # Uses global command
```

### templates/

Pre-configured vault templates for new nodes.

**Structure:**
```
~/.bozly/templates/
├── music/
│   ├── context.md
│   ├── commands/
│   │   ├── album-review.md
│   │   ├── discovery.md
│   │   └── artist-spotlight.md
│   └── config.json
├── journal/
│   ├── context.md
│   ├── commands/
│   │   ├── daily-reflection.md
│   │   └── weekly-review.md
│   └── config.json
└── project/
    ├── context.md
    ├── commands/
    │   └── sprint-planning.md
    └── config.json
```

**Use when creating a node:**
```bash
bozly init --template music    # Uses music template
bozly init --template journal  # Uses journal template
```

### hooks/

Global hooks triggered by events (optional).

**Structure:**
```
~/.bozly/hooks/
├── on-init.sh          # Runs when node is initialized
├── on-command.sh       # Runs before each command
├── on-session.sh       # Runs after session completes
└── on-cleanup.sh       # Runs during cleanup
```

**Example:**
```bash
#!/bin/bash
# ~/.bozly/hooks/on-session.sh

# Automatically backup sessions
cp -r "$SESSION_PATH" "$HOME/backups/bozly-sessions/"
```

---

## Node Structure

### Directory: `~/music/.bozly/` (or any vault)

Every vault has a `.bozly` folder. This is where all vault-specific data lives.

```
~/music/.bozly/
├── config.json              ← Node configuration
├── context.md               ← AI context (MOST IMPORTANT)
├── index.json               ← Task & command index
├── commands/                ← Node-specific commands
├── workflows/               ← Multi-step automations
├── tasks/                   ← Task management
├── hooks/                   ← Node-specific hooks
├── sessions/                ← Session history
└── models.json              ← AI model preferences (optional)
```

### config.json

Node-specific configuration.

**What it contains:**
```json
{
  "id": "music-vault-abc123",
  "name": "My Music Discovery",
  "type": "music",
  "createdAt": "2024-12-01T10:30:00Z",
  "version": "0.6.0",
  "ai": {
    "default": "claude",
    "model": "claude-3-5-sonnet-20241022"
  },
  "timezone": "America/New_York",
  "metadata": {
    "description": "Album reviews and discovery",
    "owner": "You",
    "tags": ["music", "discovery"]
  }
}
```

**Edit with:**
```bash
cd ~/music
bozly config view
bozly config set ai.default gpt
```

### context.md

The **most important file**. Everything your AI knows about this vault.

**What it contains:**
```markdown
# My Music Discovery Vault

## Purpose & Mission
This vault helps me discover, analyze, and understand music deeply.

## Music Taste Profile
- Primary Genres: Jazz, Soul, Hip-Hop
- Era Preferences: 60s-90s
- Favorite Artists: Miles Davis, D'Angelo, J. Dilla
- Sub-genres: Fusion, Afrobeat, East Coast Hip-Hop

## How I Want To Work
1. Detailed production analysis
2. Historical/cultural context
3. 3-5 thoughtful recommendations
4. No mainstream pop unless exceptional

## Available Commands
- album-review: Deep dive analysis
- discovery: Find new music
- artist-spotlight: Learn about an artist

## Key Resources
- listening-log.md: Complete history
- favorites.csv: Top 50 albums
```

**Edit with:**
```bash
bozly context edit
bozly context view
```

### index.json

Index of tasks and commands (auto-generated).

**What it contains:**
```json
{
  "commands": [
    {
      "name": "album-review",
      "description": "Deep dive album analysis",
      "source": "vault",
      "tags": ["music", "analysis"]
    }
  ],
  "tasks": [
    {
      "id": "task-123",
      "title": "Review new D'Angelo",
      "status": "pending",
      "createdAt": "2025-12-27"
    }
  ]
}
```

**Auto-maintained by:** BOZLY (don't edit manually)

### commands/

Node-specific commands. Override global commands with same name.

**Structure:**
```
~/music/.bozly/commands/
├── album-review.md
├── discovery-session.md
├── artist-spotlight.md
├── listening-recap.md
└── mood-based-discovery.md
```

**Create with:**
```bash
cd ~/music
bozly command create          # Creates in this node
```

**Scope:**
- Only available when in this vault
- Overrides global command with same name

### workflows/

Multi-step automations (runs multiple commands in sequence).

**Structure:**
```
~/music/.bozly/workflows/
├── weekly-discovery.yml
├── album-deep-dive.yml
└── listening-reflection.yml
```

**Example workflow:**
```yaml
# ~/music/.bozly/workflows/weekly-discovery.yml
name: Weekly Music Discovery
description: Full week of music exploration

steps:
  - name: Initial Question
    command: pipe
    args: "What music should I explore this week?"

  - name: Deep Discovery
    command: discovery-session

  - name: Weekly Recap
    command: listening-recap

  - name: Plan Next Week
    command: plan-listening
```

**Run with:**
```bash
bozly workflow run weekly-discovery
```

### tasks/

Task management (optional, Cline-style tasks).

**Structure:**
```
~/music/.bozly/tasks/
├── active/
│   ├── task-123.json        # Review D'Angelo album
│   └── task-124.json        # Learn modal jazz
└── completed/
    ├── task-120.json
    └── task-121.json
```

**Example task:**
```json
{
  "id": "task-123",
  "title": "Review D'Angelo - Voodoo",
  "description": "Deep analysis of production & composition",
  "status": "active",
  "createdAt": "2025-12-25",
  "dueDate": "2025-12-31",
  "command": "album-review"
}
```

### hooks/

Node-specific automation triggers.

**Structure:**
```
~/music/.bozly/hooks/
├── on-init.sh          # Runs when node initialized
├── on-command.sh       # Runs before each command
├── on-session.sh       # Runs after session completes
└── on-cleanup.sh       # Runs during cleanup
```

**Example:**
```bash
#!/bin/bash
# ~/music/.bozly/hooks/on-session.sh

# After each session, log to a file
echo "$(date) - Ran command: $COMMAND_NAME" >> listening-log.txt
```

### models.json

AI model preferences for this node (optional).

**What it contains:**
```json
{
  "default": "claude-3-5-sonnet-20241022",
  "models": {
    "analysis": "claude-3-5-sonnet-20241022",
    "brainstorm": "gpt-4",
    "quick": "claude-3-haiku-20241022"
  },
  "temperature": 0.7,
  "maxTokens": 2000
}
```

**Use with:**
```bash
bozly run album-review --model analysis
```

---

## Sessions Structure

### Directory: `.bozly/sessions/`

Complete history of all command executions.

**Structure:**
```
.bozly/sessions/
└── {vault-id}/                    ← Vault identifier
    └── 2025/                       ← Year
        └── 12/                     ← Month
            └── 27/                 ← Day
                ├── {uuid-1}/       ← Session 1
                ├── {uuid-2}/       ← Session 2
                └── {uuid-3}/       ← Session 3
```

### Inside Each Session: `{uuid}/`

```
.bozly/sessions/{vault-id}/2025/12/27/{uuid}/
├── session.json           ← Metadata about the execution
├── context.md             ← Context that was used
├── prompt.txt             ← Raw prompt sent to AI
├── results.md             ← AI's response (human readable)
└── execution.json         ← Technical execution details
```

### session.json

Metadata about the command execution.

**What it contains:**
```json
{
  "id": "{uuid}",
  "vaultId": "music-vault-abc123",
  "vaultName": "My Music",
  "command": "album-review",
  "ai": {
    "provider": "claude",
    "model": "claude-3-5-sonnet-20241022"
  },
  "startTime": "2025-12-27T14:22:00Z",
  "endTime": "2025-12-27T14:25:30Z",
  "duration": 210,
  "status": "success",
  "tokensUsed": {
    "input": 2450,
    "output": 1240
  }
}
```

### context.md

A copy of the context that was used.

**Why it's saved:**
- Compare with updated context later
- Understand what the AI knew
- Debug inconsistent results
- Track context evolution

### prompt.txt

The exact prompt sent to the AI.

**Format:**
```
[Context from context.md]
---
[Command from command.md]
```

**Why it's saved:**
- Complete audit trail
- Reproducibility
- Debug if needed

### results.md

The AI's response (formatted).

**Format:**
```markdown
# Album Review: D'Angelo - Voodoo

## First Impressions
...

## Production & Sound
...

## Best Tracks
...
```

### execution.json

Technical execution details.

**What it contains:**
```json
{
  "command": "album-review",
  "provider": "claude",
  "model": "claude-3-5-sonnet-20241022",
  "startTime": "2025-12-27T14:22:00Z",
  "endTime": "2025-12-27T14:25:30Z",
  "duration": 210,
  "status": "success",
  "tokensUsed": {
    "input": 2450,
    "output": 1240,
    "total": 3690
  },
  "costs": {
    "input": 0.735,
    "output": 0.1476,
    "total": 0.8826
  },
  "metadata": {
    "temperature": 0.7,
    "maxTokens": 2000,
    "stopSequences": []
  }
}
```

---

## Commands Structure

### Global Commands: `~/.bozly/commands/`

Available to all nodes.

```
~/.bozly/commands/
├── quick-note.md
├── brainstorm.md
├── summarize.md
├── weekly-review.md
└── analyze.md
```

**Example command file:**
```markdown
# Quick Note

Capture an idea with AI-powered suggestions.

## Instructions
I have a quick note to capture:

[Your note here]

Please:
1. Summarize it in one sentence
2. Extract key points (3-5 bullets)
3. Suggest related ideas
4. Rate importance (1-10)
```

### Node Commands: `.bozly/commands/`

Specific to this vault. Override global commands.

```
~/music/.bozly/commands/
├── album-review.md
├── discovery-session.md
├── artist-spotlight.md
└── listening-recap.md
```

### Command Resolution

When you run `bozly run X`:

```
1. Check .bozly/commands/X.md
   ↓ (if not found)
2. Check ~/.bozly/commands/X.md
   ↓ (if not found)
3. Check framework defaults
   ↓ (if not found)
4. Command not found error
```

**Tip:** Node commands override global, global override framework.

---

## Example Layouts

### Complete Music Node

```
~/music/
├── .bozly/
│   ├── config.json
│   ├── context.md              ← Music taste profile
│   ├── commands/
│   │   ├── album-review.md
│   │   ├── discovery.md
│   │   ├── artist-spotlight.md
│   │   └── listening-recap.md
│   ├── workflows/
│   │   ├── weekly-discovery.yml
│   │   └── album-deep-dive.yml
│   ├── sessions/
│   │   └── 2025/12/27/         ← Today's sessions
│   └── hooks/
│       └── on-session.sh
├── listening-log.md             ← Your files (optional)
├── favorites.csv
└── README.md
```

### Complete Journal Node

```
~/journal/
├── .bozly/
│   ├── config.json
│   ├── context.md              ← Your journaling preferences
│   ├── commands/
│   │   ├── daily-reflection.md
│   │   ├── weekly-review.md
│   │   └── mood-check.md
│   ├── workflows/
│   │   └── weekly-reflection.yml
│   ├── sessions/
│   │   └── 2025/12/27/
│   └── hooks/
│       └── on-session.sh
├── journal-entries.md           ← Your content
└── goals.md
```

### Complete Project Node

```
~/my-project/
├── .bozly/
│   ├── config.json
│   ├── context.md              ← Project overview
│   ├── commands/
│   │   ├── sprint-planning.md
│   │   ├── standup.md
│   │   └── retrospective.md
│   ├── workflows/
│   │   └── sprint-cycle.yml
│   ├── sessions/
│   │   └── 2025/12/27/
│   └── hooks/
│       └── on-session.sh
├── README.md                    ← Project docs
├── src/                         ← Your code
└── TASKS.md
```

---

## Common Tasks

### Find a Specific Session

```bash
# By date
ls .bozly/sessions/{vault-id}/2025/12/27/

# By command
find .bozly/sessions -name "*album-review*"

# Most recent
ls -t .bozly/sessions/{vault-id}/*/*/*/ | head -5
```

### View a Session

```bash
# See results
cat .bozly/sessions/{vault-id}/2025/12/27/{uuid}/results.md

# See what was sent to AI
cat .bozly/sessions/{vault-id}/2025/12/27/{uuid}/prompt.txt

# See costs
cat .bozly/sessions/{vault-id}/2025/12/27/{uuid}/execution.json
```

### Backup Your Data

```bash
# Backup all sessions
cp -r ~/.bozly/sessions/ ~/backup-bozly-sessions/

# Backup a specific vault
cp -r ~/music/.bozly/ ~/backup-music-bozly/
```

### Clean Old Sessions

```bash
# BOZLY can auto-cleanup old sessions
bozly cleanup --days 90

# Or manually
rm -rf .bozly/sessions/*/2024/          # Delete all 2024 sessions
```

---

## File Size Reference

Typical vault after 3 months:

```
~/.bozly/                           ~1-2 MB
├── config files                    ~100 KB
├── commands/                       ~50 KB
├── templates/                      ~200 KB
└── (no sessions at global level)

~/music/.bozly/                     ~10-50 MB
├── config                          ~50 KB
├── context.md                      ~10 KB
├── commands/                       ~50 KB
├── workflows/                      ~20 KB
└── sessions/                       ~9-50 MB (grows with usage)
```

Sessions are the largest component. Archive old sessions to save space.

---

## Key Files to Know

| File | Location | Purpose | Edit? |
|------|----------|---------|-------|
| config.json | .bozly/ | Vault settings | Yes |
| context.md | .bozly/ | AI context | Yes (important!) |
| commands/ | .bozly/ | Custom commands | Yes |
| sessions/ | .bozly/ | History | No (auto-managed) |
| models.json | .bozly/ | Model preferences | Yes (optional) |
| bozly-config.json | ~/.bozly/ | Global settings | Yes |
| bozly-registry.json | ~/.bozly/ | Node registry | No (auto-managed) |

---

## Best Practices

1. **Keep context.md updated** — It's the most important file
2. **Archive old sessions** — Keep recent ones, move old to backup
3. **Use consistent command naming** — Makes discovery easier
4. **Document your commands** — Good headers = better usage
5. **Regular backups** — Don't lose your session history

---

*BOZLY: Build. OrganiZe. Link. Yield.*

*Last updated: 2025-12-27 (Session 122)*
