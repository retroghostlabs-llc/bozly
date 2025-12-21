#!/bin/bash

##############################################################################
# BOZLY Docker Test Runner
# Builds and runs the complete test suite inside Docker isolation
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BUILD_IMAGE=false
FORCE_REBUILD=false
KEEP_CONTAINER=false
VERBOSE=false

##############################################################################
# Usage and Help
##############################################################################

usage() {
  cat << EOF
Usage: bash scripts/test-docker.sh [OPTIONS]

Run BOZLY tests inside Docker with isolation and reproducibility.

OPTIONS:
  --build              Build the Docker image (default: uses cached image)
  --rebuild            Force rebuild of Docker image
  --keep               Keep container after tests complete
  --verbose            Show detailed output
  --help               Show this help message

EXAMPLES:
  # Run tests with cached image
  bash scripts/test-docker.sh

  # Build fresh image and run tests
  bash scripts/test-docker.sh --build

  # Force rebuild and keep container for inspection
  bash scripts/test-docker.sh --rebuild --keep

EOF
  exit 0
}

##############################################################################
# Parse Arguments
##############################################################################

while [[ $# -gt 0 ]]; do
  case $1 in
    --build)
      BUILD_IMAGE=true
      shift
      ;;
    --rebuild)
      FORCE_REBUILD=true
      BUILD_IMAGE=true
      shift
      ;;
    --keep)
      KEEP_CONTAINER=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      usage
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      usage
      ;;
  esac
done

##############################################################################
# Helper Functions
##############################################################################

log_info() {
  echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
  echo -e "${GREEN}✓${NC} $*"
}

log_error() {
  echo -e "${RED}✗${NC} $*"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $*"
}

check_docker() {
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed or not in PATH"
    echo "Install Docker from: https://www.docker.com/products/docker-desktop"
    exit 1
  fi

  if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running"
    echo "Start Docker Desktop or the Docker daemon"
    exit 1
  fi

  log_success "Docker is available"
}

check_docker_compose() {
  if ! command -v docker-compose &> /dev/null; then
    log_warning "docker-compose not found, using docker compose"
    DOCKER_COMPOSE="docker compose"
  else
    DOCKER_COMPOSE="docker-compose"
  fi
}

build_image() {
  log_info "Building Docker image for tests..."

  if [ "$FORCE_REBUILD" = true ]; then
    log_info "Force rebuild enabled, removing old image..."
    docker rmi bozly-test:latest &> /dev/null || true
  fi

  if [ "$VERBOSE" = true ]; then
    $DOCKER_COMPOSE -f docker-compose.test.yml build
  else
    $DOCKER_COMPOSE -f docker-compose.test.yml build > /dev/null 2>&1
  fi

  log_success "Docker image built successfully"
}

run_tests() {
  log_info "Running tests in Docker container..."

  if [ "$VERBOSE" = true ]; then
    $DOCKER_COMPOSE -f docker-compose.test.yml run --rm test npm run test:coverage
    TEST_EXIT=$?
  else
    $DOCKER_COMPOSE -f docker-compose.test.yml run --rm test npm run test:coverage > /tmp/test-output.log 2>&1
    TEST_EXIT=$?
    cat /tmp/test-output.log
  fi

  return $TEST_EXIT
}

run_tests_keep() {
  log_info "Running tests in Docker container (keeping container for inspection)..."

  if [ "$VERBOSE" = true ]; then
    $DOCKER_COMPOSE -f docker-compose.test.yml run test npm run test:coverage
    TEST_EXIT=$?
  else
    $DOCKER_COMPOSE -f docker-compose.test.yml run test npm run test:coverage > /tmp/test-output.log 2>&1
    TEST_EXIT=$?
    cat /tmp/test-output.log
  fi

  CONTAINER_ID=$($DOCKER_COMPOSE -f docker-compose.test.yml ps -q test)

  return $TEST_EXIT
}

cleanup() {
  log_info "Cleaning up Docker resources..."

  if [ "$KEEP_CONTAINER" = false ]; then
    $DOCKER_COMPOSE -f docker-compose.test.yml down > /dev/null 2>&1 || true
    log_success "Container removed"
  else
    log_warning "Container kept for inspection: bozly-test"
    log_info "To remove container, run: docker-compose -f docker-compose.test.yml down"
  fi
}

show_coverage_summary() {
  if [ -f "coverage/index.html" ]; then
    log_success "Coverage report generated: coverage/index.html"
  fi

  if [ -f "coverage/coverage-final.json" ]; then
    log_info "Coverage data: coverage/coverage-final.json"
  fi
}

##############################################################################
# Main Execution
##############################################################################

main() {
  echo ""
  log_info "BOZLY Docker Test Runner"
  echo ""

  # Check prerequisites
  check_docker
  check_docker_compose

  # Build image if requested
  if [ "$BUILD_IMAGE" = true ]; then
    build_image
  fi

  # Run tests
  if [ "$KEEP_CONTAINER" = true ]; then
    run_tests_keep
    TEST_RESULT=$?
  else
    run_tests
    TEST_RESULT=$?
  fi

  # Cleanup
  cleanup

  # Report results
  echo ""
  if [ $TEST_RESULT -eq 0 ]; then
    log_success "All tests passed!"
    show_coverage_summary
    echo ""
    exit 0
  else
    log_error "Tests failed with exit code: $TEST_RESULT"
    echo ""
    exit $TEST_RESULT
  fi
}

main
