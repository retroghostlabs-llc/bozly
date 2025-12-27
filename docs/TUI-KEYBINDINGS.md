# BOZLY TUI - Keybindings Reference

Complete keyboard shortcut reference for the BOZLY Terminal User Interface.

## Quick Reference Table

| Keybinding | Action | Context |
|---|---|---|
| `1`-`8` | Jump to menu item | Global |
| `?` | Show help screen | Global |
| `Q` | Quit to menu | Global |
| `Ctrl+C` | Force quit app | Global |
| `Ctrl+L` | Refresh screen | Global |
| `Ctrl+S` | Save changes | Applicable screens |
| `j` / `↓` | Move down | Lists, menus |
| `k` / `↑` | Move up | Lists, menus |
| `h` / `←` | Move left | Navigation |
| `l` / `→` | Move right | Navigation |
| `gg` | Go to top | Lists |
| `G` | Go to bottom | Lists |
| `/` | Search/filter | Searchable lists |
| `n` | Next result | Search mode |
| `N` | Prev result | Search mode |
| `Tab` | Next field | Forms |
| `Shift+Tab` | Previous field | Forms |
| `Enter` | Select/submit | Everywhere |
| `Esc` | Close/cancel | Modals, forms |
| `d` | Delete item | List items |
| `y` / `Y` | Yes/confirm | Confirmations |
| `n` / `N` | No/cancel | Confirmations |

## Global Keybindings

### Menu Navigation

```
1  →  Home screen
2  →  Vaults screen
3  →  Sessions screen
4  →  Memory screen
5  →  Commands screen
6  →  Workflows screen
7  →  Config screen
8  →  Health screen
```

### Application Control

```
?       Show help screen (keybindings)
Q       Quit to main menu
Ctrl+C  Force quit application
```

### Screen Management

```
Ctrl+L  Refresh current screen
Ctrl+S  Save changes (if applicable)
```

## Navigation Keybindings

### Vim-Style Navigation

```
j  →  Move down (same as ↓)
k  →  Move up (same as ↑)
h  →  Move left (same as ←)
l  →  Move right (same as →)
```

### Arrow Keys

```
↓  →  Move down
↑  →  Move up
←  →  Move left
→  →  Move right
```

### List Navigation

```
gg     Go to top of list
G      Go to bottom of list
Ctrl+F Skip forward (if available)
Ctrl+B Skip backward (if available)
```

## Form Input Keybindings

### Field Navigation

```
Tab        Move to next field
Shift+Tab  Move to previous field
Ctrl+A     Go to beginning of input (in text fields)
Ctrl+E     Go to end of input (in text fields)
Ctrl+U     Clear input (in text fields)
```

### Form Submission

```
Enter      Submit form
Esc        Cancel and close form
Ctrl+C     Force close (discard changes)
```

## List Operations

### Navigation

```
j / ↓         Move down
k / ↑         Move up
h / ← / Esc   Go back (collapse item)
l / →         Enter/expand item
```

### Selection & Editing

```
Space      Toggle selection (if multi-select)
Enter      Select current item
d          Delete selected item(s)
/          Enter search mode
```

### Search

```
/          Enter search mode
Esc        Exit search mode
n          Go to next match
N          Go to previous match
Ctrl+L     Clear search and refresh
```

## Modal & Dialog Keybindings

### Confirmation Dialogs

```
y / Y      Confirm / Yes
n / N      Cancel / No
Tab        Switch between buttons
Enter      Select current button
Esc        Close (defaults to Cancel)
```

### Error Dialogs

```
Enter      Dismiss error
Esc        Dismiss error
q / Q      Dismiss error
```

### Input Modals

```
Tab        Next field
Shift+Tab  Previous field
Enter      Submit
Esc        Cancel
Ctrl+C     Force close
```

## Screen-Specific Keybindings

### Home/Dashboard

```
1-8        Jump to any screen
j/k        Scroll through content
Enter      View details of selected item
```

### Vaults

```
j/k        Navigate vault list
Enter      View vault details
n          Create new vault (if supported)
d          Delete vault (with confirmation)
/          Search vaults
```

