/**
 * BOZLY type definitions
 */

/**
 * Node configuration stored in .bozly/config.json
 */
export interface NodeConfig {
  name: string;
  type: string;
  version: string;
  created: string;
  ai: {
    defaultProvider: string;
    providers: string[];
  };
  hooks?: {
    sessionStart?: string;
    sessionEnd?: string;
    postTool?: string;
  };
  timezone?: string; // e.g., "America/New_York", defaults to system timezone
  memory?: MemoryNodeConfig;
}

/**
 * Node information stored in registry
 */
export interface NodeInfo {
  id: string;
  name: string;
  path: string;
  type: string;
  active: boolean;
  created: string;
  lastAccessed?: string;
}

/**
 * Global registry stored in ~/.bozly/bozly-registry.json
 */
export interface Registry {
  version: string;
  nodes: NodeInfo[];
  created: string;
  lastUpdated: string;
}

/**
 * Global config stored in ~/.bozly/bozly-config.json
 */
export interface GlobalConfig {
  version: string;
  defaultAI: string;
  theme?: string;
  editor?: string;
  cleanup?: CleanupConfig;
  timezone?: string; // e.g., "America/New_York", auto-detected from system if not set
}

/**
 * Options for initializing a node
 */
export interface InitOptions {
  path: string;
  type?: string;
  name?: string;
  force?: boolean;
  variables?: Record<string, unknown>; // Template variables from --set flags or interactive prompts
  skipTemplateVariables?: boolean; // Skip interactive variable collection (for CI/automated)
}

/**
 * Options for adding a node to registry
 */
export interface AddNodeOptions {
  path: string;
  name?: string;
}

/**
 * Node command definition
 */
export interface NodeCommand {
  name: string;
  description?: string;
  file: string;
  content?: string;
  source?: "vault" | "global" | "builtin"; // NEW: where command comes from
  model?: string; // NEW: reference to domain model
  tags?: string[]; // NEW: command categorization
}

/**
 * Context generation options
 */
export interface ContextOptions {
  provider?: string;
  includeCommands?: boolean;
  includeHistory?: boolean;
}

/**
 * Run command options
 */
export interface RunOptions {
  provider?: string;
  dryRun?: boolean;
  includeContext?: boolean;
  pastMemories?: string[]; // Optional past session memories to inject
}

/**
 * Run command result
 */
export interface RunResult {
  provider: string;
  prompt: string;
  contextSize: number;
  output?: string;
  // For session recording
  contextText?: string;
  commandText?: string;
  commandName?: string;
  modelsUsed?: string[];
  duration?: number;
}

/**
 * Type aliases for semantic versioning and hashing
 */
export type SemVer = string; // e.g., "1.0.0"
export type Hash = string; // SHA256 hash
export type ISODateTime = string; // ISO 8601 datetime
export type AIProvider = string;
export type NodeDomain = "music" | "projects" | "journal" | "content" | "custom";
export type ModelType = "scoring" | "analysis" | "classification" | "prediction";

/**
 * Model dimension (for scoring models)
 */
export interface ModelDimension {
  name: string;
  weight: number; // 0.0 to 1.0
  description?: string;
  criteria?: string[];
  scale?: {
    min: number;
    max: number;
  };
}

/**
 * Model metric (for analysis models)
 */
export interface ModelMetric {
  name: string;
  formula?: string;
  weight?: number;
  thresholds?: {
    excellent: string;
    good: string;
    atRisk: string;
    bad: string;
  };
}

/**
 * Model scoring levels
 */
export interface ModelScoringLevels {
  excellent: { min: number; max: number };
  good: { min: number; max: number };
  okay: { min: number; max: number };
  needsWork: { min: number; max: number };
}

/**
 * Model changelog entry
 */
export interface ModelChangelogEntry {
  version: SemVer;
  date: string;
  changes: string[];
}

/**
 * Full model definition
 */
export interface Model {
  name: string;
  version: SemVer;
  description?: string;
  domain?: NodeDomain;
  type?: ModelType;
  created?: ISODateTime;
  updated?: ISODateTime;

  // For scoring models
  dimensions?: ModelDimension[];
  scoring?: {
    scale: string;
    levels: ModelScoringLevels;
  };

  // For analysis models
  metrics?: ModelMetric[];

  // Version history
  changelog?: ModelChangelogEntry[];

