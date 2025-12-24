#!/bin/bash
# post-execution.update-dashboard.sh
#
# Hook Type: post-execution
# Trigger: After AI execution completes successfully
#
# Purpose: Update an external dashboard or monitoring system
# This example shows the pattern - customize the URL and payload for your system.
#
# Environment Variables Available:
#   BOZLY_SESSION_ID - Unique session identifier
#   BOZLY_SESSION_PATH - Path where session was recorded
#   BOZLY_STATUS - Execution status (completed/failed/cancelled)
#   BOZLY_DURATION_MS - How long execution took
#   BOZLY_OUTPUT_SIZE - Size of AI output in bytes
#   Plus all previous hook variables

# Configuration - customize these for your dashboard
DASHBOARD_URL="${DASHBOARD_URL:-}"
DASHBOARD_API_KEY="${DASHBOARD_API_KEY:-}"

# If no dashboard configured, silently skip
if [ -z "$DASHBOARD_URL" ]; then
  exit 0
fi

# Only update if we have an API key
if [ -z "$DASHBOARD_API_KEY" ]; then
  echo "Warning: Dashboard configured but no API key" >&2
  exit 0
fi

# Run async - don't block the command
(
  # Wait a moment to ensure session files are fully written
  sleep 1

  # Prepare the payload
  payload=$(cat <<EOF
{
  "nodeId": "$BOZLY_NODE_ID",
  "nodeName": "$BOZLY_NODE_NAME",
  "command": "$BOZLY_COMMAND",
  "provider": "$BOZLY_PROVIDER",
  "duration": $BOZLY_DURATION_MS,
  "timestamp": "$BOZLY_TIMESTAMP"
}
EOF
)

  # Send to dashboard (customize URL and auth method as needed)
  curl -s -X POST "$DASHBOARD_URL/executions" \
    -H "Authorization: Bearer $DASHBOARD_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$payload" > /dev/null 2>&1

  # Silently fail - don't interrupt the main command
) &

# Return immediately - don't wait for async operation
exit 0
