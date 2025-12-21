/**
 * Domain Models Module (Pattern 7)
 *
 * Manages domain-specific models for vaults. Models are reusable definitions
 * that provide AI assistants with structured knowledge about how to analyze,
 * score, or classify information within a domain.
 *
 * Supported model types:
 * - Scoring models: Multi-dimensional evaluation frameworks (e.g., triple-score rating)
 * - Analysis models: Metrics-based analysis for data interpretation
 * - Classification models: Categorization schemes for domain items
 * - Prediction models: Forecasting patterns and trends
 *
 * Features:
 * - Load models from .bozly/models/ directory
 * - Parse YAML/JSON model definitions
 * - Versioning and changelog tracking
 * - Model validation against schema
 * - Format models for AI prompt inclusion
 * - Hash computation for change detection
 *
 * Usage:
 *   import { loadModel, listModels, formatModelForPrompt } from './models.js';
 *   const model = await loadModel(vaultPath, 'triple-score');
 *   const formatted = formatModelForPrompt(model);
 *   const prompt = `${context}\n\n${formatted}\n\n${command}`;
 *
 * @module core/models
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import yaml from "js-yaml";
import { logger } from "./logger.js";
import { trackModelVersion } from "./versions.js";
import type { Model, Hash } from "./types.js";

const MODELS_DIR = "models";
const MODEL_EXTENSION = ".yaml";

/**
 * Load a single model by name from vault
 *
 * Reads and parses a model file from .bozly/models/{modelName}.yaml
 * Validates the model structure and computes file hash.
 *
 * @param vaultPath - Path to vault root directory
 * @param modelName - Name of the model to load (without extension)
 * @returns Parsed model object with file information
 * @throws Error if model file not found or invalid
 *
 * @example
 * const model = await loadModel('/home/user/music-vault', 'triple-score');
 * console.log(model.dimensions); // [{ name: 'Personal', ... }, ...]
 */
export async function loadModel(vaultPath: string, modelName: string): Promise<Model> {
  const modelsPath = path.join(vaultPath, ".bozly", MODELS_DIR);
  const modelPath = path.join(modelsPath, `${modelName}${MODEL_EXTENSION}`);

  await logger.debug("Loading model", {
    vaultPath,
    modelName,
    modelPath,
  });

  try {
    const content = await fs.readFile(modelPath, "utf-8");

    // Parse YAML content
    const parsed = yaml.load(content) as Partial<Model>;

    if (!parsed || typeof parsed !== "object") {
      throw new Error(`Invalid model format in ${modelPath}`);
    }

    // Compute file hash for change detection
    const hash = computeHash(content);

    // Construct model object with file info
    const model: Model = {
      name: parsed.name || modelName,
      version: parsed.version || "1.0.0",
      description: parsed.description,
      domain: parsed.domain,
      type: parsed.type,
      created: parsed.created,
      updated: parsed.updated,
      dimensions: parsed.dimensions,
      scoring: parsed.scoring,
      metrics: parsed.metrics,
      changelog: parsed.changelog,
      path: modelPath,
      hash,
    };

    await logger.debug("Model loaded successfully", {
      modelName,
      version: model.version,
      type: model.type,
      hashSize: hash.length,
    });

    // Track model version in version history
    try {
      await trackModelVersion(vaultPath, model);
    } catch (versionError) {
      await logger.debug("Failed to track model version", {
        modelName,
        error: versionError instanceof Error ? versionError.message : String(versionError),
      });
      // Don't fail the entire operation if version tracking fails
    }

    return model;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await logger.error("Failed to load model", {
      modelName,
      modelPath,
      error: errorMsg,
    });
    throw new Error(`Failed to load model '${modelName}': ${errorMsg}`);
  }
}

/**
 * List all models available in a vault
 *
 * Scans the .bozly/models/ directory and loads all model files.
 * Returns sorted list of models with basic metadata.
 *
 * @param vaultPath - Path to vault root directory
 * @returns Array of model objects (may be empty if no models exist)
 *
 * @example
 * const models = await listModels('/home/user/music-vault');
 * console.log(models.map(m => m.name)); // ['triple-score', 'album-quality', ...]
 */
