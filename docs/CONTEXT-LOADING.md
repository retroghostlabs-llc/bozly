# Context Loading in BOZLY

Context loading is a core BOZLY feature that provides AI assistants with vault-specific knowledge. When you run a command, BOZLY automatically loads context from your vault and prepares it for the AI provider.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  User runs: bozly run daily                                     │
├─────────────────────────────────────────────────────────────────┤
│  BOZLY loads:                                                   │
│  1. Vault metadata (name, type, path, provider)                │
│  2. Vault context from .bozly/context.md                       │
│  3. Available commands from .bozly/commands/                   │
│  4. The specific command content (daily.md)                    │
├─────────────────────────────────────────────────────────────────┤
│  Builds prompt:                                                 │
│  [Vault Context] + [Command Content]                           │
├─────────────────────────────────────────────────────────────────┤
│  Executes:                                                      │
│  Pipes prompt to AI CLI (claude, gpt, gemini, ollama)          │
└─────────────────────────────────────────────────────────────────┘
```

## Context Structure

When BOZLY generates context, it combines:

```markdown
---
vault: vault-name
type: vault-type
path: /path/to/vault
provider: claude
---

# Vault Context Content

[Your .bozly/context.md file goes here]

## Available Commands

- `/daily` — Log daily notes
- `/weekly` — Weekly review
```

## The Context Module (`context.ts`)

### Main Function: `generateContext()`

```typescript
import { generateContext } from './core/context.js';
import { getCurrentVault } from './core/vault.js';

const vault = await getCurrentVault();
const context = await generateContext(vault, {
  provider: 'claude',
  includeCommands: true
});
```

### Options

```typescript
interface ContextOptions {
  provider?: string;        // AI provider (default: 'claude')
  includeCommands?: boolean; // Include available commands (default: true)
  includeHistory?: boolean;  // Include session history (future)
}
```

## Creating Vault Context

Your vault's `.bozly/context.md` file tells the AI about your domain:

```markdown
# My Music Vault

## Purpose
Track album discoveries and reviews.

## Methodology
Albums are rated on:
- Personal enjoyment (1-10)
- Technical quality (1-10)
- Emotional impact (1-10)

## Guidelines
- Be honest in ratings
- Include listening date
- Link to album on Spotify

## Example Format
**Artist:** Radiohead
**Album:** Kid A
**Personal Score:** 9
**Technical Score:** 9
**Emotional Score:** 10
```

### Best Practices

1. **Be specific** — The more detail, the better the AI understands your domain
2. **Include examples** — Show the AI what good output looks like
3. **Set guidelines** — Explain your methodology and preferences
4. **Keep it focused** — Stick to domain-specific information
5. **Update periodically** — Keep context fresh as your domain evolves

## Example Workflows

### Daily Music Logging

**Command:** `bozly run daily`
**What Happens:**
1. Loads vault context (your music domain knowledge)
2. Lists available commands (`/daily`, `/weekly-roll`, `/complete-album`)
3. Sends command prompt to Claude
4. Returns album logging suggestions

**Dry-run example:**
```bash
$ bozly run daily --dry

Command: daily
Provider: claude
Context size: 633 chars

Prompt:
---
vault: music-vault
type: music
path: ~/music-vault
provider: claude
---

# Music Vault

[vault context...]

## Available Commands

- `/daily` — Log daily listening notes
- `/weekly-roll` — Select album for the week

---

## Command: /daily

[command content...]
```

### With Different AI Provider

```bash
$ bozly run daily --ai gpt

# Same flow but using GPT instead of Claude
```

### Without Vault Context

```bash
$ bozly run daily --no-context

# Just the command, no vault context
# Useful for generic commands
```

## How Commands Use Context

When a command runs, the context is prepended to the command prompt:

**Input (context.md + command.md):**
```markdown
[Vault metadata and context]

---

## Command: /daily

You are a music curator. Log today's album discoveries:
- Artist
- Album
- Ratings (personal, technical, emotional)
- Notes
```

**Result:** AI returns album log entries formatted according to your context

## Testing Context Loading

Use dry-run mode to see exactly what will be sent to the AI:

```bash
# See what would be executed
$ bozly run daily --dry

# Compare with and without context
$ bozly run daily --dry --no-context
```

## Context Sizes

Typical context sizes:
- **Minimal context:** 200-300 chars (bare minimum)
- **Standard context:** 500-800 chars (recommended)
- **Rich context:** 1000-1500 chars (detailed methodology)
- **Maximum recommended:** 2000 chars (avoid token overhead)

Use `bozly run <command> --dry` to check your context size.

## Future: Session Context

In Phase 2, context will include:
- Previous session history
- Model outputs and ratings
- User feedback patterns
- Learned preferences

This enables:
- Consistency across sessions
- Learning from past decisions
- Cross-command context awareness

## Troubleshooting

### Context not loading?

```bash
# Check vault structure
$ ls .bozly/

# Check context file exists
$ cat .bozly/context.md

# Verify with dry-run
$ bozly run <command> --dry
```

### Context too large?

```bash
# Check context size
$ bozly run <command> --dry | grep "Context size"

# If too large, simplify .bozly/context.md
# Aim for 500-800 chars
```

### Commands not appearing?

```bash
# Check commands directory
$ ls .bozly/commands/

# Verify command has description
$ head -5 .bozly/commands/daily.md
```

## API Reference

### generateContext()

```typescript
/**
 * Generate context for AI consumption
 * 
 * Creates a complete context document by combining:
 * 1. Vault metadata (name, type, path, provider)
 * 2. Vault context content from .bozly/context.md
 * 3. Available commands (if includeCommands option is true)
 */
export async function generateContext(
  vault: VaultInfo,
  options?: ContextOptions
): Promise<string>
```

**Example:**
```typescript
import { generateContext } from './core/context.js';
import { getCurrentVault } from './core/vault.js';

const vault = await getCurrentVault();
const context = await generateContext(vault, {
  provider: 'gpt',
  includeCommands: true
});

console.log(context);
```

### getCommandList()

Internal function that discovers and lists available commands.

```typescript
async function getCommandList(
  bozlyPath: string
): Promise<Array<{ name: string; description: string }>>
```

### extractDescription()

Extracts command description from YAML frontmatter or content.

```typescript
function extractDescription(content: string): string
```

## Session 41 Summary

✅ **Context Loading Implementation:**
- `context.ts` generates vault context by combining metadata + context.md + commands
- Full integration with `runVaultCommand()` in commands.ts
- Options for including/excluding context (--no-context flag)
- Comprehensive logging for debugging

✅ **Testing:**
- Context generation verified: 633 chars for music vault
- Command description extraction working
- Dry-run mode shows full prompt
- --no-context flag functional

✅ **Key Features:**
- Automatic vault discovery
- Metadata injection (vault name, type, path, provider)
- Command list generation with descriptions
- YAML frontmatter and markdown parsing

**Next Session (42):** Domain Models (Pattern 7) + Command Execution Pipeline

---

*Last updated: Session 41 (2025-12-19)*
