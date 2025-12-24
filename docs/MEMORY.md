# BOZLY Memory System

The Memory System enables BOZLY to remember and learn from past sessions, improving AI context and performance over time. It automatically extracts session summaries, builds a searchable knowledge base, and injects past learnings into new sessions.

## Overview

**Key Idea:** Every session creates a memory that informs the next session.

```
Session 1 (Tuesday)
  ↓
Auto-extract memory
  ↓
Session 2 (Wednesday)
  ↓
Load Session 1 memory → Better context for AI
  ↓
Auto-extract memory
  ↓
Session 3 (Thursday)
  ↓
Load Sessions 1 & 2 memories → Even richer context
```

### Why Memory Matters

- **Continuity:** AI understands what happened in previous sessions
- **Context Efficiency:** Rich history without re-explaining
- **Pattern Detection:** Identify trends across sessions
- **Knowledge Building:** Vault-specific learnings accumulate
- **Cross-Node Insights:** Query memories across all vaults

---

## How It Works

### 1. Automatic Memory Extraction

After every session completes, BOZLY:

1. Analyzes session data (context, command, output)
2. Generates a structured memory summary using vault-specific templates
3. Stores memory in `.bozly/sessions/{nodeId}/{date}/{uuid}/memory.md`
4. Creates metadata for indexing and discovery
5. Adds entry to `~/.bozly/memory-index.json` for cross-vault search

**Example memory.md:**
```markdown
# Memory: Music Discovery Session

Session ID: session-abc123
Date: 2025-12-24
Duration: 12 minutes

## Key Discoveries
- Explored indie folk artists
- Found connection between artist mood and scoring patterns

## Scoring Patterns Identified
- Personal: 8.2 (high engagement)
- Objective: 7.1 (solid musicianship)
- Emotional: 8.8 (strong resonance)

## Recommendations for Future Sessions
- Continue exploring Bon Iver-adjacent artists
- Test collaboration scores for ensemble works
```

### 2. Memory Loading

Before command execution, BOZLY:

1. Discovers past memories from disk
2. Ranks them by recency (most recent first)
3. Loads top 3 memories by default
4. Injects into command context

**Loading order (recency-based):**
```
Most recent → Session 91 memory (yesterday)
           → Session 89 memory (3 days ago)
           → Session 87 memory (5 days ago)
```

### 3. Memory Indexing

For cross-vault search and discovery:

1. Each memory entry is indexed with metadata:
   - Node ID and vault type
   - Command name
   - Tags (auto-extracted from content)
   - Timestamps
   - Token count

2. Index stored in `~/.bozly/memory-index.json`

3. Enables queries like:
   - "Show memories from all vaults"
   - "Find memories tagged #music from last 7 days"
   - "Search all memories for 'artist recommendations'"

---

## Configuration

### Node-Level Memory Config

Configure memory behavior per vault in `.bozly/config.json`:

```json
{
  "name": "Music Discovery",
  "type": "music",
  "memory": {
    "enabled": true,
    "maxMemoriesPerCommand": 3,
    "retentionDays": 60,
    "autoIndexing": true,
    "customTemplates": {
      "enabled": false,
      "directory": ".bozly/templates/memory"
    }
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | true | Enable/disable memory system for this vault |
| `maxMemoriesPerCommand` | number | 3 | How many past memories to load before commands |
| `retentionDays` | number | 30 | Keep memories for this many days (then auto-archive) |
| `autoIndexing` | boolean | true | Automatically index memories for search |
| `customTemplates.enabled` | boolean | false | Use custom memory templates |
| `customTemplates.directory` | string | `.bozly/templates/memory` | Path to custom templates |

### Global Memory Config

Configure global defaults in `~/.bozly/bozly-config.json`:

```json
{
  "memory": {
    "enabled": true,
    "defaultMaxMemories": 3,
    "defaultRetentionDays": 30,
    "globalIndexing": true
  }
}
```

---

## Memory Templates

Memory extraction uses vault-type-specific templates to generate consistent, high-quality summaries.

### Built-in Templates

BOZLY includes templates for 4 vault types:

#### 1. Music Template (`music.md`)

For music discovery, analysis, and curation vaults:

```markdown
# Memory: Music Discovery Session

