# AI Provider Setup & Configuration

BOZLY is AI-agnostic and works with any CLI-based AI tool. This guide covers setup for supported providers and how to use them with BOZLY.

---

## Quick Start

### 1. Check Available Providers
```bash
bozly run --list-providers
```

### 2. Pick a Provider
Choose one that's installed on your system (✅) or follow setup instructions for one that isn't (❌).

### 3. Use It
```bash
bozly run <command> --ai <provider>
```

**Example:**
```bash
bozly run daily --ai claude        # Use Claude
bozly run daily --ai gpt           # Use ChatGPT
bozly run daily --ai ollama        # Use local Ollama
```

---

## Supported Providers

### Claude (Recommended)

**Status:** ✅ Recommended for production use

**Installation:**
```bash
# Install Claude CLI
npm install -g @anthropic-ai/claude-cli

# Authenticate
claude login
```

**Setup:**
1. Create account at https://claude.ai
2. Get API key from https://console.anthropic.com
3. Run `claude login` and paste your key

**Usage:**
```bash
bozly run daily --ai claude        # Default provider
bozly run weekly --ai claude
```

**Notes:**
- Most reliable and feature-rich
- Streaming output works well
- Supports long contexts (100K tokens)
- May require Claude API key

**Docs:**
- GitHub: https://github.com/anthropics/claude-cli
- API Docs: https://docs.anthropic.com

---

### ChatGPT (OpenAI)

**Status:** ⚠️ Experimental (requires additional setup)

**Installation:**
```bash
# Option 1: NPM package
npm install -g gpt-shell

# Option 2: Python CLI
pip install openai-python
```

**Setup:**
1. Create account at https://openai.com
2. Get API key from https://platform.openai.com/api-keys
3. Set environment variable:
   ```bash
   export OPENAI_API_KEY=sk-...
   ```

**Usage:**
```bash
bozly run daily --ai gpt
```

**Notes:**
- Works but less tested than Claude
- Requires OpenAI API key
- Cost per use (check API pricing)

**Docs:**
- GitHub: https://github.com/openai/gpt-cli
- API Docs: https://platform.openai.com/docs

---

### Gemini (Google)

**Status:** ❌ Experimental (CLI support needed)

**Why Not Available:**
Google's Gemini CLI is still in development and not widely available. We recommend using Claude or Ollama instead.

**Workaround:**
Use the Claude or OpenAI integration for now. File an issue if you'd like Gemini support:
- https://github.com/RetroGhostLabs/bozly/issues

**Future:**
Once Google releases an official Gemini CLI, we'll add first-class support.

---

### Ollama (Local/Private)

**Status:** ✅ Excellent for privacy & offline use

**Installation:**

1. Download and install Ollama:
   ```
   https://ollama.ai
   ```

2. Start Ollama service:
   ```bash
   ollama serve
   ```

3. In another terminal, pull a model:
   ```bash
   ollama pull llama2
   ```

**Available Models:**
```bash
ollama pull llama2           # 7B model (recommended, 4GB)
ollama pull neural-chat      # Chat-optimized (4GB)
ollama pull mistral          # High quality (7B, 4GB)
ollama pull dolphin-mixtral  # Experimental (15B, 9GB)
```

**Usage:**
```bash
bozly run daily --ai ollama
```

**Configuration:**
Edit vault config to set default model:
```bash
cat vault/.bozly/config.json
# Set: "defaultProvider": "ollama"
```

**Notes:**
- Completely private (runs locally)
- Requires Ollama service running (`ollama serve`)
- No API key needed
- Performance depends on hardware
- First run downloads model (~4GB for llama2)

**Docs:**
- Website: https://ollama.ai
- Models: https://ollama.ai/library

**Performance Tips:**
- Use `llama2` for balanced speed/quality
- Use `mistral` for better quality (slower)
- Use `neural-chat` for chat-specific tasks
- Ensure sufficient disk space (10GB+)
- Close other applications for better performance

