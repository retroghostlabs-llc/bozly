# BOZLY Dashboard Server (`bozly serve`)

Start an interactive web dashboard to browse and manage your BOZLY vaults and sessions.

## Quick Start

### Installation

```bash
npm install -g @retroghostlabs/bozly
# or with Homebrew (when available)
brew install bozly
```

### Start the Server

```bash
bozly serve
```

This will:
- Start a local web server on `http://127.0.0.1:3847`
- Automatically open your browser to the dashboard
- Load all your registered vaults and sessions

## Command Options

```bash
bozly serve [options]
```

### Available Options

| Option | Default | Description |
|--------|---------|-------------|
| `-p, --port <port>` | `3847` | Server port number |
| `-h, --host <host>` | `127.0.0.1` | Server host/IP address |
| `-o, --open` | `true` | Automatically open browser |
| `--no-open` | — | Do not open browser automatically |

### Examples

```bash
# Start with default settings (localhost, port 3847)
bozly serve

# Start on a different port
bozly serve --port 3000

# Start on all interfaces (network accessible)
bozly serve --host 0.0.0.0

# Start without opening browser
bozly serve --no-open

# Combine options
bozly serve --port 8080 --host 0.0.0.0 --no-open
```

## Dashboard Features

### Dashboard View

The main dashboard shows:
- **Vaults Overview** — All registered vaults with stats
- **Recent Sessions** — 10 latest sessions across all vaults
- **Quick Stats** — Total sessions, success/failure counts, provider breakdown

Click any vault to explore its sessions.

### Sessions Browser

View all sessions for a vault with:
- **Filtering** — Filter by status (successful, failed, cancelled)
- **Pagination** — Browse 20 sessions per page
- **Search** — Find sessions by command or metadata
- **Click to View** — Open full session details

### Session Details

View all session data in tabbed interface:

| Tab | Contains |
|-----|----------|
| **Metadata** | Session ID, vault, command, provider, model, status, timestamp |
| **Context** | AI context that was provided to the model |
| **Prompt** | The raw user prompt sent to the AI |
| **Results** | Full AI response with markdown rendering |
| **Execution** | Timing, token counts, cost breakdown |
| **Changes** | Files modified during this session |

### Commands Browser

Browse all commands in a vault:
- **Grid View** — Visual card display
- **Search** — Find commands by name or description
- **Source Info** — See if command is global, node-specific, or built-in

## Usage Scenarios

### Scenario 1: Development & Debugging

```bash
# Terminal 1: Start the server
bozly serve

# Terminal 2: Run commands as usual
bozly run daily
bozly run weekly-review

# View results live in browser at http://127.0.0.1:3847
```

### Scenario 2: Session Analysis

1. Start server: `bozly serve`
2. Navigate to **Sessions** for your vault
3. Click on a session to see full details
4. Review context, prompt, and results side-by-side
5. Analyze execution metrics (tokens, duration, cost)

### Scenario 3: Network Access (Team/Demo)

```bash
# Start on all interfaces
bozly serve --host 0.0.0.0 --port 3000

# Share URL: http://your-machine-ip:3000
```

⚠️ **Security Note:** This exposes session history and context. Only use on trusted networks.

### Scenario 4: Custom Port (Multiple Instances)

```bash
# Terminal 1: Music vault on port 3847
cd ~/music && bozly serve

# Terminal 2: Journal vault on port 3848
cd ~/journal && bozly serve --port 3848

# Terminal 3: Projects vault on port 3849
cd ~/projects && bozly serve --port 3849

# Access all three: :3847, :3848, :3849
```

## Browser Compatibility

Tested and supported on:
- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

**Note:** The dashboard requires JavaScript enabled.

## Performance

### Pagination & Lazy Loading

- Sessions list: **20 sessions per page** (fast initial load)
- Session details: **Lazy loaded on-click** (no delay)
- Command list: **All commands** (typically <100, instant)

For vaults with 1000+ sessions, pagination keeps the UI responsive.

### First Load Time

| Scenario | Time |
|----------|------|
| 1 vault, <100 sessions | < 1 sec |
| 5 vaults, 1000 total sessions | 1-2 sec |
| 10 vaults, 10000+ sessions | 2-5 sec |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close any modal/popover |
| ← | Back to previous view |
| `Ctrl+F` | Browser search (within page) |

## Data Privacy

**All data stays local:**
- ✅ No data sent to external servers
- ✅ No analytics or telemetry
- ✅ No cookies or tracking
- ✅ Works fully offline

Data shown is read directly from your `.bozly/` directories.

## Stopping the Server

**Graceful Shutdown:**
- Press `Ctrl+C` in the terminal where server is running
- Server closes cleanly, all sessions remain saved

**Port Already in Use?**

```bash
# List what's using port 3847
lsof -i :3847

# Kill the process (if needed)
kill -9 <PID>

# Or use a different port
bozly serve --port 3848
```

## Development Mode

### For Framework Developers

```bash
# Terminal 1: Watch TypeScript compilation
npm run dev

# Terminal 2: Start server
npm start -- serve

# Server auto-reloads when TypeScript changes are detected
```

### Or Use Makefile

```bash
# Automatically runs dev mode + serve
make serve-dev

# Or just build once and serve
make serve
```

## Troubleshooting

### Server won't start

**Error:** "Address already in use"
```bash
# Use a different port
bozly serve --port 3848
```

**Error:** "No vaults registered"
```bash
# Register a vault first
bozly init  # In your project directory
bozly add   # Or add existing path
```

### Dashboard loads but shows no data

1. Verify vaults are registered: `bozly list`
2. Check vault has sessions: `bozly logs` in vault directory
3. Refresh browser (F5)
4. Check browser console for errors (F12 → Console)

### Slow session loading

**Normal:** First time loading large vaults is slow. Sessions are cached after first load.

**Solution:** Use smaller date ranges or specific filters to reduce payload.

### Connection refused

**Problem:** Browser can't reach `127.0.0.1:3847`

**Solutions:**
- Check server is running (you should see startup message)
- Try `http://localhost:3847` instead
- Check firewall isn't blocking port 3847
- Try different port: `bozly serve --port 3000`

## Advanced Usage

### Environment Variables

```bash
# Enable debug logging
BOZLY_DEBUG=true bozly serve

# Use custom home directory
BOZLY_HOME=~/.my-bozly bozly serve
```

### Programmatic Access

All data available via REST API:

```bash
# List vaults
curl http://127.0.0.1:3847/api/vaults

# Get vault details
curl http://127.0.0.1:3847/api/vaults/my-music

# Get sessions
curl http://127.0.0.1:3847/api/vaults/my-music/sessions

# Get single session
curl http://127.0.0.1:3847/api/vaults/my-music/sessions/session-id

# Get vault context
curl http://127.0.0.1:3847/api/vaults/my-music/context

# List commands
curl http://127.0.0.1:3847/api/vaults/my-music/commands

# Health check
curl http://127.0.0.1:3847/api/health
```

## Future Enhancements

Planned for upcoming releases:
- [ ] Dark mode toggle
- [ ] Custom column selection for tables
- [ ] Export sessions as JSON/CSV
- [ ] Command execution from dashboard
- [ ] Session comparison view
- [ ] Advanced filtering and search
- [ ] Responsive mobile layout

## Need Help?

- **Issues:** Report bugs at https://github.com/RetroGhostLabs/bozly/issues
- **Discussions:** Ask questions at https://github.com/RetroGhostLabs/bozly/discussions
- **Documentation:** See full docs at https://github.com/RetroGhostLabs/bozly

---

**Version:** 0.5.0-beta.1+
**Status:** Production-ready for Phase 2b
