# BOZLY Logging Standards

**Status:** Session 38+ - Active
**Last Updated:** 2025-12-18

Professional-grade logging following Claude CLI, Cline, and similar tools patterns.

---

## Overview

BOZLY provides comprehensive logging with:
- **Multiple log levels** (DEBUG, INFO, WARN, ERROR, FATAL)
- **Console output** with color coding and context
- **File output** to `.bozly/logs/` with timestamps
- **Structured logging** for machine readability
- **Performance tracking** with markers
- **Context information** (file, function, line numbers)
- **Error tracking** with full stack traces

---

## Log Levels

| Level | Use Case | Output |
|-------|----------|--------|
| **DEBUG** | Detailed debugging info | Gray, minimal output |
| **INFO** | Important events | Blue, normal operations |
| **WARN** | Warnings, unexpected situations | Yellow, potential issues |
| **ERROR** | Error conditions | Red, recoverable errors |
| **FATAL** | Fatal errors | Red background, exits process |

---

## Output Locations

### Console Output
- **stdout:** DEBUG, INFO, WARN
- **stderr:** ERROR, FATAL
- Color-coded based on level
- Context shown in gray (file, line, function)

### File Output
Location: `.bozly/logs/bozly-YYYY-MM-DD-HH-mm-ss.log`

Format: JSON (one entry per line, machine-readable)

```json
{
  "timestamp": "2025-12-18T19:30:45.123Z",
  "level": "INFO",
  "message": "Initializing vault",
  "context": {
    "vaultName": "my-vault",
    "vaultType": "music"
  },
  "file": "vault.ts",
  "function": "initVault",
  "line": 42
}
```

---

## Usage

### Initialization

```typescript
import { logger } from './core/logger.js';

// Initialize logger with log directory
await logger.init('.bozly/logs', {
  level: LogLevel.INFO,
  enableColor: true,
  includeContext: true,
});
```

### Basic Logging

```typescript
// Info level
await logger.info('Vault initialized', {
  vaultName: 'my-vault',
  vaultPath: '/home/user/my-vault',
});

// Warning level
await logger.warn('Vault already exists', {
  vaultPath: '/home/user/vault',
  action: 'overwriting with --force',
});

// Error level
await logger.error('Failed to load config', {
  path: configPath,
  reason: 'file not found',
});

// Debug level (verbose)
await logger.debug('Internal state', {
  registrySize: 5,
  activeVaults: 2,
});
```

### Error Handling

Pass Error objects for full stack traces:

```typescript
try {
  await initVault(options);
} catch (error) {
  // Error passed directly
  await logger.error('Vault initialization failed', error);

  // Or with context
  if (error instanceof Error) {
    await logger.error('Vault initialization failed', {
      vaultPath: options.path,
      errorType: error.constructor.name,
    }, error);
  }
}
```

### Performance Tracking

```typescript
await logger.markStart('vault-init');
// ... do work ...
await logger.markEnd('vault-init', 'Vault initialized');

// Output:
// [INFO] 2025-12-18T19:30:45.456Z Vault initialized (vault.ts:50)
// {
//   "duration": "234ms",
//   "label": "vault-init"
// }
```

---

## Code Documentation Standards

Every file must include:

1. **File Header** - Purpose and overview
2. **Module Documentation** - What the file exports
3. **Function Documentation** - JSDoc for all public functions
4. **Inline Comments** - For complex logic
5. **Logging** - At key points in execution

### File Template

```typescript
/**
 * Module Name
 *
 * Comprehensive description of what this module does.
 *
 * Key features:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 *
 * Usage:
 *   import { functionA } from './module.js';
 *   const result = await functionA(options);
 *
 * @module module-name
 */

import { logger } from './logger.js';

/**
 * Describes what the function does
 *
 * Detailed explanation of behavior, edge cases, and error conditions.
 *
 * @param options - Configuration options
 * @param options.path - Directory path (required)
 * @param options.name - Name (optional, defaults to directory name)
 * @returns Promise resolving to result object
 * @throws {Error} If path is invalid
 *
 * @example
 *   const result = await functionA({ path: '/home/user/vault' });
 *   console.log(result.id);
 */
export async function functionA(options: Options): Promise<Result> {
  await logger.debug('Starting operation', { options });

  try {
    // Complex logic here with logging at checkpoints
    await logger.info('Operation completed', { result: result.id });
    return result;
  } catch (error) {
    await logger.error('Operation failed', options, error);
    throw error;
  }
}
```

