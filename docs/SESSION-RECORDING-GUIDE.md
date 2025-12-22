# Session Recording Guide

**Session Recording** is a core feature of BOZLY that automatically captures a complete audit trail of every command execution, including context, prompts, responses, and execution metadata.

## Overview

Every time you run a BOZLY command (`bozly run <command>`), a multi-file session is recorded in the vault's `.bozly/sessions/` directory. This enables:

- **Audit Trail** — See exactly what context the AI received
- **Reproducibility** — Examine past executions and re-run with the same context
- **Debugging** — Compare prompts across executions to understand variations
- **Analytics** — View execution statistics and trends
- **Archival** — Organize sessions by node, date, and execution ID

## File Structure

Sessions are organized in a date-based hierarchy:

```
~/.bozly/sessions/
├── {node-id}/
│   └── 2025/12/20/
│       └── {uuid}/
│           ├── session.json       # Metadata & index
│           ├── context.md         # What the AI knew
│           ├── prompt.txt         # Raw prompt text
│           ├── execution.json     # Technical details
│           ├── results.md         # Human-readable output
│           └── changes.json       # File modifications
```

### File Details

#### session.json (Metadata)
Contains session ID, vault, timestamp, command, provider, status, and execution duration.

```json
{
  "schema_version": "1.0",
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "nodeId": "music",
  "timestamp": "2025-12-20T14:32:00Z",
  "command": "rate-album",
  "provider": "claude",
  "status": "completed",
  "executionTimeMs": 3450,
  "nodeName": "Music Vault"
}
```

#### context.md (What the AI Knew)
Documents the context sources—vault knowledge, command definition, models used, and dynamic variables.

#### prompt.txt (Raw Prompt)
The exact prompt text sent to the AI provider—useful for diff comparisons.

#### execution.json (Technical Details)
Includes command inputs, AI request details, response info, execution log, and timing data.

```json
{
  "commandInput": { "vault_id": "music", "command": "rate-album" },
  "aiRequest": {
    "provider": "claude",
    "model": "claude-3-5-sonnet-20241022",
    "promptLength": 2450
  },
  "aiResponse": {
    "finishReason": "end_turn",
    "contentLength": 850
  },
  "executionLog": [
    { "timestamp": "2025-12-20T14:32:00.123Z", "type": "start", "message": "..." },
    { "timestamp": "2025-12-20T14:32:02.450Z", "type": "complete", "message": "..." }
  ],
  "timing": { "startMs": 1703084520123, "endMs": 1703084523450, "totalMs": 3327 }
}
```

#### results.md (Human-Readable Output)
The actual AI output with command name, status, duration, and any error messages.

#### changes.json (File Modifications)
Tracks which files were created, modified, or deleted during execution.

## Using Sessions

### View Recent Sessions

```bash
bozly logs                          # Show last 10 sessions
bozly logs --limit 20               # Show last 20 sessions
bozly logs --verbose                # Show detailed information
```

### Filter Sessions

```bash
bozly logs --command daily          # Filter by command name
bozly logs --provider claude        # Filter by AI provider
bozly logs --status completed       # Filter by status (completed, failed, dry_run)
bozly logs --node music      # Filter by node ID
bozly logs --since 2025-12-20       # Sessions since date (ISO format)
bozly logs --until 2025-12-21       # Sessions until date (ISO format)
```

### Compare Sessions

Compare prompts between two executions:

```bash
bozly diff <session-id-1> <session-id-2>     # Compare specific sessions
bozly diff --command daily --last 2           # Compare last 2 executions of "daily"
```

This shows what changed in the prompt between executions, including context size, prompt size, duration, and status changes.

## Running Commands with Recording

By default, all non-dry-run executions are recorded:

```bash
bozly run daily                     # Records session automatically
bozly run daily --dry               # Preview without recording
bozly run daily --verbose           # Include detailed info in logs
```

### Status Values

- **completed** — Command executed successfully
- **failed** — Command encountered an error
- **dry_run** — Dry-run preview (not recorded)

## Session Lifecycle

```
┌─────────────────────────────────────────┐
│ User runs: bozly run <command>          │
├─────────────────────────────────────────┤
│ 1. Load node context                   │
│ 2. Load command definition              │
│ 3. Build prompt                         │
│ 4. Send to AI provider                  │
│ 5. Record session with all components   │
│ 6. (Optional) Apply changes to vault    │
└─────────────────────────────────────────┘
```

## Accessing Session Files

Sessions are organized by vault and date, making them easy to browse:

