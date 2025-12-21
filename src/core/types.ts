/**
 * BOZLY type definitions
 */

/**
 * Vault configuration stored in .bozly/config.json
 */
export interface VaultConfig {
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
}

/**
 * Vault information stored in registry
 */
export interface VaultInfo {
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
  vaults: VaultInfo[];
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
}

/**
 * Options for initializing a vault
 */
export interface InitOptions {
  path: string;
  type?: string;
  name?: string;
  force?: boolean;
}

/**
 * Options for adding a vault to registry
 */
export interface AddVaultOptions {
  path: string;
  name?: string;
}

/**
 * Vault command definition
 */
export interface VaultCommand {
  name: string;
  description?: string;
  file: string;
  content?: string;
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
export type VaultDomain = "music" | "projects" | "journal" | "content" | "custom";
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
  domain?: VaultDomain;
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
  vaultId: string; // Machine-readable vault ID (for directory hierarchy)
  vaultName: string;
  vaultPath: string;

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
  commandInput: Record<string, any>;
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
  vault?: string;
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
