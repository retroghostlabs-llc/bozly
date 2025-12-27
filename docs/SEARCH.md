# Cross-Node Search & History

BOZLY provides powerful search and history commands to find sessions, memories, and commands across all your vaults. These commands enable intelligent discovery and context retrieval from your entire workspace.

## Quick Start

```bash
# Search across all vaults
bozly search "your query"

# View recent sessions
bozly history

# Show history for a specific vault
bozly history music
```

## Search Command

The `bozly search` command searches across sessions, memories, and commands in all vaults.

### Usage

```bash
bozly search <query> [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `query` | Search text (required) |

### Options

| Option | Alias | Description | Example |
|--------|-------|-------------|---------|
| `--command <name>` | `-c` | Filter by command name | `bozly search "music" --command daily` |
| `--provider <provider>` | `-p` | Filter by AI provider (claude, gpt, gemini, ollama) | `bozly search "task" --provider claude` |
| `--nodes <ids>` | `-n` | Filter by node IDs (comma-separated) | `bozly search "query" --nodes music,journal` |
| `--status <status>` | `-s` | Filter by status (completed, failed, dry_run) | `bozly search "error" --status failed` |
| `--older-than <days>` | | Sessions from last N days | `bozly search "recent" --older-than 7` |
| `--newer-than <days>` | | Sessions newer than N days | `bozly search "old" --newer-than 30` |
| `--in <targets>` | | Search specific targets (sessions,memories,commands) | `bozly search "api" --in commands` |
| `--limit <number>` | `-l` | Max results (default: 50) | `bozly search "task" --limit 100` |
| `--json` | | Output as JSON | `bozly search "music" --json` |
| `--export <file>` | `-e` | Export to file (JSON or CSV based on extension) | `bozly search "music" --export results.json` |

### Examples

#### Basic Search
```bash
# Search everything for "meeting"
bozly search "meeting"

# Output:
# SEARCH RESULTS: "meeting"
#
# SESSIONS (3)
# ┌─────────────┬──────────┬────────┐
# │ Command     │ Status   │ Score  │
# ├─────────────┼──────────┼────────┤
# │ standup     │ completed│ 95%    │
# │ notes       │ completed│ 87%    │
# │ summary     │ failed   │ 72%    │
# └─────────────┴──────────┴────────┘
```

#### Filter by Command
```bash
# Find all "daily" sessions
bozly search "progress" --command daily

# Find sessions for a specific command across all vaults
bozly search "urgent" --command standup
```

#### Filter by Provider
```bash
# Find sessions using Claude
bozly search "analysis" --provider claude

# Find GPT sessions only
bozly search "code" --provider gpt
```

#### Filter by Status
```bash
# Find failed sessions
bozly search "error" --status failed

# Find dry run tests
bozly search "test" --status dry_run
```

#### Date Range Filtering
```bash
# Find sessions from last 7 days
bozly search "recent" --older-than 7

# Find older sessions (30+ days ago)
bozly search "archive" --older-than 30
```

#### Filter Search Targets
```bash
# Search only commands
bozly search "deploy" --in commands

# Search memories only
bozly search "insight" --in memories

# Search multiple targets
bozly search "setup" --in sessions,commands
```

#### Combine Filters
```bash
# Find completed "daily" commands from Claude in last week
bozly search "progress" \
  --command daily \
  --provider claude \
  --status completed \
  --older-than 7

# Search across specific nodes only
bozly search "music" --nodes music,projects --limit 20
```

#### JSON Output
```bash
# Get results as JSON
bozly search "api" --json

# Pipe to another tool
bozly search "bug" --json | jq '.results.sessions[0]'
```

#### Export Results
```bash
# Export to JSON file
bozly search "analysis" --export results.json

# Export to CSV for spreadsheet
bozly search "tasks" --export tasks.csv

# Both formats include:
# - Session metadata (command, status, timestamp, provider)
# - Relevance scores
# - Node information
```

### Output Format

#### Default Table Format

```
SEARCH RESULTS: "your query"

SESSIONS (5)
┌─────────────┬───────────┬────────┬────────────┐
│ Command     │ Node      │ Status │ Score      │
├─────────────┼───────────┼────────┼────────────┤
│ daily       │ music     │ ✓ completed │ 95%    │
│ standup     │ projects  │ ✓ completed │ 87%    │
│ test        │ music     │ • dry_run │ 72%      │
└─────────────┴───────────┴────────┴────────────┘

