# BOZLY Example Vaults

This folder contains example vaults demonstrating how to use BOZLY for different domains.

---

## Available Examples

### Music Discovery Vault
**Location:** `music-vault/`

A complete music discovery and review system:
- Triple-scoring methodology (Shaun + Objective + Emotional)
- Weekly album selection with roll system
- TRIPLE search strategy (Influence + Year + All-time)
- Dashboard integration

**Key commands:**
- `/daily` — Log daily listening notes
- `/weekly-roll` — Select album for the week
- `/complete-album` — Finalize album review

### Journal Vault
**Location:** `journal-vault/`

Daily journaling with mood tracking:
- Daily entry templates
- Weekly reviews
- Mood tracking system

**Key commands:**
- `/daily-entry` — Create today's entry
- `/log-mood` — Record current mood
- `/weekly-review` — Weekly reflection

---

## Using These Examples

### Option 1: Clone and Customize

```bash
# Copy an example vault
cp -r examples/music-vault ~/my-music-vault
cd ~/my-music-vault

# Register with BOZLY
bozly add .

# Start using
bozly status
bozly run daily
```

### Option 2: Use as Template

```bash
# Initialize from template
bozly init --type music
bozly init --type journal
```

---

## Vault Structure

Each example follows the BOZLY structure:

```
example-vault/
├── .bozly/                 ← BOZLY configuration
│   ├── config.json         ← Vault settings
│   ├── context.md          ← AI context
│   ├── commands/           ← Vault commands
│   └── ...
├── README.md               ← Vault documentation
├── SETUP-GUIDE.md          ← Setup instructions
└── [domain-specific files]
```

---

## Customizing Examples

1. **Copy the example** to a new location
2. **Edit `.bozly/context.md`** to match your needs
3. **Modify commands** in `.bozly/commands/`
4. **Update file structure** as needed
5. **Register with BOZLY:** `bozly add .`

---

## Creating Your Own

See [BUILDING-YOUR-VAULT.md](../docs/BUILDING-YOUR-VAULT.md) for a complete guide to creating custom vaults.

---

## Contributing Examples

Want to share your vault?

1. Create a clean version (remove personal data)
2. Include documentation:
   - README.md explaining the vault
   - SETUP-GUIDE.md for installation
   - Example content
3. Submit a PR or share in [Discussions](https://github.com/RetroGhostLabs/bozly/discussions)

---

*BOZLY: Build. OrganiZe. Link. Yield.*

*Last updated: 2025-12-16*