  // File info
  path: string;
  hash?: Hash;
}

/**
 * Session prompt metadata (context, model, command sizes)
 */
export interface SessionPromptMetadata {
  contextSize: number;
  modelSize?: number;
  commandSize: number;
  total: number;
}

/**
 * Session response metadata
 */
export interface SessionResponseMetadata {
  status: "completed" | "failed" | "interrupted";
  duration: number; // milliseconds
  outputSize?: number;
  tokenEstimate?: number;
  error?: string;
}

/**
 * Session recording stored in .bozly/sessions/
 */
export interface Session {
  // Schema version for future migrations
  schema_version?: string;

  // Session identity
  id: string; // UUID
  timestamp: ISODateTime;
  command: string;

  // Execution context
  provider: AIProvider;
  nodeId: string; // Machine-readable node ID (for directory hierarchy)
  nodeName: string;
  nodePath: string;

  // Status (completed, failed, dry_run)
  status: "completed" | "failed" | "dry_run";
  executionTimeMs: number; // Duration in milliseconds

  // Error details (if failed)
  error?: {
    message: string;
    code: string;
    timestamp: ISODateTime;
  };

  // Prompt & response
  prompt: {
    metadata: SessionPromptMetadata;
    content?: string; // Optional: full prompt text for debugging
  };
  response: {
    metadata: SessionResponseMetadata;
    content?: string; // Optional: full response text for audit
  };

  // Environment metadata
  environment: {
    nodeVersion: string;
    bozlyVersion: string;
    platform: string;
    timezone?: string; // User's configured timezone (e.g., "America/New_York")
  };

  // Metadata (tags, related sessions for Phase 2)
  metadata?: {
    tags?: string[];
    relatedSessions?: string[];
  };
}

/**
 * Execution log entry for session tracking
 */
export interface ExecutionLogEntry {
  timestamp: ISODateTime;
  type: "start" | "ai_call" | "processing" | "complete" | "error";
  message: string;
}

/**
 * File change tracking
 */
export interface FileChange {
  path: string;
  action: "created" | "modified" | "deleted";
  beforeSize?: number;
  afterSize?: number;
  diffPreview?: string;
}

/**
 * Execution details stored in execution.json
 */
export interface ExecutionDetails {
  commandInput: Record<string, unknown>;
  aiRequest: {
    provider: string;
    model?: string;
    promptLength: number;
    temperature?: number;
    maxTokens?: number;
  };
  aiResponse: {
    finishReason: string;
    contentLength: number;
    stopReason?: string;
  };
  executionLog: ExecutionLogEntry[];
  timing: {
    startMs: number;
    endMs: number;
    totalMs: number;
  };
}

/**
 * File changes summary for session
 */
export interface FileChanges {
  filesModified: FileChange[];
  summary: {
    totalFilesModified: number;
    totalFilesCreated: number;
    totalFilesDeleted: number;
  };
  recommendations: string[];
}

/**
 * All session files combined
 */
export interface SessionFiles {
  sessionJson: Session;
  contextMd: string;
  promptTxt: string;
  executionJson: ExecutionDetails;
  resultsMd: string;
  changesJson: FileChanges;
}

/**
 * Session query options
 */
export interface SessionQueryOptions {
  command?: string;
  provider?: string;
  node?: string;
  status?: "completed" | "failed" | "dry_run";
  startDate?: ISODateTime;
  endDate?: ISODateTime;
  limit?: number;
  offset?: number;
}

/**
 * Session diff for comparison
 */
export interface SessionDiff {
  left: Session;
  right: Session;
  promptDiff?: string; // Diff output of prompt.txt files
  differences: {
    prompt: {
      contextSize: number; // Difference in context
      total: number; // Difference in total
    };
    response: {
      duration: number; // Difference in duration
      status: boolean; // Status changed?
    };
  };
}

/**
 * Hook system types
 */

/**
 * Hook types - when hooks execute in the session lifecycle
 *
 * - session-start: Before command loading (environment setup)
 * - pre-execution: Before AI call (prompt ready, can inspect/validate)
 * - post-execution: After AI succeeds (process output)
 * - session-end: After session recorded (archive, notify)
 * - on-error: When execution fails (error handling)
 * - on-cancel: When user interrupts Ctrl+C (cleanup)
 */
export type HookType =
  | "session-start"
  | "pre-execution"
  | "post-execution"
  | "session-end"
  | "on-error"
  | "on-cancel";

