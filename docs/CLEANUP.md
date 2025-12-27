# BOZLY Cleanup System

## Overview

BOZLY includes a disk management system to prevent storage bloat from accumulated sessions and backups. The cleanup system provides automated and manual options for managing your node data lifecycle.

## Why Cleanup Matters

BOZLY generates persistent data that accumulates over time:

- **Sessions**: 6 files per run (~2-10KB each)
- **Backups**: Full node copies during removal operations
- **Metrics**: Usage tracking data (optional, Phase 2)

Heavy users can accumulate **GBs of session data** over months without realizing it.

## Storage Limits

By default, BOZLY allocates **500 MB per node** for sessions. You can configure this in `~/.bozly/bozly-config.json`:

```json
{
  "cleanup": {
    "sessions": {
      "maxStorageMB": 500
    }
  }
}
```

## Checking Storage

### View storage for current node

```bash
bozly status --storage
```

Output:
```
Storage Usage:
  Total: 245 MB / 500 MB (49%)
  Sessions: 245 MB
    - Active: 312 sessions
    - Archived: 1535 sessions
  Backups: 12 MB

⚠️  Storage usage is high
  Run 'bozly cleanup --preview' to see cleanup options
```

### View storage for all nodes

```bash
bozly cleanup --all --preview
```

Shows cleanup analysis for every registered node.

## Cleaning Up

### Preview what will be cleaned (safe)

```bash
bozly cleanup --preview
```

Shows what WOULD be deleted without making changes.

### Delete old sessions

```bash
bozly cleanup --older-than 90d --force
```

Deletes sessions older than 90 days. Requires `--force` flag for safety.

### Support for time units

- `30d` — 30 days
- `6m` — 6 months (180 days)
- `1y` — 1 year (365 days)
- `1w` — 1 week (7 days)

### Clean all nodes at once

```bash
bozly cleanup --all --older-than 90d --force
```

Runs cleanup on every registered node.

### Clean to storage limit

```bash
bozly cleanup --to-limit --force
```

Automatically deletes oldest sessions until storage usage drops to 80% of limit.

## Configuration

Edit `~/.bozly/bozly-config.json` to customize cleanup behavior:

```json
{
  "cleanup": {
    "sessions": {
      "enabled": true,
      "retentionDays": 90,
      "archiveAfterDays": 30,
      "maxStorageMB": 500,
      "keepMinSessions": 100
    },
    "backups": {
      "maxCount": 10,
      "maxAgeDays": 30
    },
    "autoCleanup": true,
    "warnAtPercent": 80
  }
}
```

### Configuration Options

| Option | Default | Purpose |
|--------|---------|---------|
| `enabled` | `true` | Enable cleanup features |
| `retentionDays` | `90` | Keep sessions for this many days before deleting |
| `archiveAfterDays` | `30` | Compress sessions older than this (future feature) |
| `maxStorageMB` | `500` | Hard limit per node |
| `keepMinSessions` | `100` | Always keep at least N most recent sessions |
| `autoCleanup` | `true` | Automatically cleanup when storage is critical |
| `warnAtPercent` | `80` | Warn user when storage exceeds this % of limit |

### Disable automatic cleanup

If you want manual control only:

```json
{
  "cleanup": {
    "autoCleanup": false
  }
}
```

### Never delete sessions

To keep all sessions forever:

```json
{
  "cleanup": {
    "sessions": {
      "retentionDays": -1
    }
  }
}
```

## Automatic Cleanup

When storage exceeds 95% of the limit during a `bozly run`, BOZLY automatically cleans oldest sessions until usage drops to 80%. This prevents complete disk exhaustion.

You can disable automatic cleanup in config if you prefer manual control.

## Data Retention Tiers

BOZLY uses a three-tier retention model:

### Tier 1: Active Sessions (0-30 days)
- **Status**: Uncompressed, fast access
- **Use case**: Recent work you might review
- **Action on cleanup**: Preserved unless explicitly targeted

### Tier 2: Archived Sessions (30-90 days)
- **Status**: Compressed to `.tar.gz` (future feature)
- **Use case**: Historical reference, space saving
- **Action on cleanup**: Can archive to save space

### Tier 3: Rotated Sessions (90+ days)
- **Status**: Deleted or moved to cold storage
- **Use case**: Very old data, rarely needed
- **Action on cleanup**: Automatically deleted

## Session Lookup After Cleanup

Sessions are indexed even after deletion, so you can still:

```bash
bozly logs -n 50        # See old sessions in history
bozly diff <session-id> # Compare even deleted sessions (decompresses from archive)
```

## Best Practices

### Daily users

Keep default settings (90-day retention, 500MB limit):

```bash
# Check monthly
bozly status --storage

# Cleanup as needed
bozly cleanup --preview
bozly cleanup --older-than 90d --force
```

### Heavy users (10+ sessions/day)

Reduce retention to 30-45 days:

```json
{
  "cleanup": {
    "sessions": {
      "retentionDays": 30,
      "maxStorageMB": 1000
    }
  }
}
```

### Archive-first approach

Compress old data instead of deleting:

```bash
bozly cleanup --archive --older-than 30d --force
```

(Archival feature coming in Phase 2.5)

## Troubleshooting

### "Storage usage is critical"

Your sessions folder is near the limit. Run:

```bash
bozly cleanup --preview
bozly cleanup --older-than 60d --force
```

### "Not in a node directory"

Use `--all` to cleanup all nodes:

```bash
bozly cleanup --all --older-than 90d --force
```

### "Add --force flag to proceed"

Cleanup is destructive. Always preview first:

```bash
bozly cleanup --preview
```

Then add `--force` to actually delete:

```bash
bozly cleanup --older-than 90d --force
```

### Need to recover deleted sessions?

Deleted sessions are removed permanently. However:
- Session metadata is indexed for history
- Backups are kept separately (`bozly remove` creates backups)

Always preview before cleanup to avoid surprises.

## How It Works

### Session Discovery

BOZLY finds sessions by scanning:
```
~/.bozly/sessions/{YYYY}/{MM}/{DD}/{uuid}/
```

Each session occupies one directory with 6 files.

### Storage Calculation

Uses `du -sb` to measure directory sizes, then:
1. Calculates active vs archived session breakdown
2. Checks backup directory size
3. Compares against configured limits
4. Reports usage percentage

### Safe Deletion

When cleaning:
1. Lists sessions by age (oldest first)
2. Respects `keepMinSessions` (never deletes if below minimum)
3. Deletes sessions atomically (full directory or none)
4. Reports results (sessions deleted, space freed)

## Next Steps

- **Phase 2a** (v0.4.5): Session archival (`--archive` flag)
- **Phase 2b** (v0.5.0): Automatic cleanup trigger integration
- **Phase 2c** (v0.5.0): Cold storage offloading (S3, GCS)

## Related Documentation

- [Session Recording](./SESSION-RECORDING.md) — How sessions are stored
- [Configuration](./CONFIGURATION.md) — Full config reference
- [Command Reference](./CLI.md) — All cleanup options

---

*Cleanup system introduced in Phase 2f (v0.4.0). For feedback or issues, see the [contributing guide](../CONTRIBUTING.md).*

---

## See Also

- [GETTING-STARTED.md](GETTING-STARTED.md) — Getting started with BOZLY
- [CONFIGURATION-REFERENCE.md](CONFIGURATION-REFERENCE.md) — Cleanup configuration
- [CLI-REFERENCE.md](CLI-REFERENCE.md) — Cleanup commands
- [API-REFERENCE.md](API-REFERENCE.md) — Cleanup API functions

*Last updated: 2025-12-27 (Session 122)*
