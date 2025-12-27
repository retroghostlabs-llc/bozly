# BOZLY TUI Development Guide

Complete guide for developers working on the Terminal User Interface system.

**Status:** ✅ Production Ready with 80%+ Test Coverage
**Framework:** blessed (Terminal UI library)
**Language:** TypeScript
**Test Coverage Target:** 80%+ for all modules
**Last Updated:** December 27, 2025

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Development Setup](#development-setup)
5. [Writing Tests](#writing-tests)
6. [Code Standards](#code-standards)
7. [Common Patterns](#common-patterns)
8. [Extending the TUI](#extending-the-tui)
9. [Performance Optimization](#performance-optimization)
10. [Debugging Guide](#debugging-guide)

---

## Architecture Overview

### Design Principles

The BOZLY TUI is built on these core principles:

1. **Modularity** - Each component (Screen, Modal, APIClient) is independent
2. **Testability** - All public APIs are unit-testable with 80%+ coverage
3. **Responsiveness** - Real-time updates via API client with configurable refresh intervals
4. **Graceful Degradation** - Works in dumb terminals, supports colors when available
5. **Keyboard-First** - All features accessible via keyboard, no mouse required
6. **API-Driven** - Communicates with REST API server, not direct file access

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   BozlyTUI (App)                    │
│  Main application controller, screen management     │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐  ┌─────▼──────┐ ┌────▼─────┐
   │ Screens │  │   Modals   │ │APIClient │
   └────┬────┘  └─────┬──────┘ └────┬─────┘
        │             │             │
   ┌────▼────────┐   │         ┌────▼──────────┐
   │8 Screens    │   │         │REST Endpoints │
   │- Home       │   │         │- Vaults       │
   │- Vaults     │   ├─────────┤- Sessions     │
   │- Sessions   │   │         │- Commands     │
   │- Commands   │   │         │- Workflows    │
   │- Workflows  │   │         │- Memory       │
   │- Memory     │   │         │- Config       │
   │- Config     │   │         │- Health       │
   │- Health     │   │         └───────────────┘
   └─────────────┘   │
                 ┌───▼────────┐
                 │2 Modals    │
                 │- Confirm   │
                 │- Error     │
                 └────────────┘

Blessed Terminal Screen
```

### Technology Stack

- **blessed** (6.1.0+) - Terminal UI rendering library
- **axios** (0.18.0+) - HTTP client for API communication
- **TypeScript** - Type-safe development
- **vitest** - Unit testing framework
- **@inquirer/prompts** - Interactive command-line prompts

---

## Project Structure

```
src/cli/tui/
├── core/
│   ├── app.ts              (Main TUI application class)
│   ├── screen.ts           (Base Screen class, abstract)
│   ├── modal.ts            (Base Modal class, abstract)
│   ├── keybindings.ts      (Global keyboard handling)
│   └── api-client.ts       (REST API client with caching)
├── screens/
│   ├── home.ts             (Home/Dashboard screen)
│   ├── vaults.ts           (Vaults browser screen)
│   ├── sessions.ts         (Sessions/history screen)
│   ├── commands.ts         (Commands browser screen)
│   ├── workflows.ts        (Workflows screen)
│   ├── memory.ts           (Memory/knowledge screen)
│   ├── config.ts           (Configuration screen)
│   └── health.ts           (Health/status screen)
├── modals/
│   ├── confirm.ts          (Confirmation dialog)
│   └── error.ts            (Error message dialog)
├── index.ts                (Main TUI export/entry)
└── commands/
    └── tui.ts              (CLI command handler)

tests/unit/cli/tui/core/
├── app.test.ts             (Integration tests)
├── modal.test.ts           (Basic modal tests)
├── modal-comprehensive.test.ts (80%+ coverage)
├── screen.test.ts          (Screen lifecycle tests)
├── api-client.test.ts      (Basic API tests)
├── api-client-comprehensive.test.ts (80%+ coverage)
└── keybindings.test.ts     (Keybinding tests)

tests/integration/
└── tui-app.test.ts         (Full TUI integration tests)
```

---

## Core Components

### 1. BozlyTUI (App)

**File:** `src/cli/tui/core/app.ts`

Main application controller managing:
- Blessed screen setup and lifecycle
- Screen registration and switching
- Modal management
- Global keybindings
- Polling/update mechanism
- API client initialization

**Key Methods:**

```typescript
// Lifecycle
async init(): Promise<void>              // Initialize app
async start(): Promise<void>             // Start TUI
shutdown(): void                         // Cleanup and exit

// Screen Management
registerScreen(screen: Screen): void     // Register new screen
switchScreen(screenId: string): void     // Switch to screen
getScreen(): blessed.Widgets.Screen      // Get blessed screen

// Modal Management
async showModal(modal: Modal): Promise<any> // Show modal, wait for result

// API Access
getAPIClient(): APIClient                // Get API client instance
```

**Test Coverage:** 80%+ (core features tested)

---

### 2. Screen (Base Class)

**File:** `src/cli/tui/core/screen.ts`

Abstract base class for all screen implementations.

**Key Methods:**

```typescript
abstract async init(): Promise<void>     // Initialize (called once)
abstract async activate(): Promise<void> // Activate (called when switched to)
abstract async render(): Promise<void>   // Render content
abstract async deactivate(): void        // Called when switching away
abstract async destroy(): void           // Cleanup resources

// Utilities
protected handleKey(ch: string, key?: any): Promise<void>
protected getSize(): { width: number; height: number }
protected log(message: string): void
```

**Implementation Pattern:**

```typescript
export class MyScreen extends Screen {
  private box: blessed.Widgets.BoxElement | null = null;

  async init(): Promise<void> {
    this.box = this.createBox();
    // One-time initialization
  }

  async activate(): Promise<void> {
    // Called when screen becomes active
    await this.render();
  }

  async render(): Promise<void> {
    if (!this.box) return;
    this.box.setContent("Screen content");
    this.parent.render();
  }

  async deactivate(): void {
    // Cleanup before switching away
  }

  async destroy(): void {
    if (this.box) this.box.destroy();
  }
}
```

**Test Coverage:** 80%+ on all concrete screen implementations

---

### 3. Modal (Base Class)

**File:** `src/cli/tui/core/modal.ts`

Abstract base class for all dialog windows.

**Key Methods:**

```typescript
abstract async init(): Promise<void>
abstract async render(): Promise<void>
abstract async handleKey(ch: string, key?: any): Promise<void>

async show(): Promise<any>               // Show modal, return promise
close(result?: any): void                // Close and resolve promise
destroy(): void                          // Cleanup

// Utilities
protected createBox(options?: Partial<BoxOptions>): BoxElement
protected createTextInput(parent: BoxElement, options?: Partial<TextboxOptions>): TextboxElement
protected createButton(parent: BoxElement, text: string, options?: Partial<ButtonOptions>): ButtonElement
protected createList(parent: BoxElement, options?: Record<string, unknown>): ListElement
protected setFocus(element: { focus: () => void }): void
```

**Implementation Pattern:**

```typescript
export class MyModal extends Modal {
  private box: BoxElement | null = null;
  private confirmButton: ButtonElement | null = null;

  async init(): Promise<void> {
    this.box = this.createBox();
    this.confirmButton = this.createButton(this.box, "Confirm", {
      mouse: true,
      keys: true,
    });
    this.confirmButton.on("press", () => this.close(true));
  }

  async render(): Promise<void> {
    if (this.box) {
      this.box.setContent("Modal content");
    }
  }

  async handleKey(ch: string, key?: any): Promise<void> {
    if (ch === "escape") {
      this.close(false);
    }
  }
}
```

**Test Coverage:** 80%+ on core functionality

---

### 4. APIClient

**File:** `src/cli/tui/core/api-client.ts`

HTTP client for communicating with BOZLY REST API server.

**Key Methods:**

```typescript
// Health & Config
async isHealthy(): Promise<boolean>
async getHealth(): Promise<any>
async getConfig(): Promise<any>
async updateConfig(config: any): Promise<any>

// Vaults
async getVaults(): Promise<any[]>
async getVault(id: string): Promise<any>
async createVault(config: any): Promise<any>
async updateVault(id: string, config: any): Promise<any>
async deleteVault(id: string): Promise<void>

// Sessions (similar CRUD methods)
async getSessions(vaultId?: string, limit?: number): Promise<any[]>
async getSession(id: string): Promise<any>
async searchSessions(query: string, filters?: any): Promise<any[]>
async compareSessions(id1: string, id2: string): Promise<any>
async deleteSession(id: string): Promise<void>

// Commands, Workflows, Memory, etc. (full CRUD for all resources)

// Error Handling
parseError(error: unknown): APIError
```

**Features:**

- **Caching:** 5-second cache for list endpoints (GET /vaults, /commands, etc.)
- **Cache Invalidation:** Automatic on create/update/delete operations
- **Error Handling:** Axios error parsing with code, message, and details
- **Timeout:** 10-second timeout per request

**Test Coverage:** 80%+ with comprehensive CRUD and caching tests

---

### 5. Keybindings

**File:** `src/cli/tui/core/keybindings.ts`

Global keyboard handling system.

**Features:**
- Vim-style navigation (hjkl, gg, G)
- Screen jumping (number keys 1-8)
- Global shortcuts (?, q, r)
- Screen-specific handlers
- Modal key capture

**Usage:**

```typescript
// Bind a key in screen or modal
this.screen.key(['q'], () => {
  app.shutdown();
});

// Vim keys in lists
this.screen.key(['j'], () => this.selectNext());
this.screen.key(['k'], () => this.selectPrev());
```

---

## Development Setup

### Prerequisites

```bash
# Node.js 16+ and npm 8+
node --version  # v16.0.0 or later
npm --version   # 8.0.0 or later

# TypeScript compiler
npx tsc --version

# BOZLY installed globally or locally
npm install -g @retroghostlabs/bozly
# OR
npm link  # if developing locally
```

### Setup Development Environment

```bash
# Clone/navigate to bozly repo
cd release/bozly

# Install dependencies
npm install

# Verify setup with tests
npm run test

# Start development with file watching
npm run dev  # or use `make dev` if using Makefile
```

### Running the TUI During Development

```bash
# Terminal 1: Start API server
npm run dev:server
# OR
bozly serve

# Terminal 2: Start TUI (will watch for file changes)
npm run dev:tui
# OR manually
npx ts-node src/cli/tui/index.ts
```

---

## Writing Tests

### Test Coverage Requirements

**Industry Standard:** 80%+ for production code

**Target Breakdown:**
- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

### Test Structure

All tests follow this pattern:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MyComponent } from "@/cli/tui/core/my-component";

describe("MyComponent", () => {
  let component: MyComponent;

  beforeEach(() => {
    // Setup
    vi.clearAllMocks();
    component = new MyComponent();
  });

  afterEach(() => {
    // Cleanup
    if (component) {
      component.destroy();
    }
  });

  describe("Constructor", () => {
    it("should initialize with default values", () => {
      expect(component).toBeDefined();
    });
  });

  describe("Method Name", () => {
    it("should perform expected action", () => {
      expect(component.method()).toBe(expectedResult);
    });
  });
});
```

### Example Test Files

#### API Client Tests (Comprehensive)

**File:** `tests/unit/cli/tui/core/api-client-comprehensive.test.ts`
**Coverage:** 80%+ (150+ test cases)
**Topics:**
- Constructor initialization
- Health checks
- All CRUD operations (Vaults, Sessions, Commands, Workflows, Memory, Config)
- Caching behavior and invalidation
- Error handling and parsing
- Integration scenarios

#### Modal Tests (Comprehensive)

**File:** `tests/unit/cli/tui/core/modal-comprehensive.test.ts`
**Coverage:** 80%+ (40+ test cases)
**Topics:**
- Lifecycle (init → show → close → destroy)
- Promise resolution
- Event handling
- Error resilience
- Focus management
- Getter methods (getId, getTitle, isCurrentlyVisible)

### Running Tests

```bash
# Run all tests
npm run test

# Run with coverage report
npm run test -- --coverage

# Run specific test file
npm run test -- tests/unit/cli/tui/core/modal-comprehensive.test.ts

# Watch mode (auto-rerun on file changes)
npm run test -- --watch

# Coverage report in HTML
npm run test -- --coverage
open coverage/index.html
```

### Checking Coverage

```bash
# Generate and open HTML coverage report
npm run test -- --coverage
open coverage/index.html

# Show coverage in terminal
npm run test -- --coverage 2>&1 | grep "src/cli/tui"
```

---

## Code Standards

### Style Guide

**Language:** TypeScript with strict mode

**Formatting:**
- Use `prettier` for auto-formatting
- Run `npm run format` before committing
- ESLint rules enforced in CI/CD

**Naming Conventions:**

```typescript
// Classes: PascalCase
export class MyScreen extends Screen {}
export class APIClient {}

// Methods/functions: camelCase
async performAction(): Promise<void> {}
private calculateValue(): number {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 5000;

// Interfaces: PascalCase with I prefix optional
export interface ScreenConfig {}
export type ModalResult = boolean | string | null;

// Private properties: leading underscore
private _data: any[] = [];
```

### Code Quality Rules

1. **Type Safety:**
   - No `any` types (use `unknown` and narrow with guards)
   - Strict null checks enabled
   - Explicit return types on public methods

2. **Error Handling:**
   - All async operations wrapped in try/catch
   - Graceful fallbacks for terminal errors
   - Meaningful error messages

3. **Comments:**
   - Public APIs must have JSDoc comments
   - Complex logic should have explanatory comments
   - TODO comments for future work

```typescript
/**
 * Initialize the screen (called once on startup)
 *
 * @throws {Error} If initialization fails
 * @example
 * await screen.init();
 */
async init(): Promise<void> {
  // Implementation
}
```

4. **Testing:**
   - 80%+ code coverage minimum
   - Unit tests for all public methods
   - Integration tests for component interactions
   - Mocking external dependencies (blessed, axios)

---

## Common Patterns

### Implementing a New Screen

```typescript
import { Screen } from "@/cli/tui/core/screen";
import blessed from "blessed";

export class MyNewScreen extends Screen {
  private box: blessed.Widgets.BoxElement | null = null;
  private list: blessed.Widgets.ListElement | null = null;

  async init(): Promise<void> {
    // Create UI elements (called once)
    this.box = this.createBox({
      border: "line",
      label: " My Screen ",
    });

    this.list = this.createList(this.box, {
      top: 1,
      height: "100% - 2",
      mouse: true,
      keys: true,
      vi: true,
    });

    // Setup event handlers
    this.list.on("select", async (item) => {
      await this.handleSelect(item);
    });
  }

  async activate(): Promise<void> {
    // Called when screen becomes active
    await this.render();
  }

  async render(): Promise<void> {
    // Render/update content
    if (!this.list) return;
    const items = await this.fetchItems();
    this.list.setItems(items.map(item => item.name));
  }

  async deactivate(): void {
    // Called before switching away
  }

  async destroy(): void {
    // Cleanup resources
    if (this.box) this.box.destroy();
  }

  private async handleSelect(item: any): Promise<void> {
    // Handle user selection
  }

  private async fetchItems(): Promise<any[]> {
    return this.app.getAPIClient().getVaults();
  }
}
```

### Implementing a New Modal

```typescript
import { Modal } from "@/cli/tui/core/modal";
import blessed from "blessed";

export class MyNewModal extends Modal {
  private box: blessed.Widgets.BoxElement | null = null;
  private input: blessed.Widgets.TextboxElement | null = null;
  private confirmButton: blessed.Widgets.ButtonElement | null = null;
  private cancelButton: blessed.Widgets.ButtonElement | null = null;

  async init(): Promise<void> {
    // Create modal box
    this.box = this.createBox();

    // Create text input
    this.input = this.createTextInput(this.box, {
      top: 1,
      left: 1,
      width: "100% - 2",
      height: 3,
    });

    // Create buttons
    this.confirmButton = this.createButton(this.box, "Confirm", {
      top: 5,
      left: 1,
    });

    this.cancelButton = this.createButton(this.box, "Cancel", {
      top: 5,
      left: 20,
    });

    // Setup handlers
    this.confirmButton.on("press", () => {
      this.close(this.input?.getValue());
    });

    this.cancelButton.on("press", () => {
      this.close(null);
    });
  }

  async render(): Promise<void> {
    this.setFocus(this.input!);
  }

  async handleKey(ch: string, key?: any): Promise<void> {
    if (key?.name === "escape") {
      this.close(null);
    }
  }
}
```

### Using APIClient

```typescript
// In a screen or modal
private async loadData(): Promise<void> {
  try {
    const client = this.app.getAPIClient();

    // Check health
    const healthy = await client.isHealthy();
    if (!healthy) {
      throw new Error("API server not responding");
    }

    // Fetch vaults
    const vaults = await client.getVaults();

    // Search sessions
    const results = await client.searchSessions("query", {
      status: "success"
    });

    // Create new vault
    const newVault = await client.createVault({
      name: "my-vault",
      description: "My vault"
    });

  } catch (error) {
    const apiError = client.parseError(error);
    this.showError(`Failed to load: ${apiError.message}`);
  }
}
```

---

## Extending the TUI

### Adding a New Screen

1. **Create screen file:**
```bash
touch src/cli/tui/screens/my-screen.ts
```

2. **Implement Screen class** (see pattern above)

3. **Register in BozlyTUI:**
```typescript
// In app initialization
const myScreen = new MyScreen(screen, { id: "my-screen", title: "My Screen" });
this.registerScreen(myScreen);
```

4. **Add keyboard shortcut:**
```typescript
// In app keybindings
screen.key(['m'], () => {
  this.switchScreen('my-screen');
});
```

5. **Write tests:**
```bash
touch tests/unit/cli/tui/screens/my-screen.test.ts
```

6. **Test the new screen:**
```bash
npm run test -- tests/unit/cli/tui/screens/my-screen.test.ts
```

---

## Performance Optimization

### Caching Strategy

The APIClient implements a 5-second cache for list endpoints:

```typescript
// Cached (returns cached within 5 seconds)
const vaults = await client.getVaults();  // 1st call: hits API
const vaults2 = await client.getVaults(); // 2nd call: returns cache

// Non-cached (always hits API)
const vault = await client.getVault(id);

// Invalidation (on write operations)
await client.createVault({...});  // Creates + invalidates cache
```

### Rendering Performance

- **Batch Updates:** Combine multiple screen updates before calling `render()`
- **Lazy Loading:** Load list items on demand, not all at once
- **Debounce Input:** Debounce search/filter input to avoid excessive filtering

### Terminal Rendering

- Use blessed's built-in rendering (don't call `render()` excessively)
- Avoid global screen re-renders; update individual elements
- Use `hidden` property instead of destroying/recreating elements

---

## Debugging Guide

### Enable Debug Logging

```bash
# Set environment variable
DEBUG=bozly:* bozly tui

# Or in code
console.log('Debug message'); // Appears in stderr
```

### Debugging in VS Code

**Launch Configuration** (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "TUI Debug",
      "program": "${workspaceFolder}/src/cli/tui/index.ts",
      "runtimeArgs": ["--loader", "ts-node/esm"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Common Issues

**Terminal frozen:**
- Press `Ctrl+C` to interrupt
- TUI doesn't handle certain terminal sequences

**Memory leak:**
- Ensure `destroy()` is called on all components
- Verify event listeners are unbound in `deactivate()`

**API errors:**
- Check if `bozly serve` is running
- Verify custom `--api-url` if specified
- Check firewall/proxy blocking localhost connections

### Inspecting State

```typescript
// In any screen/modal
console.log('Current screen:', this.id);
console.log('API client config:', this.app.getAPIClient());
console.log('Screen size:', this.getSize());
```

---

## Resources

- [Blessed Documentation](https://github.com/chjj/blessed)
- [BOZLY Architecture Guide](../docs/ARCHITECTURE.md)
- [TUI Dashboard Design](./TUI-DASHBOARD-DESIGN.md)
- [API Documentation](../docs/API.md)

---

**Last Updated:** December 27, 2025
**Maintained by:** BOZLY Development Team
**License:** Open Source (check LICENSE file)
