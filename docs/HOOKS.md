# BOZLY Hooks System

Hooks are automated scripts or programs that execute at specific moments during command execution. They enable you to extend BOZLY's behavior without modifying the framework itself.

**Key Principle:** Hooks are 100% internal to BOZLY. They execute at BOZLY lifecycle events, completely separate from any AI provider hooks (like Claude Code hooks). BOZLY is a pure "context provider" that pipes prompts to AI CLIs.

---

## Hook Lifecycle

```
User runs: bozly run daily

1. session-start hook executes
   ├─ Load recent tasks
   ├─ Validate environment
   └─ Display context summary

2. BOZLY loads context.md + commands/daily.md
3. BOZLY generates full prompt
4. pre-execution hook executes
   ├─ Inspect final prompt
   ├─ Validate prompt size
   └─ Log what will be sent

5. BOZLY calls AI: echo "prompt" | claude
   AI streams output to console

6. post-execution hook executes
   ├─ Process AI output
   ├─ Generate artifacts
   └─ Track file changes

7. BOZLY records session to .bozly/sessions/

8. session-end hook executes
   ├─ Update task index
   ├─ Send notifications
   └─ Archive work

[On error or Ctrl+C instead]:
   on-error hook executes → Error handling, cleanup
   on-cancel hook executes → Resource cleanup, notifications
```

---

## Hook Types

### 1. session-start
**When:** Session begins (before command loading)

**Use Cases:**
- Load and display recent tasks
- Show previous session summary
- Validate environment (internet, disk space)
- Set up runtime dependencies

**Available Environment Variables:**
```bash
BOZLY_NODE_ID=music-vault
BOZLY_NODE_NAME="Music Collection"
BOZLY_NODE_PATH=/Users/x/music
BOZLY_COMMAND=daily
BOZLY_PROVIDER=claude
BOZLY_TIMESTAMP=2025-12-23T10:30:00Z
```

**Example:** See `examples/hooks/session-start.show-tasks.sh`

---

### 2. pre-execution
**When:** Before AI call (prompt fully assembled)

**Use Cases:**
- Validate prompt size (warn if too large)
- Log exact prompt being sent to AI (audit trail)
- Perform last-chance validation checks
- Enhance `--dry` mode previews

**Available Environment Variables:**
All from `session-start`, plus:
```bash
BOZLY_PROMPT_SIZE=4567     # bytes
```

**Important:** The full prompt is available via context passed to hook (see stdin below).

**Example:** See `examples/hooks/pre-execution.validate-prompt.sh`

---

### 3. post-execution
**When:** After AI completes successfully

**Use Cases:**
- Process files created by AI output
- Generate artifacts (PDFs, exports, summaries)
- Update external dashboards
- Track file changes from AI execution

**Available Environment Variables:**
```bash
# All from session-start, plus prompt info, plus:
BOZLY_SESSION_ID=f47ac10b-58cc-4372-a567-0e02b2c3d479
BOZLY_SESSION_PATH=~/.bozly/sessions/music/2025/12/23/f47ac10b...
BOZLY_STATUS=completed
BOZLY_DURATION_MS=3450
BOZLY_OUTPUT_SIZE=1245  # bytes
```

**Example:** See `examples/hooks/post-execution.update-dashboard.sh`

---

### 4. session-end
**When:** After session recorded successfully

**Use Cases:**
- Update task index with completed work
- Send notifications (Discord, Slack, email)
- Archive completed work
- Trigger external workflows (n8n, Zapier, etc.)

**Available Environment Variables:**
Same as `post-execution` (includes session data + prompt info)

**Example:** See `examples/hooks/session-end.notify-discord.sh`

---

### 5. on-error
**When:** When execution fails (AI error, timeout, validation error)

**Use Cases:**
- Send error alerts to monitoring systems
- Implement retry logic
- Cleanup failed work
- Log detailed error information

**Available Environment Variables:**
```bash
# All from session-start, plus error-specific:
BOZLY_ERROR_MESSAGE="AI provider exited with code 1"
BOZLY_ERROR_CODE=AI_EXECUTION_FAILED
```

**Example:** See `examples/hooks/on-error.alert-slack.sh`

---

### 6. on-cancel
**When:** User interrupts (Ctrl+C) or process terminates

**Use Cases:**
- Save partial work before shutdown
- Cleanup temporary resources
- Send cancellation notifications
- Track interrupted sessions