## Key Discoveries
- Artists & albums explored
- Scoring patterns identified

## Notable Insights
- Personal/Objective/Emotional scoring trends

## Recommendations for Future Sessions
```

**Best for:** Music vaults tracking artist discoveries, scoring patterns, mood associations.

#### 2. Journal Template (`journal.md`)

For personal journals and reflection:

```markdown
# Memory: Journal Entry Summary

## Themes & Patterns
- Key topics discussed
- Emotional arc

## Recurring Patterns
- Compared to past 7/30 days
- Self-insights

## Reflections for Next Entry
```

**Best for:** Journal vaults with emotional tracking, mood patterns, life reflections.

#### 3. Project Template (`project.md`)

For development projects, work tracking:

```markdown
# Memory: Project Session Summary

## Work Completed
## Challenges Encountered
## Decisions Made
## Next Steps
## Progress Metrics
```

**Best for:** Project vaults tracking development work, decisions, blockers.

#### 4. Generic Template (`generic.md`)

For any other vault type:

```markdown
# Memory: Session Summary

## Overview
## Key Points
## What Was Accomplished
## Lessons Learned
## Next Steps
```

**Best for:** Custom vault types, content creation, general knowledge work.

### Custom Templates

Create vault-specific memory templates in `.bozly/templates/memory/`:

```bash
# Create custom template
mkdir -p .bozly/templates/memory/
echo "# Custom Memory Template" > .bozly/templates/memory/custom.md
```

Enable in config:
```json
{
  "memory": {
    "customTemplates": {
      "enabled": true,
      "directory": ".bozly/templates/memory"
    }
  }
}
```

---

## Usage Examples

### Example 1: Basic Memory Flow (Music Vault)

**Session 1 - Tuesday:**
```bash
$ bozly run discover-indie-folk
# AI explores indie folk artists, generates memory
```

**Memory extracted:**
```markdown
# Memory: Music Discovery Session
Date: 2025-12-24
Key Discoveries: Bon Iver, Fleet Foxes
Scoring: Personal 8.2, Objective 7.1, Emotional 8.8
```

**Session 2 - Wednesday:**
```bash
$ bozly run refine-recommendations
# Memory from Session 1 automatically loaded:
# "Previous session explored indie folk with high emotional resonance"
# AI uses this context to refine recommendations
```

### Example 2: Memory with Multiple Nodes

**Global memory index tracks all vaults:**

```json
{
  "entries": [
    {
      "nodeId": "music-vault",
      "command": "discover",
      "timestamp": "2025-12-24T10:30:00Z",
      "tags": ["indie", "folk", "emotional"],
      "memoryPath": "~/.bozly/sessions/music-vault/2025/12/24/uuid1/memory.md"
    },
    {
      "nodeId": "journal-vault",
      "command": "reflect",
      "timestamp": "2025-12-24T14:15:00Z",
      "tags": ["mood", "creative-block", "breakthrough"],
      "memoryPath": "~/.bozly/sessions/journal-vault/2025/12/24/uuid2/memory.md"
    }
  ]
}
```

**Cross-vault search:**
```bash
# Future: Search all vaults for creative patterns
$ bozly search "creative breakthrough" --all-vaults
# Returns memories from journal, music, projects simultaneously
```

### Example 3: Adjusting Memory Configuration

**Music vault with deeper history:**

```json
{
  "name": "Music Discovery",
  "type": "music",
  "memory": {
    "enabled": true,
    "maxMemoriesPerCommand": 5,      // Load more memories for richer context
    "retentionDays": 120,             // Keep memories for 4 months
    "autoIndexing": true
  }
}
```

**Journal vault with standard settings:**

```json
{
  "name": "Daily Journal",
  "type": "journal",
  "memory": {
    "enabled": true,
    "maxMemoriesPerCommand": 3,       // Standard 3 memories
    "retentionDays": 90,              // Quarterly review
    "autoIndexing": true
  }
}
```

---

## Memory File Structure

### Session Memory Files

```
~/.bozly/sessions/
  └── {nodeId}/
      └── {YYYY}/
          └── {MM}/
              └── {DD}/
                  └── {uuid}/
                      ├── session.json          # Session metadata
                      ├── context.md            # What AI knew
                      ├── prompt.txt            # Raw prompt
                      ├── results.md            # AI output
                      ├── memory.md             # ← MEMORY (extracted)
                      ├── memory-metadata.json  # ← METADATA (for indexing)
                      ├── execution.json        # Timing/logs
                      └── changes.json          # File modifications
