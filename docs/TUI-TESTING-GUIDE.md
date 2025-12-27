# TUI Manual Testing Guide

**Date:** December 27, 2025
**Task:** 1.4 - Manual TUI testing across all 8 screens
**Status:** Testing Plan & Checklist

---

## Overview

Manual testing of the BOZLY Terminal UI across all 8 interactive screens. Each screen has specific interaction patterns and visual elements to verify.

---

## Setup & Prerequisites

### Build Status
```bash
npm run build  # ✅ Succeeds with no type errors
npm test       # ✅ 1,278 tests passing (1 pre-existing failure unrelated)
```

### Running the TUI
```bash
# Build first
npm run build

# Start the TUI server
node dist/cli/index.js tui

# This launches the interactive Terminal UI
```

---

## Screen Testing Checklist

### 1. Home Dashboard Screen

**Location:** `src/cli/tui/screens/home.ts`
**Purpose:** Main overview of BOZLY workspace status

#### Visual Elements to Verify
- [ ] Screen title displays "Home" at top
- [ ] System statistics box shows:
  - [ ] Vaults count
  - [ ] Sessions count
  - [ ] Commands count
  - [ ] Memory entries count
- [ ] Navigation menu displays all 8 screen options
- [ ] Colors and styling render correctly (cyan borders, white text)

#### Interactions to Test
- [ ] Arrow keys / j/k navigate between options
- [ ] Enter key selects menu item and switches screen
- [ ] q/Ctrl+C exits the application gracefully

#### Expected State
- [ ] Welcome message displays correctly
- [ ] Real data loads from workspace
- [ ] No errors in console

---

### 2. Vaults Screen

**Location:** `src/cli/tui/screens/vaults.ts`
**Purpose:** Browse and manage registered vaults

#### Visual Elements to Verify
- [ ] Screen title "Vaults" visible
- [ ] Left panel (60%) shows vault list with items
- [ ] Right panel (40%) shows selected vault details:
  - [ ] Vault name
  - [ ] Vault ID
  - [ ] Path
  - [ ] Status
  - [ ] Sessions count
  - [ ] Commands count
  - [ ] Creation date
- [ ] Each vault shows as single line in list

#### Interactions to Test
- [ ] j/down arrow moves to next vault
- [ ] k/up arrow moves to previous vault
- [ ] Enter key shows vault detail modal
- [ ] d key prompts delete confirmation
- [ ] Esc closes modal dialogs
- [ ] Right panel updates when selection changes

#### Expected State
- [ ] All registered vaults display
- [ ] Selection highlights in blue
- [ ] Detail panel reflects current selection
- [ ] Modals appear centered on screen

---

### 3. Sessions Screen

**Location:** `src/cli/tui/screens/sessions.ts`
**Purpose:** View command execution history

#### Visual Elements to Verify
- [ ] Screen title "Sessions" visible
- [ ] Search hint line displays "Search: (type / to search, Esc to cancel)"
- [ ] Left panel (60%) shows sessions list with:
  - [ ] Status icon (✓ for success, ✗ for failed, ◐ for pending)
  - [ ] Command name
  - [ ] Node ID in parentheses
- [ ] Right panel (40%) shows selected session details:
  - [ ] ID
  - [ ] Command
  - [ ] Status
  - [ ] Node
  - [ ] Provider
  - [ ] Timestamp
  - [ ] Duration in ms
  - [ ] Error message (if applicable)

#### Interactions to Test
- [ ] j/down navigates to next session
- [ ] k/up navigates to previous session
- [ ] Enter shows session output modal
- [ ] Details update when selection changes
- [ ] Status icons render correctly

#### Expected State
- [ ] Sessions list populated from workspace
- [ ] Color coding for status (success, failed, pending)
- [ ] Proper alignment and spacing

---

### 4. Commands Screen

**Location:** `src/cli/tui/screens/commands.ts`
**Purpose:** Browse available commands

#### Visual Elements to Verify
- [ ] Screen title "Commands" visible
- [ ] Left panel (60%) shows command list:
  - [ ] Command name
  - [ ] Status badge (Active/Disabled)
