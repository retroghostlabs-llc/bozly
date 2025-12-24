#!/bin/bash
# on-error.alert-slack.sh
#
# Hook Type: on-error
# Trigger: When execution fails (AI error, timeout, validation error, etc)
#
# Purpose: Send error alert to Slack so you know something went wrong
# Useful for unattended automation or background processing.
#
# Environment Variables Available:
#   BOZLY_ERROR_MESSAGE - Error message from the failure
#   BOZLY_ERROR_CODE - Error code/type
#   Plus all session-start variables
#
# Required Setup:
#   Create a Slack webhook and set: export SLACK_WEBHOOK="https://hooks.slack.com/services/..."

SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Silently skip if no webhook configured
if [ -z "$SLACK_WEBHOOK" ]; then
  exit 0
fi

# Send Slack notification (non-blocking)
(
  curl -s -X POST "$SLACK_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d @- <<EOF
{
  "text": "🚨 BOZLY Error in $BOZLY_NODE_NAME",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚨 Execution Failed",
        "emoji": true
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Node:*\n$BOZLY_NODE_NAME"
        },
        {
          "type": "mrkdwn",
          "text": "*Command:*\n$BOZLY_COMMAND"
        },
        {
          "type": "mrkdwn",
          "text": "*Provider:*\n$BOZLY_PROVIDER"
        },
        {
          "type": "mrkdwn",
          "text": "*Error Code:*\n$BOZLY_ERROR_CODE"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Error Message:*\n\`\`\`$BOZLY_ERROR_MESSAGE\`\`\`"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "Time: $BOZLY_TIMESTAMP"
        }
      ]
    }
  ]
}
EOF
) > /dev/null 2>&1 &

exit 0