```bash
# Browse node sessions from Dec 20, 2025
ls ~/.bozly/sessions/music/2025/12/20/

# Find a specific session's UUID
bozly logs --command daily | grep "f47ac10b"

# View session details
cat ~/.bozly/sessions/music/2025/12/20/f47ac10b-58cc-4372-a567-0e02b2c3d479/session.json
cat ~/.bozly/sessions/music/2025/12/20/f47ac10b-58cc-4372-a567-0e02b2c3d479/prompt.txt
cat ~/.bozly/sessions/music/2025/12/20/f47ac10b-58cc-4372-a567-0e02b2c3d479/results.md
```

## Advanced Usage

### Session Statistics

Get execution statistics:

```bash
# Total sessions, success rate, average duration, providers used
bozly logs --limit 100    # Shows summary
```

### Dry-Run Mode

Preview a command without recording:

```bash
bozly run daily --dry                # Shows prompt, no recording
```

### Archival

Sessions are naturally organized by date, making archival straightforward:

```bash
# Archive old sessions (roadmap feature)
tar -czf sessions-2025-11.tar.gz ~/.bozly/sessions/*/2025/11/
```

## Phase 2+ Enhancements (Roadmap)

- **Auto-Cleanup & Disk Management** — Prevent session bloat
  - `bozly cleanup` command with `--preview`, `--older-than`, `--archive` flags
  - Session retention policy (configurable, default 90 days)
  - Storage monitoring (`bozly status --storage`)
  - Auto-cleanup when storage exceeds threshold
  - See: `planning/current/SESSION-65-AUTO-CLEANUP-DESIGN.md`
- **Session Memory** — Extract and reuse session summaries across commands
- **Cross-Vault Queries** — Search sessions across multiple nodes
- **n8n Integration** — Monitor session directories for workflow automation
- **Gzip Compression** — Reduce disk space for old sessions (part of Auto-Cleanup)
- **Prompt Hashing** — Detect identical prompts across executions
- **Session Archival Tool** — Automated archival and rotation (part of Auto-Cleanup)

## Global Session Operations (Pattern 2 - Transparency)

Query, analyze, and manage sessions across all nodes simultaneously.

### View Sessions Across All Vaults

```bash
bozly logs --global                    # Show recent sessions from all nodes
bozly logs --global --limit 30         # Show last 30 sessions across all nodes
bozly logs --global --verbose          # Detailed information for all sessions
```

### Global Statistics

See aggregated metrics across all nodes:

```bash
bozly logs --global --stats            # Show statistics across all nodes
```

Output includes:
- Total sessions across all nodes
- Success/failure rates globally
- Average execution duration
- Vaults with active sessions
- Providers used (Claude, GPT, Gemini, Ollama, etc.)
- Commands executed across all nodes

### Filter Across Vaults

Combine --global with any filter:

```bash
bozly logs --global --command daily    # Find all "daily" commands across nodes
bozly logs --global --provider claude  # All sessions using Claude across nodes
bozly logs --global --since 2025-12-01 # All sessions since a date across nodes
bozly logs --global --status failed    # All failed sessions across nodes
```

### Archive Sessions

**Archive by date** (across all nodes):
```bash
# Archive sessions older than Dec 1, 2025
bozly logs --global --archive-before 2025-12-01
```

**Archive specific vault**:
```bash
# Archive all sessions from a specific vault
bozly logs --global --archive-vault music
```

### Example: Multi-Vault Monitoring

```bash
# Daily: Check all nodes for failures
bozly logs --global --status failed --stats

# Weekly: Review all sessions
bozly logs --global --stats

# Monthly: Archive old sessions
bozly logs --global --since $(date -d '30 days ago' +%Y-%m-%d)
```

## Troubleshooting

### Sessions not being recorded

Check that you're in a node directory:

```bash
bozly status    # Should show vault details
```

### Session files not readable

Check file permissions:

```bash
ls -la ~/.bozly/sessions/
find ~/.bozly/sessions -type f -ls | head -20
```

### Disk space concerns

Sessions are stored as plain text/JSON, so old sessions can be safely archived:

```bash
# Find large session files
find ~/.bozly/sessions -type f -size +100k -ls

# Archive by year
tar -czf sessions-2024.tar.gz ~/.bozly/sessions/*/2024/
rm -rf ~/.bozly/sessions/*/2024/
```

## Best Practices

1. **Review Failed Sessions** — Always check what went wrong
2. **Use Comments in Commands** — Document intent in `.bozly/commands/`
3. **Compare When Changing Context** — Use `bozly diff` before/after context updates
4. **Archive Old Sessions** — Keep active sessions organized
5. **Monitor Prompt Size** — Large contexts impact cost and latency

## Related Commands

- `bozly logs` — View and filter sessions
- `bozly diff` — Compare session prompts
- `bozly run` — Execute command (with automatic session recording)
- `bozly status` — Check node status and location
