#!/bin/bash
# session-end.notify-discord.sh
#
# Hook Type: session-end
# Trigger: After session is recorded successfully
#
# Purpose: Send a success notification to a Discord channel
# Useful for tracking work across multiple devices or sharing progress with team.
#
# Environment Variables Available:
#   BOZLY_SESSION_ID - Unique session identifier
#   BOZLY_SESSION_PATH - Where session was recorded
#   BOZLY_STATUS - Session status (completed/failed/cancelled)
#   BOZLY_DURATION_MS - Execution duration
#   Plus all previous variables
#
# Required Setup:
#   Create a Discord webhook and set: export DISCORD_WEBHOOK="https://discordapp.com/api/webhooks/..."

DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-}"

# Silently skip if no webhook configured
if [ -z "$DISCORD_WEBHOOK" ]; then
  exit 0
fi

# Format duration in seconds
duration_sec=$((BOZLY_DURATION_MS / 1000))

# Send Discord notification (non-blocking)
(
  curl -s -X POST "$DISCORD_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d @- <<EOF
{
  "username": "BOZLY",
  "avatar_url": "https://avatars.githubusercontent.com/u/1234567?s=200",
  "embeds": [
    {
      "title": "✅ Command Completed",
      "description": "Session finished successfully",
      "fields": [
        {"name": "Node", "value": "$BOZLY_NODE_NAME", "inline": true},
        {"name": "Command", "value": "$BOZLY_COMMAND", "inline": true},
        {"name": "Provider", "value": "$BOZLY_PROVIDER", "inline": true},
        {"name": "Duration", "value": "${duration_sec}s", "inline": true}
      ],
      "color": 3066993,
      "timestamp": "$BOZLY_TIMESTAMP"
    }
  ]
}
EOF
) > /dev/null 2>&1 &

exit 0