**Available Environment Variables:**
```bash
# All from session-start, plus:
BOZLY_CANCEL_REASON=SIGINT  # or SIGTERM
```

**Example:** See `examples/hooks/on-cancel.cleanup.sh`

---

## Hook File Structure

### Location

Hooks are stored in:
- **Global:** `~/.bozly/hooks/` (apply to all nodes)
- **Per-node:** `{nodePath}/.bozly/hooks/` (node-specific)

### Naming Convention

Format: `{hookType}.{name}.{extension}`

**Valid examples:**
```
session-start.show-tasks.sh
pre-execution.validate-prompt.js
post-execution.update-dashboard.py
session-end.notify-discord.sh
on-error.alert-slack.sh
on-cancel.cleanup.sh
```

**Requirements:**
- Hook type must be one of: `session-start`, `pre-execution`, `post-execution`, `session-end`, `on-error`, `on-cancel`
- Name can contain letters, numbers, hyphens (alphanumeric + dash)
- Extension can be any executable format: `.sh`, `.js`, `.py`, `.rb`, etc.

### Permissions

Hooks must be executable:
```bash
chmod +x ~/.bozly/hooks/session-start.show-tasks.sh
chmod +x ~/music/.bozly/hooks/on-error.alert-slack.sh
```

---

## Hook Execution

### Environment

All hooks receive context as environment variables. Additionally:
- Working directory: The node directory (where the command is running)
- stdin: Full JSON context (for complex data access)
- stdout/stderr: Captured and logged

### Context via stdin

Full hook context is passed as JSON via stdin:

```bash
#!/bin/bash
# Read full context from stdin if needed
context=$(cat)

# Extract fields with jq (if available)
nodeId=$(echo "$context" | jq -r '.nodeId')
command=$(echo "$context" | jq -r '.command')
```

### Error Handling

- **Hook failures don't break commands** - If a hook exits with non-zero code, it's logged as a warning but execution continues
- **Isolated execution** - Each hook runs in a separate process
- **Timeouts** - Hooks are killed after 30 seconds by default (configurable)
- **Logging** - All hook execution is logged to BOZLY_DEBUG logs

### Logging Hooks

Enable hook debugging:
```bash
BOZLY_DEBUG=true bozly run daily
```

Check hook logs in session execution.json:
```bash
cat ~/.bozly/sessions/{nodeId}/{YYYY}/{MM}/{DD}/{uuid}/execution.json | jq '.hooks'
```

---

## Examples

### Example 1: Load Recent Tasks (session-start)

```bash
#!/bin/bash
# session-start.show-tasks.sh

# Show the 3 most recent completed tasks
echo "📋 Recent tasks:"
ls -lt ~/.bozly/sessions/$BOZLY_NODE_ID/*/ 2>/dev/null | head -3 | while read -r line; do
  echo "  • $(echo $line | awk '{print $NF}')"
done
```

### Example 2: Validate Prompt Size (pre-execution)

```bash
#!/bin/bash
# pre-execution.validate-prompt.sh

# Warn if prompt is very large (>100KB)
if [ "$BOZLY_PROMPT_SIZE" -gt 102400 ]; then
  echo "⚠️  Large prompt ($(( $BOZLY_PROMPT_SIZE / 1024 ))KB)"
  echo "   This may be slow or expensive with your provider"
fi

exit 0  # Don't fail - this is just a warning
```

### Example 3: Send Discord Notification (session-end)

```bash
#!/bin/bash
# session-end.notify-discord.sh

DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-}"
if [ -z "$DISCORD_WEBHOOK" ]; then
  exit 0  # Silently skip if webhook not configured
fi

# Send notification to Discord
curl -X POST "$DISCORD_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{
    \"content\": \"✅ Completed: $BOZLY_COMMAND ($BOZLY_DURATION_MS ms)\",
    \"username\": \"BOZLY\",
    \"avatar_url\": \"https://avatars.githubusercontent.com/u/1234567\"
  }"
```

### Example 4: Send Slack Alert (on-error)

