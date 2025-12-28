# BOZLY Configuration System

Complete guide to configuring BOZLY with all available settings, environment variables, and configuration options.

## Overview

BOZLY provides a comprehensive, centralized configuration system for managing all framework settings. Configuration follows a **4-layer priority system**:

1. **CLI Flags** (highest priority) — e.g., `bozly serve --port 4000`
2. **Environment Variables** — e.g., `BOZLY_PORT=4000`
3. **Config File** — `~/.bozly/bozly-config.json`
4. **Hardcoded Defaults** (lowest priority)

This means CLI flags override everything, environment variables override config files, and so on.

---

## Configuration Categories

Configuration is organized into 5 main categories:

- **Server** — API server port, host, health check timeouts
- **Storage** — Directory paths for sessions, logs, cache
- **Client** — TUI refresh intervals, API cache timeouts
- **Logging** — Log levels, console/file output, formatting
- **Process** — Execution timeouts for hooks, workflows, AI

---

## Using the Config Command

### Get Configuration Value

Get a specific configuration value:

```bash
# Get system config (prefix with system.)
bozly config system.server.port
# Output: 3847

# Get vault config (no prefix)
bozly config defaultAI
# Output: claude
```

### Set Configuration Value

Set a configuration value:

```bash
# Set system config (prefix with system.)
bozly config system.server.port 4000

# Set vault config (no prefix)
bozly config defaultAI gpt
```

### List All Configuration

Show all configuration (both system and vault):

```bash
bozly config --list
# or simply:
bozly config
```

---

## Server Configuration

Settings for the API server that powers the web dashboard and TUI.

| Setting | Env Variable | CLI Flag | Default | Purpose |
|---------|-------------|----------|---------|---------|
| `system.server.port` | `BOZLY_PORT` | `bozly serve -p` | 3847 | API server port |
| `system.server.host` | `BOZLY_HOST` | `bozly serve -h` | 127.0.0.1 | Server bind address |
| `system.server.healthCheckTimeout` | `BOZLY_HEALTH_CHECK_TIMEOUT` | — | 2000ms | Health check timeout |
| `system.server.healthCheckIntervalMs` | `BOZLY_HEALTH_CHECK_INTERVAL` | — | 200ms | Health check polling interval |
| `system.server.startupTimeoutMs` | `BOZLY_STARTUP_TIMEOUT` | — | 30000ms | Server startup timeout |
| `system.server.openBrowser` | `BOZLY_OPEN_BROWSER` | — | true | Auto-open browser on start |

### Examples

```bash
# Change API server port
bozly config system.server.port 4000

# Set via environment variable
export BOZLY_PORT=4000
bozly serve

# Set via CLI flag
bozly serve --port 4000

# Change health check timeout
bozly config system.server.healthCheckTimeout 5000
export BOZLY_HEALTH_CHECK_TIMEOUT=5000
```

---

## Storage Configuration

Settings for file storage directories and paths.

| Setting | Env Variable | Default | Purpose |
|---------|-------------|---------|---------|
| `system.storage.baseDir` | `BOZLY_HOME` | ~/.bozly | BOZLY root directory |
| `system.storage.sessionDir` | `BOZLY_SESSION_DIR` | {baseDir}/sessions | Session storage |
| `system.storage.logDir` | `BOZLY_LOG_DIR` | {baseDir}/logs | Log file directory |
| `system.storage.cacheDir` | `BOZLY_CACHE_DIR` | {baseDir}/.cache | Cache directory |
| `system.storage.commandsDir` | `BOZLY_COMMANDS_DIR` | {baseDir}/commands | Global commands directory |
| `system.storage.workflowsDir` | `BOZLY_WORKFLOWS_DIR` | {baseDir}/workflows | Global workflows directory |

### Examples

```bash
# Change base directory
bozly config system.storage.baseDir /opt/bozly
export BOZLY_HOME=/opt/bozly

# Store sessions in custom location
bozly config system.storage.sessionDir /var/lib/bozly/sessions
export BOZLY_SESSION_DIR=/var/lib/bozly/sessions

# Change log directory
bozly config system.storage.logDir /var/log/bozly
export BOZLY_LOG_DIR=/var/log/bozly
```

---

## Client Configuration

Settings for TUI and API clients (caching, refresh intervals, timeouts).

| Setting | Env Variable | Default | Purpose |
|---------|-------------|---------|---------|
| `system.client.apiCacheTimeoutMs` | `BOZLY_API_CACHE_TIMEOUT` | 5000ms | API response cache duration |
| `system.client.tuiRefreshIntervalMs` | `BOZLY_TUI_REFRESH_INTERVAL` | 5000ms | TUI screen refresh interval |
| `system.client.apiTimeoutMs` | `BOZLY_API_TIMEOUT` | 10000ms | API request timeout (axios) |
| `system.client.debounceDelayMs` | `BOZLY_DEBOUNCE_DELAY` | 300ms | Input debounce delay |

