# BOZLY Diagnostics Guide

`bozly diagnose` is your framework health check tool. It verifies everything is set up correctly and can automatically fix common issues.

---

## Quick Overview

**What:** Framework health checker that validates your BOZLY installation
**When:** Use whenever something seems off, or during initial setup
**Why:** Prevents cryptic errors by catching configuration issues early
**How:** One command that checks 8 critical components

---

## When You'll Use It

### 🆕 After First Install
```bash
cd ~/my-vault
bozly init
bozly diagnose  # Verify everything is set up
```

### 🔍 Troubleshooting Issues
When commands fail with strange errors:
```bash
bozly diagnose --verbose
```

### 🔧 During Setup/Configuration
After adding providers or vaults:
```bash
bozly diagnose --fix  # Auto-fix any issues found
```

### 📋 Pre-Production Checklist
Before running important commands:
```bash
bozly diagnose  # Should show all ✓
```

---

## Command Usage

### Basic Check
```bash
bozly diagnose
```

Shows 8 quick checks. If all pass, your BOZLY is healthy:

```
✓ framework-install: BOZLY framework is installed
✓ global-config: Global config found
✓ global-registry: Global registry found
✓ current-vault: In vault: my-music-vault
✓ vault-structure: Vault structure is valid
✓ context-size: Context file size is good (12.5KB)
✓ providers: Providers available: Claude, ChatGPT
✓ vault-registry: Vault is registered (ID: abc123)

✓ All checks passed! Framework is healthy.
```

### Detailed Output
```bash
bozly diagnose --verbose
```

Shows full details for each check:

```
✓ global-config: Global config found
  Size: 382 bytes

✓ providers: Providers available: Claude, ChatGPT, Gemini
  3 provider(s) detected

✓ vault-registry: Vault is registered (ID: L1VzZXJzL3NiZXZl)
  Path: /Users/you/music
```

### Auto-Fix Issues
```bash
bozly diagnose --fix
```

Automatically fixes any problems found and re-runs diagnostics:

```
Attempting to fix issues...

Fix Results:
✓ vault-registry: Fixed successfully
✓ global-config: Already passing, no fix needed

After Fixes:
Summary: 8/8 checks passed

✓ All issues fixed! Framework is healthy.
```

---

## What Gets Checked

### 1. Framework Installation ✓
**Checks:** BOZLY is installed and accessible
**Fixes:** (None - this is foundational)
**If it fails:** Reinstall BOZLY: `npm install -g @retroghostlabs/bozly`

### 2. Global Config
**Checks:** `~/.bozly/bozly-config.json` exists
**Fixes:** Creates with sensible defaults
**What it contains:** Default AI provider, theme, timezone settings

### 3. Global Registry
**Checks:** `~/.bozly/bozly-registry.json` exists
**Fixes:** Creates empty registry
**What it tracks:** All your registered vaults

### 4. Current Vault
**Checks:** You're in a valid vault directory (has `.bozly/`)
**Fixes:** (None - use `bozly init` to create vault)
**If it fails:** Run from vault directory: `cd ~/my-vault && bozly diagnose`

### 5. Vault Structure
**Checks:** Vault has required files:
  - `.bozly/config.json` (vault configuration)
  - `.bozly/context.md` (AI context)
  - `.bozly/sessions/` (directory for session history)

**Fixes:** Creates missing directories and files with defaults
**What it ensures:** Vault is properly initialized

### 6. Context File Size
**Checks:** Context file is reasonable size (<25KB)
**Fixes:** (None - you need to trim context)
**Why it matters:** Large contexts slow down AI responses

**If context is too large:**
```bash
# Edit your context file to be more concise
bozly context --edit

# Then check again
bozly diagnose
```

### 7. Provider Installation
**Checks:** At least one AI provider CLI is installed (Claude, GPT, Gemini, or Ollama)
**Fixes:** (None - install providers manually)
**Why it matters:** You need a provider to run commands

**To install Claude CLI:**
```bash
npm install -g @anthropic-ai/claude-cli
claude login
bozly diagnose
```

### 8. Vault Registration
**Checks:** Your vault is registered in global registry
**Fixes:** Registers the vault automatically
**Why it matters:** Allows `bozly list` to find your vault

---

## Real-World Examples

