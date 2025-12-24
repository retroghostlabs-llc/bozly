# BOZLY Commands System

Commands are executable prompts that define specific AI tasks within a BOZLY node. They combine context, instructions, and configuration to produce consistent, repeatable results.

## Overview

A **command** in BOZLY is:
- A markdown file (`.md`) containing AI-executable instructions
- Associated with optional metadata (model, tags, description)
- Resolved from vault, global, or builtin sources
- Executed via `bozly run <command>` with automatic context injection

## Command Resolution

BOZLY resolves commands in a three-tier priority system:

```
┌─────────────────────────┐
│ Vault Commands          │  (highest priority)
│ .bozly/commands/        │
└─────────────────────────┘
           ↓
┌─────────────────────────┐
│ Global Commands         │
│ ~/.bozly/commands/      │
└─────────────────────────┘
           ↓
┌─────────────────────────┐
│ Builtin Commands        │  (lowest priority)
│ {npm}/default-commands/ │
└─────────────────────────┘
```

This allows you to:
- Override default commands per-vault
- Share commands across vaults globally
- Always have fallback commands available

## Command Structure

### Basic Command File

```markdown
# Daily Standup

## Purpose
Summarize today's work and plan tomorrow's priorities.

## Instructions
Review the following and provide a comprehensive standup:
1. What I accomplished today
2. What I'll focus on tomorrow
3. Any blockers or challenges

## Models
- primary: claude-3-5-sonnet-20241022
- fallback: gpt-4

## Tags
- daily
- standup
- reflection
```

### Command Metadata

Commands are discovered automatically from their file path and content. Optional metadata:
- **name**: Command name (derived from filename)
- **description**: Short description (from first line or header)
- **source**: Where command came from (vault | global | builtin)
- **model**: Preferred AI model
- **tags**: Categories/keywords

### Naming Convention

Use kebab-case (lowercase, hyphens) for command files:
- ✅ `daily-standup.md`
- ✅ `weekly-review.md`
- ✅ `quick-note.md`
- ❌ `Daily Standup.md` (avoid spaces)
- ❌ `dailyStandup.md` (avoid camelCase)

## Creating Commands

### Interactive Creation

```bash
bozly command create
```

This launches an interactive wizard that guides you through:
1. Command name (validated)
2. Description
3. Scope (global or vault-specific)
4. Content template

### Manual Creation

Create a markdown file in `.bozly/commands/`:

```bash
cat > .bozly/commands/my-analysis.md << 'EOF'
# Analyze Report

Analyze the following data and provide key insights:

[Your instructions here]
EOF
```

### Global Commands

Global commands are stored in `~/.bozly/commands/` and available to all vaults:

```bash
bozly command create  # Creates in ~/.bozly/commands/
```

### Vault Commands

Vault commands override global commands and are stored in `.bozly/commands/`:

```bash
cd ~/my-vault
bozly command create  # Creates in .bozly/commands/
```

## Default Global Commands

BOZLY ships with 5 default global commands:

### 1. status-check
Quick daily standup and status assessment

```bash
bozly run status-check
```

### 2. weekly-review
Comprehensive weekly retrospective and planning

```bash
bozly run weekly-review
```

### 3. quick-note
Capture ideas with AI-powered suggestions

```bash
bozly run quick-note
```

### 4. summarize
Extract key points from content

```bash
bozly run summarize "Paste content here"
```

### 5. brainstorm
Generate creative approaches to problems

```bash
bozly run brainstorm "Describe your challenge"
```

## Listing Commands

### List All Commands

```bash
bozly command list
```

Shows all available commands grouped by source:
- Vault commands
- Global commands (if outside vault)
- Builtin commands

### List with Source Tracking

Each listed command shows:
- **Name**: Command identifier
- **Source**: vault | global | builtin
- **Description**: From command header
- **Tags**: Associated keywords (if defined)

Example output:
```
Builtin Commands:
  status-check         (builtin)
    Quick daily standup

Global Commands:
  my-analysis          (global)
    Custom data analysis
```

## Best Practices

### 1. Clear Naming

Use descriptive names that indicate the command's purpose:
- ✅ `daily-standup.md`
- ✅ `weekly-goals.md`
- ✅ `music-review.md`
- ❌ `task1.md`
- ❌ `cmd.md`

### 2. Comprehensive Instructions