/**
 * Hook metadata discovered from .bozly/hooks/ directory
 */
export interface HookMetadata {
  name: string;
  type: HookType;
  file: string;
  enabled: boolean;
  timeout?: number; // milliseconds, default 30000
}

/**
 * Context data passed to hooks via environment variables and temp file
 *
 * Different hooks receive different subsets of this data:
 * - All hooks: node info, command, provider, timestamp
 * - pre-execution, post-execution, session-end: prompt + promptSize
 * - post-execution, session-end, on-error: session + output/error
 * - on-error only: error details
 * - on-cancel only: cancellation reason + partial output
 */
export interface HookContext {
  // Available to all hooks
  nodeId: string;
  nodeName: string;
  nodePath: string;
  command: string;
  provider: string;
  timestamp: string; // ISO 8601

  // Available to pre-execution, post-execution, session-end
  prompt?: string;
  promptSize?: number;

  // Available to post-execution, session-end, on-error
  session?: {
    id: string;
    sessionPath: string;
    status: "completed" | "failed" | "cancelled";
    duration: number; // milliseconds
    output?: string;
    error?: string;
  };

  // Available to on-error only
  error?: {
    message: string;
    code: string;
    stack?: string;
  };

  // Available to on-cancel only
  cancellationReason?: string; // "SIGINT", "SIGTERM", etc.
  partialOutput?: string;
}

/**
 * Result of executing a single hook
 */
export interface HookResult {
  hookName: string;
  success: boolean;
  duration: number; // milliseconds
  error?: string;
  stdout?: string;
  stderr?: string;
}

/**
 * Workflow system types
 */

/**
 * Error handling strategy for workflow steps
 * - "stop": Fail entire workflow on step failure
 * - "continue": Log error and proceed to next step
 */
export type WorkflowErrorStrategy = "stop" | "continue";

/**
 * Single step in a workflow
 */
export interface WorkflowStep {
  id: string; // Unique within workflow (e.g., "journal-entry")
  description?: string;
  node: string; // Node ID to run command on
  command: string; // Command name
  timeout?: number; // milliseconds, default 300000 (5 min)
  onError: WorkflowErrorStrategy;
  context?: Record<string, unknown>; // Step-specific context
  conditional?: {
    requires?: string[]; // IDs of steps that must complete first
    skip?: string; // Boolean expression to skip step
  };
}

/**
 * Result of executing a single workflow step
 */
export interface WorkflowStepResult {
  stepId: string;
  status: "completed" | "failed" | "skipped";
  duration: number; // milliseconds
  output?: string;
  error?: string;
  session?: Session; // Full session object if step ran
}

/**
 * A complete workflow definition
 */
export interface Workflow {
  id: string; // Unique identifier (e.g., "daily")
  name: string;
  description?: string;
  version: string;
  created: string; // ISO 8601
  updated?: string; // ISO 8601

  steps: WorkflowStep[];
  onCompleted?: "notify" | "none";
  metadata?: {
    frequency?: "once" | "daily" | "weekly" | "manual";
    bestTime?: string; // HH:MM format
    tags?: string[];
  };
}

/**
 * Result of executing a complete workflow
 */
export interface WorkflowResult {
  workflowId: string;
  status: "completed" | "failed" | "partially_completed";
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  duration: number; // milliseconds
  stepsCompleted: number;
  stepsFailed: number;
  stepsSkipped: number;
  steps: WorkflowStepResult[];
  sessionId?: string; // Parent workflow session ID
  error?: string; // If workflow itself failed
}

/**
 * Options for executing a workflow
 */
export interface WorkflowExecutionOptions {
  dryRun?: boolean;
  verbose?: boolean;
  fromStep?: string; // Start from this step
  skipSteps?: string[]; // Skip specific steps
  contextOverride?: Record<string, unknown>; // Override context variables
}

/**
 * Validation error for workflow
 */
export interface WorkflowValidationError {
  step: string; // Step ID, or "workflow" for top-level
  field: string; // Field that failed validation
  message: string;
}

/**
 * Cleanup system types
 */

/**
 * Cleanup configuration for session retention and disk management
 */
export interface CleanupSessionConfig {
  enabled: boolean; // Enable cleanup features
  retentionDays: number; // Days before deletion (default: 90)
  archiveAfterDays: number; // Days before compression (default: 30)
  maxStorageMB: number; // Per-node limit (default: 500)
  keepMinSessions: number; // Always keep N most recent (default: 100)
}

