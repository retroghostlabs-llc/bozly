#!/bin/bash
# on-cancel.cleanup.sh
#
# Hook Type: on-cancel
# Trigger: When user interrupts (Ctrl+C, SIGINT, SIGTERM)
#
# Purpose: Clean up temporary files and resources before shutdown
# Ensures no orphaned processes or temp files left behind when work is interrupted.
#
# Environment Variables Available:
#   BOZLY_CANCEL_REASON - Signal that triggered cancellation (SIGINT, SIGTERM)
#   BOZLY_NODE_ID - ID of the node that was being worked on
#   BOZLY_COMMAND - Command that was interrupted
#   Plus all session-start variables

# Define temp directory for this node
TEMP_DIR="/tmp/bozly-$BOZLY_NODE_ID"

# Clean up temp files if they exist
if [ -d "$TEMP_DIR" ]; then
  # Remove any temporary files created during execution
  rm -rf "$TEMP_DIR" 2>/dev/null

  if [ $? -eq 0 ]; then
    echo "🧹 Cleaned up temporary files" >&2
  else
    echo "⚠️  Warning: Could not fully cleanup $TEMP_DIR" >&2
  fi
fi

# Additional cleanup patterns (customize as needed):
# - Kill background processes specific to this node/command
# - Close database connections
# - Upload partial progress
# - Notify external systems of cancellation

# Example: Kill any background processes tagged with node ID
# (only if you have a specific naming convention)
# pkill -f "bozly-$BOZLY_NODE_ID" 2>/dev/null

# Example: Log cancellation event
# echo "$(date +%s) - Cancelled: $BOZLY_COMMAND in $BOZLY_NODE_NAME" >> ~/.bozly/cancellations.log

echo "✓ Cleanup complete (signal: $BOZLY_CANCEL_REASON)" >&2

exit 0
