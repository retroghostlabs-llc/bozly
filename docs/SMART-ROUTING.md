# Smart Routing Guide

**Version:** v0.4.0+
**Phase:** 2c (Automation & Integrations)

Smart Routing allows you to automatically select the right AI provider for each command based on your vault and command configuration. Instead of manually specifying `--ai` every time, BOZLY intelligently routes to the best provider for the task.

---

## Quick Start

### Basic Usage: Per-Vault Provider

Configure your vault to prefer a specific AI provider:

```bash
cd ~/music-vault
bozly config set provider claude      # Use Claude for all commands in this vault
bozly config set model sonnet         # Use Claude Sonnet model

bozly run daily                        # Uses claude (vault default)
bozly run daily --ai gpt              # Override to gpt
```

**Edit `.bozly/config.json` directly:**

```json
{
  "name": "music-vault",
  "provider": "claude",
  "model": "sonnet"
}
```

### Advanced: Per-Command Providers

Different commands can use different providers:

```json
{
  "name": "music-vault",
  "provider": "claude",
  "model": "sonnet",
  "commands": {
    "brainstorm": {
      "provider": "claude",
      "model": "sonnet"
    },
    "format-lyrics": {
      "provider": "ollama",
      "model": "llama3"
    },
    "quick-check": {
      "provider": "gpt",
      "model": "gpt-4o-mini"
    }
  }
}
```

Now each command uses its configured provider:

```bash
bozly run brainstorm      # Uses claude (command config)
bozly run format-lyrics   # Uses ollama (command config)
bozly run quick-check     # Uses gpt (command config)
bozly run daily           # Uses claude (vault default, no command config)
bozly run daily --ai gpt  # Override to gpt (CLI wins)
```

---

## Provider Resolution Hierarchy

BOZLY follows a clear priority hierarchy when deciding which provider to use:

```
Highest Priority ⬇️

1. CLI Flag                  --ai claude
2. Command-Level Config      commands.brainstorm.provider
3. Vault-Level Config        .bozly/config.json (provider field)
4. Global Config Default     ~/.bozly/bozly-config.json (defaultAI)
5. Hardcoded Default         "claude"

Lowest Priority ⬆️
```

**Examples:**

```bash
# Uses ollama (CLI flag wins all)
bozly run daily --ai ollama

# Uses gpt (command config, no CLI flag)
bozly run review

# Uses claude (vault default, no command/CLI override)
bozly run new-command

# Uses global default (no vault override)
bozly run command              # In vault with no provider config

# Uses claude (hardcoded default)
bozly run command              # In vault with no config anywhere
```

---

## Use Cases & Examples

### Music Production Vault (Creative Focus)

Use Claude for complex creative tasks, Ollama for quick text formatting:

```json
{
  "name": "music-vault",
  "type": "custom",
  "provider": "claude",
  "model": "sonnet",
  "commands": {
    "brainstorm-lyrics": {
      "provider": "claude",
      "model": "sonnet"
    },
    "analyze-mood": {
      "provider": "claude",
      "model": "haiku"
    },
    "format-notes": {
      "provider": "ollama",
      "model": "llama3"
    },
    "quick-fix": {
      "provider": "gpt",
      "model": "gpt-4o-mini"
    }
  }
}
```

**Usage:**

```bash
bozly run brainstorm-lyrics   # Claude Sonnet for creative work
bozly run analyze-mood        # Claude Haiku for quick analysis
bozly run format-notes        # Ollama for local processing
bozly run quick-fix           # GPT-4o-mini for simple edits
```

**Benefits:**
- Right AI for each task
- Cost optimization (local Ollama for simple tasks)
- Creative tasks get powerful models
- Fast iteration with quick models

### Code Analysis Vault (Technical Focus)

Use different providers for different code tasks:

```json
{
  "name": "code-vault",
  "type": "custom",
  "provider": "gpt",
  "model": "gpt-4o",
  "commands": {
    "code-review": {
      "provider": "gpt",
      "model": "gpt-4o"
    },
    "debug": {
      "provider": "claude",
      "model": "sonnet"
    },
    "lint-quick": {
      "provider": "ollama",
      "model": "codellama"
    },
    "refactor": {
      "provider": "gpt",
      "model": "gpt-4o"
    },
    "document": {
      "provider": "claude",
      "model": "haiku"
    }
  }
}
```

**Usage & Reasoning:**

```bash
bozly run code-review   # GPT-4o: Strengths in code analysis
bozly run debug          # Claude: Better at reasoning about errors
bozly run lint-quick     # Ollama: Fast local analysis, no cost
bozly run refactor       # GPT-4o: Good at structural changes
bozly run document       # Claude Haiku: Clear explanations
```

### Journal Vault (Privacy Focus)

Keep everything local with Ollama:

```json
{
  "name": "journal-vault",
  "type": "custom",
  "provider": "ollama",
  "model": "llama3"
}
```

