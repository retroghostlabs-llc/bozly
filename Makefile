.PHONY: help build dev test test-watch test-ui test-coverage test-isolated test-with-prefix test-docker lint lint-fix format format-check validate clean start serve serve-dev

help:
	@echo "BOZLY - Development Commands"
	@echo ""
	@echo "Building:"
	@echo "  make build           Compile TypeScript to dist/"
	@echo "  make dev             Watch mode compilation (auto-rebuild on changes)"
	@echo "  make clean           Remove dist/ and coverage/ directories"
	@echo ""
	@echo "Testing - Unit Tests:"
	@echo "  make test            Run all tests once"
	@echo "  make test-watch      Run tests in watch mode (re-run on changes)"
	@echo "  make test-ui         Open Vitest UI in browser"
	@echo "  make test-coverage   Run tests with coverage report"
	@echo ""
	@echo "Testing - Isolated (Recommended for Development):"
	@echo "  make test-isolated   Test in isolated temp directory (auto-cleanup)"
	@echo "                       → Fastest feedback, tests exact npm package"
	@echo ""
	@echo "Testing - Persistent:"
	@echo "  make test-with-prefix   Test with persistent ~/.bozly-test prefix"
	@echo "                          → Keep env for repeated testing"
	@echo ""
	@echo "Testing - Docker (Pre-Publish Validation):"
	@echo "  make test-docker     Run Docker npm integration tests"
	@echo "                       → Exactly matches GitHub Actions CI/CD"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint            Check for ESLint errors"
	@echo "  make lint-fix        Auto-fix ESLint errors"
	@echo "  make format          Format code with Prettier"
	@echo "  make format-check    Check formatting without modifying"
	@echo ""
	@echo "Full Workflow:"
	@echo "  make validate        Run: lint → format:check → build → test:coverage"
	@echo ""
	@echo "Running:"
	@echo "  make start           Run the bozly CLI"
	@echo "  make serve           Start BOZLY dashboard server (port 3847)"
	@echo "  make serve-dev       Start server in development (watch mode)"
	@echo ""
	@echo "Development Loop:"
	@echo "  Terminal 1:  make dev           (watch mode compilation)"
	@echo "  Terminal 2:  make test-watch    (watch mode tests)"
	@echo "  Terminal 3:  make test-isolated (test in isolation)"
	@echo ""

build:
	npm run build

dev:
	npm run dev

test:
	npm run test

test-watch:
	npm run test:watch

test-ui:
	npm run test:ui

test-coverage:
	npm run test:coverage

lint:
	npm run lint

lint-fix:
	npm run lint:fix

format:
	npm run format

format-check:
	npm run format:check

validate:
	npm run validate

clean:
	npm run clean

start:
	npm start

test-isolated:
	@./scripts/test-isolated.sh

test-with-prefix:
	@./scripts/test-with-prefix.sh

test-docker:
	@docker compose -f docker-compose.yml --profile test up --build

serve:
	npm start -- serve

serve-dev:
	npm run dev &
	npm start -- serve
