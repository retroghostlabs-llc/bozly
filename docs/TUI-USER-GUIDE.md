# BOZLY Terminal UI (TUI) User Guide

Complete guide to using the BOZLY Terminal User Interface Dashboard.

**Status:** ✅ Production Ready (v0.6.0+)
**Coverage:** 90%+ test coverage on all core modules (@unblessed/blessed)
**Last Updated:** December 27, 2025

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Starting the TUI](#starting-the-tui)
3. [Main Screens](#main-screens)
4. [Navigation](#navigation)
5. [Keyboard Shortcuts](#keyboard-shortcuts)
6. [Common Tasks](#common-tasks)
7. [Tips & Tricks](#tips--tricks)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- BOZLY v0.5.0 or later installed
- `bozly serve` API server running (listens on http://127.0.0.1:3847 by default, or configured port)
- Terminal with 80+ column width, 24+ row height (for optimal display)

### Launch in 2 Steps

```bash
# Terminal 1: Start the BOZLY API server
bozly serve

# Terminal 2: Launch the interactive TUI
bozly tui
```

The TUI will:
- Connect to the running API server
- Load all vaults and their data
- Display the interactive home screen
- Update in real-time as you work

---

## Starting the TUI

### Basic Launch

```bash
bozly tui
```

### With Custom Server

```bash
# If bozly serve is running on a different port
bozly tui --api-url http://localhost:8000/api
```

### With Custom Refresh Rate

```bash
# Update data every 10 seconds (default: 5 seconds)
bozly tui --refresh 10000
```

### Exit the TUI

Press `q` to gracefully exit and return to your terminal.

---

## Main Screens

The TUI provides 8 main screens accessible via keyboard navigation:

### 1. **Home Dashboard**

The main overview screen showing:
- System status and health
- Total vault count
- Recent session summary
- Quick statistics

**Access:** Press `H` from any screen or on startup

**Features:**
- See at-a-glance system health
- View total storage usage
- Recent activity summary
- Navigation quick reference

### 2. **Vaults Screen**

Browse and manage all registered BOZLY vaults.

**Access:** Press `V`

**Features:**
- List all vaults with details
- View vault status (active, idle, error)
- See vault creation date
- View vault configuration
- Navigate to vault sessions and commands

**Actions:**
- `↓/↑` or `j/k` - Navigate vaults
- `Enter` - View vault details
- `E` - Edit vault configuration
- `D` - Delete vault (with confirmation)

### 3. **Sessions Screen**

View command execution history across all vaults.

**Access:** Press `S`

**Features:**
- List all sessions in chronological order
- Filter by vault, provider, or status
- Search session content
- Compare execution results
- View session details (context, prompt, output)

**Actions:**
- `↓/↑` or `j/k` - Navigate sessions
- `Enter` - View session full details
- `/` - Search within sessions
- `C` - Compare two sessions
- `D` - Delete session
- `F` - Filter by vault or provider

### 4. **Commands Screen**

Browse available commands across all vaults.

**Access:** Press `C`

**Features:**
- List global and vault-specific commands
- View command purpose and usage
- See execution statistics
- Find commands by keyword
- View command template

**Actions:**
- `↓/↑` or `j/k` - Navigate commands
- `Enter` - View command details
- `/` - Search for command
- `R` - Run command (interactive)
- `E` - Edit command
- `D` - Delete command

### 5. **Workflows Screen**

View and manage multi-step automated processes.

**Access:** Press `W`

**Features:**
- List all workflows
- View workflow steps and conditions
- See execution history
- View success/failure statistics

**Actions:**
- `↓/↑` or `j/k` - Navigate workflows
- `Enter` - View workflow details
- `R` - Run workflow
- `E` - Edit workflow
- `D` - Delete workflow

### 6. **Memory Screen**

Browse extracted knowledge and learning records.

**Access:** Press `M`

**Features:**
- View extracted memory entries
- See extraction date and source sessions
- Search across all memories
- View memory content
- See memory relationships

**Actions:**
- `↓/↑` or `j/k` - Navigate memories
- `Enter` - View memory entry
- `/` - Search memories
- `D` - Delete memory entry
- `E` - Edit memory notes

### 7. **Configuration Screen**

View and modify system and vault settings.

**Access:** Press `O` (for settings/Options)

**Features:**
- View all configuration options
- See current provider settings
- View cache and performance settings
- Display timezone configuration
- Show API connection details

**Actions:**
- `↓/↑` - Navigate settings
- `Enter` - Edit setting value
- `R` - Reset setting to default
- `S` - Save all changes

### 8. **Health Screen**

Monitor BOZLY API server status and health.

**Access:** Press `H` (when not on Home)

**Features:**
- View API server status
- See uptime and memory usage
- Display last sync time
- View connected vaults status
- Show database statistics

**Actions:**
- `R` - Refresh health status manually
- `T` - Show detailed timing information

---

## Navigation

### Global Navigation

Navigate between screens from anywhere using:

- **Number Keys:** 1-8 jump directly to screen (1=Home, 2=Vaults, 3=Sessions, etc.)
- **HJKL Keys:** Vim-style navigation (H=Home, J=down, K=up, L=right)
- **Arrow Keys:** Standard arrow key navigation
- **Tab:** Next screen in sequence
- **Shift+Tab:** Previous screen in sequence

### List Navigation

Within list screens (Vaults, Sessions, Commands):

- **↓** or **j** - Move down
- **↑** or **k** - Move up
- **G** - Go to end of list
- **gg** - Go to beginning of list
- **PgDn** or **d** - Page down
- **PgUp** or **u** - Page up

### In Dialogs/Modals

- **Tab** - Next field
- **Shift+Tab** - Previous field
- **Enter** - Confirm/Submit
- **Esc** - Cancel/Close

---

## Keyboard Shortcuts

### Universal Shortcuts (All Screens)

| Key | Action |
|-----|--------|
| `H` | Home Dashboard |
| `V` | Vaults Screen |
| `S` | Sessions Screen |
| `C` | Commands Screen |
| `W` | Workflows Screen |
| `M` | Memory Screen |
| `O` | Configuration Screen |
| `?` | Show help |
| `q` | Quit TUI |
| `r` | Refresh current view |
| `/` | Search (in list screens) |

### Navigation Shortcuts

| Key | Action |
|-----|--------|
| `j/↓` | Move down |
| `k/↑` | Move up |
| `h/←` | Move left |
| `l/→` | Move right |
| `gg` | Go to top |
| `G` | Go to bottom |
| `PgUp/u` | Page up |
| `PgDn/d` | Page down |
| `Enter` | Select/Open item |

### Action Shortcuts (In List Screens)

| Key | Action |
|-----|--------|
| `e` | Edit item |
| `d` | Delete item |
| `r` | Run/Execute item |
| `c` | Compare (sessions only) |
| `f` | Filter |
| `s` | Sort |
| `y` | Copy to clipboard |

---

## Common Tasks

### View Recent Sessions

1. Press `S` to open Sessions Screen
2. Sessions are listed chronologically (newest first)
3. Press `Enter` on a session to view details
4. Press `Esc` to return to list

### Run a Command

**From Commands Screen:**
1. Press `C` to open Commands Screen
2. Navigate to desired command
3. Press `R` to run
4. Fill in any required parameters
5. Press `Enter` to execute
6. View results in session output

**From Vaults Screen:**
1. Press `V` to open Vaults Screen
2. Press `Enter` on a vault
3. Navigate to vault's commands section
4. Press `R` to run command

### Create a New Command

1. Press `C` to open Commands Screen
2. Press `N` for new command
3. Fill in command details:
   - Name (e.g., `summarize-notes`)
   - Purpose (e.g., "Create concise summary of notes")
   - Template (the prompt/instructions)
4. Press `Enter` to save
5. Command appears in list immediately

### Compare Two Sessions

1. Press `S` to open Sessions Screen
2. Navigate to first session
3. Press `C` to mark for comparison
4. Navigate to second session
5. Press `C` to compare
6. View side-by-side comparison
7. Press `Esc` to close comparison

### Search Sessions

1. Press `S` to open Sessions Screen
2. Press `/` to open search
3. Type search query (searches content, metadata, results)
4. Press `Enter` to search
5. Results appear in list
6. Press `Esc` to clear search

### Filter Sessions by Vault

1. Press `S` to open Sessions Screen
2. Press `F` to open filter
3. Select "Vault" filter type
4. Choose vault from dropdown
5. List updates to show only that vault's sessions

### View System Configuration

1. Press `O` to open Configuration Screen
2. Scroll through all settings
3. Press `Enter` on a setting to edit
4. Change value and press `Enter`
5. Press `S` to save all changes
6. Press `Esc` if you want to discard changes

---

## Tips & Tricks

### Performance Tips

- **Refresh Rate:** If TUI is slow, increase refresh interval: `bozly tui --refresh 10000`
- **List Size:** Most lists show 20-50 items; use search (`/`) to narrow results quickly
- **Cache:** Configuration and vault lists are cached; press `R` to force refresh

### Workflow Tips

- **Common Pattern:** Vaults → Sessions → Session Details → Run Related Command
- **Quick Jump:** Use number keys (1-8) to jump directly to screen instead of navigating
- **Undo/Redo:** Use `Ctrl+Z` to undo deletions (where supported)

### Search Tips

- **Search Syntax:** Use plain text or regex patterns
- **Session Search:** Searches context, prompt, results, and metadata
- **Command Search:** Searches name, purpose, and template
- **Fuzzy Matching:** Try partial matches (e.g., `summar` finds `summarize`)

### Navigation Tips

- **Vim Mode:** If you're familiar with vim, navigation is natural (hjkl, gg, G, etc.)
- **Mouse Support:** Click on items to select (experimental, not all terminals)
- **Keyboard Only:** All features accessible via keyboard (recommended)

### Data Export

- **Copy to Clipboard:** Select an item and press `Y` to copy
- **Export Session:** Open session detail and look for export option
- **Export List:** Some lists support `E` to export (CSV/JSON)

---

## Troubleshooting

### TUI Won't Start

**Error:** "BOZLY API server not running"

**Solution:**
```bash
# In another terminal, start the API server
bozly serve

# The server should run on http://127.0.0.1:3847 by default (or your configured BOZLY_PORT)
# Wait a few seconds for server to start, then try bozly tui again
```

**Error:** "Connection refused"

**Solution:**
- Check that `bozly serve` is running: `ps aux | grep bozly`
- Try `bozly serve --port 3001` if 3000 is in use
- Use custom URL when launching TUI: `bozly tui --api-url http://localhost:3001/api`

### TUI is Slow

**Problem:** Navigation lag or slow screen updates

**Solutions:**
1. Increase refresh interval: `bozly tui --refresh 10000`
2. Close other resource-heavy applications
3. Check terminal capabilities: some terminals don't support complex rendering
4. Use simpler terminal themes (disable colors if needed)

### Items Not Updating

**Problem:** Sessions, commands, or memories don't appear to update

**Solutions:**
1. Press `R` to manually refresh current screen
2. Switch to different screen and back (forces refresh)
3. Increase refresh interval if server is busy
4. Check `Health` screen to see if API server is healthy

### Display Issues

**Problem:** Text appears garbled or text overlaps

**Solutions:**
1. Resize terminal to at least 80×24 characters
2. Use a modern terminal emulator (iTerm2, Windows Terminal, Alacritty)
3. Try different terminal color scheme
4. Check terminal encoding (should be UTF-8)

### Commands Won't Execute

**Problem:** Pressing `R` to run command does nothing

**Solutions:**
1. Verify `bozly serve` is running (check Health screen)
2. Check command prerequisites (required AI CLI installed)
3. Review command configuration (might be invalid)
4. Check Health screen for API errors

### Data Disappeared

**Problem:** Sessions, commands, or vaults vanished

**Solutions:**
1. Check you're connected to correct server (API url)
2. Press `R` to refresh
3. Check `.bozly/` directory in vault - data should still be there
4. Restart `bozly serve` to reload all data

---

## Getting Help

- **In TUI:** Press `?` to view context-sensitive help
- **Command Help:** `bozly tui --help` shows all options
- **Issue Reporting:** Report bugs at https://github.com/RetroGhostLabs/bozly/issues
- **Documentation:** Full BOZLY docs at https://bozly.io/docs

---

## Keyboard Reference Card

```
═════════════════════════════════════════════════════════════
                 BOZLY TUI KEYBOARD REFERENCE
═════════════════════════════════════════════════════════════

SCREENS                      NAVIGATION               ACTIONS
───────────────────────────  ───────────────────────  ───────────────────
H - Home          W - Workflows
V - Vaults        M - Memory              j/↓ - Down      e - Edit
S - Sessions      O - Config              k/↑ - Up        d - Delete
C - Commands      ? - Help                h/← - Left      r - Run
                  q - Quit                l/→ - Right     / - Search

GLOBAL SHORTCUTS
────────────────────────────────────────────────────────────
R - Refresh       Tab - Next Screen       Esc - Cancel/Back
Enter - Open      Shift+Tab - Prev Screen Y - Copy to Clipboard

POSITION SHORTCUTS
────────────────────────────────────────────────────────────
gg - Top           G - Bottom             PgUp - Page Up   PgDn - Page Down

═════════════════════════════════════════════════════════════
```

---

**Pro Tip:** Master the vim-style navigation (hjkl, gg, G) and number keys (1-8) for screen jumping to become a power user!