export interface CleanupBackupConfig {
  maxCount: number; // Max node backups to keep (default: 10)
  maxAgeDays: number; // Delete backups older than N days (default: 30)
}

/**
 * Global cleanup configuration stored in ~/.bozly/bozly-config.json
 */
export interface CleanupConfig {
  sessions: CleanupSessionConfig;
  backups: CleanupBackupConfig;
  autoCleanup: boolean; // Enable automatic cleanup (default: true)
  warnAtPercent: number; // Warn when storage exceeds % (default: 80)
}

/**
 * Storage usage information
 */
export interface StorageUsage {
  sessionsSizeMB: number; // Total size of all sessions
  activeSessions: {
    count: number;
    sizeMB: number;
  };
  archivedSessions: {
    count: number;
    sizeMB: number;
  };
  backupsSizeMB: number;
  totalSizeMB: number;
  percentUsed: number; // Percentage of maxStorageMB
  maxStorageMB: number;
}

/**
 * Storage info for a single node
 */
export interface NodeStorageInfo {
  nodeId: string;
  nodeName: string;
  nodePath: string;
  usage: StorageUsage;
  canClean: {
    oldSessions: number; // Sessions older than retentionDays
    archivedSessions: number; // Sessions that can be archived
  };
}

/**
 * Options for cleanup command
 */
export interface CleanupOptions {
  preview?: boolean; // Dry-run mode
  dryRun?: boolean; // Alias for preview
  olderThan?: string; // Filter: "90d", "6m", "1y"
  archive?: boolean; // Archive instead of delete
  vault?: string; // Clean specific vault
  all?: boolean; // Clean all vaults
  force?: boolean; // Skip confirmation
  toLimit?: boolean; // Clean to storage limit
}

/**
 * Result of cleanup operation
 */
export interface CleanupResult {
  sessionsDeleted: number;
  sessionsArchived: number;
  backupsDeleted: number;
  spaceFreedMB: number;
  duration: number; // milliseconds
  dryRun: boolean;
}

/**
 * Template system types
 */

/**
 * Template variable definition
 */
export interface TemplateVariable {
  prompt: string; // Question to ask user
  default?: string | boolean | number; // Default value
  type?: "string" | "boolean" | "number"; // Data type
  required?: boolean; // Whether value is required
}

/**
 * Template metadata stored in template.json
 */
export interface TemplateMetadata {
  name: string; // Template ID (e.g., "music-discovery")
  displayName: string; // Human-readable name
  description: string;
  version: string; // SemVer (e.g., "1.0.0")
  author?: {
    name: string;
    url?: string;
  };
  license?: string;
  tags?: string[];
  category?: string; // e.g., "creative", "productivity", "custom"
  requires?: {
    bozly: string; // Min version (e.g., ">=0.3.0")
  };
  variables?: Record<string, TemplateVariable>; // User-defined variables
  postInit?: {
    message?: string; // Message to show after template applied
    commands?: string[]; // Commands to suggest running
  };
}

/**
 * Template with metadata and location
 */
export interface Template {
  metadata: TemplateMetadata;
  path: string; // Absolute path to template directory
  source: "builtin" | "user"; // Where template came from
}

/**
 * Template context for variable substitution
 * Built with system variables + user variables
 */
export interface TemplateContext {
  VAULT_NAME: string;
  CREATED_DATE: string; // YYYY-MM-DD format
  CREATED_DATETIME: string; // Full ISO datetime format
  BOZLY_VERSION: string;
  USER_NAME?: string;
  [key: string]: string | boolean | number | undefined; // Custom variables
}

/**
 * Options for creating a template
 */
export interface CreateTemplateOptions {
  name: string;
  displayName: string;
  description: string;
  author?: string;
  tags?: string[];
  category?: string;
}

/**
 * Session memory - Structured summary of a session's learnings
 * Auto-extracted from sessions and stored in .bozly/sessions/{nodeId}/{date}/{uuid}/memory.md
 */
export interface SessionMemory {
  sessionId: string;
  nodeId: string;
  nodeName: string;
  timestamp: ISODateTime;
  durationMinutes: number;
  tokenCount?: number;
  aiProvider: AIProvider;
  command: string;