---

## Logging in Core Modules

### Vault Operations

```typescript
// src/core/vault.ts
import { logger } from './logger.js';

export async function initVault(options: InitOptions): Promise<VaultInfo> {
  await logger.debug('Initializing vault', {
    path: options.path,
    type: options.type
  });

  const vaultPath = path.resolve(options.path);

  try {
    await fs.mkdir(vaultPath, { recursive: true });
    await logger.info('Vault directory created', { vaultPath });

    // Create subdirectories with logging
    const dirs = ['sessions', 'tasks', 'commands', 'workflows', 'hooks'];
    for (const dir of dirs) {
      const dirPath = path.join(vaultPath, '.bozly', dir);
      await fs.mkdir(dirPath, { recursive: true });
      await logger.debug('Directory created', { dir: dirPath });
    }

    // Create configuration
    const config = createConfig(options);
    await logger.info('Vault configuration created', {
      vaultName: config.name,
      vaultType: config.type,
      providers: config.ai.providers
    });

    // Register vault
    const vault = await addVaultToRegistry({ path: vaultPath, name: config.name });
    await logger.info('Vault registered', {
      vaultId: vault.id,
      vaultName: vault.name
    });

    return vault;
  } catch (error) {
    await logger.error('Vault initialization failed',
      { vaultPath, type: options.type },
      error as Error
    );
    throw error;
  }
}
```

### Registry Operations

```typescript
// src/core/registry.ts
import { logger } from './logger.js';

export async function addVaultToRegistry(options: AddVaultOptions): Promise<VaultInfo> {
  await logger.debug('Adding vault to registry', {
    vaultPath: options.path,
    vaultName: options.name
  });

  try {
    const registry = await loadRegistry();
    await logger.debug('Registry loaded', {
      vaultCount: registry.vaults.length
    });

    const vault: VaultInfo = {
      id: generateVaultId(),
      name: options.name,
      path: options.path,
      type: 'default',
      active: true,
      created: new Date().toISOString(),
    };

    registry.vaults.push(vault);
    await saveRegistry(registry);

    await logger.info('Vault added to registry', {
      vaultId: vault.id,
      vaultName: vault.name,
      totalVaults: registry.vaults.length
    });

    return vault;
  } catch (error) {
    await logger.error('Failed to add vault to registry',
      { vaultPath: options.path },
      error as Error
    );
    throw error;
  }
}
```

### Configuration Operations

```typescript
// src/core/config.ts
import { logger } from './logger.js';

export async function loadVaultConfig(vaultPath: string): Promise<VaultConfig> {
  const configPath = path.join(vaultPath, '.bozly', 'config.json');

  await logger.debug('Loading vault configuration', { configPath });

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content) as VaultConfig;

    await logger.info('Vault configuration loaded', {
      vaultName: config.name,
      vaultType: config.type,
      defaultProvider: config.ai.defaultProvider
    });

    return config;
  } catch (error) {
    await logger.error('Failed to load vault configuration',
      { vaultPath, configPath },
      error as Error
    );
    throw error;
  }
}
```

---

## Logging in CLI Commands

### Command Pattern

```typescript
// src/cli/commands/init.ts
import { logger } from '../../core/logger.js';

export async function handleInit(
  program: Command,
  options: Partial<CliOptions>
): Promise<void> {
  await logger.info('Init command started', {
    vaultPath: options.path,
    vaultName: options.name,
    force: options.force
  });

  try {
    await logger.markStart('init-vault');

    const vault = await initVault({
      path: options.path,
      name: options.name,
      type: options.type,
      force: options.force,
    });

    await logger.markEnd('init-vault', 'Vault initialized successfully');
    await logger.info('Init command completed', { vaultId: vault.id });

    console.log(`✓ Vault created: ${vault.name}`);
  } catch (error) {
    await logger.error('Init command failed', options, error as Error);
    console.error(`✗ Failed to initialize vault: ${(error as Error).message}`);
    process.exit(1);
  }
}
```

---

## Log File Analysis

### Viewing Current Log

```bash
# Show latest log file
tail -f .bozly/logs/bozly-*.log

# Parse structured logs (JSON)
cat .bozly/logs/bozly-*.log | jq '.level' | sort | uniq -c

# Find errors
cat .bozly/logs/bozly-*.log | jq 'select(.level == "ERROR")'
```

### Log File Examples

