# BOZLY Suggestions System

## Overview

BOZLY's suggestion system analyzes past command sessions and recommends improvements to your commands, context, and configuration.

**Key Principle:** BOZLY suggests, you approve. The framework never auto-updates your commands.

---

## Using Command Suggestions

### Basic Usage

Analyze a command and see improvement suggestions:

```bash
bozly suggest <command>
```

Example:

```bash
$ bozly suggest daily

Analyzing sessions for command: daily...

Found 3 suggestions

🔴 HIGH PRIORITY
[1] Error Pattern Detected
    Command fails 60% of the time with provider 'claude'
    Error: Context length exceeded
    → Recommend: Reduce context by 30% or split into sub-commands

🟡 MEDIUM PRIORITY
[2] Context Optimization
    40% of context is unused in successful responses
    → Recommend: Remove unused sections from context.md

🟢 LOW PRIORITY
[3] Provider Recommendation
    Tested: claude (60% success), gpt (95% success)
    → Recommend: Switch to 'gpt' for better reliability

Apply [1]? (y/n)
```

### Command Options

```bash
bozly suggest [command] [options]
```

**Options:**

- `[command]` — Command name to analyze (optional). If not provided, BOZLY will ask
- `-v, --verbose` — Show detailed analysis data and statistics
- `--dry-run` — Preview suggestions without saving to history
- `--all` — Show all suggestions including low-confidence ones (default: confidence > 50%)

### Examples

```bash
# Analyze command with detailed stats
bozly suggest daily --verbose

# Preview suggestions without saving
bozly suggest journal --dry-run

# Show all suggestions including low-confidence
bozly suggest weekly --all

# Analyze a command
bozly suggest brainstorm
```

---

## Suggestion Types

### 1. Pattern Detection 🔴 HIGH

Detects recurring error patterns in failed sessions.

**Example:**
- "Command fails 60% of the time with provider 'claude'"
- Error: "Context length exceeded"

**Why:** If a command consistently fails with a specific provider or error type, BOZLY surfaces the pattern so you can address the root cause.

**Typical Actions:**
- Switch to a different provider
- Reduce context size
- Split into sub-commands
- Handle specific error cases

---

### 2. Context Optimization 🟡 MEDIUM

Identifies unused content in your command context.

**Example:**
- "40% of context is unused in successful responses"
- Potential savings: ~2,000 tokens per run

**Why:** Large contexts slow down responses and increase costs. BOZLY analyzes what context actually gets used and flags waste.

**Typical Actions:**
- Remove unused sections from context.md
- Split context into multiple parts
- Use command-specific context

---

### 3. Provider Recommendations 🟡 MEDIUM

Recommends which AI provider performs best for your command.

**Example:**
- claude: 60% success rate
- gpt: 95% success rate
- gemini: 70% success rate
- "Recommend: Switch to 'gpt' for better reliability"

**Why:** Different providers have different strengths. BOZLY tests your command across providers and recommends the best performer.

**Typical Actions:**
- Change `defaultProvider` in config
- Use provider-specific commands for critical workflows

---

### 4. Prompt Refinement 🟢 LOW

Suggests keywords or phrases that improve response quality.

**Example:**
- "Successful responses often include: actionable, concise, specific"
- "Consider adding 'be concise' to your prompt"

**Why:** Certain keywords consistently appear in your best responses. Adding them to your prompt can improve quality.

**Typical Actions:**
- Add suggested keywords to context
- Refine instructions in your command prompt
- Add examples of desired output

---

### 5. Command Splitting 🟢 LOW

Suggests breaking large, complex commands into focused sub-commands.

**Example:**
- Current: "daily" command (5,000 tokens of context, multiple tasks)
- Suggested: Split into "daily-overview" (2,000 tokens) and "daily-details" (2,500 tokens)

**Why:** Smaller, focused commands are easier to maintain, faster to execute, and more reusable.

**Typical Actions:**
- Create new sub-commands
- Refactor shared logic into utilities
- Improve command modularity

---

## Approval Flow

When you run `bozly suggest`, BOZLY presents each suggestion and asks for approval:

```bash
Apply suggestion 1 of 3? (Y/n) y

Preview changes:
< [old context size: 5000 tokens]
> [new context size: 3500 tokens]

Apply? (y/n) y
✓ Saved: Error Pattern Detected
  Action: Reduce context by 30% or split into sub-commands

Remaining suggestions [2] [3] - run 'bozly suggest daily' anytime
```

**What approval means:**
- Saves the suggestion to your suggestions history
- Marks it as reviewed by you
- Does NOT automatically apply changes
- You remain in control of your commands

---

## Suggestion History

All suggestions are logged in `.bozly/suggestions-history.json`:

```json
{
  "version": "1.0",
  "created": "2025-12-24T16:30:00Z",
  "updated": "2025-12-24T16:35:00Z",
  "suggestions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "commandName": "daily",
      "type": "pattern",
      "priority": "high",
      "title": "Error Pattern Detected",
      "description": "Command fails 60% with provider 'claude'",
      "analysis": {
        "samplesAnalyzed": 20,
        "confidence": 0.85,
        "data": { "failureRate": 0.6, "provider": "claude" }
      },
      "recommendation": {
        "action": "Switch provider or reduce context",
        "rationale": "Provider 'claude' has low success rate"
      },
      "impact": {
        "expectedImprovement": "+35% success rate",
        "riskLevel": "low",
        "reversible": true
      },
      "createdAt": "2025-12-24T16:30:00Z",
      "appliedAt": "2025-12-24T16:35:00Z"
    }
  ]
}
```

This history serves as:
- **Audit trail**: Track what was suggested and when
- **Learning log**: See patterns in your command usage
- **Decision record**: Remember why you accepted/rejected suggestions

---

## Safety Model

### Three-Tier Safety

BOZLY respects the three-tier safety model:

```
┌─────────────────────────────────────┐
│ Tier 1: Framework Code              │
│ (BOZLY core, never changes)         │
└─────────────────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│ Tier 2: Global Config               │
│ (~/.bozly/, user-controlled)        │
└─────────────────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│ Tier 3: Node Config & Commands      │
│ (./node/.bozly/, user-owned)        │
└─────────────────────────────────────┘
```

**Your commands are in Tier 3 (user-owned).** BOZLY never modifies them without your approval.

### Key Constraints

1. ✅ **Never auto-update** — Suggestions are logged, not automatically applied
2. ✅ **Show what would change** — You always see before/after previews
3. ✅ **Require explicit approval** — Interactive prompts for each suggestion
4. ✅ **Full audit trail** — All suggestions logged with timestamps
5. ✅ **Reversible** — Most suggestions can be undone

---

## How Suggestions Work

### Analysis Algorithm

When you run `bozly suggest <command>`:

1. **Load Sessions** — Find the last 20 sessions of that command
2. **Analyze Patterns** — Run 5 analyzer modules:
   - Error pattern detection
   - Context optimization
   - Provider performance
   - Prompt refinement
   - Command splitting
3. **Generate Suggestions** — Create 1-3 actionable suggestions
4. **Filter & Sort** — Remove low-confidence suggestions, sort by priority
5. **Present & Approve** — Show suggestions and ask for approval

### Confidence Scoring

Each suggestion has a confidence score (0-1):

- **High (0.8-1.0)** — Strong pattern detected (e.g., 80%+ failure rate)
- **Medium (0.5-0.8)** — Clear evidence (e.g., 3+ sessions analyzed)
- **Low (<0.5)** — Weak signal (only shown with `--all` flag)

---

## Example Workflows

### Workflow 1: Fix a Failing Command

```bash
$ bozly suggest daily

Found 1 suggestion

🔴 HIGH PRIORITY
[1] Error Pattern Detected
    Command fails 60% of the time with provider 'claude'

Apply [1]? (y/n) y

✓ Saved suggestion to: ~/.bozly/nodes/music/.bozly/suggestions-history.json

Next steps:
- Review your command's context or split it into smaller commands
- Try with a different provider: bozly config set ai.defaultProvider gpt
- Test the updated command: bozly run daily
```

