# BOZLY Troubleshooting Guide

This guide helps you solve common issues with BOZLY.

---

## Terminal Compatibility Mode Warning

### Symptom
When running `bozly tui`, you see a warning message:

```
⚠️  Terminal Compatibility Mode
───────────────────────────────────────────────────────────
Your terminal's xterm-256color definition has compatibility issues.
BOZLY is running in degraded mode with reduced styling.
```

### What This Means
Your system's terminfo database has a malformed `xterm-256color` terminal definition. BOZLY detects this and automatically falls back to a simplified terminal mode to ensure functionality. The TUI will still work, but with reduced styling and UI elements.

### Root Cause
The issue is in the terminal capability database (terminfo), specifically the `Setulc` (set underline color) capability. This commonly happens on:

- **macOS**: Outdated terminfo database
- **Linux**: Systems with stale or corrupted terminfo cache
- **SSH/Remote shells**: Custom terminal definitions
- **Docker containers**: Minimal base images without updated terminfo

### Solution

#### Option 1: macOS (Recommended)
```bash
# Using Homebrew (easiest)
brew reinstall ncurses

# Verify the fix
infocmp xterm-256color | grep -i setulc
```

#### Option 2: Ubuntu/Debian Linux
```bash
# Update terminfo package
sudo apt-get update
sudo apt-get install --reinstall ncurses-bin

# Verify the fix
infocmp xterm-256color | grep -i setulc
```

#### Option 3: Manual Terminfo Rebuild (Any System)
```bash
# Rebuild from system source
sudo tic -x /usr/share/terminfo/x/xterm-256color

# Or download and rebuild from latest source
curl https://invisible-island.net/datafiles/current/terminfo.src.gz | \
  gunzip | sudo tic -x -

# Verify the fix
infocmp xterm-256color | grep -i setulc
```

#### Option 4: Clear Terminfo Cache
```bash
# Remove cached terminfo
rm -rf ~/.terminfo

# Rebuild user terminfo
tic /usr/share/terminfo/x/xterm-256color 2>/dev/null || true
```

### Verification
After applying a fix, restart your terminal and run:

```bash
bozly tui
```

The warning should no longer appear, and the TUI will have full styling and UI elements.

---

## TUI Not Displaying

### Symptom
The TUI command runs but shows a blank screen with no content.

### Solutions

**Check if API server is running:**
```bash
# In one terminal, start the API server
bozly serve

# In another terminal, start the TUI
bozly tui
```

**Verify API connectivity:**
```bash
# Check if API is responding
curl http://127.0.0.1:3847/api/health

# Or check with different port
curl http://127.0.0.1:3847/api/vaults
```

**Check for errors:**
```bash
# Run with debug output
BOZLY_DEBUG=true bozly tui
```

---

## TUI Crashes on Startup

### Symptom
The TUI starts but immediately exits with an error.

### Common Causes & Solutions

**Missing API server:**
- Ensure `bozly serve` is running in another terminal
- Check the API port: `bozly serve --help`

**Port already in use:**
```bash
# Check what's using the port
lsof -i :3847

# Kill the process (replace PID)
kill -9 <PID>

# Or use a different port
BOZLY_PORT=3848 bozly serve
```

**Permission issues:**
```bash
# Ensure BOZLY directory is writable
chmod -R u+w ~/.bozly/
```

---

## Keyboard Input Not Working

### Symptom
Keyboard commands don't respond in the TUI.

### Solutions

**Try with different TERM setting:**
```bash
TERM=xterm bozly tui
TERM=screen bozly tui
TERM=screen-256color bozly tui
```

**Check for stuck processes:**
```bash
# List all bozly processes
ps aux | grep bozly

# Kill any stuck processes
pkill -f "bozly tui"
```

---

## TUI Performance Issues

### Symptom
The TUI is slow or unresponsive.

### Solutions

**Adjust refresh interval:**
```bash
# Slower refresh (less CPU usage)
bozly tui --refresh 10000  # 10 seconds

# Faster refresh
bozly tui --refresh 2000   # 2 seconds
```

**Check system resources:**
```bash
# Monitor CPU and memory
top
# Press 'q' to quit
```

---

## API Connection Errors

### Symptom
"Error loading stats" messages in TUI.

### Solutions

**Verify API is healthy:**
```bash
# Check API health endpoint
curl -s http://127.0.0.1:3847/api/health | jq .

# Check API logs
bozly serve  # Watch for error messages
```

**Restart the API server:**
```bash
# Stop the server
bozly stop

# Wait a moment
sleep 2

# Start it again
bozly serve
```

---

## Terminal Emulator Issues

### Different Emulators, Different Behaviors

**iTerm2 (macOS):**
- Set Report Terminal Type to `xterm-256color`
- Preferences → Profiles → Terminal → Report Terminal Type

**GNOME Terminal (Linux):**
```bash
# Set terminal type
export TERM=xterm-256color
bozly tui
```

**VS Code Integrated Terminal:**
- Sometimes requires: `export TERM=xterm`

**SSH Connection:**
```bash
# Ensure terminal is set on remote
ssh -t user@host "export TERM=xterm-256color; bozly tui"
```

---

## Getting Help

If you encounter issues not covered here:

1. **Check the logs:**
   ```bash
   # View BOZLY logs
   tail -f ~/.bozly/logs/*
   ```

2. **Report the issue:**
   - Include your OS and terminal emulator
   - Include terminal type: `echo $TERM`
   - Include error messages
   - Include output of: `infocmp $TERM`

3. **GitHub Issues:**
   - https://github.com/RetroGhostLabs/bozly/issues

---

## Related Documentation

- [TUI User Guide](./TUI-USER-GUIDE.md)
- [TUI Development Guide](./TUI-DEVELOPMENT-GUIDE.md)
- [Installation Guide](./GETTING-STARTED.md)