---

## Common Tasks

### Set Default Provider

**Global (system-wide):**
```bash
# Edit ~/.bozly/bozly-config.json
{
  "defaultAI": "claude"
}
```

**Per-Node:**
```bash
# Edit vault/.bozly/config.json
{
  "ai": {
    "defaultProvider": "claude"
  }
}
```

### Switch Providers

```bash
# Try a command with different providers
bozly run daily --ai claude
bozly run daily --ai gpt
bozly run daily --ai ollama
```

### Dry Run Before Executing

```bash
# Preview the prompt without execution
bozly run daily --ai claude --dry
```

Use this to:
- See context size
- Verify node context is loaded
- Check model is included (if referenced in command)
- Preview exact prompt that will be sent

### Get Help Installing a Provider

```bash
# Try to run with a missing provider
bozly run daily --ai ollama

# Get setup instructions if not installed
Provider 'ollama' is not installed.
Install Ollama for local AI models:
  1. Download from https://ollama.ai
  2. Install and start: ollama serve
  ...
```

---

## Troubleshooting

### Error: "Provider not found"

**Problem:** You're trying to use a provider that isn't installed.

**Solution:**
```bash
# Check what's available
bozly run --list-providers

# Follow setup instructions for your chosen provider
# Then retry: bozly run daily --ai <provider>
```

### Error: "Failed to start claude"

**Problem:** CLI tool exists but can't execute.

**Solutions:**
1. Check authentication:
   ```bash
   claude --version        # Should work
   claude login           # Re-authenticate if needed
   ```

2. Check PATH:
   ```bash
   which claude           # Should show path to CLI
   ```

3. Check permissions:
   ```bash
   ls -la ~/.npm-global/bin/claude
   ```

### Error: "Provider exited with code X"

**Problem:** Provider CLI ran but failed with error.

**Solutions:**
- **Code 1:** Invalid prompt or API error
- **Code 127:** CLI not found (install the provider)
- **Code 143:** Process was killed (timeout? out of memory?)

**Debug:**
```bash
# Run with verbose logging
BOZLY_DEBUG=true bozly run daily --ai claude

# Test provider directly
claude --help                    # Should work
echo "Test prompt" | claude -p   # Should return response
```

### Error: "Failed to authenticate" (OpenAI/Claude)

**Problem:** Missing or invalid API key.

**Solution:**
1. Get API key:
   - Claude: https://console.anthropic.com
   - OpenAI: https://platform.openai.com/api-keys

2. Authenticate:
   ```bash
   claude login             # Claude
   export OPENAI_API_KEY=sk-...   # OpenAI
   ```

3. Test:
   ```bash
   echo "Hello" | claude -p
   echo "Hello" | gpt
   ```

### Error: "No route to host" or Network errors

**Problem:** Can't reach API servers (network issue).

**Solutions:**
1. Check internet connection:
   ```bash
   ping 8.8.8.8
   ```

2. Check provider status:
   - Claude: https://status.anthropic.com
   - OpenAI: https://status.openai.com

3. Try offline provider:
   ```bash
   # Use Ollama (runs locally)
   bozly run daily --ai ollama
   ```

### Ollama Won't Start

**Problem:** `ollama serve` command not found.

**Solutions:**
1. Install Ollama from https://ollama.ai
2. Check installation:
   ```bash
   ollama --version
   ```

3. For Mac/Linux issues:
   ```bash
   # Reinstall
   brew uninstall ollama
   brew install ollama
   ```

### Ollama Slow or Out of Memory

**Problem:** Responses are slow or process crashes.

**Solutions:**
1. Check available RAM:
   ```bash
   free -h              # Linux
   vm_stat              # Mac
   ```

2. Use smaller model:
   ```bash
   ollama pull neural-chat    # Smaller than llama2
   ```

3. Close other applications to free memory

4. Reduce batch size (if supported by model)

---

## Session Recording

All command executions are recorded to `.bozly/sessions/`:

