# BOZLY TUI Dashboard - User Guide

Welcome to the BOZLY Terminal User Interface (TUI) Dashboard! This guide covers everything you need to know about using the interactive terminal dashboard.

## Quick Start

### Launching the TUI

```bash
# Start the BOZLY TUI dashboard
bozly tui

# Optional: Specify custom API server
bozly tui --api-url http://localhost:3001/api

# Optional: Change data refresh interval (milliseconds)
bozly tui --refresh 2000
```

### Prerequisites

Before launching the TUI, make sure the BOZLY API server is running:

```bash
bozly serve
```

The API server defaults to `http://localhost:3000/api`. The TUI will check for API availability on startup and provide helpful error messages if the server is not running.

## Main Interface

The TUI dashboard consists of several key areas:

### Left Sidebar Menu

The left sidebar shows the main navigation menu with these options:

- **[1] Home** - Dashboard overview
- **[2] Vaults** - View and manage vaults
- **[3] Sessions** - View session history
- **[4] Memory** - View memory entries
- **[5] Commands** - Browse available commands
- **[6] Workflows** - View and manage workflows
- **[7] Config** - View system configuration
- **[8] Health** - View API health status
- **[?] Help** - Show keybindings help
- **[Q] Quit** - Exit the TUI

### Main Content Area

The main content area (right side of the screen) displays information for the currently selected screen. This area may include:

- Text content
- Lists of items
- Forms for input
- Status information

### Status Bar

The status bar at the bottom shows contextual help and available actions for the current screen.

## Navigation

### Using the Menu

#### Quick Menu Navigation (Numbers 1-8)

Press any number key 1-8 to jump directly to a menu item:

```
Press '1' → Jump to Home screen
Press '2' → Jump to Vaults screen
Press '3' → Jump to Sessions screen
... etc
```

#### Alternative: Arrow Keys

Press arrow keys to navigate the menu (if available):

```
↑/↓ or j/k → Move between menu items
→/l        → Enter selected menu item
←/h        → Go back
```

### Within Lists

Navigate list content using vim-style keybindings:

```
j or ↓    → Move down
k or ↑    → Move up
h or ←    → Move left
l or →    → Move right
gg        → Go to top of list
G         → Go to bottom of list
/         → Search/filter (if supported)
n         → Next search result
N         → Previous search result
Enter     → Select item
d         → Delete item (if supported)
```

### Within Forms

Navigate form fields using Tab and Shift+Tab:

```
Tab       → Next field
Shift+Tab → Previous field
Enter     → Submit form
Esc       → Cancel
```

## Global Keybindings

These keybindings work everywhere in the TUI:

### Navigation

```
[1-8]      Jump to menu item by number
[?]        Show help screen
```

### Actions

```
[Ctrl+L]   Refresh current screen
[Ctrl+S]   Save changes (if applicable)
[Q]        Quit to menu
[Ctrl+C]   Force quit application
```

### Modals & Forms

```
[Esc]      Close modal or cancel form
[Enter]    Submit form or confirm action
[Tab]      Next field (in forms)
[Shift+Tab] Previous field (in forms)
```

## Screen Guide

### Home / Dashboard Screen

The home screen provides an overview of your BOZLY system:

- **System Overview**: Total count of vaults, sessions, commands, and success rate
- **Recent Sessions**: List of your last 5 sessions with status
- **Quick Actions**: Shortcuts to common operations

### Vaults Screen

Manage your BOZLY vaults:

- View all registered vaults
- See vault status and configuration
- Create new vaults (if supported)
- Switch between vaults

Navigate with `j/k` or arrow keys. Press `Enter` to view vault details.

### Sessions Screen

View your command execution history:

- See all previous sessions
- Check session status (success/failure/pending)
- View session duration
- Access session output

Use `/` to search sessions. Filter by vault or date range (if supported).

### Memory Screen

View and manage your memory entries:

- Browse extracted knowledge from sessions
- View memory categories
- Search memory content

Memory helps preserve context across sessions.

### Commands Screen

Browse available commands in your vaults:

- See all available commands
- View command descriptions
- Check command parameters
- Run commands from here (if supported)

### Workflows Screen

View and manage workflows:

- See all workflows in your vaults
- Check workflow status
- View workflow steps
- Monitor workflow execution

### Config Screen

View system configuration:

- BOZLY version
- API server location
- Cache settings
- Vault locations
- Other configuration details

### Health Screen