**Usage:**

```bash
bozly run daily-reflection    # All local, no data leaves your machine
bozly run mood-analysis       # Local Ollama
bozly run weekly-summary      # Local processing
```

### Content Creation Vault (Multi-Purpose)

Mix providers for different content tasks:

```json
{
  "name": "content-vault",
  "type": "custom",
  "provider": "claude",
  "model": "sonnet",
  "commands": {
    "outline": {
      "provider": "claude",
      "model": "sonnet"
    },
    "draft": {
      "provider": "claude",
      "model": "opus"
    },
    "edit": {
      "provider": "gpt",
      "model": "gpt-4o-mini"
    },
    "proofread": {
      "provider": "ollama",
      "model": "llama3"
    },
    "seo-optimize": {
      "provider": "gpt",
      "model": "gpt-4o-mini"
    }
  }
}
```

---

## CLI Commands

### Configure Provider

```bash
# Set vault-level provider
bozly config set provider claude
bozly config set model sonnet

# View current provider config
bozly config get provider
```

### List Available Providers

```bash
bozly run --list-providers
```

Shows which providers are installed and available on your system:

```
Available AI Providers:

✓ claude   (claude command installed)
✓ gpt      (gpt command not found - install it)
✗ gemini   (gemini command not found - install it)
✓ ollama   (ollama command installed)
```

### Override at Runtime

```bash
# Use different provider for one command
bozly run daily --ai gpt

# Use different model (if provider supports it)
bozly run daily --ai claude --model haiku
```

### Dry Run with Provider Info

```bash
bozly run daily --dry
```

Shows which provider will be used:

```
Command: daily
Provider: claude (from vault config)
Model: sonnet
Context size: 2,450 characters

─ Full Prompt (will be sent to AI)
─────────────────────────────────
... prompt content ...
─────────────────────────────────
```

---

## Fallback Chains (v0.5.0+)

Automatically try a backup provider if the primary fails:

```json
{
  "routing": {
    "fallbackChain": ["claude", "gpt", "ollama"]
  }
}
```

Stored in: `~/.bozly/bozly-config.json`

**Behavior:**

```bash
bozly run daily
```

1. Tries `claude` (configured provider)
2. If `claude` unavailable (not installed, rate limited, etc.)
3. Tries `gpt`
4. If `gpt` unavailable
5. Tries `ollama`
6. If all fail → Error with helpful message

**Benefits:**
- Graceful degradation when providers fail
- Automatic fallback to local providers
- No manual intervention needed

---

## Configuration Reference

### Node-Level Config: `.bozly/config.json`

```typescript
interface NodeConfig {
  // ... standard fields ...

  // Smart Routing fields
  provider?: string;           // Vault default provider (e.g., "claude")
  model?: string;              // Vault default model (e.g., "sonnet")
  commands?: {
    [commandName: string]: {
      provider?: string;       // Command-specific provider
      model?: string;          // Command-specific model
    };
  };
}
```

**Example:**

```json
{
  "name": "music-vault",
  "type": "custom",
  "version": "1.0.0",
  "created": "2025-01-01",
  "ai": {
    "defaultProvider": "claude",
    "providers": ["claude", "gpt", "ollama"]
  },
  "provider": "claude",
  "model": "sonnet",
  "commands": {
    "analyze": {
      "provider": "claude",
      "model": "sonnet"
    },
    "quick-check": {
      "provider": "ollama",
      "model": "llama3"
    }
  }
}
```

### Global Config: `~/.bozly/bozly-config.json`

```typescript
interface GlobalConfig {
  // ... standard fields ...

  routing?: {
    strategy?: "manual" | "complexity-based";  // Default: "manual"
    fallbackChain?: string[];                  // e.g., ["claude", "gpt", "ollama"]
  };
}
```

**Example:**

```json
{
  "version": "0.4.0",
  "defaultAI": "claude",
  "routing": {
    "strategy": "manual",
    "fallbackChain": ["claude", "gpt", "ollama"]
  }
}
```

---

## Common Patterns

### Cost Optimization

Use expensive providers only for complex tasks:

```json
{
  "provider": "ollama",                      // Default: free local
  "commands": {
    "analyze": {
      "provider": "claude",                  // Expensive but thorough
      "model": "opus"
    },
    "format": {
      "provider": "ollama",                  // Cheap, local
      "model": "llama3"
    }
  }
}
```

### Task-Specific Models

Different models for different complexity levels:

```json
{
  "provider": "claude",
  "commands": {
    "quick-summary": {
      "model": "haiku"                       // Fastest, cheapest
    },
    "detailed-analysis": {
      "model": "sonnet"                      // Balanced
    },
    "complex-reasoning": {
      "model": "opus"                        // Most powerful
    }
  }
}
```

### Quality Tiers

Multiple commands with increasing quality:

```json
{
  "commands": {
    "draft-1": {
      "provider": "ollama",
      "model": "llama3"
    },
    "draft-2": {
      "provider": "gpt",
      "model": "gpt-4o-mini"
    },
    "final-review": {
      "provider": "claude",
      "model": "opus"
    }
  }
}
```

---

## Troubleshooting

### "Provider not installed" Error

**Problem:**

```
Error: claude not installed (command 'claude' not found)
```

**Solutions:**

1. Install the provider:
   ```bash
   npm install -g claude-cli  # or similar
   ```

2. Use a different provider:
   ```bash
   bozly run daily --ai gpt
   ```

3. Configure a fallback chain:
   ```json
   {
     "routing": {
       "fallbackChain": ["claude", "gpt", "ollama"]
     }
   }
   ```

### Provider Selection Not Working

**Problem:** Vault provider config is ignored.

**Debug:**

```bash
# See what provider is selected
bozly run daily --dry

# Check config hierarchy
cat .bozly/config.json         # Check node config
cat ~/.bozly/bozly-config.json # Check global config
```

**Verify the hierarchy:**
- CLI flag has highest priority
- Command config overrides vault config
- Vault config overrides global config

### Slow Provider Response

**Problem:** Commands are slow with current provider.

**Solutions:**

1. Use a faster provider for quick tasks:
   ```json
   {
     "commands": {
       "daily": {
         "provider": "ollama",
         "model": "llama3"
       }
     }
   }
   ```

2. Use a faster model:
   ```json
   {
     "model": "haiku"  // Faster than sonnet/opus
   }
   ```

3. Check provider availability:
   ```bash
   bozly run --list-providers
   ```

---

## Advanced Configuration

### Custom Provider (Advanced)

**Currently:** BOZLY supports claude, gpt, gemini, ollama

**Future:** Custom provider support will allow you to define:
- Custom CLI commands
- Model flag formats
- Availability detection
- Cost calculation

For now, stick to supported providers.

### Complexity-Based Routing (Planned for v1.0)

**Not yet implemented.** Future versions will:
- Automatically detect task complexity
- Route simple tasks to cheap/fast providers
- Route complex tasks to powerful providers
- Learn from session history

---

## Best Practices

### 1. Set Clear Defaults

```json
{
  "provider": "claude",     // Clear default
  "model": "sonnet"         // Consistent model
}
```

### 2. Use Command Overrides Sparingly

Only override for specific use cases:

```json
{
  "provider": "claude",     // 80% of commands
  "commands": {
    "quick-check": {        // 20% of commands
      "provider": "ollama"
    }
  }
}
```

### 3. Test Configuration

```bash
# Test each command's provider
bozly run daily --dry
bozly run analyze --dry
bozly run quick-check --dry

# Verify with --list-providers
bozly run --list-providers
```

### 4. Document Your Choices

Add comments to explain why commands use specific providers:

```json
{
  "provider": "claude",
  "commands": {
    "brainstorm": {
      "provider": "claude",
      "comment": "Needs strong creative reasoning"
    },
    "format": {
      "provider": "ollama",
      "comment": "Simple task, keep local for privacy"
    }
  }
}
```

### 5. Use Fallback Chains

Add a fallback chain to handle provider failures gracefully:

```json
{
  "routing": {
    "fallbackChain": ["claude", "gpt", "ollama"]
  }
}
```

---

## FAQ

**Q: Can I change providers mid-command?**
A: No, providers are selected before execution. Use `--ai` to change for one command.

**Q: Do I need to restart BOZLY after config changes?**
A: No, config is loaded fresh for each `bozly run` command.

**Q: Can I use the same provider multiple times in a fallback chain?**
A: No, BOZLY automatically deduplicates fallback chains.

**Q: What if no providers in fallback chain are available?**
A: BOZLY returns the primary provider (will error at execution time with helpful message).

**Q: Can I set provider per-node globally?**
A: Yes, use `~/.bozly/bozly-config.json` for global default. Each node can override.

**Q: Is there a priority between node and global config?**
A: Yes: CLI flag > command config > node config > global config > default.

---

## Related Guides

- [BOZLY Quick Start](./QUICK-START.md) - Getting started
- [Commands Guide](./COMMANDS.md) - Creating and managing commands
- [CLI Reference](./CLI.md) - Full command reference
- [Architecture](./ARCHITECTURE.md) - Design and internals

---

*Smart Routing: Right AI, Right Task, Right Time*

---

## See Also

- [GETTING-STARTED.md](GETTING-STARTED.md) — Getting started with BOZLY
- [CLI-REFERENCE.md](CLI-REFERENCE.md) — Smart routing CLI commands
- [CONFIGURATION-REFERENCE.md](CONFIGURATION-REFERENCE.md) — Routing configuration
- [API-REFERENCE.md](API-REFERENCE.md) — Routing API functions
- [AI-PROVIDERS.md](AI-PROVIDERS.md) — Supported AI providers

*Last updated: 2025-12-27 (Session 122)*
