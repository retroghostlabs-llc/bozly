# BOZLY TypeScript API Reference

Complete reference for the BOZLY TypeScript API for developers integrating with BOZLY.

**Last updated:** 2025-12-27 (Session 122)

---

## Table of Contents

1. [Core Modules](#core-modules)
2. [Node Management](#node-management)
3. [Commands](#commands)
4. [Sessions](#sessions)
5. [Configuration](#configuration)
6. [Context Management](#context-management)
7. [Hooks & Automation](#hooks--automation)
8. [Workflows](#workflows)
9. [AI Generation](#ai-generation)
10. [Type Definitions](#type-definitions)
11. [Error Handling](#error-handling)
12. [Examples](#examples)

---

## Core Modules

### Import Structure

```typescript
// Import from main entry point
import {
  initNode,
  getCurrentNode,
  getNodeConfig,
  getCommand,
  runNodeCommand,
  recordSession,
  querySessions,
  // ... and more
} from '@retroghostlabs/bozly';

// Or import from specific modules
import * as nodeOps from '@retroghostlabs/bozly/core/node';
import * as commands from '@retroghostlabs/bozly/core/commands';
import * as sessions from '@retroghostlabs/bozly/core/sessions';
```

### Available Modules

| Module | Purpose | Key Functions |
|--------|---------|---|
| `core/node` | Node/vault operations | initNode, getCurrentNode, loadNode |
| `core/commands` | Command management | getCommand, runNodeCommand, createCommand |
| `core/sessions` | Session recording | recordSession, querySessions, getSession |
| `core/config` | Configuration | getConfig, setConfig |
| `core/context` | AI context | generateContext, loadContext |
| `core/hooks` | Event automation | executeHooks, discoverHooks |
| `core/workflows` | Multi-step automation | runWorkflow, getWorkflow |
| `core/providers` | AI providers | getProvider, executeWithProvider |
| `core/registry` | Vault registry | getRegistry, addNodeToRegistry |
| `core/search` | Cross-vault search | searchSessions |
| `core/cleanup` | Session management | cleanupNode, calculateStorage |

---

## Node Management

### initNode()

Initialize a new vault/node.

**Signature:**
```typescript
async function initNode(options: InitOptions): Promise<NodeInfo>
```

**Parameters:**
```typescript
interface InitOptions {
  path: string;                    // Required: vault directory path
  name?: string;                   // Optional: human-readable name (defaults to dir name)
  type?: string;                   // Optional: vault type (music, journal, project, etc.)
  force?: boolean;                 // Optional: overwrite if exists (default: false)
  variables?: Record<string, unknown>; // Template variables for initialization
  skipTemplateVariables?: boolean; // Skip interactive variable collection
}
```

**Returns:**
```typescript
interface NodeInfo {
  id: string;                      // Unique node ID (uuid)
  name: string;                    // Human-readable name
  path: string;                    // Absolute path to vault
  type: string;                    // Vault type (music, journal, etc.)
  active: boolean;                 // Whether vault is active
  created: string;                 // ISO timestamp of creation
  lastAccessed?: string;           // ISO timestamp of last access
}
```

**Throws:**
- `Error` if path is invalid or already exists (without force=true)

**Example:**
```typescript
import { initNode } from '@retroghostlabs/bozly';

const vault = await initNode({
  path: '/home/user/music',
  name: 'My Music Discovery',
  type: 'music'
});

console.log(`Created vault: ${vault.id}`);
console.log(`Location: ${vault.path}`);
```

---

### getCurrentNode()

Get the current vault (walks up directory tree).

**Signature:**
```typescript
async function getCurrentNode(): Promise<NodeInfo>
```

**Returns:**
```typescript
NodeInfo  // Current vault information
```

**Throws:**
- `Error` if not inside a vault directory

**Example:**
```typescript
const node = await getCurrentNode();
console.log(`Currently in: ${node.name}`);
```

---

### loadNode()

Load a specific vault by path.

**Signature:**
```typescript
async function loadNode(vaultPath: string): Promise<NodeConfig>
```

**Parameters:**
- `vaultPath` (string): Path to vault directory

**Returns:**
```typescript
interface NodeConfig {
  name: string;
  type: string;
  version: string;
  created: string;
  ai: {
    defaultProvider: string;
    providers: string[];
  };
  timezone?: string;
  hooks?: HookConfig;
  memory?: MemoryNodeConfig;
  provider?: string;               // Node-level provider override
  model?: string;                  // Node-level model hint
  commands?: Record<string, CommandRouting>;
}
```

**Example:**
```typescript
const config = await loadNode('/home/user/music');
console.log(`AI Provider: ${config.ai.defaultProvider}`);
```

---

## Commands

### getCommand()

Get a command by name.

**Signature:**
```typescript
async function getCommand(
  commandName: string,
  vaultPath?: string
): Promise<NodeCommand>
```

**Parameters:**
- `commandName` (string): Command name
- `vaultPath` (string, optional): Vault path (uses current if not provided)

**Returns:**
```typescript
interface NodeCommand {
  name: string;                    // Command identifier
  description: string;             // Short description
  source: 'vault' | 'global' | 'builtin';
  path: string;                    // File path to command
  tags?: string[];                 // Associated keywords
  content: string;                 // Raw markdown content
  lastModified?: string;           // ISO timestamp
}
```

**Example:**
```typescript
const cmd = await getCommand('album-review', '/home/user/music');
console.log(cmd.description);
console.log(cmd.content);  // Raw markdown
```

---

### getNodeCommands()

List all commands available in a vault.

**Signature:**
```typescript
async function getNodeCommands(vaultPath: string): Promise<NodeCommand[]>
```

**Example:**
```typescript
const commands = await getNodeCommands('/home/user/music');
console.log(`Available commands: ${commands.map(c => c.name).join(', ')}`);
```

---

### getGlobalCommands()

List global commands (available to all vaults).

**Signature:**
```typescript
async function getGlobalCommands(): Promise<NodeCommand[]>
```

**Example:**
```typescript
const global = await getGlobalCommands();
global.forEach(cmd => {
  console.log(`${cmd.name}: ${cmd.description}`);
});
```

---

### getAllCommands()

List all available commands (vault + global + builtin).

**Signature:**
```typescript
async function getAllCommands(vaultPath: string): Promise<NodeCommand[]>
```

**Example:**
```typescript
const all = await getAllCommands('/home/user/music');
console.log(`Total: ${all.length} commands`);
```

---

### runNodeCommand()

Execute a command with your AI.

**Signature:**
```typescript
async function runNodeCommand(
  commandName: string,
  options: RunCommandOptions
): Promise<ExecutionResult>
```

**Parameters:**
```typescript
interface RunCommandOptions {
  vaultPath: string;               // Vault directory
  aiProvider?: string;             // Override AI provider
  model?: string;                  // Override model
  input?: string;                  // Direct input
  noSave?: boolean;                // Don't save session (default: false)
  verbose?: boolean;               // Detailed output
}
```

**Returns:**
```typescript
interface ExecutionResult {
  success: boolean;
  output: string;                  // AI response
  sessionId?: string;              // Session ID if saved
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  duration: number;                // Execution time in ms
  error?: string;                  // Error message if failed
}
```

**Example:**
```typescript
const result = await runNodeCommand('album-review', {
  vaultPath: '/home/user/music',
  aiProvider: 'claude',
  input: 'Review D\'Angelo - Voodoo'
});

if (result.success) {
  console.log(result.output);
  console.log(`Session: ${result.sessionId}`);
  console.log(`Tokens used: ${result.tokens?.total}`);
}
```

---

### createGlobalCommand()

Create a new global command.

**Signature:**
```typescript
async function createGlobalCommand(
  name: string,
  content: string,
  metadata?: CommandMetadata
): Promise<NodeCommand>
```

**Parameters:**
- `name` (string): Command name (kebab-case)
- `content` (string): Markdown content
- `metadata` (optional): Description, tags, etc.

**Example:**
```typescript
const cmd = await createGlobalCommand(
  'album-analysis',
  `# Album Analysis\n\nAnalyze this album deeply...`,
  { tags: ['music', 'analysis'] }
);
```

---

## Sessions

### recordSession()

Record a command execution as a session.

**Signature:**
```typescript
async function recordSession(
  vaultPath: string,
  sessionData: SessionRecordOptions
): Promise<Session>
```

**Parameters:**
```typescript
interface SessionRecordOptions {
  commandName: string;
  context: string;                 // AI context used
  prompt: string;                  // Raw prompt sent
  results: string;                 // AI response
  aiProvider: string;
  model: string;
  status: 'success' | 'error' | 'running';
  duration: number;                // milliseconds
  tokensUsed?: {
    input: number;
    output: number;
  };
  error?: string;                  // If status is 'error'
}
```

**Returns:**
```typescript
interface Session {
  id: string;                      // Unique session ID
  vaultId: string;
  vaultName: string;
  command: string;
  ai: {
    provider: string;
    model: string;
  };
  timestamp: string;               // ISO format
  duration: number;
  status: 'success' | 'error';
  tokens?: TokenCount;
  costs?: CostInfo;
}
```

**Example:**
```typescript
const session = await recordSession('/home/user/music', {
  commandName: 'album-review',
  context: '# Music Context...',
  prompt: 'Context + Command combined',
  results: 'AI response here',
  aiProvider: 'claude',
  model: 'claude-3-5-sonnet-20241022',
  status: 'success',
  duration: 3200,
  tokensUsed: { input: 2450, output: 1240 }
});
```

---

### querySessions()

Query sessions with filters.

**Signature:**
```typescript
async function querySessions(
  vaultPath: string,
  options: SessionQueryOptions
): Promise<Session[]>
```

**Parameters:**
```typescript
interface SessionQueryOptions {
  command?: string;                // Filter by command
  limit?: number;                  // Max results (default: 10)
  days?: number;                   // Last N days
  status?: 'success' | 'error';    // Filter by status
  sortBy?: 'date' | 'duration';    // Sort order
  descending?: boolean;            // Reverse order
}
```

**Example:**
```typescript
const sessions = await querySessions('/home/user/music', {
  command: 'album-review',
  days: 7,
  limit: 20,
  sortBy: 'date'
});

sessions.forEach(s => {
  console.log(`${s.timestamp}: ${s.command} (${s.status})`);
});
```

---

### getSession()

Get a specific session by ID.

**Signature:**
```typescript
async function getSession(
  vaultPath: string,
  sessionId: string
): Promise<SessionDetails>
```

**Returns:**
```typescript
interface SessionDetails {
  session: Session;
  files: SessionFiles;
  context: string;                 // Context that was used
  prompt: string;                  // Raw prompt
  results: string;                 // AI response
  execution: ExecutionDetails;     // Technical details
}
```

**Example:**
```typescript
const details = await getSession('/home/user/music', 'session-uuid');
console.log(details.results);      // AI response
console.log(details.tokens);       // Token usage
```

---

## Configuration

### getConfig()

Get global or node configuration.

**Signature:**
```typescript
async function getConfig(isGlobal?: boolean): Promise<GlobalConfig | NodeConfig>
```

**Parameters:**
- `isGlobal` (boolean, optional): Get global config (default: false = node config)

**Returns:**
```typescript
// Global config
interface GlobalConfig {
  version: string;
  defaultAI: string;
  theme?: string;
  editor?: string;
  cleanup?: CleanupConfig;
  timezone?: string;
  routing?: RoutingConfig;
}

// Node config
interface NodeConfig {
  name: string;
  type: string;
  version: string;
  created: string;
  ai: {
    defaultProvider: string;
    providers: string[];
  };
  timezone?: string;
  hooks?: HookConfig;
  memory?: MemoryNodeConfig;
  commands?: Record<string, CommandRouting>;
}
```

**Example:**
```typescript
const nodeConfig = await getConfig();
console.log(`Node type: ${nodeConfig.type}`);

const globalConfig = await getConfig(true);
console.log(`Default AI: ${globalConfig.defaultAI}`);
```

---

### setConfig()

Update configuration.

**Signature:**
```typescript
async function setConfig(
  key: string,
  value: string,
  isGlobal?: boolean
): Promise<void>
```

**Parameters:**
- `key` (string): Config key (dot notation: "ai.default", "timezone")
- `value` (string): New value
- `isGlobal` (boolean, optional): Update global config (default: false = node)

**Example:**
```typescript
// Node config
await setConfig('ai.defaultProvider', 'gpt');

// Global config
await setConfig('defaultAI', 'gpt', true);
await setConfig('timezone', 'America/Los_Angeles', true);
```

---

## Context Management

### generateContext()

Generate AI context for a vault.

**Signature:**
```typescript
async function generateContext(
  vaultPath: string,
  options?: ContextGenerationOptions
): Promise<string>
```

**Parameters:**
```typescript
interface ContextGenerationOptions {
  includeFiles?: boolean;          // Include file references
  includeCommands?: boolean;       // List available commands
  maxLength?: number;              // Max characters
}
```

**Returns:**
- `string`: Generated markdown context

**Example:**
```typescript
const context = await generateContext('/home/user/music', {
  includeCommands: true,
  includeFiles: true
});

console.log(context);  // Markdown context ready for AI
```

---

### loadContext()

Load context from `.bozly/context.md`.

**Signature:**
```typescript
async function loadContext(vaultPath: string): Promise<string>
```

**Returns:**
- `string`: Raw markdown context

**Example:**
```typescript
const context = await loadContext('/home/user/music');
// Use context with AI
```

---

## Hooks & Automation

### executeHooks()

Run hooks for a specific event.

**Signature:**
```typescript
async function executeHooks(
  vaultPath: string,
  hookType: HookType,
  context: HookContext
): Promise<HookResult[]>
```

**Parameters:**
```typescript
type HookType = 'on-init' | 'on-command' | 'on-session' | 'on-cleanup';

interface HookContext {
  vaultId: string;
  vaultPath: string;
  command?: string;
  sessionId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
```

**Returns:**
```typescript
interface HookResult {
  hookName: string;
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
}
```

**Example:**
```typescript
const results = await executeHooks('/home/user/music', 'on-session', {
  vaultId: 'vault-123',
  vaultPath: '/home/user/music',
  command: 'album-review',
  sessionId: 'session-456',
  timestamp: new Date().toISOString()
});

results.forEach(r => {
  console.log(`${r.hookName}: ${r.success ? 'OK' : 'FAILED'}`);
});
```

---

### discoverHooks()

Find all hooks in a directory.

**Signature:**
```typescript
async function discoverHooks(hooksPath: string): Promise<HookMetadata[]>
```

**Returns:**
```typescript
interface HookMetadata {
  name: string;
  type: HookType;
  path: string;
  enabled: boolean;
  executable: boolean;
}
```

**Example:**
```typescript
const hooks = await discoverHooks('/home/user/music/.bozly/hooks');
hooks.forEach(h => {
  console.log(`${h.name} (${h.type}): ${h.enabled ? 'enabled' : 'disabled'}`);
});
```

---

## Workflows

### runWorkflow()

Execute a multi-step workflow.

**Signature:**
```typescript
async function runWorkflow(
  vaultPath: string,
  workflowName: string,
  options?: WorkflowRunOptions
): Promise<WorkflowResult>
```

**Parameters:**
```typescript
interface WorkflowRunOptions {
  dryRun?: boolean;                // Preview steps without executing
  verbose?: boolean;               // Detailed output
  stopOnError?: boolean;           // Stop if step fails (default: true)
}
```

**Returns:**
```typescript
interface WorkflowResult {
  workflowName: string;
  success: boolean;
  steps: StepResult[];
  totalDuration: number;
  error?: string;
}

interface StepResult {
  stepName: string;
  command: string;
  success: boolean;
  output?: string;
  duration: number;
  error?: string;
}
```

**Example:**
```typescript
const result = await runWorkflow('/home/user/music', 'weekly-discovery');

if (result.success) {
  console.log(`Workflow completed in ${result.totalDuration}ms`);
  result.steps.forEach(s => {
    console.log(`  ${s.stepName}: ${s.success ? 'OK' : 'FAILED'}`);
  });
}
```

---

### getWorkflow()

Load a workflow definition.

**Signature:**
```typescript
async function getWorkflow(
  vaultPath: string,
  workflowName: string
): Promise<WorkflowDefinition>
```

**Returns:**
```typescript
interface WorkflowDefinition {
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers?: WorkflowTrigger[];
  conditions?: Record<string, string>;
}
```

---

## AI Generation

### generateCommandContent()

Generate command content using AI.

**Signature:**
```typescript
async function generateCommandContent(
  description: string,
  context?: string
): Promise<string>
```

**Parameters:**
- `description` (string): What the command should do
- `context` (string, optional): Vault context for better generation

**Returns:**
- `string`: Generated markdown command content

**Example:**
```typescript
const content = await generateCommandContent(
  'Review an album with focus on production and composition',
  'Music domain with focus on production details'
);

console.log(content);  // Ready to save as .md file
```

---

### generateCommandSuggestions()

Get AI suggestions for new commands based on usage patterns.

**Signature:**
```typescript
async function generateCommandSuggestions(
  vaultPath: string,
  count?: number
): Promise<CommandSuggestion[]>
```

**Returns:**
```typescript
interface CommandSuggestion {
  commandName: string;
  description: string;
  reasoning: string;              // Why this command would be useful
  template: string;               // Markdown template
  confidence: number;             // 0-1 confidence score
}
```

**Example:**
```typescript
const suggestions = await generateCommandSuggestions('/home/user/music', 5);

suggestions.forEach(s => {
  console.log(`${s.commandName}: ${s.description}`);
  console.log(`  Why: ${s.reasoning}`);
  console.log(`  Confidence: ${(s.confidence * 100).toFixed(0)}%`);
});
```

---

## Type Definitions

### Common Types

```typescript
// ISO 8601 datetime string
type ISODateTime = string;  // e.g., "2025-12-27T14:22:00Z"

// Token usage
interface TokenCount {
  input: number;
  output: number;
  total: number;
}

// Cost information
interface CostInfo {
  input: number;      // $ cost for input tokens
  output: number;     // $ cost for output tokens
  total: number;      // Total cost
}

// AI Provider
interface AIProvider {
  name: string;       // 'claude', 'gpt', 'gemini', 'ollama'
  available: boolean;
  version?: string;
  models: string[];
}

// Command routing
interface CommandRouting {
  provider?: string;  // Override provider for this command
  model?: string;     // Override model
}

// Cleanup configuration
interface CleanupConfig {
  enabled: boolean;
  retentionDays: number;  // How long to keep sessions
  archivePath?: string;   // Where to archive old sessions
  autoRun?: boolean;      // Auto-cleanup on command execution
}

// Hook configuration
interface HookConfig {
  sessionStart?: string;
  sessionEnd?: string;
  postTool?: string;
}
```

---

## Error Handling

### Error Types

```typescript
// All errors inherit from this
class BozlyError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

// Specific errors
class VaultNotFoundError extends BozlyError {}
class CommandNotFoundError extends BozlyError {}
class SessionError extends BozlyError {}
class ConfigError extends BozlyError {}
class HookError extends BozlyError {}
class ProviderError extends BozlyError {}
```

### Error Handling Example

```typescript
import { CommandNotFoundError, VaultNotFoundError } from '@retroghostlabs/bozly';

try {
  const result = await runNodeCommand('non-existent', {
    vaultPath: '/home/user/music'
  });
} catch (error) {
  if (error instanceof CommandNotFoundError) {
    console.log('Command not found');
  } else if (error instanceof VaultNotFoundError) {
    console.log('Vault not found');
  } else {
    console.log(`Unknown error: ${error.message}`);
  }
}
```

---

## Examples

### Complete Example: Run a Command

```typescript
import {
  getCurrentNode,
  getCommand,
  runNodeCommand,
  recordSession,
  loadContext
} from '@retroghostlabs/bozly';

async function runDiscoverySession() {
  try {
    // Get current vault
    const node = await getCurrentNode();
    console.log(`Working with: ${node.name}`);

    // Load context
    const context = await loadContext(node.path);

    // Get the command
    const cmd = await getCommand('discovery-session', node.path);
    console.log(`Command: ${cmd.name}`);

    // Run it
    const result = await runNodeCommand('discovery-session', {
      vaultPath: node.path,
      verbose: true
    });

    if (result.success) {
      console.log('Success!');
      console.log(result.output);
      console.log(`Session: ${result.sessionId}`);
      console.log(`Tokens: ${result.tokens?.total}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

runDiscoverySession();
```

### Example: Create Command Programmatically

```typescript
import { createGlobalCommand, getGlobalCommands } from '@retroghostlabs/bozly';

async function setupGlobalCommand() {
  const content = `# Music Discovery

Based on my taste profile, find 5 new albums I should listen to.

For each album:
- Artist & title
- Why I'd like it
- Production notes
- Similar albums`;

  const cmd = await createGlobalCommand(
    'music-discovery',
    content,
    {
      tags: ['music', 'discovery']
    }
  );

  console.log(`Created: ${cmd.name}`);

  // List all global commands
  const allGlobal = await getGlobalCommands();
  console.log(`Total global commands: ${allGlobal.length}`);
}

setupGlobalCommand();
```

### Example: Query Sessions

```typescript
import { querySessions } from '@retroghostlabs/bozly';

async function analyzeUsage(vaultPath: string) {
  // Get last 30 days of sessions
  const sessions = await querySessions(vaultPath, {
    days: 30,
    sortBy: 'date',
    descending: true
  });

  console.log(`Sessions in last 30 days: ${sessions.length}`);

  // Group by command
  const byCommand: Record<string, number> = {};
  sessions.forEach(s => {
    byCommand[s.command] = (byCommand[s.command] ?? 0) + 1;
  });

  // Show usage
  Object.entries(byCommand).forEach(([cmd, count]) => {
    console.log(`  ${cmd}: ${count} times`);
  });
}
```

### Example: Execute Hooks

```typescript
import { executeHooks, discoverHooks } from '@retroghostlabs/bozly';

async function runSessionHooks(vaultPath: string, sessionId: string) {
  // Find all hooks
  const hooks = await discoverHooks(`${vaultPath}/.bozly/hooks`);
  console.log(`Found ${hooks.length} hooks`);

  // Run on-session hooks
  const results = await executeHooks(vaultPath, 'on-session', {
    vaultId: 'vault-123',
    vaultPath,
    sessionId,
    timestamp: new Date().toISOString()
  });

  // Report results
  results.forEach(r => {
    if (r.success) {
      console.log(`✓ ${r.hookName}`);
    } else {
      console.log(`✗ ${r.hookName}: ${r.error}`);
    }
  });
}
```

---

## Best Practices

### 1. Error Handling
Always wrap API calls in try-catch:
```typescript
try {
  const result = await runNodeCommand('cmd', options);
} catch (error) {
  console.error(`Failed: ${error.message}`);
  // Handle appropriately
}
```

### 2. Async/Await
All API functions are async. Always use await:
```typescript
const node = await getCurrentNode();  // Good
const node = getCurrentNode();         // Wrong!
```

### 3. Path Resolution
Use absolute paths:
```typescript
const abs = path.resolve(userPath);
const node = await loadNode(abs);      // Good
const node = await loadNode('~/music'); // Wrong!
```

### 4. Configuration Updates
Use setConfig for changes:
```typescript
// Good: persists changes
await setConfig('timezone', 'America/New_York', true);

// Don't modify config objects directly
config.timezone = 'America/New_York';  // Won't persist!
```

---

## See Also

- [GETTING-STARTED.md](GETTING-STARTED.md) — Getting started guide
- [CLI-REFERENCE.md](CLI-REFERENCE.md) — CLI command reference
- [CONFIGURATION-REFERENCE.md](CONFIGURATION-REFERENCE.md) — All config options

---

*BOZLY: Build. OrganiZe. Link. Yield.*

*Last updated: 2025-12-27 (Session 122)*