  // Core memory sections (markdown content)
  title: string; // Brief title of what was accomplished
  currentState?: string; // What's being worked on
  taskSpec?: string; // Original request and goals
  workflow?: string; // Commands used, patterns discovered
  errors?: string; // Problems and solutions
  learnings?: string; // What succeeded/failed
  keyResults?: string; // Exact outputs and deliverables

  // Metadata for indexing and discovery
  tags: string[]; // vault-type, domain, keywords
  relevantSessions?: string[]; // IDs of related previous sessions
  summary: string; // One-line summary
}

/**
 * Memory metadata stored alongside memory.md
 */
export interface MemoryMetadata {
  sessionId: string;
  nodeId: string;
  nodeName: string;
  timestamp: ISODateTime;
  durationMinutes: number;
  tokenCount?: number;
  aiProvider: AIProvider;
  command: string;
  memoryAutoExtracted: boolean;
  extractionTrigger: "tokenThreshold" | "timeThreshold" | "toolUseThreshold" | "sessionEnd";
  tags: string[];
  relevantPreviousSessions: string[];
  summary: string;
  vaultType?: string; // 'music', 'project', 'journal', etc.
}

/**
 * Memory extraction trigger types
 */
export type ExtractionTrigger =
  | "tokenThreshold"
  | "timeThreshold"
  | "toolUseThreshold"
  | "sessionEnd";

/**
 * Memory index entry for querying across sessions
 */
export interface MemoryIndexEntry {
  sessionId: string;
  nodeId: string;
  nodeName: string;
  timestamp: ISODateTime;
  command: string;
  summary: string;
  tags: string[];
  filePath: string; // Path to memory.md file
}

/**
 * Memory configuration options
 */
export interface MemoryConfig {
  enabled: boolean;
  engine: "built-in"; // Future: could support external engines
  autoExtract: {
    tokenThreshold: number; // Extract memory at this token count
    timeThreshold: number; // Extract memory after this many seconds
    toolUseThreshold: number; // Extract memory after this many tool calls
  };
  storage: {
    format: "markdown"; // Only markdown supported currently
    location: string; // Path like ~/.bozly/sessions/
    indexing: boolean; // Enable memory indexing
  };
  templates: {
    enabled: boolean;
    customDirectory?: string; // Path to custom templates
    vaultSpecific: Record<string, boolean>; // e.g., { "music": true, "project": true }
  };
  retention: {
    keepSessions: "all" | number; // 'all' or number of days
    autoArchiveAfterDays?: number;
  };
}

/**
 * Memory extraction statistics
 */
export interface MemoryStats {
  totalSessions: number;
  totalMemories: number;
  oldestMemory?: ISODateTime;
  newestMemory?: ISODateTime;
  averageDurationMinutes: number;
  tagCounts: Record<string, number>;
}

/**
 * Node-level memory configuration (subset of MemoryConfig for .bozly/config.json)
 * Allows per-node customization of memory behavior
 */
export interface MemoryNodeConfig {
  enabled?: boolean; // Default: true if not specified
  maxMemoriesPerCommand?: number; // Default: 3 (how many past memories to load)
  retentionDays?: number; // Default: 30 (keep memories for this many days)
  autoIndexing?: boolean; // Default: true (automatically index memories for search)
  customTemplates?: {
    enabled?: boolean;
    directory?: string; // Path to custom memory templates
  };
}

/**
 * Suggestion types for command improvement recommendations
 */
export type SuggestionType =
  | "pattern" // Error patterns, failure trends
  | "context" // Context optimization (unused content)
  | "provider" // Provider/model recommendations
  | "prompt" // Prompt refinement keywords
  | "splitting"; // Command splitting suggestions

/**
 * Analysis data for a suggestion (type-specific)
 */
export interface SuggestionAnalysisData {
  samplesAnalyzed: number;
  confidence: number; // 0-1
  data: Record<string, unknown>; // Type-specific analysis
}

/**
 * Recommendation details in a suggestion
 */
export interface SuggestionRecommendation {
  action: string; // What to do
  example?: string; // Before/after example
  rationale: string; // Why this helps
}

/**
 * Impact assessment for a suggestion
 */
export interface SuggestionImpact {
  expectedImprovement: string; // e.g., "+20% faster"
  riskLevel: "low" | "medium" | "high";
  reversible: boolean; // Can user undo?
}