### Example 1: Fresh Install
```bash
$ bozly init
$ bozly diagnose
⚠ 1 issue(s) detected.
✗ vault-registry: Vault is not registered in global registry

$ bozly diagnose --fix
✓ vault-registry: Fixed successfully
✓ All issues fixed! Framework is healthy.

$ bozly list
▪ my-vault  (registered)
```

### Example 2: Context Too Large
```bash
$ bozly diagnose
✗ context-size: Context file is too large (38.2KB)

$ cat .bozly/context.md | wc -c
38200

$ bozly context --edit
# ... trim down the content ...

$ bozly diagnose
✓ context-size: Context file size is good (19.5KB)
✓ All checks passed! Framework is healthy.
```

### Example 3: Missing Provider
```bash
$ bozly diagnose
✗ providers: No AI providers installed

$ npm install -g @anthropic-ai/claude-cli
$ claude login

$ bozly diagnose
✓ providers: Providers available: Claude
✓ All checks passed! Framework is healthy.
```

### Example 4: Troubleshooting Failed Command
```bash
# Command runs but seems wrong
$ bozly run my-command --error-msg

# Run diagnostics in verbose mode to see what's happening
$ bozly diagnose --verbose

# Output might reveal missing context or bad configuration
```

---

## Exit Codes

The `diagnose` command exits with:

- **0** = All checks passed ✓
- **1** = One or more checks failed ✗

This is useful in scripts:

```bash
# Only run commands if framework is healthy
if bozly diagnose > /dev/null; then
    bozly run my-command
else
    echo "Please fix framework issues first"
    bozly diagnose --fix
fi
```

---

## Tips & Best Practices

### Run Before Important Work
```bash
# Good practice: verify framework before running important commands
bozly diagnose && bozly run daily-review
```

### Use in CI/CD
```bash
# In automated scripts, use exit code to gate workflow
bozly diagnose --fix
if [ $? -ne 0 ]; then
    echo "Framework check failed"
    exit 1
fi
```

### Regular Health Checks
```bash
# Weekly health check as part of your routine
bozly diagnose --verbose | grep -v "✓"  # Show only failures
```

### Debugging
```bash
# Show everything with full details
bozly diagnose --verbose

# Enable debug logs for more info
BOZLY_DEBUG=true bozly diagnose
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Not in a vault" | Running from wrong directory | `cd` to vault directory |
| "No providers installed" | Claude CLI not installed | `npm install -g @anthropic-ai/claude-cli && claude login` |
| "Context too large" | Context file >25KB | Edit `.bozly/context.md` to be more concise |
| "Vault not registered" | New vault not added to registry | `bozly diagnose --fix` |
| "Config missing" | Vault not properly initialized | `bozly init --force` |

---

## Architecture & Design

**Why We Built This:**
1. **Error Prevention** — Catch issues before they cause cryptic failures
2. **Self-Healing** — Auto-fix common problems without user intervention
3. **Transparency** — Clear visibility into framework health
4. **Debugging** — Verbose mode helps troubleshoot issues

**Part of Phase B:**
The `diagnose` command is one of 10 core framework commands being built to stabilize BOZLY before v1.0 release.

---

## Related Commands

- `bozly init` — Initialize a vault
- `bozly list` — List registered vaults
- `bozly status` — Show current vault status
- `bozly context` — View/edit vault context
- `bozly config` — Manage settings

---

## Next Steps

1. **After seeing issues:** Run `bozly diagnose --fix` to auto-fix
2. **If issues persist:** Run `bozly diagnose --verbose` for details
3. **Still stuck?** Check [Troubleshooting Guide](./TROUBLESHOOTING.md)
4. **Report bugs:** [GitHub Issues](https://github.com/RetroGhostLabs/bozly/issues)

---

## For Vault Operators

If you're managing multiple vaults:

```bash
# Check all vaults quickly
for vault in ~/music ~/projects ~/journal; do
    echo "Checking $vault..."
    bozly diagnose $vault --verbose
    echo "---"
done

# Or auto-fix all
for vault in ~/.bozly/vaults/*; do
    bozly diagnose $vault --fix
done
```

---

## See Also

- [Getting Started Guide](./GETTING-STARTED.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Configuration Reference](./CONFIGURATION.md)
- [CLI Reference](./CLI-REFERENCE.md)