```json
{
  "timestamp": "2025-12-18T19:30:45.123Z",
  "level": "INFO",
  "message": "Initializing vault",
  "context": {
    "path": "/home/user/my-vault",
    "name": "my-vault",
    "type": "music"
  },
  "file": "vault.ts",
  "function": "initVault",
  "line": 42
}

{
  "timestamp": "2025-12-18T19:30:45.456Z",
  "level": "INFO",
  "message": "Vault directory created",
  "context": {
    "vaultPath": "/home/user/my-vault"
  },
  "file": "vault.ts",
  "function": "initVault",
  "line": 50
}

{
  "timestamp": "2025-12-18T19:30:45.789Z",
  "level": "ERROR",
  "message": "Vault initialization failed",
  "context": {
    "vaultPath": "/home/user/my-vault",
    "type": "music"
  },
  "error": "EACCES: permission denied",
  "stack": "Error: EACCES: permission denied\n    at Object.mkdirSync [as mkdir]\n    at vault.ts:50:20",
  "file": "vault.ts",
  "function": "initVault",
  "line": 68
}
```

---

## Logger Configuration

### Global Setup (in CLI entry point)

```typescript
// src/cli/index.ts
import { logger, LogLevel } from '../core/logger.js';

async function main(): Promise<void> {
  // Determine log level from environment
  const logLevel = process.env.BOZLY_DEBUG === 'true'
    ? LogLevel.DEBUG
    : LogLevel.INFO;

  // Initialize logger
  const bozlyHome = process.env.BOZLY_HOME ||
    path.join(process.env.HOME || '', '.bozly');
  const logsDir = path.join(bozlyHome, 'logs');

  await logger.init(logsDir, {
    level: logLevel,
    enableColor: process.stdout.isTTY,
    includeContext: true,
  });

  await logger.info('BOZLY CLI started', {
    command: process.argv[2],
    bozlyHome,
    logFile: logger.getLogger().getLogFilePath(),
  });

  // ... run commands ...
}
```

### Log Levels by Environment

```bash
# Production - INFO level only
NODE_ENV=production bozly init my-vault

# Development - DEBUG level for detailed output
BOZLY_DEBUG=true bozly init my-vault

# Silent mode - WARN level only
BOZLY_LOG_LEVEL=WARN bozly init my-vault
```

---

## Testing with Logging

### Test-Friendly Logging

```typescript
// tests/unit/vault.test.ts
describe('Vault Operations', () => {
  it('should log vault initialization', async () => {
    // Setup test logger
    const logs: LogEntry[] = [];
    const testLogger = new Logger({
      enableFile: false,
      enableConsole: false,
    });

    // Capture logs in memory
    testLogger.on('log', (entry) => logs.push(entry));

    // Run operation
    const vault = await initVault({ path: tempPath, name: 'test' });

    // Verify logging
    expect(logs).toContainEqual(
      expect.objectContaining({
        level: 'INFO',
        message: 'Vault initialized',
      })
    );
  });
});
```

---

## Best Practices

✅ **Do:**
- Log at function entry/exit for important operations
- Include context object with relevant data
- Use consistent message wording
- Log errors with full stack traces
- Mark performance-critical sections
- Use appropriate log levels
- Document what logs are expected
- Test logging behavior

❌ **Don't:**
- Log sensitive information (passwords, keys, tokens)
- Spam debug logs in production
- Use console.log directly (use logger)
- Ignore errors (always log failures)
- Log the same thing multiple times
- Use generic messages ("operation failed")
- Mix concerns (don't log business logic in infrastructure)

---

## Security & Privacy

⚠️ **Never log:**
- Passwords or API keys
- Personal information (SSNs, emails)
- Credit card numbers
- Access tokens or session IDs
- Private vault content

✅ **Always log:**
- Operation names and parameters (safe ones)
- Error types and messages
- Timing information
- User actions (vault creation, etc.)

---

## Performance Considerations

- Logging is async to avoid blocking
- File I/O is batched when possible
- Large context objects are JSON stringified
- Color coding is conditionally applied
- Log level filtering happens early

---

## References

- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)
- [12-Factor App: Logging](https://12factor.net/logs)
- [Structured Logging](https://www.kartar.net/2015/12/structured-logging/)
- [Log Level Guidelines](https://en.wikipedia.org/wiki/Syslog#Severity)

---

**Last Updated:** 2025-12-18 (Session 38+)
**Log Directory:** `.bozly/logs/`
**Log Format:** JSON (one entry per line)
