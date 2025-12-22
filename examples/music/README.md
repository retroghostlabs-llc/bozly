# Music Discovery Vault

An example BOZLY vault for album discovery and review.

## Features

- **Triple Scoring System** — Personal, Objective, and Emotional scores
- **TRIPLE Search Strategy** — Influence, Year, and All-time discovery methods
- **Weekly Album Focus** — Dedicated listening periods
- **Daily Logging** — Capture thoughts as you listen

## Getting Started

1. Copy this folder to your desired location
2. Register with BOZLY:
   ```bash
   cd music-vault
   bozly add .
   ```
3. Check status:
   ```bash
   bozly status
   ```

## Commands

| Command | Description |
|---------|-------------|
| `/daily` | Log daily listening notes |
| `/weekly-roll` | Select album for the week |
| `/complete-album` | Finalize album review |

## Usage

```bash
# Start your week
bozly run weekly-roll

# Log daily thoughts
bozly run daily

# Complete a review
bozly run complete-album
```

## Customization

Edit `.bozly/context.md` to customize:
- Scoring criteria
- Discovery methodology
- Personal preferences

---

*BOZLY: Build. OrganiZe. Link. Yield.*
