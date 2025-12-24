#!/bin/bash
# session-start.show-tasks.sh
#
# Hook Type: session-start
# Trigger: Before command loading, at session start
#
# Purpose: Display the 3 most recent completed tasks from this node
# This gives context about what was done previously and refreshes memory.
#
# Environment Variables Available:
#   BOZLY_NODE_ID - ID of the current node
#   BOZLY_NODE_NAME - Human-readable name of current node
#   BOZLY_NODE_PATH - Full path to node directory
#   BOZLY_COMMAND - Command about to be executed
#   BOZLY_PROVIDER - AI provider being used
#   BOZLY_TIMESTAMP - ISO timestamp of session start

# Show recent sessions header
echo "📋 Recent work in $BOZLY_NODE_NAME:"

# Find the 3 most recent sessions in reverse chronological order
sessions_path="$BOZLY_NODE_PATH/.bozly/sessions"

if [ ! -d "$sessions_path" ]; then
  echo "  (no previous sessions yet)"
  exit 0
fi

# Use find to locate the most recent sessions (by UUID directory mtime)
# and display them with friendly timestamps
find "$sessions_path" -type d -mindepth 4 -maxdepth 4 -name "[0-9a-f-]*" 2>/dev/null | \
  sort -r | \
  head -3 | \
  while read session_dir; do
    if [ -f "$session_dir/session.json" ]; then
      # Extract command name and timestamp from session.json
      command=$(grep -o '"command":"[^"]*"' "$session_dir/session.json" | cut -d'"' -f4)
      timestamp=$(grep -o '"timestamp":"[^"]*"' "$session_dir/session.json" | cut -d'"' -f4)

      # Format timestamp for display (just show date and time, not full ISO)
      display_time=$(echo "$timestamp" | cut -d'T' -f1,2 | cut -d'+' -f1)

      echo "  • $command ($display_time)"
    fi
  done

exit 0
