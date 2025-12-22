# BOZLY Development Guide

**Status:** Session 38 - Active
**Last Updated:** 2025-12-18

This guide documents development standards, practices, and workflows for BOZLY contributors.

---

## 2025 TypeScript Standards

BOZLY follows modern TypeScript and JavaScript best practices for 2025:

### TypeScript Configuration

**Compilation Target:** ES2022
- Modern async/await, Promise support
- Native modules (ES modules)
- Optional chaining, nullish coalescing
- BigInt, logical assignment operators

**Strict Mode:** Enabled ✅
```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

This prevents common bugs and ensures type safety.

### Node.js Version

**Minimum:** Node.js 18+
- Node.js 18 reached LTS in October 2022
- Native ES modules support (no transpiling)
- Native fetch API
- Strong performance

**Development:** Node.js 20 or 22 LTS recommended

### Module System

**Use:** ES Modules (ESM)
```typescript
// ✅ Correct
import fs from "fs/promises";
import path from "path";
import { initNode } from "./node.js";

// ❌ Avoid
const fs = require("fs/promises");
const path = require("path");
```

All BOZLY code uses ESM. This is the modern standard for Node.js.

---

## Code Organization

### Directory Structure

```
src/
├── core/                    # Core library modules
│   ├── index.ts            # Public API
│   ├── types.ts            # Type definitions
│   ├── node.ts            # Node operations
│   ├── registry.ts         # Node registry
│   ├── config.ts           # Configuration
│   ├── context.ts          # Context generation
│   └── commands.ts         # Command loading
├── cli/                    # CLI interface
│   ├── index.ts           # CLI entry point
│   └── commands/          # Individual commands
│       ├── init.ts
│       ├── list.ts
│       ├── status.ts
│       ├── add.ts
│       ├── context.ts
│       ├── config.ts
│       ├── run.ts
│       └── index.ts
└── index.ts               # Package entry point

tests/
├── conftest.ts            # Shared test utilities
├── unit/                  # Unit tests
├── integration/           # Integration tests
└── fixtures/              # Test data
```

### File Naming

- **Source files:** `camelCase.ts` (e.g., `node.ts`, `loadNode()`)
- **Test files:** `camelCase.test.ts` (e.g., `node.test.ts`)
- **Config files:** `kebab-case.json` (e.g., `.eslintrc.json`)

---

## Code Style & Standards

### Imports & Exports

1. **Named exports for modules, default for index**

```typescript
// ✅ node.ts - use named exports for individual modules
export async function initNode(options: InitOptions): Promise<NodeInfo> {
  // ...
}

export async function loadNode(id: string): Promise<Node> {
  // ...
}

// ✅ index.ts - re-export as default from main index
export { initNode, loadNode } from "./node.js";
```

2. **Absolute path imports** (via tsconfig paths - not yet configured, use relative for now)

```typescript
// Relative imports currently (full path aliases in v1.1)
import { initNode } from "../core/node.js";
```

### Type Annotations

**Always provide explicit types:**

```typescript
// ✅ Good
export async function initNode(options: InitOptions): Promise<NodeInfo> {
  const nodePath: string = path.resolve(options.path);
  const config: NodeConfig = createConfig(options);
  return node;
}

// ❌ Avoid implicit types
export async function initNode(options) {
  const nodePath = path.resolve(options.path);
  return node;
}

// ❌ Don't use `any` unless absolutely necessary
export function processData(data: any): any {
  // ...
}

// ✅ If truly unknown, use union or generic
export function processData<T>(data: T): T {
  // ...
}
```

### Function Documentation

Use JSDoc for public functions:

```typescript
/**
 * Initialize a new node in the specified directory
 *
 * Detailed explanation of what the function does, including edge cases,
 * error conditions, and important behavior notes.
 *
 * @param options - Node initialization options
 * @param options.path - Directory path for node (required)
 * @param options.name - Human-readable node name (optional, defaults to dir name)
 * @param options.type - Node type (optional, defaults to 'default')
 * @param options.force - Overwrite existing node (optional, default false)
 * @returns Node information with ID and metadata
 * @throws {Error} If node path is invalid or already exists (without force)
 *
 * @example
 *   const node = await initNode({
 *     path: '/home/user/my-node',
 *     name: 'my-node',
 *     type: 'music'
 *   });
 *   console.log(`Created node: ${node.id}`);
 */
export async function initNode(options: InitOptions): Promise<NodeInfo> {
  // ...
}
```

**Don't over-document:** Obvious code doesn't need comments.

```typescript
// ❌ Excessive comments
// Set the name to the directory name
const name = options.name || path.basename(nodePath);

// ✅ Better: code is self-documenting
const name = options.name ?? path.basename(nodePath);
```

### File Documentation

Every file must have a header comment:

```typescript
/**
 * Node Operations Module
 *
 * Provides core functionality for creating, managing, and accessing nodes.
 * Handles node initialization, file structure creation, and registry updates.
 *
 * Key features:
 * - Create new nodes with configurable types
 * - Automatic directory structure generation
 * - Node registration and tracking
 * - Error handling and recovery
 *
 * Usage:
 *   import { initNode } from './node.js';
 *   const node = await initNode({ path: '/path/to/node' });
 *
 * @module core/node
 */