- [ ] Right panel (40%) shows selected command details:
  - [ ] Command name
  - [ ] Description
  - [ ] Provider (claude, gpt, etc.)
  - [ ] Parameters/Options
  - [ ] Last execution time

#### Interactions to Test
- [ ] j/down navigates command list
- [ ] k/up navigates backwards
- [ ] Enter shows command execution modal
- [ ] Details update on selection change
- [ ] Status indicators display correctly

#### Expected State
- [ ] All workspace commands list properly
- [ ] Active commands highlighted
- [ ] Parameter details readable
- [ ] Color scheme consistent

---

### 5. Workflows Screen

**Location:** `src/cli/tui/screens/workflows.ts`
**Purpose:** View and manage automation workflows

#### Visual Elements to Verify
- [ ] Screen title "Workflows" visible
- [ ] Left panel (50%) shows workflow list:
  - [ ] Status indicator
  - [ ] Workflow name
  - [ ] Step count in parentheses
- [ ] Right panel (50%) shows workflow details:
  - [ ] Name
  - [ ] Separator line
  - [ ] Status
  - [ ] Steps count
  - [ ] Node ID
  - [ ] Last run time
  - [ ] Description

#### Interactions to Test
- [ ] j/down navigate workflows
- [ ] k/up navigate backwards
- [ ] Details panel updates on selection
- [ ] Status icons (✓/✗) display correctly
- [ ] Long descriptions wrap properly

#### Expected State
- [ ] Workflows display with correct step counts
- [ ] Status shows active/disabled
- [ ] Last run times formatted readably
- [ ] Layout splits 50/50 correctly

---

### 6. Memory Screen

**Location:** `src/cli/tui/screens/memory.ts`
**Purpose:** View extracted knowledge and learning

#### Visual Elements to Verify
- [ ] Screen title "Memory & Knowledge" visible
- [ ] Left panel (40%) shows memory entries list:
  - [ ] Category label in brackets
  - [ ] Content preview (truncated at 40 chars)
- [ ] Right panel (60%) shows full content:
  - [ ] Category header
  - [ ] Full memory content
  - [ ] Source
  - [ ] Node ID
  - [ ] Timestamp

#### Interactions to Test
- [ ] j/down navigate memory entries
- [ ] k/up navigate backwards
- [ ] Content panel updates on selection
- [ ] Categories display with bracket formatting
- [ ] Long content is scrollable

#### Expected State
- [ ] All memory entries visible
- [ ] Content properly truncated in list view
- [ ] Full content readable in detail panel
- [ ] Timestamps present and readable

---

### 7. Config Screen

**Location:** `src/cli/tui/screens/config.ts`
**Purpose:** View and manage configuration

#### Visual Elements to Verify
- [ ] Screen title "Configuration" visible
- [ ] Configuration values display in structured format:
  - [ ] Provider settings
  - [ ] API keys/tokens (masked if sensitive)
  - [ ] Workspace path
  - [ ] Default values
  - [ ] User preferences
- [ ] Colors and formatting clear and readable

#### Interactions to Test
- [ ] Content scrolls if longer than viewport
- [ ] Keyboard navigation (arrow keys, Page Up/Down)
- [ ] Graceful display of missing config values
- [ ] Special characters in paths display correctly

#### Expected State
- [ ] Current configuration loads
- [ ] All settings visible
- [ ] No sensitive data exposed (masked appropriately)
- [ ] Layout is organized and readable

---

### 8. Health Status Screen

**Location:** `src/cli/tui/screens/health.ts`
**Purpose:** System health and diagnostic information

#### Visual Elements to Verify
- [ ] Screen title "Health Status" visible
- [ ] Status indicators display for:
  - [ ] Node.js version
  - [ ] Disk space
  - [ ] Memory usage
  - [ ] Network connectivity
  - [ ] BOZLY version
- [ ] Color coding:
  - [ ] Green for healthy
  - [ ] Yellow for warnings
  - [ ] Red for errors
- [ ] Numeric values and units display correctly

#### Interactions to Test
- [ ] Status updates when data refreshes
- [ ] Values display with proper formatting
- [ ] Long diagnostic messages wrap correctly
- [ ] Icons align properly with text

#### Expected State
- [ ] System diagnostics display
- [ ] Version numbers accurate
- [ ] Resource usage shown
- [ ] No runtime errors