/**
 * Command suggestion with analysis and recommendation
 * Stored in .bozly/suggestions-history.json
 */
export interface Suggestion {
  id: string; // UUID
  commandName: string;
  type: SuggestionType;
  priority: "high" | "medium" | "low";
  title: string; // Short title for CLI
  description: string; // Longer explanation
  analysis: SuggestionAnalysisData;
  recommendation: SuggestionRecommendation;
  impact: SuggestionImpact;
  createdAt: ISODateTime;
  appliedAt?: ISODateTime; // When user approved
  nodeId?: string; // Which node (optional, for global commands)
}

/**
 * History of all suggestions (applied and rejected)
 * Stored in .bozly/suggestions-history.json
 */
export interface SuggestionsHistory {
  version: string;
  created: ISODateTime;
  updated: ISODateTime;
  suggestions: Suggestion[];
}

/**
 * Cross-node search types (Phase 2j)
 */

/**
 * Search target types for cross-vault search
 */
export type SearchTarget = "sessions" | "memories" | "commands";

/**
 * Session status for filtering
 */
export type SessionStatus = "completed" | "failed" | "dry_run";

/**
 * Cross-node search query
 */
export interface SearchQuery {
  text?: string; // Full-text search term
  command?: string; // Specific command filter
  provider?: AIProvider; // claude, gpt, gemini, ollama
  nodeId?: string; // Specific vault/node ID
  status?: SessionStatus; // completed, failed, dry_run
  startDate?: ISODateTime; // ISO 8601
  endDate?: ISODateTime; // ISO 8601
  searchIn?: SearchTarget[]; // What to search (default: all)
  limit?: number; // Max results (default: 50)
  offset?: number; // Pagination offset (default: 0)
  fuzzy?: boolean; // Fuzzy matching (default: false)
}

/**
 * Individual session search result with relevance
 */
export interface SessionSearchResult {
  type: "session";
  session: Session;
  matchedFields: string[]; // Which fields matched the query
  relevanceScore: number; // 0-1, for ranking
  nodeInfo: {
    nodeId: string;
    nodeName: string;
    nodePath: string;
  };
}

/**
 * Memory index entry reference in search results
 */
export interface MemorySearchResult {
  type: "memory";
  memory: {
    sessionId: string;
    nodeId: string;
    nodeName: string;
    timestamp: ISODateTime;
    command: string;
    summary: string;
    tags: string[];
    filePath: string;
  };
  matchedFields: string[]; // summary, tags, command
  relevanceScore: number;
  sessionPath: string; // Path to the session that generated this memory
}

/**
 * Command search result with relevance
 */
export interface CommandSearchResult {
  type: "command";
  command: NodeCommand;
  matchedFields: string[]; // name, description, tags
  relevanceScore: number;
  sourceNode?: {
    nodeId: string;
    nodeName: string;
  }; // undefined for global commands
}

/**
 * Aggregated search results from all targets
 */
export interface AggregatedSearchResults {
  query: SearchQuery;
  timestamp: ISODateTime;
  queryTimeMs: number;
  counts: {
    sessions: number;
    memories: number;
    commands: number;
    total: number;
  };
  results: {
    sessions: SessionSearchResult[];
    memories: MemorySearchResult[];
    commands: CommandSearchResult[];
  };
  groupedByNode?: Record<
    string,
    {
      sessions: SessionSearchResult[];
      memories: MemorySearchResult[];
      commands: CommandSearchResult[];
    }
  >;
}

/**
 * Options for history command
 */
export interface HistoryOptions {
  limit?: number; // Default: 10, Max: 100
  offset?: number; // Pagination
  provider?: AIProvider; // Filter by provider
  command?: string; // Filter by command name
  status?: SessionStatus; // Filter by status
  older?: number; // Days to look back
}

/**
 * History result item (session with node info)
 */
export interface HistoryResult {
  session: Session;
  nodeInfo: {
    nodeId: string;
    nodeName: string;
  };
  memory?: {
    sessionId: string;
    summary: string;
  }; // If memory was extracted for this session
}

/**
 * Statistics for search results
 */
export interface SearchStats {
  totalResults: number;
  byType: Record<SearchTarget, number>;
  byNode: Record<string, number>;
  byProvider: Record<AIProvider, number>;
  dateRange: {
    oldest?: ISODateTime;
    newest?: ISODateTime;
  };
}