```bash
#!/bin/bash
# on-error.alert-slack.sh

SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
if [ -z "$SLACK_WEBHOOK" ]; then
  exit 0
fi

curl -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{
    \"text\": \"🚨 BOZLY Error in $BOZLY_NODE_NAME\",
    \"blocks\": [
      {
        \"type\": \"section\",
        \"text\": {
          \"type\": \"mrkdwn\",
          \"text\": \"*Error:* \`$BOZLY_ERROR_MESSAGE\`\n*Node:* $BOZLY_NODE_NAME\n*Command:* \`$BOZLY_COMMAND\`\"
        }
      }
    ]
  }"
```

### Example 5: Cleanup Temp Files (on-cancel)

```bash
#!/bin/bash
# on-cancel.cleanup.sh

# Clean up any temporary files created by this command
TEMP_DIR="/tmp/bozly-$BOZLY_NODE_ID"
if [ -d "$TEMP_DIR" ]; then
  rm -rf "$TEMP_DIR"
  echo "🧹 Cleaned up temporary files"
fi

exit 0
```

---

## Best Practices

### 1. Keep Hooks Fast

- **Target:** <5 seconds
- **Timeout:** 30 seconds (hard limit)
- Don't do heavy processing in hooks
- Offload to background jobs if needed:
  ```bash
  #!/bin/bash
  # async-notification.sh

  # Run notification in background
  (
    sleep 1
    # ... notification logic ...
  ) &

  exit 0  # Don't wait for background job
  ```

### 2. Handle Failures Gracefully

- Hooks that fail don't break commands (by design)
- Log failures clearly for debugging
- Test hooks before deploying:
  ```bash
  bash ~/music/.bozly/hooks/on-error.alert-slack.sh
  ```

### 3. Log to stderr

- stdout is captured by BOZLY for session logs
- Use stderr for debugging output:
  ```bash
  #!/bin/bash
  echo "📊 Processing results..." >&2
  ```

### 4. Use Environment Variables

- Don't hardcode paths or settings
- Read from environment for flexibility:
  ```bash
  #!/bin/bash
  SLACK_WEBHOOK="${SLACK_WEBHOOK:-https://hooks.slack.com/...}"
  DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-}"
  ```

### 5. Handle Missing Dependencies

- Check if required tools are available
- Gracefully skip if not:
  ```bash
  #!/bin/bash
  if ! command -v jq &> /dev/null; then
    echo "jq not installed - skipping complex processing" >&2
    exit 0
  fi
  ```

### 6. Don't Assume Execution Order

- Multiple hooks of same type run sequentially, but order isn't guaranteed
- Don't rely on side effects from other hooks
- Make each hook independently runnable

---

## Troubleshooting

### Hook not executing

**Check 1:** Is the hook file executable?
```bash
ls -la ~/.bozly/hooks/session-start.*.sh
# Should show: -rwxr-xr-x (not -rw-r--r--)

# Fix:
chmod +x ~/.bozly/hooks/session-start.show-tasks.sh
```

**Check 2:** Is the filename correct?
```bash
# Must match: {hookType}.{name}.{ext}
# Valid: session-start.show-tasks.sh
# Invalid: show-tasks.sh (missing hook type)
#         session-start.show-tasks (missing extension)
```

**Check 3:** Enable debug logging
```bash
BOZLY_DEBUG=true bozly run daily
# Look for hook execution logs
```

### Hook fails but doesn't affect command

This is expected behavior! Hooks are isolated:
- Failing hook logs a warning
- Command continues normally
- Check the error in `execution.json`:
  ```bash
  cat ~/.bozly/sessions/{nodeId}/*/*/*/execution.json | jq '.hooks'
  ```

### Hook times out

Hooks have a 30-second timeout. If your hook exceeds this:

**Option 1:** Optimize the hook
```bash
# Before: Slow operation
cd ~/music && find . -name "*.mp3" | wc -l

# After: Cache the result
if [ ! -f /tmp/music_count.cache ]; then
  cd ~/music && find . -name "*.mp3" | wc -l > /tmp/music_count.cache
fi
cat /tmp/music_count.cache
```

**Option 2:** Run async (return immediately)
```bash
#!/bin/bash
# slow-operation.sh

# Don't wait for operation to complete
(
  # ... slow operation ...
) &

exit 0  # Return immediately
```

### Accessing full context in hook

Use jq to parse JSON from stdin:

```bash
#!/bin/bash
# Hook that needs detailed context

context=$(cat)

# Extract nested values
nodeId=$(echo "$context" | jq -r '.nodeId')
command=$(echo "$context" | jq -r '.command')
prompt=$(echo "$context" | jq -r '.prompt // empty')
output=$(echo "$context" | jq -r '.session.output // empty')

echo "Node: $nodeId"
echo "Command: $command"
```

