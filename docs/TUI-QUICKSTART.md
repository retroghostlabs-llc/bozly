# BOZLY TUI - Quick Start Guide

Get up and running with the BOZLY Terminal User Interface in 5 minutes.

## Step 1: Start the API Server

The TUI dashboard communicates with the BOZLY REST API server. Start it first:

```bash
bozly serve
```

This starts the API on `http://localhost:3000` by default. You should see output like:

```
BOZLY API Server running on http://localhost:3000
Press Ctrl+C to stop
```

## Step 2: Launch the TUI (in a new terminal)

```bash
bozly tui
```

If everything is working, you'll see the TUI dashboard load with:

- **Left sidebar**: Navigation menu (numbered 1-8)
- **Main area**: Dashboard with overview information
- **Status bar**: Shows available keybindings

## Step 3: Navigate the Dashboard

### The Menu

The left sidebar shows 8 main screens:

```
1. Home       ← You're here (Dashboard overview)
2. Vaults     ← Your vault workspace areas
3. Sessions   ← Session history and logs
4. Memory     ← Extracted knowledge base
5. Commands   ← Available commands reference
6. Workflows  ← Workflow definitions
7. Config     ← System settings
8. Health     ← API server status
```

### Jump to Any Screen

Press any number key to jump to that screen:

```
Press '2'  → Go to Vaults
Press '3'  → Go to Sessions
Press '5'  → Go to Commands
```

## Step 4: Explore Your Data

### View Your Vaults

1. Press **2** (Vaults)
2. You'll see a list of your registered vaults
3. Press **j/k** or **arrow keys** to navigate
4. Press **Enter** to view vault details

### View Recent Sessions

1. Press **3** (Sessions)
2. Scroll through recent command sessions
3. Press **Enter** to view session details
4. See output, context, and results

### Search Commands

1. Press **5** (Commands)
2. Press **/** to search
3. Type a command name
4. Press **n** for next match, **N** for previous

## Step 5: Basic Keybindings

Here are the 10 most important keys:

| Key | Action |
|---|---|
| `1`-`8` | Jump to screen |
| `j` / `k` | Move down/up |
| `Enter` | Select item |
| `/` | Search lists |
| `Ctrl+L` | Refresh |
| `?` | Show help |
| `Esc` | Go back/close |
| `Q` | Return to menu |
| `Ctrl+C` | Quit app |
| `Tab` | Next field (forms) |

## Common Tasks

### Task: View vault details

```
1. Press '2' (Vaults)
2. Press 'j' / 'k' to find your vault
3. Press 'Enter' to view details
```

### Task: Search for a command

```
1. Press '5' (Commands)
2. Press '/' to start search
3. Type command name (e.g., "create")
4. Press 'n' for next match
5. Press 'Esc' to exit search
```

### Task: Check API health

```
1. Press '8' (Health)
2. View API status, version, and performance
3. Press 'Ctrl+L' to refresh
```

### Task: Go back to previous screen

```
Press 'Esc' or 'Q'
```

## Troubleshooting

### "API Server Not Running" Error

**Problem**: TUI shows API connection error
**Solution**:
```bash
# In another terminal, start the API server
bozly serve
```

### Keybindings Don't Work

**Problem**: Arrow keys or other keys not responding
**Solution**:
1. Try vim-style keys: `j` (down), `k` (up), `h` (left), `l` (right)
2. Press `?` to see all available keybindings
3. Try `Ctrl+L` to refresh the display

### Terminal Text is Garbled

**Problem**: Display looks corrupted or cut off
**Solution**:
1. Resize your terminal to a larger size
2. Exit the TUI with `Ctrl+C`
3. Run `bozly tui` again

## Next Steps

### Learn More Keybindings

Press **?** in the TUI to see the help screen with all keybindings.

Or read the full [TUI-KEYBINDINGS.md](./TUI-KEYBINDINGS.md) reference.

### Explore All Features

Check out [TUI-USAGE.md](./TUI-USAGE.md) for:

- Complete screen-by-screen guide
- Tips and tricks
- Advanced usage
- Troubleshooting
- Accessibility features

### Use the CLI

The TUI complements the BOZLY CLI. Use both together:

```bash
# Run commands from CLI
bozly run my-command

# View results in TUI
bozly tui  # (Press 3 for Sessions)
```

## Tips for Faster Navigation

### Use Number Keys for Speed

Instead of arrow-key navigation, just press the number:

```
Press '1' → Home
Press '2' → Vaults
Press '5' → Commands
```

### Search First

When looking for something specific:

```
1. Go to the relevant screen
2. Press '/'
3. Type your search term
4. Press 'n' to jump between results
```

### Keyboard > Mouse

While mouse is supported, keyboard is often faster:

```
j/k       faster than clicking and scrolling
/         faster than manually searching
1-8       faster than navigating menus
```

## Default Configuration

The TUI uses these defaults:

| Setting | Default | Can Change? |
|---|---|---|
| API Server | `http://localhost:3000/api` | `--api-url` |
| Refresh Rate | 5000ms (5 sec) | `--refresh` |
| Color Scheme | Blue/cyan/white | Terminal settings |

Example with custom settings:

```bash
bozly tui --api-url http://remote:3000/api --refresh 2000
```

## Getting Help

### In the TUI

```
Press '?'  → Show keybindings
```

### From Terminal

```bash
bozly tui --help        # Show command help
man bozly-tui           # Man page (if available)
```

### Documentation

- **[TUI-USAGE.md](./TUI-USAGE.md)** - Full user guide
- **[TUI-KEYBINDINGS.md](./TUI-KEYBINDINGS.md)** - Complete keybindings reference
- **[README.md](../README.md)** - BOZLY framework overview

## Quick Reference Card

Print this for your desk:

```
╔═══════════════════════════════════════╗
║       BOZLY TUI QUICK REFERENCE       ║
├─────────────────────────────────────────
║ NAVIGATION       │ ACTIONS           ║
├──────────────────┼───────────────────┤
║ 1-8     Jump    │ /      Search      ║
║ j/k     Move    │ ?      Help        ║
║ gg      Top     │ Ctrl+L Refresh    ║
║ G       Bottom  │ Ctrl+S Save       ║
║ Enter   Select  │ Q      Menu       ║
║ Esc     Back    │ Ctrl+C Quit       ║
╚═════════════════════════════════════════╝
```

---

**TUI Version**: v0.6.0-beta.1
**Last Updated**: 2025-12-27
**Estimated Time**: 5 minutes to first successful use
