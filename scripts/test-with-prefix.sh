#!/bin/bash

# test-with-prefix.sh - Test BOZLY with a separate npm prefix
#
# This script creates a persistent test environment in ~/.bozly-test
# Use this when you want to test repeatedly without recreating the env.
#
# Advantages:
# - Faster than temp directory (no recreation each time)
# - Still completely isolated from your real ~/.bozly/
# - Persistent (compare dev version to real version side-by-side)
#
# Disadvantages:
# - Takes up disk space
# - Need to manually clean up
#
# Usage:
#   ./scripts/test-with-prefix.sh              # Install and test
#   ./scripts/test-with-prefix.sh --cleanup    # Remove test prefix
#   ./scripts/test-with-prefix.sh --help       # Show this message

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_PREFIX="$HOME/.bozly-test"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --cleanup)
      echo -e "${YELLOW}Removing test prefix: $TEST_PREFIX${NC}"
      rm -rf "$TEST_PREFIX"
      echo -e "${GREEN}✓ Cleaned up${NC}"
      exit 0
      ;;
    --help)
      grep "^# " "$0" | sed 's/^# //' | head -25
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Helper functions
print_step() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}▶ $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

main() {
  print_step "Testing BOZLY with npm prefix"

  # Step 1: Build the project
  echo "Building TypeScript..."
  if ! npm run build; then
    print_error "Build failed"
    exit 1
  fi
  print_success "Build completed"

  # Step 2: Create test prefix directory
  print_step "Creating test prefix directory"
  mkdir -p "$TEST_PREFIX"
  print_success "Test prefix: $TEST_PREFIX"

  # Step 3: Install to test prefix
  print_step "Installing BOZLY to test prefix"
  echo "Installing from: $PROJECT_ROOT"

  if ! npm install --prefix "$TEST_PREFIX" "$PROJECT_ROOT" --no-save > /dev/null 2>&1; then
    print_error "npm install failed"
    exit 1
  fi

  print_success "Installation complete"

  # Step 4: Verify CLI works
  print_step "Verifying BOZLY CLI"
  CLI_PATH="$TEST_PREFIX/node_modules/.bin/bozly"

  if [ ! -x "$CLI_PATH" ]; then
    print_error "CLI not found or not executable at $CLI_PATH"
    exit 1
  fi

  echo "Testing: $CLI_PATH --version"
  if ! $CLI_PATH --version > /dev/null 2>&1; then
    print_error "CLI not working"
    exit 1
  fi

  print_success "CLI is functional"

  # Step 5: Show how to use the test version
  print_step "Using the test version"
  echo -e "${YELLOW}Option 1: Use directly${NC}"
  echo "  $CLI_PATH init test-node"
  echo "  $CLI_PATH list"
  echo ""
  echo -e "${YELLOW}Option 2: Add to PATH temporarily${NC}"
  echo "  export PATH=\"$TEST_PREFIX/node_modules/.bin:\$PATH\""
  echo "  bozly init test-node"
  echo ""
  echo -e "${YELLOW}Option 3: Create alias${NC}"
  echo "  alias bozly-test='$CLI_PATH'"
  echo "  bozly-test init test-node"
  echo ""
  echo -e "${YELLOW}Clean up later with:${NC}"
  echo "  ./scripts/test-with-prefix.sh --cleanup"
  echo ""
  echo -e "${YELLOW}To compare with production BOZLY:${NC}"
  echo "  bozly --version  # Your real BOZLY"
  echo "  $CLI_PATH --version  # Test version"
}

main
