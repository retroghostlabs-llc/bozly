# BOZLY Testing Guide

**Status:** Session 38 - Active
**Last Updated:** 2025-12-18

Comprehensive testing guide for BOZLY contributors.

---

## Testing Strategy

### Test Types

| Type | Purpose | Location | Tools |
|------|---------|----------|-------|
| **Unit Tests** | Test individual functions in isolation | `tests/unit/` | Vitest + fixtures |
| **Integration Tests** | Test CLI commands end-to-end | `tests/integration/` | Vitest + mock node |
| **Manual Tests** | Verify behavior manually | `MANUAL-TESTING.md` | CLI + text editor |

### Coverage Goals

- **Overall:** 80%+ code coverage
- **Core modules:** 85%+ (node, registry, config, context)
- **CLI commands:** 75%+ (integration tests)
- **Type files:** Excluded from coverage

**Current Status:** Tests being written (Session 38)

---

## Running Tests

### Quick Start

```bash
# Run all tests once
npm run test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Open Vitest UI in browser
npm run test:ui
```

### Running Specific Tests

```bash
# Run specific test file
npm run test node.test.ts

# Run tests matching pattern
npm run test -- --grep "initNode"

# Run single test (use .only)
it.only("should initialize node", async () => {
  // Only this test runs
});
```

### Watch Mode Development

```bash
# Terminal 1: Watch source files
npm run dev

# Terminal 2: Watch tests
npm run test:watch
```

---

## Unit Testing

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initNode } from "../../src/core/node";

describe("Node Operations", () => {
  beforeEach(async () => {
    // Setup before each test
  });

  afterEach(async () => {
    // Cleanup after each test
  });

  describe("initNode", () => {
    it("should create a new node", async () => {
      // Arrange
      const options = { path: "/tmp/node", name: "test" };

      // Act
      const node = await initNode(options);

      // Assert
      expect(node.name).toBe("test");
    });

    it("should reject if node exists", async () => {
      // Test error case
      await expect(initNode(options)).rejects.toThrow();
    });
  });
});
```

### Test Fixtures & Utilities

**Available in conftest.ts:**

```typescript
// Create isolated temp directory
const tempDir = await createTempDir();

// Get current temp directory
const dir = getTempDir();

// Create mock node with all subdirectories
const nodePath = await createMockNode(tempDir);

// Create mock registry
await createMockRegistry(tempDir);

// File operations
await fileExists(filePath);
await dirExists(dirPath);
await readJSON<T>(filePath);
await writeJSON<T>(filePath, data);
```

### Example Unit Test

```typescript
describe("Node Initialization", () => {
  it("should create .bozly directory structure", async () => {
    // Arrange
    await createTempDir();
    const tempDir = getTempDir();
    const nodePath = path.join(tempDir, "my-node");

    // Act
    await initNode({ path: nodePath, name: "my-node" });

    // Assert
    expect(await dirExists(path.join(nodePath, ".bozly"))).toBe(true);
    expect(await dirExists(path.join(nodePath, ".bozly", "sessions"))).toBe(true);
    expect(await dirExists(path.join(nodePath, ".bozly", "tasks"))).toBe(true);
  });

  it("should create config.json with correct structure", async () => {
    // Arrange
    await createTempDir();
    const tempDir = getTempDir();
    const nodePath = path.join(tempDir, "node");

    // Act
    await initNode({ path: nodePath, name: "test-node", type: "music" });

    // Assert
    const configPath = path.join(nodePath, ".bozly", "config.json");
    const config = await readJSON(configPath);

    expect(config.name).toBe("test-node");
    expect(config.type).toBe("music");
    expect(config.ai.defaultProvider).toBe("claude");
  });
});
```

### Testing Best Practices

✅ **Do:**
- Use descriptive test names: "should create .bozly directory structure"
- Test one thing per test
- Use AAA pattern (Arrange, Act, Assert)
- Clean up after tests (automatic via afterEach)
- Test edge cases and errors
- Use fixtures for common setup

❌ **Don't:**
- Test implementation details, test behavior
- Use unclear names: "test1", "should work"
- Mix multiple assertions across concepts
- Leave test data lying around
- Skip error case testing
- Test the testing framework itself

---

## Integration Testing

### CLI Command Testing

```typescript
describe("bozly list command", () => {
  it("should list all registered nodes", async () => {
    // Arrange
    await createTempDir();
    const tempDir = getTempDir();
    process.env.BOZLY_HOME = tempDir;
    await createMockRegistry(tempDir);

    // Act
    const { nodes } = await listNodes();

    // Assert
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe("test-node");
  });
});
```

### Mock Node Creation

All integration tests should use mock nodes:

```typescript
// Create a complete test node
const nodePath = await createMockNode(tempDir);