### Workflow 2: Optimize a Slow Command

```bash
$ bozly suggest journal --verbose

Found 2 suggestions

🟡 MEDIUM PRIORITY
[1] Context Optimization
    40% of context unused (4,000 of 10,000 tokens)
    Data: context optimization: 40%, avg output: 200 tokens

Apply [1]? (y/n) y

Next steps:
1. Open: ~/.bozly/nodes/music/.bozly/context.md
2. Review and remove unused sections
3. Re-run: bozly suggest journal
4. Test: bozly run journal
```

### Workflow 3: Dry-Run Preview

```bash
$ bozly suggest brainstorm --dry-run

Found 2 suggestions

🟡 MEDIUM PRIORITY
[1] Provider Recommendation
    Provider 'gpt' performs 30% better than 'claude'

(No suggestions saved - dry-run mode)

Next time you're ready, run:
bozly suggest brainstorm
```

---

## Best Practices

### When to Trust Suggestions

✅ Trust suggestions when:
- Confidence is high (>80%)
- Pattern is clear (10+ sessions analyzed)
- Multiple sessions show the same issue
- The suggested fix is reversible

⚠️ Be cautious when:
- Confidence is low (<50%)
- Few sessions analyzed
- Your use case is unique
- The suggested change is irreversible

### Using Suggestions Effectively

1. **Run regularly** — Analyze commands every 5-10 runs to catch patterns early
2. **Review confidence** — Focus on high-confidence suggestions first
3. **Test changes** — After applying a suggestion, test your command
4. **Document decisions** — Add notes to suggestion history if you reject one
5. **Monitor results** — Check if the suggestion improved your workflow

### Don't

❌ Don't:
- Apply suggestions without reviewing them
- Use `--dry-run` as a decision-making tool (always review before applying)
- Trust low-confidence suggestions for critical commands
- Change multiple things at once (test one suggestion at a time)

---

## Integration with Other Features

### With Hooks

Suggestions can be generated as part of your workflow:

```bash
# Hook: post-session
bozly suggest $COMMAND --dry-run | grep "HIGH PRIORITY" && notify "New suggestions available"
```

### With Workflows

Chain suggestions into your workflow:

```json
{
  "id": "weekly-review",
  "steps": [
    {
      "id": "suggest-daily",
      "command": "suggest daily"
    },
    {
      "id": "suggest-journal",
      "command": "suggest journal"
    }
  ]
}
```

### With Memory System

Suggestions are logged alongside session memory:

```bash
$ bozly logs --memory
# Shows memories + suggestions for each session
```

---

## Troubleshooting

### "No suggestions found"

This means:
- Command has <3 sessions
- No clear patterns detected
- All analyzers returned low-confidence results

**Fix:** Run the command a few more times, then try again

### "Confidence is too low"

Suggestions below 50% confidence are hidden by default.

**Fix:** Use `--all` to see all suggestions (including low-confidence ones)

### "Apply suggestion modified my command"

This shouldn't happen. Suggestions are logged to history, not auto-applied.

**Check:**
- Review `.bozly/suggestions-history.json`
- Run `git diff` to see what changed
- Manually revert if needed

---

## Phase 2k Status

- ✅ Suggestion engine with 5 analyzer types
- ✅ CLI command: `bozly suggest`
- ✅ Interactive approval flow
- ✅ Suggestion history tracking
- ✅ Full audit trail with timestamps
- ✅ 22 unit tests (100% passing)
- ✅ Documentation (this file)

**Next:** Phase 2j - Cross-Node Search (enable searching across multiple nodes at once)

---

## See Also

- [BOZLY-RESPONSIBILITY-MODEL.md](./BOZLY-RESPONSIBILITY-MODEL.md) — Why BOZLY never auto-updates
- [COMMANDS.md](./COMMANDS.md) — Creating and managing commands
- [CLI.md](./CLI.md) — All CLI commands reference
- [MEMORY.md](./MEMORY.md) — Session memory system

---

*Phase 2k: Command Suggestions & Learning*
*Last updated: Session 99 (2025-12-24)*
