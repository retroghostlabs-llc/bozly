# BOZLY Configuration Reference

Complete reference for all BOZLY configuration options.

**Last updated:** 2025-12-27 (Session 122)

---

## Table of Contents

1. [Configuration Levels](#configuration-levels)
2. [Global Configuration](#global-configuration)
3. [Node Configuration](#node-configuration)
4. [Environment Variables](#environment-variables)
5. [Configuration Files](#configuration-files)
6. [Setting Configuration](#setting-configuration)
7. [Configuration Examples](#configuration-examples)

---

## Configuration Levels

BOZLY has **three levels** of configuration:

### Level 1: Framework Defaults
- Built into BOZLY
- Cannot be modified
- Lowest priority

### Level 2: Global Configuration
- Location: `~/.bozly/bozly-config.json`
- Applies to all vaults
- Medium priority
- User-editable

### Level 3: Node Configuration
- Location: `.bozly/config.json` (in each vault)
- Specific to that vault
- Highest priority
- Overrides global settings

**Resolution order:** Node config → Global config → Framework defaults

---

## Global Configuration

### File Location
```
~/.bozly/bozly-config.json
```

### Structure
```json
{
  "version": "0.6.0",
  "defaultAI": "claude",
  "theme": "auto",
  "editor": "vim",
  "timezone": "America/New_York",
  "cleanup": {
    "enabled": true,
    "retentionDays": 365,
    "archivePath": null,
    "autoRun": false
  },
  "routing": {
    "strategy": "manual",
    "fallbackChain": ["claude", "gpt", "ollama"]
  }
}
```

### Options

#### version
**Type:** string
**Default:** Current BOZLY version
**Editable:** No (auto-managed)
**Purpose:** Track config file format version

```json
"version": "0.6.0"
```

#### defaultAI
**Type:** string
**Default:** "claude"
**Editable:** Yes
**Allowed values:** claude, gpt, gemini, ollama, custom
**Purpose:** Default AI provider for all vaults

```json
"defaultAI": "claude"
```

**Set via CLI:**
```bash
bozly config set defaultAI gpt --global
```

#### theme
**Type:** string
**Default:** "auto"
**Editable:** Yes
**Allowed values:** auto, light, dark
**Purpose:** Terminal color theme

```json
"theme": "auto"
```

**Set via CLI:**
```bash
bozly config set theme dark --global
```

#### editor
**Type:** string (command path)
**Default:** System default (vim, nano, code, etc.)
**Editable:** Yes
**Purpose:** Default text editor for editing context, commands, etc.

```json
"editor": "vim"
```

Valid values:
- `vim` — Vi Improved
- `nano` — Nano editor
- `code` — VS Code
- `emacs` — Emacs
- Any command available in PATH

**Set via CLI:**
```bash
bozly config set editor code --global
bozly config set editor /usr/bin/nano --global
```

#### timezone
**Type:** string (IANA timezone)
**Default:** System timezone (auto-detected)
**Editable:** Yes
**Purpose:** Timezone for session timestamps and scheduling

```json
"timezone": "America/New_York"
```

Valid formats:
- IANA: `America/New_York`, `Europe/London`, `Asia/Tokyo`
- UTC offset: `UTC+5`, `UTC-8`
- Common: `EST`, `PST` (not recommended - ambiguous)

**Set via CLI:**
```bash
bozly config set timezone "America/Los_Angeles" --global
bozly config set timezone "Europe/Paris" --global
bozly config set timezone UTC --global
```

**Common timezones:**
```
America/New_York        Eastern Time
America/Chicago         Central Time
America/Denver          Mountain Time
America/Los_Angeles     Pacific Time
America/Anchorage       Alaska Time
America/Toronto         Eastern (Canada)
Europe/London           GMT/BST
Europe/Paris            CET/CEST
Europe/Berlin           CET/CEST
Asia/Tokyo              JST
Asia/Shanghai           CST
Asia/Kolkata            IST
Australia/Sydney        AEDT/AEST
```

#### cleanup
**Type:** Object
**Purpose:** Session cleanup configuration

**Structure:**
```json
{
  "enabled": true,
  "retentionDays": 365,
  "archivePath": null,
  "autoRun": false
}
```

##### cleanup.enabled
**Type:** boolean
**Default:** true
**Purpose:** Enable/disable automatic cleanup

```json
"cleanup": {
  "enabled": true
}
```

##### cleanup.retentionDays
**Type:** number
**Default:** 365 (1 year)
**Purpose:** How long to keep sessions before deleting

```json
"cleanup": {
  "retentionDays": 365
}
```

Valid values:
- `30` — Keep for 1 month
- `90` — Keep for 3 months
- `180` — Keep for 6 months
- `365` — Keep for 1 year
- `0` — Keep forever

**Set via CLI:**
```bash
bozly config set cleanup.retentionDays 180 --global
```

##### cleanup.archivePath
**Type:** string | null
**Default:** null (don't archive)
**Purpose:** Archive old sessions before deleting

```json
"cleanup": {
  "archivePath": "/home/user/archive/bozly-sessions"
}
```

If set, cleanup will:
1. Copy old sessions to archive path
2. Then delete from main location

**Set via CLI:**
```bash
bozly config set cleanup.archivePath "~/archive/bozly" --global
```

##### cleanup.autoRun
**Type:** boolean
**Default:** false
**Purpose:** Auto-cleanup on each command execution

```json
"cleanup": {
  "autoRun": false
}
```

If enabled, cleanup runs automatically after each command based on retentionDays.

**Set via CLI:**
```bash
bozly config set cleanup.autoRun true --global
```

#### routing
**Type:** Object
**Purpose:** Smart routing configuration (Phase 2c)

**Structure:**
```json
{
  "strategy": "manual",
  "fallbackChain": ["claude", "gpt", "ollama"]
}
```

##### routing.strategy
**Type:** string
**Default:** "manual"
**Allowed values:** manual, complexity-based
**Purpose:** How to choose AI provider

- `manual` — User specifies per command or vault
- `complexity-based` — Auto-select based on task complexity

```json
"routing": {
  "strategy": "manual"
}
```

##### routing.fallbackChain
**Type:** array of strings
**Default:** ["claude", "gpt", "ollama"]
**Purpose:** Providers to try if primary fails

```json
"routing": {
  "fallbackChain": ["claude", "gpt", "ollama"]
}
```

If primary provider fails, will try each in order.

---

## Node Configuration

### File Location
```
.bozly/config.json (in your vault)
```

### Structure
```json
{
  "id": "music-vault-abc123",
  "name": "My Music Discovery",
  "type": "music",
  "version": "0.6.0",
  "created": "2025-12-01T10:30:00Z",
  "ai": {
    "defaultProvider": "claude",
    "providers": ["claude", "gpt"]
  },
  "timezone": "America/New_York",
  "provider": "claude",
  "model": "claude-3-5-sonnet-20241022",
  "commands": {
    "album-review": {
      "provider": "claude",
      "model": "claude-3-5-sonnet-20241022"
    },
    "quick-analysis": {
      "model": "claude-3-haiku-20241022"
    }
  },
  "hooks": {
    "sessionStart": "on-session-start.sh",
    "sessionEnd": "on-session-end.sh"
  },
  "memory": {
    "enabled": true,
    "extractionInterval": 10,
    "maxMemorySize": "10MB"
  }
}
```

### Options

#### id
**Type:** string (UUID)
**Default:** Auto-generated on init
**Editable:** No
**Purpose:** Unique identifier for this vault

#### name
**Type:** string
**Default:** Directory name
**Editable:** Yes
**Purpose:** Human-readable vault name

```json
"name": "My Music Discovery"
```

**Set via CLI:**
```bash
cd ~/music
bozly config set name "My New Name"
```

#### type
**Type:** string
**Default:** "default"
**Editable:** Yes
**Allowed values:** music, journal, project, content, research, personal, other
**Purpose:** Vault domain type

```json
"type": "music"
```

**Set via CLI:**
```bash
bozly config set type project
```

#### version
**Type:** string
**Default:** BOZLY version at creation
**Editable:** No (auto-managed)
**Purpose:** Track which version created this vault

#### created
**Type:** ISO datetime string
**Default:** Auto-set on init
**Editable:** No
**Purpose:** When vault was created

#### ai
**Type:** Object
**Purpose:** AI provider configuration

**Structure:**
```json
{
  "defaultProvider": "claude",
  "providers": ["claude", "gpt"]
}
```

##### ai.defaultProvider
**Type:** string
**Default:** "claude"
**Purpose:** Default provider for this vault

```json
"ai": {
  "defaultProvider": "claude"
}
```

**Set via CLI:**
```bash
bozly config set ai.defaultProvider gpt
```

##### ai.providers
**Type:** array of strings
**Purpose:** Available providers for this vault

```json
"ai": {
  "providers": ["claude", "gpt", "ollama"]
}
```

#### timezone
**Type:** string (IANA timezone)
**Default:** Global timezone or system timezone
**Editable:** Yes
**Purpose:** Timezone for this vault's sessions

```json
"timezone": "America/New_York"
```

Overrides global timezone for this vault only.

**Set via CLI:**
```bash
bozly config set timezone "America/Los_Angeles"
```

#### provider (Node-level override)
**Type:** string
**Default:** undefined (use defaultProvider)
**Editable:** Yes
**Purpose:** Override AI provider for entire vault

```json
"provider": "gpt"
```

If set, this overrides `ai.defaultProvider`.

**Set via CLI:**
```bash
bozly config set provider gpt
```

#### model (Node-level default)
**Type:** string
**Default:** undefined (use provider's default)
**Editable:** Yes
**Purpose:** Preferred model for this vault

```json
"model": "claude-3-5-sonnet-20241022"
```

Valid models (examples):
- Claude: `claude-3-5-sonnet-20241022`, `claude-3-haiku-20241022`
- GPT: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
- Ollama: `llama2`, `mistral`, `neural-chat`

**Set via CLI:**
```bash
bozly config set model "gpt-4o"
```

#### commands (Per-command routing)
**Type:** Object
**Default:** {} (empty)
**Purpose:** Per-command AI provider/model overrides

```json
"commands": {
  "album-review": {
    "provider": "claude",
    "model": "claude-3-5-sonnet-20241022"
  },
  "quick-analysis": {
    "model": "claude-3-haiku-20241022"
  },
  "deep-research": {
    "provider": "gpt",
    "model": "gpt-4o"
  }
}
```

Useful for:
- Using specialized models for specific tasks
- Using faster models for quick commands
- Trying different providers

**How it works:**
```bash
bozly run album-review                  # Uses config for album-review
bozly run album-review --ai gpt        # Overrides with gpt
bozly run album-review --model claude-3-haiku-20241022  # Overrides model
```

#### hooks
**Type:** Object
**Purpose:** Event hook configuration

```json
{
  "sessionStart": "on-session-start.sh",
  "sessionEnd": "on-session-end.sh",
  "postTool": "after-tool.sh"
}
```

##### hooks.sessionStart
**Type:** filename or path
**Purpose:** Run before command execution

```json
"hooks": {
  "sessionStart": "on-start.sh"
}
```

File should be executable: `.bozly/hooks/on-start.sh`

##### hooks.sessionEnd
**Type:** filename or path
**Purpose:** Run after command completes

```json
"hooks": {
  "sessionEnd": "on-end.sh"
}
```

##### hooks.postTool
**Type:** filename or path
**Purpose:** Run after specific tool execution (Phase 2c)

#### memory
**Type:** Object
**Purpose:** Memory system configuration

```json
{
  "enabled": true,
  "extractionInterval": 10,
  "maxMemorySize": "10MB"
}
```

##### memory.enabled
**Type:** boolean
**Default:** true
**Purpose:** Enable memory extraction and injection

##### memory.extractionInterval
**Type:** number
**Default:** 10
**Purpose:** Extract memory every N commands

##### memory.maxMemorySize
**Type:** string
**Default:** "10MB"
**Purpose:** Maximum memory storage size

---

## Environment Variables

BOZLY respects these environment variables:

### BOZLY_HOME
**Type:** path
**Default:** `~/.bozly`
**Purpose:** BOZLY configuration directory

```bash
export BOZLY_HOME="/custom/path/bozly"
bozly status
```

### BOZLY_TIMEZONE
**Type:** IANA timezone
**Purpose:** Override timezone (higher priority than config)

```bash
export BOZLY_TIMEZONE="America/Los_Angeles"
bozly run discovery
```

### EDITOR
**Type:** command path
**Default:** vim
**Purpose:** Text editor for editing context/commands

```bash
export EDITOR=code
bozly context edit
```

### BOZLY_DEBUG
**Type:** boolean (set to any value)
**Purpose:** Enable debug logging

```bash
export BOZLY_DEBUG=1
bozly run album-review
```

### BOZLY_NO_COLOR
**Type:** boolean (set to any value)
**Purpose:** Disable colored output

```bash
export BOZLY_NO_COLOR=1
bozly list
```

### AI Provider-Specific

#### Claude
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

#### OpenAI
```bash
export OPENAI_API_KEY="sk-..."
```

#### Ollama
```bash
export OLLAMA_HOST="localhost:11434"
```

---

## Setting Configuration

### Via CLI

#### View Configuration
```bash
# View node config
bozly config view

# View global config
bozly config view --global

# View specific key
bozly config get ai.defaultProvider
bozly config get cleanup.retentionDays --global
```

#### Set Configuration
```bash
# Node config
bozly config set timezone "America/Los_Angeles"
bozly config set ai.defaultProvider gpt
bozly config set model "gpt-4o"

# Global config
bozly config set defaultAI claude --global
bozly config set theme dark --global
bozly config set cleanup.retentionDays 180 --global
```

#### Reset Configuration
```bash
# Reset node to defaults
bozly config reset

# Reset global
bozly config reset --global
```

### Via JSON File

Edit `.bozly/config.json` (node) or `~/.bozly/bozly-config.json` (global) directly:

```bash
# Edit node config
vim .bozly/config.json

# Edit global config
vim ~/.bozly/bozly-config.json
```

---

## Configuration Examples

### Example 1: Music Discovery Vault

```json
{
  "id": "music-vault-abc123",
  "name": "Music Discovery",
  "type": "music",
  "version": "0.6.0",
  "created": "2025-12-01T10:30:00Z",
  "ai": {
    "defaultProvider": "claude",
    "providers": ["claude", "gpt", "ollama"]
  },
  "timezone": "America/New_York",
  "provider": "claude",
  "model": "claude-3-5-sonnet-20241022",
  "commands": {
    "album-review": {
      "provider": "claude",
      "model": "claude-3-5-sonnet-20241022"
    },
    "quick-summary": {
      "model": "claude-3-haiku-20241022"
    }
  },
  "memory": {
    "enabled": true,
    "extractionInterval": 5
  }
}
```

### Example 2: Project Management Vault

```json
{
  "id": "project-vault-def456",
  "name": "My Project",
  "type": "project",
  "version": "0.6.0",
  "created": "2025-11-15T09:00:00Z",
  "ai": {
    "defaultProvider": "gpt",
    "providers": ["gpt", "claude"]
  },
  "timezone": "America/Los_Angeles",
  "provider": "gpt",
  "model": "gpt-4o",
  "commands": {
    "sprint-planning": {
      "provider": "gpt",
      "model": "gpt-4o"
    },
    "code-review": {
      "provider": "claude",
      "model": "claude-3-5-sonnet-20241022"
    }
  },
  "hooks": {
    "sessionEnd": "log-to-database.sh"
  }
}
```

### Example 3: Global Configuration

```json
{
  "version": "0.6.0",
  "defaultAI": "claude",
  "theme": "dark",
  "editor": "code",
  "timezone": "America/New_York",
  "cleanup": {
    "enabled": true,
    "retentionDays": 180,
    "archivePath": "/home/user/archive/bozly-sessions",
    "autoRun": true
  },
  "routing": {
    "strategy": "manual",
    "fallbackChain": ["claude", "gpt", "ollama"]
  }
}
```

---

## Configuration Validation

BOZLY validates configuration on load:

```bash
# Validate node config
bozly config validate

# Validate global config
bozly config validate --global
```

Invalid configurations will produce helpful error messages:

```
Error: Invalid timezone "America/Invalid_City"
Valid IANA timezones: America/New_York, America/Chicago, ...
```

---

## Best Practices

### 1. Timezone Configuration
- Always set timezone explicitly (don't rely on system)
- Use IANA format (America/Los_Angeles, not PST)
- Set consistently across global and nodes

### 2. AI Provider Configuration
- Global: Set your default/most-used provider
- Node: Override only when needed
- Commands: Use for optimization (faster models for quick tasks)

### 3. Cleanup Configuration
- Set reasonable retention (365 days default is good)
- Archive old sessions before deletion
- Enable auto-cleanup if you run many commands

### 4. Hooks Configuration
- Use for important workflows
- Keep hooks simple and fast
- Log output for debugging

### 5. Security
- Don't commit `.bozly/config.json` to git if it has sensitive data
- Environment variables are better for API keys
- Use `.gitignore` to exclude `.bozly/` from version control

---

## Troubleshooting

### Invalid Configuration

```bash
# Check config validity
bozly doctor

# View config details
bozly config view --json
```

### Reset to Defaults

```bash
# Reset node
bozly config reset --force

# Reset global
bozly config reset --force --global
```

### Check What's Active

```bash
bozly status           # Shows node config in effect
bozly config view      # Shows all active config
```

---

## See Also

- [GETTING-STARTED.md](GETTING-STARTED.md) — Initial setup
- [CLI-REFERENCE.md](CLI-REFERENCE.md) — bozly config command
- [API-REFERENCE.md](API-REFERENCE.md) — getConfig() function

---

*BOZLY: Build. OrganiZe. Link. Yield.*

*Last updated: 2025-12-27 (Session 122)*