export async function listModels(vaultPath: string): Promise<Model[]> {
  const modelsPath = path.join(vaultPath, ".bozly", MODELS_DIR);

  await logger.debug("Listing models in vault", { vaultPath, modelsPath });

  try {
    const files = await fs.readdir(modelsPath);
    const modelFiles = files.filter((f) => f.endsWith(MODEL_EXTENSION));

    await logger.debug("Found model files", { count: modelFiles.length, files: modelFiles });

    const models: Model[] = [];
    for (const file of modelFiles) {
      const modelName = file.replace(MODEL_EXTENSION, "");
      try {
        const model = await loadModel(vaultPath, modelName);
        models.push(model);
        await logger.debug("Added model to list", { name: model.name });
      } catch (error) {
        await logger.warn("Skipping invalid model file", { file });
      }
    }

    // Sort by name for consistent ordering
    models.sort((a, b) => a.name.localeCompare(b.name));

    await logger.info("Models list retrieved", { count: models.length });
    return models;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // Models directory doesn't exist - return empty list
      await logger.debug("Models directory not found (normal for new vaults)");
      return [];
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    await logger.error("Failed to list models", {
      vaultPath,
      error: errorMsg,
    });
    throw new Error(`Failed to list models: ${errorMsg}`);
  }
}

/**
 * Save a model to vault
 *
 * Writes model definition to .bozly/models/{modelName}.yaml
 * Creates models directory if it doesn't exist.
 *
 * @param vaultPath - Path to vault root directory
 * @param model - Model object to save
 * @throws Error if write operation fails
 *
 * @example
 * const model: Model = {
 *   name: 'quality-score',
 *   version: '1.0.0',
 *   type: 'scoring',
 *   dimensions: [...]
 * };
 * await saveModel('/home/user/music-vault', model);
 */
export async function saveModel(vaultPath: string, model: Model): Promise<void> {
  const modelsPath = path.join(vaultPath, ".bozly", MODELS_DIR);
  const modelFileName = `${model.name}${MODEL_EXTENSION}`;
  const modelPath = path.join(modelsPath, modelFileName);

  await logger.debug("Saving model", {
    vaultPath,
    modelName: model.name,
    modelPath,
  });

  try {
    // Ensure models directory exists
    await fs.mkdir(modelsPath, { recursive: true });

    // Prepare model data for YAML serialization
    const modelData = {
      name: model.name,
      version: model.version,
      description: model.description,
      domain: model.domain,
      type: model.type,
      created: model.created,
      updated: model.updated,
      ...(model.dimensions && { dimensions: model.dimensions }),
      ...(model.scoring && { scoring: model.scoring }),
      ...(model.metrics && { metrics: model.metrics }),
      ...(model.changelog && { changelog: model.changelog }),
    };

    // Serialize to YAML
    const yaml_content = yaml.dump(modelData, {
      indent: 2,
      lineWidth: 100,
    });

    // Write to file
    await fs.writeFile(modelPath, yaml_content, "utf-8");

    await logger.info("Model saved successfully", {
      modelName: model.name,
      version: model.version,
      fileSize: yaml_content.length,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await logger.error("Failed to save model", {
      modelName: model.name,
      error: errorMsg,
    });
    throw new Error(`Failed to save model '${model.name}': ${errorMsg}`);
  }
}

/**
 * Validate model schema
 *
 * Checks if a model conforms to the expected structure and has all required fields.
 * Does NOT validate semantic correctness of model values.
 *
 * @param model - Model to validate
 * @returns Validation result with list of errors (if any)
 *
 * @example
 * const { valid, errors } = validateModel(model);
 * if (!valid) {
 *   console.error('Validation errors:', errors);
 * }
 */
export function validateModel(model: Model): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!model.name || typeof model.name !== "string") {
    errors.push("Model must have a 'name' field (string)");
  }

  if (!model.version || !isValidSemVer(model.version)) {
    errors.push("Model must have a valid 'version' field (e.g., '1.0.0')");
  }

  if (!model.path || typeof model.path !== "string") {
    errors.push("Model must have a 'path' field");
  }

  // Check type if specified
  if (model.type && !["scoring", "analysis", "classification", "prediction"].includes(model.type)) {
    errors.push("Model type must be 'scoring', 'analysis', 'classification', or 'prediction'");
  }

  // For scoring models, check required fields
  if (model.type === "scoring") {
    if (!model.dimensions || model.dimensions.length === 0) {
      errors.push("Scoring models must have at least one dimension");
    }

    if (model.dimensions) {
      for (const dim of model.dimensions) {
        if (!dim.name) {
          errors.push("All dimensions must have a 'name' field");
        }
        if (typeof dim.weight !== "number" || dim.weight < 0 || dim.weight > 1) {
          errors.push("Dimension weights must be numbers between 0.0 and 1.0");
        }
      }

      // Weights should sum to approximately 1.0
      const totalWeight = model.dimensions.reduce((sum, d) => sum + d.weight, 0);
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        errors.push(`Dimension weights should sum to 1.0 (got ${totalWeight.toFixed(2)})`);
      }
    }
  }

  // For analysis models, check required fields
  if (model.type === "analysis") {
    if (!model.metrics || model.metrics.length === 0) {
      errors.push("Analysis models must have at least one metric");
    }
  }

  return {
    valid: errors.length === 0,
    ...(errors.length > 0 && { errors }),
  };
}