### Examples

```bash
# Increase API cache for slower networks
bozly config system.client.apiCacheTimeoutMs 10000
export BOZLY_API_CACHE_TIMEOUT=10000

# Reduce TUI refresh for faster systems
bozly config system.client.tuiRefreshIntervalMs 2000
export BOZLY_TUI_REFRESH_INTERVAL=2000

# Increase API timeout for slow servers
bozly config system.client.apiTimeoutMs 30000
export BOZLY_API_TIMEOUT=30000
```

---

## Logging Configuration

Settings for application logging output, format, and level.

| Setting | Env Variable | Default | Purpose |
|---------|-------------|---------|---------|
| `system.logging.level` | `BOZLY_LOG_LEVEL` | info | Log level (debug/info/warn/error) |
| `system.logging.enableConsole` | `BOZLY_LOG_CONSOLE` | true | Output logs to console |
| `system.logging.enableFile` | `BOZLY_LOG_FILE` | true | Write logs to file |
| `system.logging.enableColor` | `BOZLY_LOG_COLOR` | auto-detect | Use colors in console output |
| `system.logging.includeTimestamp` | `BOZLY_LOG_TIMESTAMP` | true | Include timestamps in logs |
| `system.logging.includeContext` | `BOZLY_LOG_CONTEXT` | true | Include file/function/line info |
| `system.logging.maxFileSizeBytes` | `BOZLY_LOG_MAX_FILE_SIZE` | 10485760 (10MB) | Log rotation threshold |

### Log Levels

- **debug** — Detailed diagnostic information (development)
- **info** — General informational messages (default)
- **warn** — Warning messages for potential issues
- **error** — Error messages for failures

### Examples

```bash
# Enable debug logging
bozly config system.logging.level debug
export BOZLY_LOG_LEVEL=debug

# Disable console output (file only)
bozly config system.logging.enableConsole false
export BOZLY_LOG_CONSOLE=false

# Disable file output (console only)
bozly config system.logging.enableFile false
export BOZLY_LOG_FILE=false

# Force color output in CI environments
export BOZLY_LOG_COLOR=true

# Disable colors (respects NO_COLOR env var)
export NO_COLOR=1
# or
bozly config system.logging.enableColor false
```

---

## Process Configuration

Settings for process-level execution timeouts and limits.

| Setting | Env Variable | Default | Purpose |
|---------|-------------|---------|---------|
| `system.process.hookTimeoutMs` | `BOZLY_HOOK_TIMEOUT` | 30000ms | Hook execution timeout |
| `system.process.workflowStepTimeoutMs` | `BOZLY_WORKFLOW_STEP_TIMEOUT` | 300000ms (5m) | Workflow step timeout |
| `system.process.aiGenerationTimeoutMs` | `BOZLY_AI_GENERATION_TIMEOUT` | 60000ms | AI generation timeout |

### Examples

```bash
# Increase hook timeout for slow operations
bozly config system.process.hookTimeoutMs 60000
export BOZLY_HOOK_TIMEOUT=60000

# Reduce workflow step timeout
bozly config system.process.workflowStepTimeoutMs 180000  # 3 minutes
export BOZLY_WORKFLOW_STEP_TIMEOUT=180000

# Increase AI generation timeout
bozly config system.process.aiGenerationTimeoutMs 120000  # 2 minutes
export BOZLY_AI_GENERATION_TIMEOUT=120000
```

---

## Configuration File Format

Configuration can be persisted to `~/.bozly/bozly-config.json`:

```json
{
  "server": {
    "port": 3847,
    "host": "127.0.0.1",
    "healthCheckTimeout": 2000,
    "healthCheckIntervalMs": 200,
    "startupTimeoutMs": 30000,
    "openBrowser": true
  },
  "storage": {
    "baseDir": "/home/user/.bozly",
    "sessionDir": "/home/user/.bozly/sessions",
    "logDir": "/home/user/.bozly/logs",
    "cacheDir": "/home/user/.bozly/.cache",
    "commandsDir": "/home/user/.bozly/commands",
    "workflowsDir": "/home/user/.bozly/workflows"
  },
  "client": {
    "apiCacheTimeoutMs": 5000,
    "tuiRefreshIntervalMs": 5000,
    "apiTimeoutMs": 10000,
    "debounceDelayMs": 300
  },
  "logging": {
    "level": "info",
    "enableConsole": true,
    "enableFile": true,
    "enableColor": true,
    "includeTimestamp": true,
    "includeContext": true,
    "maxFileSizeBytes": 10485760
  },
  "process": {
    "hookTimeoutMs": 30000,
    "workflowStepTimeoutMs": 300000,
    "aiGenerationTimeoutMs": 60000
  }
}
```

---

## Environment Variables

All BOZLY configuration can be controlled via environment variables with the `BOZLY_*` prefix:

