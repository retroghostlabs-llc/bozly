# Daily Journal Vault

An example BOZLY vault for daily journaling and mood tracking.

## Features

- **Mood Tracking** — 7-point scale from terrible to amazing
- **Daily Entries** — Structured reflection prompts
- **Weekly Reviews** — Pattern recognition and insights

## Getting Started

1. Copy this folder to your desired location
2. Register with BOZLY:
   ```bash
   cd journal-vault
   bozly add .
   ```
3. Check status:
   ```bash
   bozly status
   ```

## Commands

| Command | Description |
|---------|-------------|
| `/daily-entry` | Create today's journal entry |
| `/log-mood` | Record current mood |
| `/weekly-review` | Weekly reflection and patterns |

## Usage

```bash
# Create today's entry
bozly run daily-entry

# Quick mood log
bozly run log-mood

# Weekly review
bozly run weekly-review
```

## Customization

Edit `.bozly/context.md` to customize:
- Mood scale
- Entry prompts
- Review structure

---

*BOZLY: Build. OrganiZe. Link. Yield.*
