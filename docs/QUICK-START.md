# Quick Start — Get Running in 5 Minutes

**Last updated:** 2025-12-27 (Session 122)

---

## 30 Seconds: Install

```bash
npm install -g @retroghostlabs/bozly
bozly --version    # Verify: should show v0.6.0+
```

---

## 1 Minute: Create Your First Vault

```bash
mkdir ~/music
cd ~/music
bozly init

# Answer the prompts:
# Name: "My Music"
# Type: "music"
# AI: "claude"
```

---

## 2 Minutes: Create a Command

```bash
cat > .bozly/commands/discover.md << 'EOF'
# Find New Music

Based on my taste, suggest 5 albums I should listen to next.

Include:
- Artist & album name
- Why I'd like it
- Key tracks
EOF
```

---

## 3 Minutes: Run It

```bash
bozly run discover
```

Your AI responds with music recommendations. Session auto-saved.

---

## 4 Minutes: Explore

```bash
# See all sessions
bozly history

# View a specific session
bozly history view <SESSION_ID>

# View other commands
bozly command list

# Check your context
bozly context view
```

---

## 5 Minutes: Edit Your Context (Optional)

```bash
# Edit what your AI knows about you
bozly context edit

# Add your music preferences, favorite artists, etc.
# Better context = better results
```

---

## You're Done!

Next, explore:
- **[GETTING-STARTED.md](GETTING-STARTED.md)** — Detailed walkthrough
- **[COMMANDS-GUIDE.md](COMMANDS-GUIDE.md)** — Creating complex commands
- **[WORKFLOWS-GUIDE.md](WORKFLOWS-GUIDE.md)** — Multi-step automation
- **[CLI-REFERENCE.md](CLI-REFERENCE.md)** — All commands available

---

## Common Next Steps

### Create Multiple Commands

```bash
# List commands
bozly command list

# Create more
bozly command create
```

### Use Different AI

```bash
bozly run discover --ai gpt      # Use GPT
bozly config set ai.default gpt  # Make it default
```

### Create Another Vault

```bash
mkdir ~/journal
cd ~/journal
bozly init
```

### Quick One-Liners

```bash
bozly pipe "How do I learn music theory?"  # Quick question
bozly list                                  # See all vaults
bozly doctor                                # Health check
```

---

## That's It!

For more, see [GETTING-STARTED.md](GETTING-STARTED.md).

*BOZLY: Build. OrganiZe. Link. Yield.*
