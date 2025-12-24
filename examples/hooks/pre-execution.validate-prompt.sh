#!/bin/bash
# pre-execution.validate-prompt.sh
#
# Hook Type: pre-execution
# Trigger: Before AI call (prompt fully assembled)
#
# Purpose: Validate prompt size and warn if it's unusually large
# Large prompts can be slower and more expensive with some AI providers.
#
# Environment Variables Available:
#   BOZLY_PROMPT_SIZE - Size of the assembled prompt in bytes
#   BOZLY_NODE_ID - ID of the current node
#   BOZLY_COMMAND - Command being executed
#   BOZLY_PROVIDER - AI provider being used
#   All from session-start as well

# Define thresholds (in bytes)
WARN_THRESHOLD=$((100 * 1024))    # 100 KB
ERROR_THRESHOLD=$((500 * 1024))   # 500 KB

prompt_size_kb=$((BOZLY_PROMPT_SIZE / 1024))

# Check if prompt exceeds warning threshold
if [ "$BOZLY_PROMPT_SIZE" -gt "$ERROR_THRESHOLD" ]; then
  echo "⚠️  LARGE PROMPT: ${prompt_size_kb}KB" >&2
  echo "   This prompt is very large and may be slow/expensive" >&2
  echo "   Provider: $BOZLY_PROVIDER | Command: $BOZLY_COMMAND" >&2
  echo "" >&2
  # Don't fail - still let it execute, but warn the user
  exit 0

elif [ "$BOZLY_PROMPT_SIZE" -gt "$WARN_THRESHOLD" ]; then
  echo "⚠️  Large prompt (${prompt_size_kb}KB)" >&2
  echo "   Execution may be slower with your provider" >&2
  exit 0
fi

# Prompt is within normal range
exit 0