MEMORIES (2)
  2024-12-22 [music]
  → Key insight about music streaming analysis...
  Tags: analysis, workflow

COMMANDS (3)
┌─────────────┬──────────┬────────┬────────────┐
│ Name        │ Source   │ Score  │ Node       │
├─────────────┼──────────┼────────┼────────────┤
│ create-task │ vault    │ 85%    │ projects   │
│ deploy      │ global   │ 78%    │ global     │
│ update      │ vault    │ 72%    │ music      │
└─────────────┴──────────┴────────┴────────────┘

Total: 5 sessions, 2 memories, 3 commands
```

#### JSON Format

```json
{
  "query": {
    "text": "your query",
    "command": "daily",
    "provider": "claude",
    "limit": 50
  },
  "counts": {
    "sessions": 5,
    "memories": 2,
    "commands": 3,
    "total": 10
  },
  "results": {
    "sessions": [
      {
        "type": "session",
        "session": {
          "id": "uuid",
          "command": "daily",
          "status": "completed",
          "provider": "claude",
          "timestamp": "2024-12-22T10:30:00Z"
        },
        "nodeInfo": {
          "nodeId": "music",
          "nodeName": "Music Vault",
          "nodePath": "/path/to/music"
        },
        "relevanceScore": 0.95,
        "matchedFields": ["command", "text"]
      }
    ],
    "memories": [...],
    "commands": [...]
  }
}
```

## History Command

The `bozly history` command shows recent sessions across all vaults or a specific vault.

### Usage

```bash
bozly history [node] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `[node]` | Optional: specific node ID to filter |

### Options

| Option | Alias | Description | Example |
|--------|-------|-------------|---------|
| `--limit <number>` | `-l` | Max results (default: 10, max: 100) | `bozly history --limit 20` |
| `--provider <provider>` | `-p` | Filter by AI provider | `bozly history --provider claude` |
| `--command <name>` | `-c` | Filter by command name | `bozly history --command daily` |
| `--older-than <days>` | | Sessions from last N days | `bozly history --older-than 7` |
| `--status <status>` | | Filter by status (completed, failed, dry_run) | `bozly history --status completed` |
| `--json` | | Output as JSON | `bozly history --json` |

### Examples

#### View All Recent Sessions
```bash
# Show last 10 sessions across all vaults
bozly history

# Output:
# RECENT SESSIONS (last 10)
# ──────────────────────────────────
#
# Music Vault (3)
#   12/22 10:30 daily           ✓ completed [claude]  2.5s
#     → Key insights about music workflow...
#   12/22 09:15 standup         ✓ completed [gpt]     1.8s
#     → Team updates and next steps...
#
# Projects Vault (4)
#   12/22 08:45 review          ✓ completed [claude]  3.2s
#     → Code review findings and recommendations...
#   ...
#
# Total: 10 sessions
```

#### View History for Specific Vault
```bash
# Show history for music vault
bozly history music

# Output:
# HISTORY: music (5)
# ──────────────────────────────────
#   12/22 10:30 daily           ✓ completed [claude]  2.5s
#   12/21 10:15 daily           ✓ completed [claude]  2.3s
#   12/20 10:45 standup         ✓ completed [gpt]     1.8s
#   12/19 14:30 review          ✗ failed     [claude] 5.1s
#   12/18 11:00 analysis        • dry_run    [ollama] 4.2s
```

#### Filter by Command
```bash
# Show only daily sessions
bozly history --command daily

# Show only standup sessions
bozly history standup --command standup
```

#### Filter by Provider
```bash
# Show only Claude sessions
bozly history --provider claude

# Show only GPT sessions
bozly history --provider gpt
```

#### Filter by Status
```bash
# Show only completed sessions
bozly history --status completed

# Show only failed sessions (for debugging)
bozly history --status failed

# Show only dry runs
bozly history --status dry_run
```

#### Time-Based Filtering
```bash
# Show sessions from last 7 days
bozly history --older-than 7

# Show sessions from last 30 days
bozly history --older-than 30

# Specific vault with time filter
bozly history music --older-than 7
```

#### Combine Filters
```bash
# Show completed daily sessions from last week
bozly history \
  --command daily \
  --status completed \
  --older-than 7

# Show music vault history, limited to 5
bozly history music --limit 5

# Show failed Claude sessions
bozly history --provider claude --status failed
```