```

### Logging Standards

**Every module must include comprehensive logging:**

```typescript
import { logger } from '../core/logger.js';

export async function initNode(options: InitOptions): Promise<NodeInfo> {
  // Log function entry with parameters
  await logger.debug('Initializing node', {
    path: options.path,
    name: options.name,
    type: options.type,
  });

  try {
    // Log major operations
    await logger.info('Creating node directory', { nodePath });
    await fs.mkdir(nodePath, { recursive: true });

    // Log configuration
    const config = createConfig(options);
    await logger.debug('Node config created', {
      nodeName: config.name,
      providers: config.ai.providers.length,
    });

    // Log successful completion
    const node = await addNodeToRegistry({ path: nodePath, name: config.name });
    await logger.info('Node initialized successfully', {
      nodeId: node.id,
      nodeName: node.name,
    });

    return node;
  } catch (error) {
    // Log errors with context
    await logger.error('Node initialization failed',
      { nodePath, type: options.type },
      error as Error
    );
    throw error;
  }
}
```

**Log Levels:**
- **DEBUG** - Detailed info for developers (parameter values, internal state)
- **INFO** - Important events (node created, operation completed)
- **WARN** - Unexpected situations (node exists, retry happening)
- **ERROR** - Error conditions (operation failed, file not found)
- **FATAL** - Fatal errors (exit process immediately)

**Log Output:**
- Console: Color-coded, human-readable
- File: `.bozly/logs/bozly-YYYY-MM-DD-HH-mm-ss.log` (JSON, one per line)

See `LOGGING.md` for comprehensive logging guide.

### Error Handling

**Use descriptive error messages:**

```typescript
// ✅ Good - clear, actionable
throw new Error(
  `Node already exists at ${nodePath}. Use --force to overwrite.`
);

// ❌ Vague
throw new Error("Node exists");

// ✅ Use Error subclasses for categorization
class NodeAlreadyExistsError extends Error {
  constructor(path: string) {
    super(`Node already exists at ${path}. Use --force to overwrite.`);
    this.name = "NodeAlreadyExistsError";
  }
}
```

**Always log errors:**

```typescript
try {
  await initNode(options);
} catch (error) {
  // ✅ Log with context and error object
  await logger.error('Operation failed', options, error as Error);
  // Then rethrow or handle
  throw error;
}
```

### Async/Await

Always use async/await over Promises:

```typescript
// ✅ Async/await (modern, readable)
export async function initNode(options: InitOptions): Promise<NodeInfo> {
  const nodePath = path.resolve(options.path);
  await fs.mkdir(nodePath, { recursive: true });
  return node;
}

// ❌ Promise chains (legacy)
export function initNode(options: InitOptions): Promise<NodeInfo> {
  return fs.mkdir(nodePath, { recursive: true })
    .then(() => node);
}
```

### Null/Undefined Handling

Use nullish coalescing and optional chaining:

```typescript
// ✅ Modern (2025)
const name = options.name ?? path.basename(nodePath);
const provider = config.ai?.defaultProvider ?? "claude";

// ❌ Legacy style
const name = options.name || path.basename(nodePath); // Doesn't handle ""
const provider = config && config.ai && config.ai.defaultProvider || "claude";
```

---

## Linting & Formatting

### ESLint

Run before committing:

```bash
npm run lint              # Check for errors
npm run lint:fix         # Auto-fix errors
```

**Rules:**
- No unused variables
- Strict equality (===)
- Explicit function return types
- No any types (unless unavoidable)
- Consistent quotes (double quotes)

See `.eslintrc.json` for full configuration.

### Prettier

Auto-format on save:

```bash
npm run format           # Format all src files
npm run format:check    # Check without modifying
```

**Configuration:**
- Print width: 100 characters
- Tab width: 2 spaces
- Single quotes: OFF (use double)
- Trailing commas: ES5 compatible
- Line ending: LF

See `.prettierrc.json` for full configuration.

### Pre-Commit Workflow

Before pushing:

```bash
npm run lint:fix        # Auto-fix style issues
npm run format          # Auto-format code
npm run build           # Verify compilation
npm run test:coverage   # Run all tests with coverage
```

Or use the convenience script:

```bash
npm run validate        # Runs: lint → format:check → build → test:coverage
```

---

## Testing Standards

### Test Organization

**Unit tests:** Test individual functions in isolation
**Integration tests:** Test CLI commands end-to-end

```
tests/
├── unit/
│   ├── node.test.ts       # Test node.ts module
│   ├── registry.test.ts    # Test registry.ts module
│   ├── config.test.ts      # Test config.ts module
│   └── context.test.ts     # Test context.ts module
└── integration/
    ├── cli-init.test.ts    # Test `bozly init` command
    ├── cli-list.test.ts    # Test `bozly list` command
    └── cli-run.test.ts     # Test `bozly run` command
