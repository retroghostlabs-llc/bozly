#!/bin/bash

# test-isolated.sh - Test BOZLY in a completely isolated environment
#
# This script:
# 1. Builds your dev version
# 2. Packs it as a .tgz file
# 3. Creates a temporary test directory
# 4. Installs the packed version there
# 5. Runs tests in isolation
# 6. Cleans up when done
#
# This approach is PERFECT for:
# - Quick iteration during development
# - Testing without affecting your real ~/.bozly/
# - Simulating the exact npm install experience users get
#
# Usage:
#   ./scripts/test-isolated.sh              # Interactive testing
#   ./scripts/test-isolated.sh --no-cleanup # Keep temp dir for investigation
#   ./scripts/test-isolated.sh --help       # Show this message

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLEANUP=true
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-cleanup)
      CLEANUP=false
      echo -e "${YELLOW}Note: Temporary directory will NOT be cleaned up${NC}"
      shift
      ;;
    --verbose)
      VERBOSE=true
      set -x
      shift
      ;;
    --help)
      grep "^# " "$0" | sed 's/^# //' | head -20
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

cleanup_on_exit() {
  if [ $CLEANUP = true ]; then
    if [ -n "$TEST_DIR" ] && [ -d "$TEST_DIR" ]; then
      print_step "Cleaning up temporary directory"
      rm -rf "$TEST_DIR"
      print_success "Cleaned up $TEST_DIR"
    fi
  else
    if [ -n "$TEST_DIR" ] && [ -d "$TEST_DIR" ]; then
      echo -e "${YELLOW}Temporary test directory preserved at: $TEST_DIR${NC}"
      echo -e "${YELLOW}To clean up manually: rm -rf $TEST_DIR${NC}"
    fi
  fi
}

trap cleanup_on_exit EXIT

# Main workflow
main() {
  print_step "Building BOZLY for isolated testing"

  # Step 1: Build the project
  echo "Building TypeScript..."
  if ! npm run build; then
    print_error "Build failed"
    exit 1
  fi
  print_success "Build completed"

  # Step 2: Pack the project
  print_step "Packing BOZLY as npm package"
  echo "Creating .tgz package..."

  # Remove old pack files
  rm -f "$PROJECT_ROOT"/*.tgz

  if ! npm pack --quiet; then
    print_error "npm pack failed"
    exit 1
  fi

  # Find the created .tgz file
  PACK_FILE=$(find "$PROJECT_ROOT" -maxdepth 1 -name "*.tgz" -type f)
  if [ -z "$PACK_FILE" ]; then
    print_error "No .tgz file found after npm pack"
    exit 1
  fi

  print_success "Packed: $(basename "$PACK_FILE")"

  # Step 3: Create temporary test directory
  print_step "Creating isolated test environment"
  TEST_TIMESTAMP=$(date +%s%N)
  TEST_DIR="/tmp/bozly-test-$TEST_TIMESTAMP"

  mkdir -p "$TEST_DIR"
  cd "$TEST_DIR"

  print_success "Test directory: $TEST_DIR"

  # Step 4: Initialize npm project in temp directory
  echo "Initializing npm project..."
  npm init -y > /dev/null 2>&1

  # Step 5: Install the packed version
  print_step "Installing BOZLY package"
  echo "Installing from: $(basename "$PACK_FILE")"

  if ! npm install "$PACK_FILE" --no-save > /dev/null 2>&1; then
    print_error "npm install failed"
    exit 1
  fi

  print_success "Installation complete"

  # Step 6: Verify CLI works
  print_step "Verifying BOZLY CLI"
  echo "Testing: npx bozly --version"

  if ! npx bozly --version > /dev/null 2>&1; then
    print_error "CLI not working"
    exit 1
  fi

  print_success "CLI is functional"

  # Step 7: Run interactive tests
  print_step "Interactive Testing"
  echo -e "${YELLOW}You can now test BOZLY commands in isolation.${NC}"
  echo -e "${YELLOW}Examples:${NC}"
  echo "  npx bozly init test-node"
  echo "  npx bozly list"
  echo "  npx bozly add test-node"
  echo ""
  echo -e "${YELLOW}Test directory: $TEST_DIR${NC}"
  echo -e "${YELLOW}Press Ctrl+C when done testing${NC}"
  echo ""

  # Drop into bash for interactive testing
  bash
}

# Run main workflow
main