#### JSON Output
```bash
# Get history as JSON
bozly history --json

# Get specific vault history as JSON
bozly history music --json

# Pipe to tools
bozly history --json | jq '.[] | select(.session.status == "failed")'
```

## Relevance Scoring

Results are scored on a scale of 0-1 based on:

### Session Scoring
- **Base score**: 0.5
- **Command match**: +0.3 if command name matches filter
- **Provider match**: +0.2 if provider matches filter
- **Status match**: +0.1 if status matches query
- **Text match**: +0.2 if text appears in session metadata

### Memory Scoring
- **Base score**: 0.5
- **Summary match**: +0.3 if text found in summary
- **Tags match**: +0.2 if text found in tags
- **Command match**: +0.2 if command matches filter

### Command Scoring
- **Base score**: 0.5
- **Name match**: +0.3 if text in command name
- **Description match**: +0.2 if text in description
- **Tags match**: +0.15 if text in command tags

## Grouped Results

Results can be grouped by node for easier navigation:

```json
{
  "groupedByNode": {
    "music": {
      "sessions": [...],
      "memories": [...],
      "commands": [...]
    },
    "projects": {
      "sessions": [...],
      "memories": [...],
      "commands": [...]
    }
  }
}
```

## Memory Integration

Search integrates with BOZLY's memory system:

- **Extracted memories** are indexed and searchable
- **Memory summaries** appear in results
- **Tags** on memories improve search precision
- **Memory relationships** are preserved

## Performance Notes

- **Default limits**: Search (50), History (10)
- **Maximum limits**: Search (no max), History (100)
- **Indexing**: Memory index updated with each session
- **Caching**: No caching; all queries run fresh

## Tips & Best Practices

### Effective Searching
1. **Be specific**: Use relevant keywords from your work
2. **Use filters**: Combine text with command/provider/status filters
3. **Check dates**: Use `--older-than` to focus on recent work
4. **Export for analysis**: Use `--export` for offline analysis

### History Management
1. **Regular review**: Use `bozly history` daily to track progress
2. **Find patterns**: Look for status failures to identify issues
3. **Monitor providers**: Track which AI works best for your tasks
4. **Archive old data**: Use date filters to manage volume

### Memory Optimization
1. **Tag effectively**: Use consistent tags for easy filtering
2. **Write summaries**: Clear summaries improve search results
3. **Link commands**: Associate memories with commands
4. **Review regularly**: Keep memories current and relevant

## Troubleshooting

### No Results Found
- Check spelling of command names
- Verify node IDs exist: `bozly list`
- Try broader date ranges: `--older-than 30`
- Search without filters first

### Unexpected Results
- Check relevance scores (low = weak match)
- Verify filters are correct: `--status completed`
- Review matched fields in JSON output
- Use `--limit 1` to focus on top result

### Performance Issues
- Reduce limit: `--limit 10`
- Filter by node: `--nodes music`
- Limit date range: `--older-than 7`
- Search single target: `--in sessions`

## Integration Examples

### Find Today's Completed Work
```bash
bozly history --status completed --older-than 1
```

### Export Week's Sessions
```bash
bozly search "*" --older-than 7 --export week.csv
```

### Find Failed Commands
```bash
bozly history --status failed
```

### Search Specific Vault with All Details
```bash
bozly search "keyword" --nodes music --json | jq .
```

### Monitor Command Usage
```bash
bozly history --limit 100 | grep -i daily
```

## Related Commands

- `bozly list` — List all registered vaults
- `bozly status` — Show current vault status
- `bozly context` — Generate AI context
- `bozly logs` — View session logs
- `bozly run <command>` — Execute a command

## See Also

- [SESSIONS.md](./SESSIONS.md) — Session recording and management
- [MEMORY.md](./MEMORY.md) — Memory extraction and indexing
- [COMMANDS.md](./COMMANDS.md) — Command management

---

## See Also

- [GETTING-STARTED.md](GETTING-STARTED.md) — Getting started with BOZLY
- [MEMORY.md](MEMORY.md) — Memory system and data extraction
- [CLI-REFERENCE.md](CLI-REFERENCE.md) — Search commands
- [API-REFERENCE.md](API-REFERENCE.md) — Search API functions

*Last updated: 2025-12-27 (Session 122)*
