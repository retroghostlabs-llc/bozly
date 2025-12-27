# Getting Started with BOZLY

A comprehensive guide to installing BOZLY and creating your first vault with real examples.

**Last updated:** 2025-12-27 (Session 122)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Your First Vault](#your-first-vault)
4. [Running Your First Command](#running-your-first-command)
5. [Real-World Walkthroughs](#real-world-walkthroughs)
6. [Next Steps](#next-steps)

---

## Prerequisites

### Required

- **macOS, Linux, or WSL2** (no native Windows support)
- **Node.js 18+** (for npm installation)
- **npm 8+** (usually comes with Node.js)
- **At least one AI CLI** installed and configured:
  - **Claude Code**: `npm install -g @anthropic-ai/claude-code`
  - **OpenAI CLI**: Configured with your API key
  - **Ollama**: `brew install ollama` (for local LLMs)

### Optional

- **Homebrew** (for alternative installation)
- **Git** (for development/contribution)
- **A text editor** like VS Code, Sublime, or vim

### Verify Your Setup

Run these commands to verify everything is ready:

```bash
# Check Node.js
node --version          # Should show v18.0.0 or higher

# Check npm
npm --version           # Should show 8.0.0 or higher

# Check for at least one AI CLI
command -v claude       # Or: command -v gpt, command -v ollama
# Should show the path to your AI CLI

# Optional: check git
git --version           # Only needed if installing from source
```

If any check fails, install the missing component before proceeding.

---

## Installation

### Option A: npm (Recommended)

The easiest way to get BOZLY.

```bash
npm install -g @retroghostlabs/bozly
```

Verify installation:

```bash
bozly --version
# Output: bozly v0.6.0 (or current version)
```

### Option B: Homebrew

If you prefer Homebrew on macOS or Linux:

```bash
brew tap retroghostlabs/bozly
brew install bozly
```

Verify:

```bash
bozly --version
```

### Option C: From Source

For development or contributing to BOZLY:

```bash
# Clone the repository
git clone https://github.com/RetroGhostLabs/bozly.git
cd bozly

# Install dependencies
npm install

# Link for development
npm link

# Verify
bozly --version
```

---

## Your First Vault

A **vault** is a domain-specific workspace. Think of it as a dedicated directory where you keep all your work, commands, and sessions for a particular domain — music, journaling, projects, etc.

### Step 1: Create a Directory

```bash
# Create a new directory for your vault
mkdir ~/my-music-vault
cd ~/my-music-vault

# Or for a journal vault
mkdir ~/my-journal
cd ~/my-journal
```

### Step 2: Initialize the Vault

Run the initialization command:

```bash
bozly init
```

BOZLY will ask you a few questions:

```
? What's the name of this vault?
> My Music Discovery

? What type of vault is this?
> music
  (Other options: journal, project, content, research, personal, other)

? Which AI provider should we use?
> claude
  (Other options: gpt, gemini, ollama)

? Should we include an example context? (y/n)
> y
```

### Step 3: Explore What Was Created

BOZLY creates a `.bozly` folder with your vault structure:

```bash
# List the contents
ls -la

# You should see:
# .bozly/

# Inside .bozly/:
ls -la .bozly/
```

**Here's what was created:**

```
.bozly/
├── config.json          ← Your vault configuration
├── context.md           ← AI context (what your AI knows about this vault)
├── index.json           ← Task and command index
├── sessions/            ← All your session history
│   └── {vault-id}/      ← Organized by vault ID
│       └── {YYYY}/{MM}/{DD}/  ← Then by date
├── commands/            ← Your custom commands
├── workflows/           ← Multi-step automations
├── tasks/               ← Task management
├── hooks/               ← Automation triggers
└── models.json          ← AI model preferences (optional)
```

Let's look at what was created:

```bash
# See your vault configuration
cat .bozly/config.json

# Look at your AI context (most important!)
cat .bozly/context.md

# Check your sessions folder
ls -la .bozly/sessions/
```

---

## Running Your First Command

### Built-in Commands

BOZLY comes with several built-in commands. Let's try one:

```bash
# Check vault status
bozly status
```

Output should show:
- Vault name
- Vault type
- AI provider
- Total sessions
- Last activity

### Quick Question

The fastest way to interact with your AI:

```bash
bozly pipe "What are some must-listen albums from 2024?"
```

This pipes your question directly to your AI with your vault's context. The session is automatically saved.

### List Available Commands

See what commands are available:

```bash
bozly command list
```

This shows:
- Built-in commands (available globally)
- Global commands (your custom commands for all vaults)
- Vault commands (specific to this vault)

### Create Your First Custom Command

Let's create a simple command for discovering music:

```bash
# Create a command file
cat > .bozly/commands/album-review.md << 'EOF'
# Album Review Session

## Purpose
Structured analysis and discovery of an album.

## Instructions
I'm going to tell you about an album. Please help me understand it better:

1. **First Impressions** - What stands out immediately?
2. **Track Analysis** - Highlight the best 3 tracks and explain why
3. **Production Quality** - How would you rate the production? (1-10)
4. **Similar Artists** - Who should I listen to next?
5. **Recommendation** - Would you recommend this to someone new to this genre?

## Expected Output
A detailed review of the album with actionable recommendations.
EOF
```

Now run it:

```bash
bozly run album-review
```

BOZLY will:
1. Load your vault's context from `.bozly/context.md`
2. Load your command from `.bozly/commands/album-review.md`
3. Pipe everything to your AI
4. Save the session automatically

### View Your Session

After running a command, your session is saved. View it:

```bash
# List your recent sessions
bozly history

# View a specific session (replace SESSION_ID with actual ID)
bozly history view <SESSION_ID>

# Or see the raw session files
ls -la .bozly/sessions/
```

---

## Real-World Walkthroughs

### Walkthrough 1: Music Discovery Vault

Let's build a complete music vault from scratch.

#### Step 1: Create Vault

```bash
mkdir ~/music
cd ~/music
bozly init
```

When prompted:
- Name: `My Music Discovery`
- Type: `music`
- Provider: `claude`

#### Step 2: Customize Context

Edit your vault's AI context:

```bash
cat > .bozly/context.md << 'EOF'
# My Music Discovery Vault

## What This Vault Does
This vault helps me discover new music, analyze albums deeply, and track my listening patterns.

## Music Preferences
- Primary Genres: Jazz, Soul, Hip-Hop, Electronic
- Favorite Artists: Miles Davis, D'Angelo, J. Dilla, Aphex Twin
- Listening History: 10+ years of serious music exploration
- New To: Shoegaze, Ambient, K-pop production

## How I Work
1. I like detailed production analysis
2. I appreciate context about artist backgrounds
3. I want thoughtful recommendations based on my taste
4. I track albums I've reviewed

## Commands Available
- album-review: Deep dive into an album
- discovery-session: Find new music
- artist-spotlight: Learn about an artist
- listening-recap: Weekly listening summary

## Files You Can Reference
- listening-log.md: My complete listening history
- favorites.json: My favorite albums by year
EOF
```

#### Step 3: Create Custom Commands

Create an album review command:

```bash
cat > .bozly/commands/album-review.md << 'EOF'
# Album Review

## Purpose
Deep dive analysis of an album I've recently listened to.

## Instructions
Help me review this album:

1. **What's Your First Impression?**
2. **Production & Sound** - Quality, mixing, standout sonic choices
3. **Best Tracks** - Which 3-5 tracks are essential? Why?
4. **Lyrical/Compositional Themes** - What's the album about?
5. **Overall Rating** - On a scale of 1-10, where does it rank?
6. **Similar Albums** - What else should I listen to?

## Format
- Be specific with production details
- Reference other albums for comparison
- Suggest at least 3 similar artists
EOF
```

Create a discovery command:

```bash
cat > .bozly/commands/discovery-session.md << 'EOF'
# Music Discovery Session

## Purpose
Guided exploration to find new music I'll love.

## Instructions
Let's find me some new music to love. Based on my taste profile:

1. **What's Missing?** - Looking at my favorite artists, what genres am I underexplored in?
2. **Bridge Recommendations** - Find albums that bridge my current taste to new territory
3. **Deep Cuts** - Suggest 5-7 artists that go deeper than mainstream picks
4. **Why These?** - For each, explain the specific connection to my taste

## Expected Output
A curated list of 5-7 albums with explanations and where to find them.
EOF
```

#### Step 4: Run a Command

```bash
bozly run discovery-session
```

Your AI will use your context to provide tailored recommendations.

#### Step 5: Explore Sessions

View what was created:

```bash
# See session history
bozly history

# Check your sessions folder
find .bozly/sessions -type f -name "results.md" | head -3

# View a session's full context
ls .bozly/sessions/*/
```

### Walkthrough 2: Journal Vault

A simpler example: a personal journal.

#### Step 1: Create

```bash
mkdir ~/journal
cd ~/journal
bozly init

# Name: "My Journal"
# Type: "journal"
# Provider: "claude"
```

#### Step 2: Create Commands

```bash
# Daily reflection
cat > .bozly/commands/daily-reflection.md << 'EOF'
# Daily Reflection

Answer these:
1. What went well today?
2. What was challenging?
3. What did I learn?
4. One thing I'm grateful for?
5. What's one focus for tomorrow?
EOF
```

#### Step 3: Run

```bash
bozly run daily-reflection
```

Your AI provides reflective questions and summarizes your answers.

### Walkthrough 3: Project Vault

For managing a development project.

#### Step 1: Create

```bash
mkdir ~/my-project
cd ~/my-project
bozly init

# Name: "Project Name"
# Type: "project"
# Provider: "claude"
```

#### Step 2: Create Sprint Command

```bash
cat > .bozly/commands/sprint-planning.md << 'EOF'
# Sprint Planning

## Prepare For:
- What we accomplished last sprint
- Current blockers
- Upcoming priorities
- Team capacity

## Output Needed:
1. Sprint goal
2. Prioritized task list
3. Risk assessment
4. Success metrics
EOF
```

#### Step 3: Configure Context

Edit `.bozly/context.md` with:
- Project description
- Tech stack
- Team members
- Current status
- Key files/resources

#### Step 4: Run

```bash
bozly run sprint-planning
```

---

## Next Steps

Now that you have a working vault, explore these features:

### Learn More

1. **[QUICK-START.md](QUICK-START.md)** — 5-minute reference
2. **[CONCEPTS.md](CONCEPTS.md)** — Understand how BOZLY works
3. **[FOLDER-STRUCTURE.md](FOLDER-STRUCTURE.md)** — Know your vault layout
4. **[COMMANDS-GUIDE.md](COMMANDS-GUIDE.md)** — Deep dive into commands
5. **[WORKFLOWS-GUIDE.md](WORKFLOWS-GUIDE.md)** — Multi-step automation
6. **[HOOKS-GUIDE.md](HOOKS-GUIDE.md)** — Automation triggers

### Explore Examples

Check out the examples directory:

```bash
cd /path/to/bozly/examples/
ls

# Each example has:
# - .bozly/ folder with config
# - context.md with setup
# - commands/ with real examples
```

### Common Tasks

**Switch AI Providers:**
```bash
bozly config set ai.default gpt
bozly run album-review --ai gpt
```

**View All Sessions:**
```bash
bozly history
bozly history --days 7        # Last week
bozly history --vault music   # Specific vault
```

**Explore Your Context:**
```bash
bozly context view
bozly context edit            # Edit with your editor
```

**Search Across Vaults:**
```bash
bozly search "jazz fusion"    # Searches all sessions
```

### Get Help

- **Command Help:** `bozly <command> --help`
- **General Help:** `bozly --help`
- **Health Check:** `bozly doctor` (diagnoses issues)
- **GitHub Issues:** [github.com/RetroGhostLabs/bozly/issues](https://github.com/RetroGhostLabs/bozly/issues)
- **GitHub Discussions:** [github.com/RetroGhostLabs/bozly/discussions](https://github.com/RetroGhostLabs/bozly/discussions)

---

## Quick Reference

### Essential Commands

```bash
# Setup
bozly init                    # Create new vault
bozly init --type music      # With template

# Status
bozly status                  # Vault status
bozly list                    # All vaults
bozly doctor                  # Health check

# Running
bozly run <command>           # Run command
bozly run <command> --ai gpt  # With specific AI
bozly pipe "question"         # Quick question

# History
bozly history                 # See sessions
bozly history view <id>       # View session
bozly history --days 7        # Last 7 days

# Config
bozly config                  # View settings
bozly config set key value    # Change setting
bozly context view            # See AI context
bozly context edit            # Edit context

# Commands
bozly command list            # Available commands
bozly command create          # Create new command
```

### File Locations

**Global Settings:**
```
~/.bozly/
├── bozly-config.json        # Global config
├── bozly-registry.json       # All vault locations
└── commands/                 # Global commands
```

**Per-Vault:**
```
~/music/.bozly/
├── config.json               # Vault config
├── context.md                # AI context (MOST IMPORTANT)
├── commands/                 # Vault commands
├── sessions/                 # Session history
├── workflows/                # Multi-step processes
└── hooks/                    # Automation
```

---

## Troubleshooting

### "Command not found: bozly"

Make sure it's installed:
```bash
npm install -g @retroghostlabs/bozly
```

Or check if npm global is in your PATH:
```bash
npm config get prefix
# Add this to your ~/.bashrc or ~/.zshrc if not in PATH:
export PATH=$(npm config get prefix)/bin:$PATH
```

### "AI provider not found"

Ensure your AI CLI is installed:
```bash
# For Claude Code
npm install -g @anthropic-ai/claude-code

# For OpenAI
pip install openai-cli
export OPENAI_API_KEY="your-key"

# For Ollama
brew install ollama
ollama pull llama2  # or your model
```

### "Vault not initialized"

You're probably not in a vault directory. Run:
```bash
bozly init
```

Or navigate to a vault:
```bash
cd ~/music
bozly status
```

### "Session not saved"

Check vault health:
```bash
bozly doctor
```

Ensure the sessions directory exists:
```bash
mkdir -p .bozly/sessions
```

---

## Key Concepts

### What is Context?

Your vault's **context** (`.bozly/context.md`) tells your AI everything about the vault:
- What it's for
- Your preferences
- What files it can reference
- Expected output format

The better your context, the better your results.

### How BOZLY Works

1. You run: `bozly run album-review`
2. BOZLY loads your context (`.bozly/context.md`)
3. BOZLY loads your command (`.bozly/commands/album-review.md`)
4. BOZLY pipes both to your AI
5. Your AI processes and responds
6. BOZLY saves the session automatically

### Session Recording

Every command execution is recorded:
- **prompt.txt** — What was sent to the AI
- **results.md** — The AI's response
- **session.json** — Metadata (timing, provider, etc.)
- **context.md** — What context was used

This creates a complete audit trail.

---

*BOZLY: Build. OrganiZe. Link. Yield.*

*Last updated: 2025-12-27 (Session 122)*