### Sessions

```
j/k        Navigate sessions
Enter      View session details
/          Search sessions
d          Delete session (if supported)
```

### Commands

```
j/k        Navigate command list
Enter      View command details
/          Search commands
r          Run command (if supported)
```

### Lists (Generic)

```
gg         Jump to top
G          Jump to bottom
j/k        Move up/down
Enter      Select item
d          Delete item
/          Search
n/N        Next/previous search result
```

## Special Keys Reference

### Enter / Return

```
Context: Form input      → Submit form
Context: List selection  → Select item
Context: Modal           → Confirm action
```

### Escape

```
Context: Modal           → Close modal
Context: Form            → Cancel (discard changes)
Context: Search          → Exit search mode
Context: Menu/list       → Go back
```

### Control Keys

```
Ctrl+A     Go to line beginning (text input)
Ctrl+B     Skip backward / Page up
Ctrl+C     Force quit application
Ctrl+E     Go to line end (text input)
Ctrl+F     Skip forward / Page down
Ctrl+L     Refresh screen
Ctrl+S     Save changes
Ctrl+U     Clear line (text input)
```

## Mouse Support

The TUI supports mouse input:

```
Left Click     Select item or activate button
Scroll Wheel   Scroll in lists
Drag           Drag scrollbars (if available)
Double Click   Open/confirm (on some items)
```

**Note**: Keyboard navigation is always available and often faster than mouse.

## Accessibility Shortcuts

### Screen Reader Support

The TUI supports screen reader navigation:

```
Tab        Navigate through focusable elements
Enter      Activate buttons and links
Arrow Keys Navigate within lists and menus
```

### High Contrast

If text is hard to read, try:

1. Using a different terminal theme
2. Resizing the terminal window
3. Using a different font size in your terminal

## Common Keybinding Patterns

### Navigate to Screen

```
Pattern 1 (Quick): Press number key (1-8)
Pattern 2 (Menu):  Use j/k to move, Enter to select
```

### Search & Filter

```
Press /          → Enter search mode
Type query       → Filter results
Press n          → Next result
Press N          → Previous result
Press Esc        → Exit search
```

### Confirm Action

```
Press action key (e.g., 'd' for delete)
→ Confirmation dialog appears
→ Press 'y' to confirm or 'n' to cancel
```

### Navigate Forms

```
Tab       → Move to next field
Enter     → Submit when done
Esc       → Cancel form
Ctrl+C    → Force close (discard changes)
```

## Troubleshooting Keybindings

### Keybinding Not Working

1. Make sure the focused element supports that key
2. Check if it's a global or screen-specific binding
3. Try `Ctrl+L` to refresh the screen
4. Check the help screen with `?`

### Arrow Keys Not Working

Some terminals require special configuration:

1. Make sure your terminal supports arrow keys
2. Try vim-style keys (`j/k/h/l`) instead
3. Try `Ctrl+B` (back) and `Ctrl+F` (forward) for up/down

### Mouse Not Working

If mouse isn't responding:

1. Try keyboard navigation instead (fully supported)
2. Check if your terminal has mouse support enabled
3. Try a different terminal emulator

### Special Character Keys Not Working

If keys like `/` or `?` don't work:

1. Check your keyboard layout
2. Try holding Shift if needed
3. Consult your terminal's documentation

## Custom Keybindings

Currently, BOZLY TUI uses fixed keybindings. Custom keybinding support is planned for future releases.

## Getting Help

### In-App Help

```
Press '?'  → Show keybindings help
```

### More Information

- See [TUI-USAGE.md](./TUI-USAGE.md) for navigation guide
- Check [README.md](../README.md) for framework overview
- Run `bozly tui --help` for command options

---

**TUI Version**: v0.6.0-beta.1
**Keybindings Version**: 1.0
**Last Updated**: 2025-12-27

### Changelog

#### v1.0 (Initial Release)
- Complete vim-style navigation support
- Global menu shortcuts (1-8)
- Form and modal support
- Search functionality
- Mouse support
- Confirmation dialogs
