# Getting Started with BOZLY

A step-by-step guide to installing BOZLY and creating your first vault.

---

## Prerequisites

### Required
- **macOS, Linux, or WSL2** (no native Windows support)
- **Node.js 18+** (for npm installation)
- **At least one AI CLI** installed:
  - **Claude Code**: `npm install -g @anthropic-ai/claude-code`
  - **GPT CLI**: `pip install openai-cli` (or your preferred GPT CLI)
  - **Ollama**: `brew install ollama` (for local LLMs)

### Optional
- **Homebrew** (for alternative installation method)
- **Git** (for cloning from source)

**Verify prerequisites:**
```bash
node --version         # Should show v18.0.0+
npm --version          # Should show 8.0.0+
command -v claude      # Claude CLI path (or check gpt/ollama)
```

---

## Step 1: Install BOZLY

### Option A: npm (Recommended)

```bash
npm install -g bozly
```

### Option B: Homebrew

```bash
brew tap retroghostlabs/bozly
brew install bozly
```

### Option C: From Source

```bash
git clone https://github.com/RetroGhostLabs/bozly.git
cd bozly
npm install
npm link
```

**Verify installation:**
```bash
bozly --version
# Should show: bozly v0.3.0 (or current version)
```

---

## Step 2: Create Your First Vault

BOZLY organizes your work into **vaults** — domain-specific workspaces with their own commands and context.

### Quick Start

```bash
# Create a directory for your vault
mkdir ~/my-first-vault
cd ~/my-first-vault

# Initialize with BOZLY
bozly init
```

BOZLY will ask you:
1. **Vault name** — What do you want to call this vault?
2. **Vault type** — What's it for? (journal, music, content, research, etc.)
3. **Default AI** — Which AI CLI to use? (claude, gpt, ollama)

### What Gets Created

```
~/my-first-vault/
└── .bozly/
    ├── config.json         ← Vault settings
    ├── context.md          ← AI context file
    ├── index.json          ← Task index
    ├── sessions/           ← Session history
    ├── tasks/              ← Task data
    ├── commands/           ← Your commands go here
    ├── workflows/          ← Multi-step processes
    └── hooks/              ← Automation triggers
```

---

## Step 3: Run Your First Command

BOZLY comes with built-in commands. Try them:

```bash
# Check vault status
bozly status

# List all vaults
bozly list

# Generate AI context
bozly context
```

### Run a Custom Command

Create a simple command:

```bash
# Create a daily command
echo "Start my daily planning session" > .bozly/commands/daily.md

# Run it with your AI
bozly run daily
```

BOZLY will:
1. Load your vault context (`.bozly/context.md`)
2. Load the command prompt (`.bozly/commands/daily.md`)
3. Pipe everything to your AI CLI
4. Save the session to `.bozly/sessions/`

---

## Step 4: Configure Your AI Provider

BOZLY works with any AI CLI. Configure your default:

```bash
# View current config
bozly config

# Set default AI
bozly config set ai.default claude

# Add another AI provider
bozly config ai add gpt
bozly config ai add ollama
```

### Switch AIs on the Fly

```bash
bozly run daily              # Uses default AI
bozly run daily --ai gpt     # Use GPT instead
bozly run daily --ai ollama  # Use local Ollama
```

---

## Step 5: Customize Your Vault

### Edit the Context File

The context file tells AI about your vault:

```bash
bozly context edit
# Opens .bozly/context.md in your editor
```

**Example context.md:**
```markdown
# My Project Vault

## Purpose
Track my side project development.

## Commands
| Command | Purpose |
|---------|---------|
| /daily | Daily standup and planning |
| /review | Weekly progress review |

## Key Files
- `TODO.md` — Current tasks
- `NOTES.md` — Project notes
```

### Add Custom Commands

Create commands in `.bozly/commands/`:

```bash
# Create a review command
cat > .bozly/commands/review.md << 'EOF'
Review my progress this week:
1. What did I accomplish?
2. What's still pending?
3. What should I focus on next week?

Read the TODO.md and NOTES.md files for context.
EOF

# Run it
bozly run review
```

---

## Step 6: Use Templates (Optional)

BOZLY includes starter templates for common use cases:

```bash
# Initialize with a template
bozly init --type music        # Music discovery vault
bozly init --type journal      # Daily journal vault
bozly init --type content      # Content production vault
```

Templates include:
- Pre-configured context.md
- Common commands
- Example workflows
- Best practices for that domain

---

## Next Steps

### Learn More
- [ARCHITECTURE.md](ARCHITECTURE.md) — How BOZLY works
- [BUILDING-YOUR-VAULT.md](BUILDING-YOUR-VAULT.md) — Create custom vaults
- [CLI Reference](CLI-DESIGN.md) — All BOZLY commands

### Explore Examples
- [Music Discovery Vault](../examples/music-vault/)
- [Journal Vault](../examples/journal-vault/)

### Get Help
- [GitHub Issues](https://github.com/RetroGhostLabs/bozly/issues)
- [GitHub Discussions](https://github.com/RetroGhostLabs/bozly/discussions)

---

## Quick Reference

### Essential Commands

```bash
# Setup
bozly init                    # Initialize new vault
bozly init --type music       # Initialize from template

# Status
bozly status                  # Current vault status
bozly list                    # All registered vaults
bozly doctor                  # Health check

# Running
bozly run <command>           # Run a command
bozly run <command> --ai gpt  # Run with specific AI
bozly pipe "question"         # Quick question with context

# Config
bozly config                  # View config
bozly config set key value    # Set value
bozly context edit            # Edit context file
```

### Folder Structure

```
~/.bozly/                     # Global config
├── bozly-registry.json       # All vault locations
├── bozly-config.json         # Global settings
└── commands/                 # Global commands

~/my-vault/.bozly/            # Per-vault config
├── config.json               # Vault settings
├── context.md                # AI context
├── commands/                 # Vault commands
└── sessions/                 # Session history
```

---

*BOZLY: Build. OrganiZe. Link. Yield.*

*Last updated: 2025-12-16*
