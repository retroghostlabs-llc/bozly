# BOZLY Versioning Guide

**Pattern 4: Versioning Over Mutation**

A guide to version tracking, history management, and model versioning in BOZLY.

---

## Overview

BOZLY implements **Pattern 4 (Versioning Over Mutation)** from LogicFlows design principles: Never change existing work, always version it instead.

This guide covers:
- Semantic versioning for models and vaults
- Automatic version tracking for context and commands
- Viewing and managing version history
- Model changelog tracking
- Version compatibility checking

---

## Quick Start

### Show Framework Version

```bash
bozly version
```

Output:
```
BOZLY Framework Version

  Version: v0.3.0-alpha.1
  Node.js: v22.20.0
  Platform: darwin
  Home: /Users/sbevere
```

### Show Vault Version Information

```bash
cd ~/my-vault
bozly version --vault
```

Output:
```
Vault Version Information: my-vault

Vault Version: 0.1.0
Framework Version: 0.3.0-alpha.1
Last Updated: 2025-12-20T23:58:22.393Z

File Versions:
  context.md: tracked (f1e3d4a2)

Model Versions:
  triple-score: v1.0.0 (a8d4f2c1)
    Latest changes:
    • Initial release
```

### Show Model Version History

```bash
bozly version --model triple-score
```

Output:
```
Model Version Information: triple-score

  Current Version: v1.0.0
  Hash: a8d4f2c1e3f5b4d2...
  Last Updated: 2025-12-20T23:58:22.393Z
  Description: Triple-score rating system for music albums

  Changelog:

    Version 1.0.0 - 2025-12-20
      • Initial release with three dimensions
```

### View Full Model Changelog

```bash
bozly version --model triple-score --history
```

Shows the complete version history with all changes for each version.

### Show All Version Information

```bash
bozly version --all
```

Shows framework version, current vault version, and all models in the vault.

---

## How Version Tracking Works

### Automatic Version Tracking

BOZLY automatically tracks versions for:

1. **Models** (`.bozly/models/*.yaml`)
   - Tracked when models are loaded
   - Includes version field and changelog
   - Hash computed for change detection

2. **Context Files** (`.bozly/context.md`)
   - Tracked when context is generated
   - Hash computed for change detection
   - Tracked in vault version history

3. **Commands** (`.bozly/commands/*.md`)
   - Indirectly tracked via version history
   - Hash stored for change detection

### Version History File

Each vault maintains `.bozly/.versions.json` which contains:

```json
{
  "vaultId": "music-vault",
  "vaultVersion": "0.1.0",
  "created": "2025-12-20T23:58:22.393Z",
  "lastUpdated": "2025-12-20T23:58:22.393Z",
  "frameworkVersion": "0.3.0-alpha.1",
  "files": [
    {
      "file": "context.md",
      "hash": "f1e3d4a2...",
      "timestamp": "2025-12-20T23:58:22.393Z"
    }
  ],
  "models": [
    {
      "name": "triple-score",
      "currentVersion": "1.0.0",
      "hash": "a8d4f2c1...",
      "timestamp": "2025-12-20T23:58:22.393Z",
      "changelog": [...]
    }
  ]
}
```

---

## Semantic Versioning