Monitor API server health:

- API status (running/down)
- Response time
- API version
- Database status (if applicable)

## Common Tasks

### Switching Between Screens

**Method 1: Number Keys**
```
Press '1' → Home screen
Press '2' → Vaults screen
```

**Method 2: Directional Navigation**
```
j/k      → Move menu cursor
Enter    → Enter selected screen
```

### Searching Items

Within list screens that support search:

```
Press '/' → Enter search mode
Type search term → Filter results
n         → Go to next match
N         → Go to previous match
Esc       → Exit search
```

### Refreshing Data

```
Press Ctrl+L → Refresh current screen
```

Auto-refresh happens every 5 seconds (configurable with --refresh flag).

### Confirming Actions

When a confirmation dialog appears:

```
y or Y    → Yes/Confirm
n or N    → No/Cancel
Tab       → Switch between buttons
Enter     → Select current button
Esc       → Cancel (defaults to No)
```

## Error Messages

### "API Server Not Running"

The TUI cannot connect to the API server.

**Solution:**
```bash
# Start the BOZLY API server
bozly serve

# Verify it's running on the correct port
curl http://localhost:3000/api/health
```

### "Vault Not Found"

The vault you're trying to access doesn't exist or has been deleted.

**Solution:**
- Go to Vaults screen (press 2)
- Create a new vault if needed
- Verify vault exists in your filesystem

### "Session Failed"

A command execution session returned an error.

**What to do:**
- Check the error message in the session details
- Review the command that was run
- Check your API configuration
- Try running the command again

## Tips & Tricks

### Efficient Navigation

```
# Jump directly between screens
Press '1' → Home
Press '2' → Vaults
Press '3' → Sessions
# No need to press Esc each time!
```

### Working with Lists

```
# Efficiently navigate large lists
gg  → Jump to top
G   → Jump to bottom
Ctrl+L → Refresh list
/   → Find specific item
```

### Form Entry

```
# Move through forms quickly
Tab → Next field
^C  → Cancel (force quit if needed)
Enter → Submit
```

### Recovery

If the TUI becomes unresponsive:

```
Ctrl+C    → Force quit the TUI
bozly tui → Restart the TUI
```

## Troubleshooting

### Terminal Rendering Issues

If text appears garbled or cut off:

```bash
# Try resizing your terminal to a larger size
# Or restart the TUI
bozly tui
```

### Slow Performance

If the TUI feels slow:

```bash
# Increase refresh interval
bozly tui --refresh 10000  # Refresh every 10 seconds

# Or decrease it for more responsiveness
bozly tui --refresh 2000   # Refresh every 2 seconds
```

### Mouse Support

The TUI supports mouse input:

- **Click** items to select them
- **Scroll** with mouse wheel in lists
- **Drag** scrollbars (if available)

Keyboard navigation is still fully supported and may be faster for power users.

## Accessibility

### Keyboard-Only Navigation

The TUI is fully navigable with keyboard. No mouse required.

### Color Scheme

The default color scheme uses:

- **Cyan**: Borders and headers
- **White**: Text and selected items
- **Blue**: Buttons and input fields
- **Red**: Error messages and warnings
- **Green**: Success messages

If colors appear incorrect, verify your terminal supports 256 colors or True Color (24-bit).

## Integration with BOZLY CLI

The TUI is integrated with the BOZLY CLI. You can:

- **View sessions** created by CLI commands
- **Browse commands** available for CLI
- **Monitor workflows** started from CLI
- **Check memory** extracted from CLI operations

Changes made in the TUI are immediately reflected in the CLI and vice versa.

## Advanced Usage

### Custom API Server

```bash
# Connect to a remote BOZLY server
bozly tui --api-url https://remote-server.com/api
```

### Performance Tuning

```bash
# Faster updates (use with caution - impacts performance)
bozly tui --refresh 1000

# Slower updates (useful for high latency connections)
bozly tui --refresh 15000
```

## Getting Help

### In-App Help

```
Press '?'  → Show keybindings help
```

### Command Help

```bash
bozly tui --help   # Show command options
```

## Next Steps

- Check out [TUI-KEYBINDINGS.md](./TUI-KEYBINDINGS.md) for a complete keybindings reference
- Read the [BOZLY README](../README.md) for framework overview
- Explore the [Commands Guide](./COMMANDS.md) for CLI usage

---

**TUI Version**: v0.6.0-beta.1
**Last Updated**: 2025-12-27