```
vault/.bozly/sessions/
├── 2025-12-19T21-08-52_daily.json
└── 2025-12-19T21-12-34_weekly.json
```

**Session Contents:**
- Timestamp and command name
- Provider used
- Prompt size breakdown (context, model, command)
- Response duration and status
- Environment metadata

**View Sessions:**
```bash
# List recent sessions (future feature)
# bozly logs

# Compare sessions (future feature)
# bozly diff <session1> <session2>
```

---

## Advanced: Custom Provider Integration

Want to add a new provider? File an issue:
- https://github.com/RetroGhostLabs/bozly/issues

Include:
- Provider name and link
- CLI tool name and installation URL
- Example command structure
- Known limitations

---

## BOZLY vs Your AI's Built-in Features

Your AI tool (Claude, ChatGPT, etc.) has its own built-in features like `/memory`, `/compact`, chat history, and more. **You can still use them!** But BOZLY provides its own context management that works across all providers.

### Why BOZLY Doesn't Rely on AI Features

BOZLY is AI-agnostic. If BOZLY depended on Claude's `/memory` command, it wouldn't work with GPT or Ollama. Instead, BOZLY provides equivalent features that work everywhere:

| AI Feature | BOZLY Alternative | Why It Matters |
|------------|-------------------|----------------|
| `/memory` (Claude) | `.bozly/sessions/` | Works with any AI |
| `/compact` (Claude) | Fresh context each run | No bloat, predictable |
| Chat history | Session recording | Auditable, searchable |
| `/chat` mode | Each `bozly run` is isolated | Clean, reproducible |

### Session Isolation (By Design)

Each `bozly run` starts fresh. The AI receives:
1. Your node context (`.bozly/context.md`)
2. The command prompt (`.bozly/commands/<command>.md`)
3. Referenced models (if any)

**Nothing else.** No previous conversation. No chat history.

**Benefits:**
- **Reproducible:** Same command = same context = predictable behavior
- **Auditable:** `bozly logs` shows exactly what was sent
- **Portable:** Switch providers without losing context
- **Private:** No conversation history leaking between runs

### When to Use BOZLY vs AI Features

| Need | Use BOZLY | Use AI Feature |
|------|-----------|----------------|
| **Consistent domain context** | `.bozly/context.md` | — |
| **Session history** | `bozly logs` | — |
| **Domain models** | `.bozly/models/` | — |
| **Quick interactive chat** | — | AI's chat mode |
| **Compress mid-conversation** | — | `/compact` (if available) |
| **Access AI-specific tools** | — | AI's MCP servers, etc. |

### Future: Session Memory (Phase 2)

BOZLY will add opt-in memory in Phase 2:
- Analyze past sessions for relevant context
- Inject relevant history into new runs
- Still user-controlled (not automatic)

See [BOZLY-RESPONSIBILITY-MODEL.md](../../.claude/guides/BOZLY-RESPONSIBILITY-MODEL.md) for the full design philosophy.

---

## FAQ

**Q: Which provider should I use?**
A: Start with Claude if you have an API key. Otherwise use Ollama for privacy/offline use.

**Q: Can I use multiple providers?**
A: Yes! Test commands with different providers to see which works best for your use case.

**Q: Can I switch providers for specific commands?**
A: Yes! Use `--ai <provider>` flag: `bozly run daily --ai ollama`

**Q: Do I need internet for BOZLY?**
A: Only for cloud providers (Claude, OpenAI). Ollama works completely offline.

**Q: How much does it cost?**
A: Claude and OpenAI have usage-based pricing. Ollama is free (uses your hardware).

**Q: Can I use BOZLY without an AI provider?**
A: Not yet, but `--dry` mode shows what would be sent without execution.

---

## Support

- **Issues:** https://github.com/RetroGhostLabs/bozly/issues
- **Discussions:** https://github.com/RetroGhostLabs/bozly/discussions
- **Docs:** https://github.com/RetroGhostLabs/bozly