```bash
# Server config
export BOZLY_PORT=4000
export BOZLY_HOST=0.0.0.0
export BOZLY_HEALTH_CHECK_TIMEOUT=5000
export BOZLY_HEALTH_CHECK_INTERVAL=200
export BOZLY_STARTUP_TIMEOUT=60000
export BOZLY_OPEN_BROWSER=false

# Storage config
export BOZLY_HOME=/opt/bozly
export BOZLY_SESSION_DIR=/var/lib/bozly/sessions
export BOZLY_LOG_DIR=/var/log/bozly
export BOZLY_CACHE_DIR=/var/cache/bozly

# Client config
export BOZLY_API_CACHE_TIMEOUT=10000
export BOZLY_TUI_REFRESH_INTERVAL=3000
export BOZLY_API_TIMEOUT=15000
export BOZLY_DEBOUNCE_DELAY=500

# Logging config
export BOZLY_LOG_LEVEL=debug
export BOZLY_LOG_CONSOLE=true
export BOZLY_LOG_FILE=true
export BOZLY_LOG_COLOR=true
export BOZLY_LOG_TIMESTAMP=true
export BOZLY_LOG_CONTEXT=true
export BOZLY_LOG_MAX_FILE_SIZE=20971520

# Process config
export BOZLY_HOOK_TIMEOUT=60000
export BOZLY_WORKFLOW_STEP_TIMEOUT=600000
export BOZLY_AI_GENERATION_TIMEOUT=120000

# Legacy compatibility
export BOZLY_DEBUG=true  # Sets logging.level to debug
export NO_COLOR=1        # Disables color output
export FORCE_COLOR=1     # Forces color output
```

---

## Priority Examples

Configuration priority (highest to lowest):

### Example 1: Port Configuration

```bash
# Default: 3847
bozly serve
# → Uses port 3847

# Override with environment variable
export BOZLY_PORT=4000
bozly serve
# → Uses port 4000

# Override with config file (~/.bozly/bozly-config.json)
# (set port to 5000 in JSON file)
bozly serve
# → Uses port 5000 (env var takes precedence if also set)

# Override with CLI flag (highest priority)
bozly serve --port 6000
# → Uses port 6000 (overrides everything)
```

### Example 2: Log Level Configuration

```bash
# Check current log level (default: info)
bozly config system.logging.level
# → info

# Set via config file
bozly config system.logging.level debug
# → Persists to ~/.bozly/bozly-config.json

# Override with environment variable
export BOZLY_LOG_LEVEL=warn
bozly tui
# → Uses warn level (overrides config file)

# Legacy environment variable still works
export BOZLY_DEBUG=true
bozly tui
# → Uses debug level (highest priority)
```

---

## Advanced Configuration

### Docker/Container Deployment

For container environments, use environment variables:

```dockerfile
FROM node:18
RUN npm install -g @retroghostlabs/bozly
ENV BOZLY_PORT=3000
ENV BOZLY_HOST=0.0.0.0
ENV BOZLY_LOG_LEVEL=info
EXPOSE 3000
CMD ["bozly", "serve"]
```

### systemd Service

For systemd integration, use environment variables:

```ini
[Unit]
Description=BOZLY API Server
After=network.target

[Service]
Type=simple
User=bozly
Environment="BOZLY_PORT=3847"
Environment="BOZLY_HOME=/var/lib/bozly"
Environment="BOZLY_LOG_DIR=/var/log/bozly"
Environment="BOZLY_LOG_LEVEL=info"
ExecStart=/usr/local/bin/bozly serve
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Custom Base Directory

Store all BOZLY data in a custom location:

```bash
# Set base directory
bozly config system.storage.baseDir /opt/myapp/bozly

# All subdirectories are computed relative to baseDir:
# - Sessions: /opt/myapp/bozly/sessions
# - Logs: /opt/myapp/bozly/logs
# - Cache: /opt/myapp/bozly/.cache
# - Commands: /opt/myapp/bozly/commands
# - Workflows: /opt/myapp/bozly/workflows
```

---

## Troubleshooting

### "Configuration key not found"

```bash
# Make sure you're using correct key path
bozly config system.server.port  # ✅ Correct
bozly config server.port          # ❌ Missing 'system.' prefix
```

### "Value must be positive"

```bash
# Some values have validation rules
bozly config system.server.port 0  # ❌ Error: must be 1-65535
bozly config system.server.port 3847  # ✅ Correct
```

### "Configuration validation failed"

```bash
# Run validation command
bozly config validate

# Check for invalid values:
# - Port out of range (1-65535)
# - Invalid log level
# - Negative timeouts
```

---

## Related Documentation

- [README.md](../README.md) — Overview and quick start
- [CLI.md](./CLI.md) — Complete CLI reference
- [SESSION-134-CONFIG-SYSTEM-INVENTORY.md](../planning/current/SESSION-134-CONFIG-SYSTEM-INVENTORY.md) — Technical design details

---

**Last Updated:** 2025-12-28 (Session 134)