```

### Memory Metadata (`memory-metadata.json`)

```json
{
  "sessionId": "session-abc123",
  "memoryPath": "~/.bozly/sessions/music-vault/2025/12/24/uuid1/memory.md",
  "extractedAt": "2025-12-24T10:30:00Z",
  "vaultType": "music",
  "command": "discover",
  "tags": ["indie", "folk", "emotional"],
  "tokenCount": 450,
  "durationMinutes": 12,
  "provider": "claude",
  "model": "claude-opus-4.5"
}
```

### Global Memory Index (`~/.bozly/memory-index.json`)

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-12-24T10:30:00Z",
  "entries": [
    {
      "id": "memory-abc123",
      "nodeId": "music-vault",
      "command": "discover",
      "timestamp": "2025-12-24T10:30:00Z",
      "tags": ["indie", "folk"],
      "memoryPath": "~/.bozly/sessions/music-vault/2025/12/24/uuid1/memory.md"
    }
  ],
  "stats": {
    "totalMemories": 42,
    "nodeCount": 3,
    "oldestMemory": "2025-10-25T09:15:00Z",
    "newestMemory": "2025-12-24T10:30:00Z"
  }
}
```

---

## Command Integration

### How Memory Loads in Commands

**Before command execution:**

1. `bozly run discover` is called
2. BOZLY loads memory for music-vault:
   - Discovers .bozly/sessions/ directory
   - Finds all memory.md files
   - Ranks by timestamp (most recent first)
   - Loads top 3 memories
3. Memories prepended to command context:
   ```
   [PAST SESSION MEMORIES]

   Memory 1 (Most Recent - Yesterday):
   # Memory: Music Discovery Session
   Date: 2025-12-23
   ...

   Memory 2 (3 days ago):
   # Memory: Music Discovery Session
   Date: 2025-12-21
   ...

   Memory 3 (5 days ago):
   # Memory: Music Discovery Session
   Date: 2025-12-19
   ...

   [VAULT CONTEXT]
   [COMMAND PROMPT]
   ```
4. AI receives full context with past learnings
5. Session completes, new memory auto-extracted

---

## Best Practices

### 1. Configure per Vault Type

Different vault types benefit from different memory settings:

```json
// Music vault: Broad history, frequent context
{
  "maxMemoriesPerCommand": 5,
  "retentionDays": 120
}

// Journal vault: Deep personal history
{
  "maxMemoriesPerCommand": 7,
  "retentionDays": 365
}

// Project vault: Recent focused context
{
  "maxMemoriesPerCommand": 3,
  "retentionDays": 30
}
```

### 2. Regular Memory Review

Periodically review memories to ensure quality:

```bash
# Future command: browse recent memories
$ bozly memory list --days 7
# Shows recent memories for review

# Future command: remove low-quality memories
$ bozly memory delete {memory-id}
```

### 3. Create Custom Templates for Specialized Work

If built-in templates don't fit your workflow, create custom ones:

```bash
# Custom template for content creation vault
.bozly/templates/memory/content.md
```

### 4. Use Tags for Organization

Memories auto-tag based on vault type, but add custom tags for searching:

```markdown
# Memory: Music Session

---
**Tags:** #indie #folk #emotional #discovery #breakthrough
```

### 5. Archive Old Memories

For long-term retention, archive memories outside active use:

```bash
# Future command: archive memories older than 90 days
$ bozly memory archive --older-than 90
```

---

## Troubleshooting

### Memory Not Loading

**Problem:** Commands execute without past memories.

**Diagnosis:**
```bash
# Check if memory is enabled
grep '"enabled"' .bozly/config.json

# Check if memories exist
ls .bozly/sessions/
```

**Solution:**
1. Verify memory is enabled in config.json
2. Run a test session to generate memories
3. Wait 30 seconds for extraction to complete

### Memory File Corrupted

**Problem:** `Error reading memory file`

**Solution:**
```bash
# Check memory metadata
cat .bozly/sessions/{nodeId}/{date}/{uuid}/memory-metadata.json

# Regenerate memory (future command)
$ bozly memory regenerate {session-id}
```

### Memory Index Out of Sync

**Problem:** Memory searches return incomplete results.

**Solution:**
```bash
# Rebuild global memory index (future command)
$ bozly memory reindex

# This rescans all .bozly/sessions/ directories
# and rebuilds ~/.bozly/memory-index.json
```

### Too Many Memories Loading

**Problem:** Command context exceeds token limit.

**Solution:**
1. Reduce `maxMemoriesPerCommand` in config.json:
   ```json
   "memory": {
     "maxMemoriesPerCommand": 2  // Instead of 3-5
   }
   ```
2. Or reduce `retentionDays` to keep only recent memories

### Memory Extraction Too Slow

**Problem:** Sessions take longer to complete.

**Solution:**
1. Disable memory extraction temporarily:
   ```json
   "memory": {
     "enabled": false
   }
   ```
2. Or optimize by running extraction in background (Phase 3 feature)

---

## Advanced Usage

### Memory-Informed Command Suggestions (Phase 2k)

**Future:** AI will suggest new commands based on memory patterns:

```bash
# Phase 2k: Analyze memories, suggest improvements
$ bozly suggest improve-discover
# Analyzes past discover sessions
# Suggests: "Add artist mood preferences to improve scoring"
```

### Cross-Vault Memory Queries (Phase 2j)

**Future:** Search memories across all vaults:

```bash
# Phase 2j: Search all memories
$ bozly search "creative patterns" --all
# Returns matching memories from music, journal, projects

# Filter by vault type
$ bozly search "artist" --vaults music,content

# Filter by date
$ bozly search "breakthrough" --after 2025-12-01 --before 2025-12-31
```

### Memory-Powered Dashboard (Phase 2b)

**Future:** Web UI to browse and analyze memories:

```bash
$ bozly serve
# Opens http://localhost:3000/memories
# Browse, filter, and analyze past learnings
# "Open in Obsidian" integration
```

---

## Architecture Notes

### Memory Extraction (Auto-Run)

Triggered after session completes:

1. **MemoryExtractor** analyzes session data
2. Selects vault-specific template
3. Generates structured memory markdown
4. Creates metadata JSON

### Memory Loading (Auto-Run)

Triggered before command execution:

1. **MemoryLoader** discovers memory files
2. Filters by retention window (30 days default)
3. Ranks by recency
4. Loads top N memories (3 default)
5. Injects into context

### Memory Indexing (Auto-Run)

Triggered after extraction:

1. **MemoryIndex** creates index entry
2. Stores in `~/.bozly/memory-index.json`
3. Enables cross-vault queries

---

## See Also

- [CLI.md](./CLI.md) - Full command reference
- [SESSION-50-MEMORY-N8N-DESIGN.md](../planning/current/SESSION-50-MEMORY-N8N-DESIGN.md) - Memory system design
- [ARCHITECTURE-DECISIONS-GUIDE.md](./.claude/guides/ARCHITECTURE-DECISIONS-GUIDE.md) - Three-tier safety model