BOZLY uses [Semantic Versioning (SemVer)](https://semver.org/) for all versioned components.

### Format

```
MAJOR.MINOR.PATCH[-PRERELEASE]
```

Examples:
- `1.0.0` — First major release
- `1.2.3` — Patch release
- `2.0.0-alpha.1` — Alpha prerelease

### Version Bumping Rules

- **MAJOR** — Breaking changes, incompatible models, schema changes
- **MINOR** — New features, dimensions, metrics (backward compatible)
- **PATCH** — Bug fixes, clarifications, improvements (no behavior change)

### Example: Model Versioning

```yaml
# models/rating-system.yaml
name: Music Rating System
version: 1.2.0
description: Rate music on multiple dimensions

changelog:
  - version: 1.2.0
    date: 2025-12-20
    changes:
      - Added 'Production Quality' dimension
      - Adjusted weights for better balance
      - Fixed scoring scale documentation

  - version: 1.1.0
    date: 2025-12-15
    changes:
      - Added threshold recommendations
      - Improved description clarity

  - version: 1.0.0
    date: 2025-12-10
    changes:
      - Initial release with three dimensions
```

---

## Managing Model Versions

### Creating a New Model Version

1. **Update your model file** (`models/my-model.yaml`)
   ```yaml
   version: 1.1.0
   # ... other fields ...
   ```

2. **Add changelog entry**
   ```yaml
   changelog:
     - version: 1.1.0
       date: 2025-12-20
       changes:
         - What changed
         - What improved
   ```

3. **Next time you run a command**, the new version is automatically tracked:
   ```bash
   bozly run daily  # Loads and tracks your model
   ```

### Checking Model Versions

```bash
# Show specific model version
bozly version --model my-model

# Show with full history
bozly version --model my-model --history
```

### Version Compatibility

Check if a model version meets requirements:

```typescript
import { isVersionCompatible } from '@bozly/core/versions';

const compatible = isVersionCompatible('1.2.0', '1.0.0');
// true - version 1.2.0 is compatible with minimum 1.0.0
```

---

## Version History Structure

### File Versions

Each tracked file includes:
- **file** — Relative path (e.g., `context.md`, `commands/daily.md`)
- **hash** — SHA256 hash of content (for change detection)
- **timestamp** — When tracked (ISO 8601)
- **version** — Semantic version (optional, for versioned files)
- **changes** — List of changes (optional)

### Model Versions

Each model includes:
- **name** — Model identifier
- **currentVersion** — Latest semver
- **hash** — Content hash
- **timestamp** — Last update
- **changelog** — Full history with dates and changes

---

## Version Workflows

### Workflow 1: Tracking Context Changes

```bash
# Generate context (automatically tracks version)
bozly context --provider claude

# Later: Check if context changed
bozly version --vault
```

### Workflow 2: Model Evolution

```bash
# Create initial model v1.0.0
cat > ~/.bozly/models/scoring.yaml << EOF
name: Scoring Model
version: 1.0.0
dimensions: [...]
changelog:
  - version: 1.0.0
    date: 2025-12-20
    changes:
      - Initial release
EOF

# Load model (tracked automatically)
bozly run daily

# Later: Update to v1.1.0
# Edit ~/.bozly/models/scoring.yaml, bump version and changelog

# Track automatically on next run
bozly run daily
```

### Workflow 3: Monitoring Vault Versions

```bash
# Check vault status
bozly version --vault

# See all information
bozly version --all

# Check specific model
bozly version --model scoring --history
```

---

## Version Files Format

### .versions.json Structure

```typescript
interface VaultVersionHistory {
  vaultId: string;              // Machine-readable vault ID
  vaultVersion: string;         // Semantic version (e.g., "0.1.0")
  created: string;              // ISO 8601 timestamp
  lastUpdated: string;          // ISO 8601 timestamp
  frameworkVersion: string;     // BOZLY framework version
  files: VersionEntry[];        // File version history
  models: ModelVersionInfo[];   // Model version tracking
}

interface VersionEntry {
  file: string;                 // Relative path
  hash: string;                 // SHA256 hash
  timestamp: string;            // ISO 8601
  version?: string;             // Semver (optional)
  changes?: string[];           // Change list (optional)
}

interface ModelVersionInfo {
  name: string;                 // Model name
  currentVersion: string;       // Latest semver
  hash: string;                 // Content hash
  timestamp: string;            // Last update
  changelog?: ChangelogEntry[]; // Full history
}
```

---

## Change Detection

### Detecting File Changes

BOZLY uses SHA256 hashing to detect changes:

```bash
# Check if context.md changed
bozly version --vault

# Hash comparison happens automatically
```

### How It Works

1. **File is loaded** → SHA256 hash computed
2. **Compared to history** → If different, file has changed
3. **Automatically tracked** → New hash stored
4. **Displayed in version info** → Shows current hash

---

## Use Cases

### Use Case 1: Model Evolution

Track how your scoring model evolves over time:

```bash
# v1.0.0: Initial release
bozly run daily

# v1.1.0: Added new dimension
# (update file and bump version)
bozly run daily

# Later: View evolution
bozly version --model scoring --history
```

### Use Case 2: Context Stability

Ensure your vault context doesn't accidentally change:

```bash
# Check context version
bozly version --vault

# See context hash
# If hash changes unexpectedly, track what changed
```

### Use Case 3: Team Coordination

Share model versions across the team:

```bash
# Your vault: model v1.2.0
bozly version --model scoring

# Team member's vault: model v1.1.0
# Understand version difference and compatibility
```

### Use Case 4: Vault Migration

Version history helps with vault backups and migration:

```bash
# Before upgrading
bozly version --vault

# Track what was versioned
# Ensure nothing important is lost during migration
```

---

## Best Practices

### 1. Always Version Models

Include changelog with every model:

```yaml
name: My Model
version: 1.0.0
changelog:
  - version: 1.0.0
    date: 2025-12-20
    changes:
      - Initial release
```

### 2. Use Semantic Versioning Correctly

- `1.0.0` → First release
- `1.1.0` → New feature added
- `1.0.1` → Bug fix
- `2.0.0` → Breaking change

### 3. Document Changes in Changelog

```yaml
changelog:
  - version: 1.1.0
    date: 2025-12-20
    changes:
      - Added "Energy" dimension (10% weight)
      - Increased "Instrumentation" weight from 20% to 30%
      - Fixed typo in "Originality" description
```

### 4. Monitor Version History

Periodically review:

```bash
bozly version --all
```

Ensures you're aware of vault evolution.

### 5. Share Version Info in Backups

When backing up vaults:

```bash
# Capture version info
bozly version --vault > vault-versions.txt

# Include in backup
# So you can restore knowing exact versions
```

---

## Command Reference

### bozly version

Show framework version.

```bash
bozly version
```

### bozly version --vault

Show version information for current vault.

```bash
bozly version --vault
```

### bozly version --model <name>

Show specific model version.

```bash
bozly version --model triple-score
```

### bozly version --model <name> --history

Show full model version history.

```bash
bozly version --model triple-score --history
```

### bozly version --all

Show all version information (framework, vault, models).

```bash
bozly version --all
```

---

## Troubleshooting

### No version history found

**Problem:** `bozly version --vault` shows "No version history found"

**Cause:** You haven't run any commands in this vault yet

**Solution:** Run a command to initialize version tracking:

```bash
bozly run any-command
```

### Model not found

**Problem:** `bozly version --model unknown` returns "Model not found"

**Cause:** Model file doesn't exist or path is wrong

**Solution:** Check model files:

```bash
ls .bozly/models/
```

### Version history corrupted

**Problem:** `.versions.json` is invalid

**Cause:** Manual editing or partial write

**Solution:** Delete `.versions.json` and let BOZLY recreate it:

```bash
rm .bozly/.versions.json
bozly run any-command
```

---

## Phase 2+ Roadmap

### Planned Features

- **Version Compatibility Checking** — Warn if model version might be incompatible
- **Automatic Version Bumping** — CLI flag to auto-bump version on changes
- **Version Diff** — Show what changed between versions
- **Version Rollback** — Revert to previous version (with safeguards)
- **Cross-Vault Version Tracking** — Monitor model versions across vaults

### Contributing Versions

Have ideas for versioning features? Please share!

---

## See Also

- [SESSION-RECORDING-GUIDE.md](./SESSION-RECORDING-GUIDE.md) — Pattern 2: Transparency
- [DOMAIN-MODELS.md](./DOMAIN-MODELS.md) — Pattern 7: Domain Models
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design overview
- [Semantic Versioning](https://semver.org/) — Official SemVer spec