// Now test commands against this node
const node = await getNode("test-node");
expect(node).toBeDefined();
```

### Testing Error Handling

```typescript
describe("Error Handling", () => {
  it("should reject if node path is invalid", async () => {
    await expect(
      initNode({ path: "/invalid/path/that/doesnt/exist" })
    ).rejects.toThrow("Permission denied");
  });

  it("should reject if config is malformed", async () => {
    // Create node with invalid JSON
    const configPath = path.join(nodePath, ".bozly", "config.json");
    await fs.writeFile(configPath, "{ invalid }");

    await expect(
      loadNodeConfig(nodePath)
    ).rejects.toThrow("SyntaxError");
  });
});
```

---

## Mocking & Fixtures

### Mock Node Structure

`createMockNode()` creates:

```
test-node/
└── .bozly/
    ├── config.json          # Valid node config
    ├── context.md           # Default context
    ├── index.json           # Task index
    ├── sessions/            # Empty directory
    ├── tasks/               # Empty directory
    ├── commands/            # Empty directory
    ├── workflows/           # Empty directory
    └── hooks/               # Empty directory
```

### Mock Registry

`createMockRegistry()` creates:

```json
{
  "version": "0.3.0",
  "nodes": [
    {
      "id": "test-node-1",
      "name": "test-node",
      "path": "/tmp/test-node",
      "type": "default",
      "active": true,
      "created": "2024-01-01T00:00:00Z"
    }
  ],
  "created": "2024-01-01T00:00:00Z",
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

### File Operations in Tests

```typescript
// Use readJSON/writeJSON helpers
const config = await readJSON<NodeConfig>(configPath);
config.name = "updated";
await writeJSON(configPath, config);

// Or use fs/promises directly
const content = await fs.readFile(filePath, "utf-8");
await fs.writeFile(filePath, newContent);
```

---

## Coverage Analysis

### Generate Coverage Report

```bash
npm run test:coverage
```

Generates:
- Terminal summary (% coverage by file)
- HTML report: `coverage/index.html`
- LCOV report: `coverage/lcov.info`

### Reading Coverage Reports

**Terminal output:**
```
src/core/node.ts          │ 85% │ 90% │ 80% │ 85%
src/core/registry.ts       │ 78% │ 75% │ 70% │ 78%
src/core/config.ts         │ 92% │ 95% │ 88% │ 92%
```

**HTML report:**
- Green: Good coverage (>80%)
- Yellow: Warning (60-80%)
- Red: Poor (<60%)

### Improving Coverage

1. Identify uncovered lines in HTML report
2. Write tests for those code paths
3. Run coverage again to verify

Example:
```typescript
// This line is uncovered (red in HTML report)
if (error.code === "ENOENT") {
  throw new NodeNotFoundError();
}

// Add test to cover it
it("should throw NodeNotFoundError if node doesn't exist", async () => {
  // This test exercises the uncovered branch
  await expect(loadNode("/nonexistent")).rejects.toThrow(NodeNotFoundError);
});
```

---

## Test File Organization

### Current Test Modules

```
tests/unit/
├── node.test.ts        # 9+ tests for node operations
├── registry.test.ts     # 10+ tests for registry management
├── config.test.ts       # 8+ tests for config handling
├── context.test.ts      # 10+ tests for context generation
└── types.test.ts        # 12+ tests for type definitions
                         ────────────────
                         49+ unit tests

tests/integration/
├── cli-init.test.ts     # 5+ tests
├── cli-list.test.ts     # 5+ tests
├── cli-add.test.ts      # 3+ tests
├── cli-status.test.ts   # 3+ tests
├── cli-context.test.ts  # 3+ tests
├── cli-run.test.ts      # 3+ tests
└── cli-config.test.ts   # 2+ tests
                         ────────────
                         24+ integration tests

Total: 73+ tests (target: 80%+ coverage)
```

---

## Debugging Tests

### Debug Specific Test

```bash
# Run with extra logging
npm run test:watch node.test.ts

# Use .only to isolate test
it.only("should handle this", async () => {
  // Only this runs
});
```

### Add Console Output

```typescript
it("should process node", async () => {
  const node = await initNode(options);
  console.log("Node created:", node);  // Shows in test output
  expect(node.name).toBe("test");
});
```

### Use Debugger

```typescript
it("should handle error", async () => {
  debugger;  // Pauses here when running with --inspect
  const result = await riskyOperation();
  expect(result).toBeDefined();
});
```

Run with debugger:
```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

Then open `chrome://inspect` in Chrome.

---

## Continuous Integration

### GitHub Actions (To Be Configured)

Tests will run on:
- Every push
- Every pull request
- Before merge to main

Pipeline:
1. `npm install`
2. `npm run lint` — Linting check
3. `npm run build` — TypeScript compilation
4. `npm run test:coverage` — Full test suite with coverage
5. `npm run format:check` — Formatting check

Must pass all checks before merging.

---

## Test Development Cycle

### When Adding a New Feature

1. **Write test first (TDD optional)**
   ```bash
   npm run test:watch
   ```

2. **Implement feature to pass test**
   ```bash
   npm run dev
   ```

3. **Add more test cases for edge cases**

4. **Run full validation**
   ```bash
   npm run validate
   ```

5. **Commit with test coverage**
   ```bash
   git commit -m "feat: Add new feature with tests"
   ```

---

## Common Test Patterns

### Testing Async Functions

```typescript
it("should load config asynchronously", async () => {
  const config = await loadNodeConfig(nodePath);
  expect(config.name).toBe("test");
});
```

### Testing Errors

```typescript
it("should throw error on invalid input", async () => {
  await expect(
    initNode({ path: null })  // Invalid
  ).rejects.toThrow("Invalid path");
});
```

### Testing File Operations

```typescript
it("should create files with correct content", async () => {
  await createNode(nodePath);

  const config = await readJSON(configPath);
  expect(config.version).toBe("0.3.0");

  const exists = await fileExists(contextPath);
  expect(exists).toBe(true);
});
```

### Testing with Temporary Directories

```typescript
it("should not pollute filesystem", async () => {
  await createTempDir();
  const tempDir = getTempDir();

  // Test operations in isolated temp dir
  const node = await initNode({ path: path.join(tempDir, "node") });

  // Cleanup happens automatically in afterEach
  // No manual cleanup needed!
});
```

---

## Manual Testing

For CLI integration testing that requires human interaction:

See `MANUAL-TESTING.md` for:
- Test scenarios for each command
- Expected output verification
- User workflow validation

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
- [Jest Documentation](https://jestjs.io/docs/getting-started) (Vitest is Jest-compatible)
- [TypeScript Testing Guide](https://www.typescriptlang.org/docs/handbook/testing.html)

---

**Last Updated:** 2025-12-18 (Session 38)
**Test Execution:** `npm run test`
**Coverage Report:** `npm run test:coverage`
