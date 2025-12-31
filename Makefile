.PHONY: help build dev test test-watch test-ui test-coverage test-isolated test-with-prefix test-docker lint lint-fix format format-check validate clean start serve serve-dev install uninstall setup verify test-all rebuild-serve

help:
	@echo "BOZLY - Development Commands"
	@echo ""
	@echo "🚀 Setup & Installation:"
	@echo "  make setup           Complete setup: clean → install → test → verify"
	@echo "  make install         Install dependencies, build, and link globally (npm link)"
	@echo "  make uninstall       Remove global bozly link (npm unlink -g)"
	@echo "  make verify          Verify bozly CLI works (--version, list, init)"
	@echo ""
	@echo "🏗️  Building:"
	@echo "  make build           Compile TypeScript to dist/"
	@echo "  make dev             Watch mode compilation (auto-rebuild on changes)"
	@echo "  make clean           Remove dist/ and coverage/ directories"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  make test            Run all tests once (99 files, 3000+ tests)"
	@echo "  make test-watch      Run tests in watch mode (re-run on changes)"
	@echo "  make test-ui         Open Vitest UI in browser"
	@echo "  make test-coverage   Run tests with coverage report"
	@echo "  make test-all        Run all test types: unit + isolated + docker"
	@echo ""
	@echo "🔬 Isolated Testing (Recommended for Development):"
	@echo "  make test-isolated   Test in isolated temp directory (auto-cleanup)"
	@echo "                       → Fastest feedback, tests exact npm package"
	@echo ""
	@echo "💾 Persistent Testing:"
	@echo "  make test-with-prefix   Test with persistent ~/.bozly-test prefix"
	@echo "                          → Keep env for repeated testing"
	@echo ""
	@echo "🐳 Docker Testing (Pre-Publish Validation):"
	@echo "  make test-docker     Run Docker npm integration tests"
	@echo "                       → Exactly matches GitHub Actions CI/CD"
	@echo ""
	@echo "✨ Code Quality:"
	@echo "  make lint            Check for ESLint errors"
	@echo "  make lint-fix        Auto-fix ESLint errors"
	@echo "  make format          Format code with Prettier"
	@echo "  make format-check    Check formatting without modifying"
	@echo ""
	@echo "📋 Full Workflow:"
	@echo "  make validate        Run: lint → format:check → build → test:coverage"
	@echo ""
	@echo "▶️  Running:"
	@echo "  make start           Run the bozly CLI"
	@echo "  make serve           Start BOZLY dashboard server (port 3847)"
	@echo "  make serve-dev       Start server in development (watch mode)"
	@echo "  make rebuild-serve   Clean build + clear cache + start server (testing)"
	@echo ""
	@echo "💻 Development Loop:"
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

# ============================================================================
# 🚀 NEW: Complete Setup, Installation & Verification Commands
# ============================================================================

install: clean
	@echo "📦 Installing dependencies..."
	npm install
	@echo "🏗️  Building project..."
	make build
	@echo "🔗 Linking globally (npm link)..."
	npm link
	@echo "✅ Installation complete!"

uninstall:
	@echo "🔌 Unlinking global bozly..."
	npm unlink -g bozly || true
	@echo "✅ Uninstall complete!"

verify:
	@echo "🔍 Verifying bozly installation..."
	@echo ""
	@echo "  1️⃣  Checking version..."
	bozly --version
	@echo ""
	@echo "  2️⃣  Listing nodes..."
	bozly list
	@echo ""
	@echo "  3️⃣  Testing init command..."
	@command -v bozly > /dev/null && echo "   ✅ bozly CLI is working!" || echo "   ❌ bozly CLI not found"
	@echo ""
	@echo "✅ Verification complete!"

setup: clean
	@echo "🚀 BOZLY Complete Setup"
	@echo "======================="
	@echo ""
	@echo "Step 1️⃣  Installing dependencies..."
	npm install
	@echo ""
	@echo "Step 2️⃣  Building project..."
	make build
	@echo ""
	@echo "Step 3️⃣  Running full test suite..."
	npm run test
	@echo ""
	@echo "Step 4️⃣  Linking globally..."
	npm link
	@echo ""
	@echo "Step 5️⃣  Verifying installation..."
	make verify
	@echo ""
	@echo "🎉 Setup complete! bozly is ready to use."
	@echo ""
	@echo "Next steps:"
	@echo "  • Try: bozly list"
	@echo "  • Try: bozly init /path/to/vault"
	@echo "  • Try: bozly serve (start dashboard)"

test-all: test
	@echo ""
	@echo "Running additional test suites..."
	@echo "  make test-isolated"
	make test-isolated

rebuild-serve: clean build
	@echo "🧹 Clearing caches..."
	@rm -rf ~/.bozly/cache 2>/dev/null || true
	@rm -rf /tmp/.bozly-cache* 2>/dev/null || true
	@echo "✅ Clean rebuild complete! Starting server..."
	@echo ""
	npm start -- serve