---

## FAQ

### Q: How do BOZLY hooks differ from AI provider hooks (like Claude Code hooks)?

**A:** They're completely separate systems:

| Aspect | BOZLY Hooks | AI Provider Hooks |
|--------|------------|-------------------|
| **When** | BOZLY lifecycle events | AI provider internal events |
| **Scope** | All nodes, all providers | Specific to that provider |
| **Context** | Node + command metadata | Provider-specific data |
| **Isolation** | Independent process | Within provider runtime |
| **Examples** | Load tasks, send notifications | Tool use, context updates |

You can use both systems together - they don't conflict.

### Q: Can hooks modify prompts?

**A:** No, hooks are read-only observers. BOZLY applies these principles:
1. Hooks can't modify commands or prompts
2. Hooks can't affect AI execution
3. Hooks can only observe and react to events

This ensures BOZLY remains predictable and trustworthy.

### Q: What happens if a hook fails?

**A:** The hook failure is logged, but:
1. ✅ Command continues normally
2. ✅ Other hooks still execute
3. ✅ Session still records
4. ⚠️ Error appears in session execution.json

Hooks are designed to be optional enhancements, never critical to command execution.

### Q: Can I use Python, Node.js, Ruby, etc. for hooks?

**A:** Yes! Hooks can be any executable:
- `session-start.check.sh` → Bash script
- `on-error.alert.js` → Node.js script
- `post-execution.report.py` → Python script
- `session-end.notify.rb` → Ruby script

Just ensure the interpreter is installed and the file is executable.

### Q: How do I test hooks?

**A:** Run the hook directly:
```bash
# Test a hook
bash ~/.bozly/hooks/session-start.show-tasks.sh

# Test with environment variables
BOZLY_NODE_ID=test-node BOZLY_COMMAND=daily \
  bash ~/.bozly/hooks/on-error.alert-slack.sh

# Test with debug output
bash -x ~/.bozly/hooks/session-end.notify-discord.sh
```

### Q: Can hooks access previous session data?

**A:** Yes, read from the session files:
```bash
#!/bin/bash
# session-end.analyze-previous.sh

# Get the last session
lastSession=$(ls -t ~/.bozly/sessions/$BOZLY_NODE_ID/*/* | head -1)

# Read previous output
if [ -f "$lastSession/results.md" ]; then
  cat "$lastSession/results.md"
fi
```

---

## Integration Examples

### Example: Automated Workflow

```bash
#!/bin/bash
# post-execution.auto-save.sh
# Automatically save completed work

# Get the session output
sessionPath="$BOZLY_SESSION_PATH"
if [ -f "$sessionPath/results.md" ]; then
  # Archive to dated backup
  cp "$sessionPath/results.md" \
     "$BOZLY_NODE_PATH/archive/$(date +%Y-%m-%d_%H-%M-%S)_$BOZLY_COMMAND.md"
fi
```

### Example: Metrics Tracking

```bash
#!/bin/bash
# session-end.track-metrics.sh
# Track command execution metrics

metrics_file="$BOZLY_NODE_PATH/.metrics.json"

# Append execution to metrics
echo "{
  \"timestamp\": \"$BOZLY_TIMESTAMP\",
  \"command\": \"$BOZLY_COMMAND\",
  \"duration\": $BOZLY_DURATION_MS,
  \"provider\": \"$BOZLY_PROVIDER\",
  \"outputSize\": $BOZLY_OUTPUT_SIZE
}" >> "$metrics_file"
```

---

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) - BOZLY system design
- [GETTING-STARTED.md](./GETTING-STARTED.md) - Initial setup
- [N8N-INTEGRATION.md](./N8N-INTEGRATION.md) - Advanced workflow integration

---

## See Also

- [GETTING-STARTED.md](GETTING-STARTED.md) — Getting started with BOZLY
- [WORKFLOWS-GUIDE.md](WORKFLOWS-GUIDE.md) — Multi-step automation
- [CLI-REFERENCE.md](CLI-REFERENCE.md) — Hook-related CLI commands
- [API-REFERENCE.md](API-REFERENCE.md) — Hooks API functions
- [TEMPLATES.md](TEMPLATES.md) — Template system

*Last updated: 2025-12-27 (Session 122)*