```

### Test File Naming

- **File:** `moduleOrFeature.test.ts`
- **Suite:** `describe("Module Name or Feature")`
- **Test:** `it("should do something specific")`

```typescript
describe("Node Operations", () => {
  describe("initNode", () => {
    it("should create a new node with default settings", async () => {
      // test code
    });

    it("should reject if node already exists", async () => {
      // test code
    });
  });
});
```

### Test Coverage

**Target:** 80%+ coverage on all core modules
**Exclusions:** Tests, dist, type definitions, index files

Run coverage report:

```bash
npm run test:coverage
```

Coverage report location: `coverage/index.html`

---

## Building & Publishing

### Build Process

```bash
npm run build           # Compile TypeScript to dist/
npm run clean          # Remove dist/ and coverage/
```

### Validation Before Publish

```bash
npm run validate       # Comprehensive check before release
```

This runs:
1. ESLint (linting)
2. Prettier (formatting check)
3. TypeScript (compilation)
4. Vitest (full test suite with coverage)

### Publishing to npm

See `LIBRARY-VETTING-PROCESS.md` for dependency vetting before version bumps.

```bash
npm version patch|minor|major
npm publish
```

prepublishOnly hook runs `npm run validate` automatically.

---

## Library Usage Guidelines

### When to Use a Library

✅ **Use libraries for:**
- CLI argument parsing (commander)
- Terminal colors (chalk)
- Loading spinners (ora)
- Common utilities already used by major projects

❌ **Don't use libraries for:**
- File operations (use fs/promises)
- Path manipulation (use path module)
- JSON handling (use JSON.parse/stringify)
- Basic logic that's unique to BOZLY

### Vetting New Dependencies

Before adding ANY new library:

1. **Is there a standard solution?**
   - Use npm registry (`npm search <term>`)
   - Check what Google, Meta, Microsoft use

2. **Is it actively maintained?**
   - Check GitHub: commits in last 3 months?
   - Check npm: last publish in last 2 months?

3. **Is it secure?**
   - Run `npm audit`
   - Check SNYK database
   - Look for known CVEs

4. **Is it widely adopted?**
   - 10k+ weekly downloads (minimum)
   - Used by major projects
   - Strong GitHub presence

5. **Documentation & TypeScript?**
   - Clear README with examples
   - TypeScript types (native or via @types)

See `LIBRARY-VETTING-PROCESS.md` for detailed vetting process.

---

## Development Workflow

### Starting a Feature

1. Create a new branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Implement feature with tests:
   ```bash
   npm run dev              # Watch mode compilation
   npm run test:watch      # Watch mode tests
   ```

3. Before committing:
   ```bash
   npm run validate        # Full validation
   ```

4. Commit with descriptive message:
   ```bash
   git commit -m "feat: Add cool new feature"
   ```

### Commit Message Format

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Test additions/modifications
- `refactor:` Code reorganization (no behavior change)
- `perf:` Performance improvement
- `chore:` Dependency updates, tooling

Example:
```bash
git commit -m "feat: Add pattern 7 (domain models) support"
git commit -m "test: Add comprehensive unit tests for node operations"
git commit -m "fix: Handle missing context.md gracefully"
```

### Pull Request Process

1. Push feature branch
2. Create PR with clear description
3. Ensure all checks pass (GitHub Actions)
4. Request code review
5. Address feedback
6. Merge when approved

---

## Debugging

### TypeScript Debugging

Enable source maps (already configured):

```bash
npm run dev             # Watch mode
node --inspect dist/cli/index.js  # Run with inspector
```

Then use VS Code Debugger or Chrome DevTools.

### Test Debugging

Run specific test file:

```bash
npm run test node.test.ts
npm run test:watch node.test.ts
```

Inspect specific test:

```typescript
it.only("should handle this case", async () => {
  // Only this test runs
});
```

---

## Performance Considerations

### Async Operations

- Always use `fs/promises` (async) over fs.readFileSync
- Use Promise.all() for parallel operations
- Cache frequently accessed data (registry, configs)

### Module Loading

- Import only what you need
- ESM tree-shaking works automatically

### Dependency Injection

For testing, pass dependencies rather than importing globally:

```typescript
// ✅ Testable - receives logger as parameter
async function initNode(options: InitOptions, logger?: Logger): Promise<NodeInfo> {
  logger?.log("Creating node...");
}

// ❌ Hard to test - hardcoded dependency
import { globalLogger } from "../logger";
async function initNode(options: InitOptions): Promise<NodeInfo> {
  globalLogger.log("Creating node...");
}
```

---

## Useful Commands

```bash
npm run build              # Compile TypeScript
npm run dev               # Watch mode compilation
npm run lint              # Check for linting errors
npm run lint:fix          # Auto-fix linting errors
npm run format            # Format code
npm run format:check      # Check formatting without modifying
npm run test              # Run all tests once
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Generate coverage report
npm run test:ui           # Open Vitest UI (browser)
npm run validate          # Full validation (lint → format → build → test)
npm run clean             # Remove build artifacts
npm start                 # Run CLI (after build)
```

---

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [Prettier Documentation](https://prettier.io/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)
- [npm Package Quality Standards](https://docs.npmjs.com/policies/npm-quality-standards)

---

**Last Reviewed:** 2025-12-18 (Session 38)
**Next Review:** After next major feature implementation