Include:
- **Purpose**: Why use this command
- **Instructions**: Specific steps or prompts
- **Expected Output**: What to expect
- **Examples**: Usage scenarios

### 3. Domain Specificity

Tailor commands to your vault's domain:
- Music vault: `album-review`, `discovery-session`
- Project vault: `sprint-planning`, `retrospective`
- Journal vault: `reflection`, `mood-tracker`

### 4. Consistent Format

Maintain consistent structure across commands:
```markdown
# Command Name

## Purpose
Why this command exists

## Instructions
How to use it

## Expected Output
What you'll get

## Examples
Real-world scenarios
```

### 5. Version Your Commands

Track changes to important commands:
```markdown
# Daily Review

**Version**: 1.1.0
**Last Updated**: 2024-12-23

### What Changed (v1.1.0)
- Added mood tracking section
- Expanded reflection prompts

## Instructions
...
```

## Advanced Usage

### Command Chains

Chain multiple commands together:

```bash
bozly run daily-standup && bozly run weekly-review
```

### Context-Aware Commands

Commands automatically receive node context including:
- Vault name
- Node configuration
- Previous sessions
- Associated models

Your command can reference this:
```markdown
# Vault-Specific Analysis

Analyze this data for the {{ vault_name }} vault:

[Your instructions]
```

### Conditional Commands

Create commands that behave differently based on node type:

```markdown
# Domain-Specific Review

For a {{ node.type }} node:
{{ if node.type == "music" }}
- Analyze album quality
- Check listening patterns
{{ else if node.type == "project" }}
- Review sprint progress
- Check milestone status
{{ endif }}
```

### Variables in Commands

Reference vault variables (when using template system):
- `{{ VAULT_NAME }}` - Node name
- `{{ USER_NAME }}` - Current user
- `{{ CREATED_DATE }}` - Node creation date
- Custom variables from template

## Troubleshooting

### Command Not Found

If a command isn't found:
1. Check spelling: `bozly command list`
2. Verify location: `.bozly/commands/`, `~/.bozly/commands/`
3. Check filename: Use kebab-case (lowercase, hyphens)

### Command Not Executing

If a command fails to execute:
1. Verify vault is initialized: `bozly status`
2. Check command syntax: Ensure valid markdown
3. Verify model availability: Check AI provider

### Vault vs Global Confusion

- **In a vault**: Both vault and global commands available
- **Outside a vault**: Only global and builtin commands available
- **Override**: Vault command overrides global with same name

## Examples

### Example 1: Music Discovery Command

```markdown
# Album Discovery Session

## Purpose
Guided exploration of new music with structured analysis

## Instructions
Let's discover new music together. For each album I mention:
1. Describe your first impression
2. Identify standout tracks
3. Rate production quality (1-10)
4. Suggest similar artists

## Models
model: claude

## Tags
- music
- discovery
- analysis
```

### Example 2: Project Planning Command

```markdown
# Sprint Planning

## Purpose
Kickoff meeting agenda and planning session

## Instructions
Help me plan the upcoming sprint:

1. **Review**: What we accomplished last sprint
2. **Blockers**: What's preventing progress
3. **Planning**: Prioritize tasks for next sprint
4. **Goals**: Define sprint objectives

## Tags
- project
- planning
- sprint
```

### Example 3: Journal Reflection Command

```markdown
# Daily Reflection

## Purpose
End-of-day journaling with AI guidance

## Instructions
Reflect on your day:

1. **Wins**: What went well today?
2. **Challenges**: What was difficult?
3. **Learnings**: What did you discover?
4. **Tomorrow**: What's one focus for tomorrow?

## Tags
- journal
- daily
- reflection
```

## Command Lifecycle

```
Created          Listed           Executed         Stored
     ↓              ↓                ↓                ↓
  .md file  → bozly command  → bozly run    → session
             list              <command>      recorded
```

1. **Create**: Write or scaffold command
2. **List**: Discover and view available commands
3. **Execute**: Run with `bozly run <command>`
4. **Store**: Session automatically recorded in `.bozly/sessions/`

## Related Topics

- **Templates**: Pre-configured vault structures with commands
- **Workflows**: Multi-step command automation
- **Hooks**: Trigger commands on events
- **Models**: Define AI behavior for specific commands
- **Sessions**: View command history and results

## See Also

- `docs/TEMPLATES.md` - Template system documentation
- `docs/WORKFLOWS.md` - Multi-step automation
- `docs/CLI.md` - Complete CLI reference