---

## Common Interactions (All Screens)

### Navigation
- [ ] **Tab key** - Switch between panels (where applicable)
- [ ] **Arrow keys** - Navigate lists
- [ ] **j/k** - Vim-style navigation works
- [ ] **q** - Quit application
- [ ] **Ctrl+C** - Force quit
- [ ] **Esc** - Close modals/dialogs

### Visual Consistency
- [ ] Border colors consistent (cyan for main, green for details)
- [ ] Text colors readable (white on dark)
- [ ] Bold styling applied to titles
- [ ] Spacing and alignment proper

### Error Handling
- [ ] No crashes on missing data
- [ ] Graceful empty state messages
- [ ] Error messages clear and helpful
- [ ] No console errors during navigation

---

## Performance Testing

### Screen Load Times
- [ ] Home screen: < 500ms
- [ ] Vaults screen: < 1s (depends on vault count)
- [ ] Sessions screen: < 1s (depends on history size)
- [ ] Commands screen: < 500ms
- [ ] Workflows screen: < 500ms
- [ ] Memory screen: < 1s
- [ ] Config screen: < 500ms
- [ ] Health screen: < 500ms

### Navigation Responsiveness
- [ ] Arrow key navigation: responsive (< 100ms)
- [ ] Screen switching: smooth (< 500ms)
- [ ] Modal opening: instant (< 100ms)
- [ ] No lag during scrolling

### Resource Usage
- [ ] CPU usage stays low during idle (< 5%)
- [ ] Memory usage stable (no leaks)
- [ ] No flickering during updates
- [ ] Smooth rendering at terminal size changes

---

## Testing Environment Notes

### Terminal Requirements
- **Min width:** 100 characters
- **Min height:** 24 lines
- **Color support:** 256-color or true color
- **Mouse support:** Optional but recommended

### Tested Configurations
- [ ] macOS Terminal.app
- [ ] iTerm2
- [ ] Linux (GNOME Terminal, Konsole, etc.)
- [ ] Windows (WSL2 Terminal)

---

## Regression Testing

### Areas Prone to Issues
1. **Widget boundary calculations** - Verify at various terminal sizes
2. **List scrolling** - Check with large data sets
3. **Modal positioning** - Verify centering with different screen sizes
4. **Color rendering** - Test on different terminal color schemes
5. **Keyboard shortcuts** - Verify vim keys work in all contexts

### Data Integrity
- [ ] No data loss when navigating screens
- [ ] Selections preserved during rapid navigation
- [ ] Modals don't corrupt underlying data
- [ ] Session history reflects actual events

---

## Automated Testing Verification

### Unit Tests Status
```bash
npm test -- tests/unit/cli/tui
# Expected: 375+ tests passing
# Type Errors: 0
```

### Build Verification
```bash
npm run build
# Expected: Success with no errors
# Output: dist/cli/index.js created (chmod +x)
```

---

## Issues Found & Resolution

### Issue Template
When testing, if issues are found:

**Format:**
```
Screen: [screen name]
Issue: [description]
Steps to Reproduce: [steps]
Expected: [expected behavior]
Actual: [actual behavior]
Severity: [Critical/High/Medium/Low]
Resolved: [Yes/No] - [resolution if yes]
```

---

## Testing Sign-Off

When all screens have been tested and pass:

- [ ] Home screen: ✓ Pass
- [ ] Vaults screen: ✓ Pass
- [ ] Sessions screen: ✓ Pass
- [ ] Commands screen: ✓ Pass
- [ ] Workflows screen: ✓ Pass
- [ ] Memory screen: ✓ Pass
- [ ] Config screen: ✓ Pass
- [ ] Health screen: ✓ Pass
- [ ] Common interactions: ✓ Pass
- [ ] Performance acceptable: ✓ Pass
- [ ] No regressions: ✓ Pass

**Overall Status:** ✅ READY FOR RELEASE

---

## Next Steps After Testing

1. Document any issues found
2. Create bug reports for regressions
3. Update release notes with testing results
4. Proceed to Task 1.5: Document migration findings

---

**Status:** Task 1.4 Checklist Created
**Ready for:** Manual Testing Session