/**
 * Format model for inclusion in AI prompt
 *
 * Converts model object to formatted markdown string suitable for
 * inclusion in prompts sent to AI providers. Formats vary by model type.
 *
 * @param model - Model to format
 * @returns Markdown-formatted model definition
 *
 * @example
 * const model = await loadModel(vaultPath, 'triple-score');
 * const formatted = formatModelForPrompt(model);
 * // Result: "## Model: Triple Score Rating..."
 */
export function formatModelForPrompt(model: Model): string {
  let output = `## Model: ${model.name}\n\n`;

  if (model.description) {
    output += `${model.description}\n\n`;
  }

  if (model.version) {
    output += `**Version:** ${model.version}\n`;
  }

  if (model.type) {
    output += `**Type:** ${model.type}\n\n`;
  }

  // Format scoring model
  if (model.type === "scoring" && model.dimensions && model.dimensions.length > 0) {
    output += "### Dimensions\n\n";

    for (const dim of model.dimensions) {
      output += `**${dim.name}** (weight: ${dim.weight})\n`;

      if (dim.description) {
        output += `- ${dim.description}\n`;
      }

      if (dim.criteria && dim.criteria.length > 0) {
        output += "- Criteria:\n";
        for (const criterion of dim.criteria) {
          output += `  - ${criterion}\n`;
        }
      }

      if (dim.scale) {
        output += `- Scale: ${dim.scale.min} to ${dim.scale.max}\n`;
      }

      output += "\n";
    }

    if (model.scoring) {
      output += "### Scoring Levels\n\n";
      const levels = model.scoring.levels;
      output += `- Excellent: ${levels.excellent.min}-${levels.excellent.max}\n`;
      output += `- Good: ${levels.good.min}-${levels.good.max}\n`;
      output += `- Okay: ${levels.okay.min}-${levels.okay.max}\n`;
      output += `- Needs Work: ${levels.needsWork.min}-${levels.needsWork.max}\n`;
    }
  }

  // Format analysis model
  if (model.type === "analysis" && model.metrics && model.metrics.length > 0) {
    output += "### Metrics\n\n";

    for (const metric of model.metrics) {
      output += `**${metric.name}**\n`;

      if (metric.formula) {
        output += `- Formula: ${metric.formula}\n`;
      }

      if (metric.weight) {
        output += `- Weight: ${metric.weight}\n`;
      }

      output += "\n";
    }
  }

  return output;
}

/**
 * Compute SHA256 hash of model file content
 *
 * Used for change detection and integrity verification.
 *
 * @param vaultPath - Path to vault root directory
 * @param modelName - Name of model to hash
 * @returns SHA256 hash of model file content
 *
 * @example
 * const hash = await computeModelHash(vaultPath, 'triple-score');
 * console.log(hash); // "abc123def456..."
 */
export async function computeModelHash(vaultPath: string, modelName: string): Promise<Hash> {
  const modelsPath = path.join(vaultPath, ".bozly", MODELS_DIR);
  const modelPath = path.join(modelsPath, `${modelName}${MODEL_EXTENSION}`);

  await logger.debug("Computing model hash", { modelName, modelPath });

  try {
    const content = await fs.readFile(modelPath, "utf-8");
    const hash = computeHash(content);

    await logger.debug("Model hash computed", {
      modelName,
      hashSize: hash.length,
    });

    return hash;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await logger.error("Failed to compute model hash", {
      modelName,
      error: errorMsg,
    });
    throw new Error(`Failed to compute hash for model '${modelName}': ${errorMsg}`);
  }
}

/**
 * Check if model exists in vault
 *
 * @param vaultPath - Path to vault root directory
 * @param modelName - Name of model to check (can be null/undefined)
 * @returns True if model file exists
 *
 * @example
 * const exists = await modelExists(vaultPath, 'triple-score');
 * if (exists) {
 *   const model = await loadModel(vaultPath, 'triple-score');
 * }
 */
export async function modelExists(
  vaultPath: string,
  modelName: string | null | undefined
): Promise<boolean> {
  // Early return if modelName is null or undefined
  if (!modelName) {
    return false;
  }
  const modelsPath = path.join(vaultPath, ".bozly", MODELS_DIR);
  const modelPath = path.join(modelsPath, `${modelName}${MODEL_EXTENSION}`);

  try {
    await fs.access(modelPath);
    await logger.debug("Model exists", { modelName });
    return true;
  } catch {
    await logger.debug("Model does not exist", { modelName });
    return false;
  }
}

/**
 * Helper: Compute SHA256 hash of content
 * @internal
 */
function computeHash(content: string): Hash {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Helper: Validate semantic version format
 * @internal
 */
function isValidSemVer(version: string): boolean {
  return /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/.test(version);
}
