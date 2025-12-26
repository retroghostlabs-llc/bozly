/**
 * Unit tests for domain models module (Pattern 7)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTempDir,
  getTempDir,
  createMockVault,
  writeJSON,
  fileExists,
  cleanupTempDir,
  dirExists,
} from "../conftest";
import {
  loadModel,
  listModels,
  saveModel,
  validateModel,
  formatModelForPrompt,
  computeModelHash,
  modelExists,
} from "../../dist/core/models.js";
import type { Model } from "../../dist/core/types.js";
import path from "path";
import fs from "fs/promises";

describe("Domain Models Module", () => {
  beforeEach(async () => {
    await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir();
  });

  describe("loadModel", () => {
    it("should load a valid model from YAML file", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);
      const modelsDir = path.join(nodePath, ".bozly", "models");
      await fs.mkdir(modelsDir, { recursive: true });

      // Create a test model file
      const modelYaml = `name: triple-score
version: 1.0.0
type: scoring
description: Triple Score Rating System
domain: music
dimensions:
  - name: Personal Enjoyment
    weight: 0.4
    description: How much I enjoyed this
  - name: Technical Quality
    weight: 0.3
    description: Production quality
  - name: Replay Value
    weight: 0.3
    description: How often I replay it`;

      const modelPath = path.join(modelsDir, "triple-score.yaml");
      await fs.writeFile(modelPath, modelYaml, "utf-8");

      const model = await loadModel(nodePath, "triple-score");

      expect(model).toBeDefined();
      expect(model.name).toBe("triple-score");
      expect(model.version).toBe("1.0.0");
      expect(model.type).toBe("scoring");
      expect(model.domain).toBe("music");
      expect(model.dimensions).toHaveLength(3);
      expect(model.path).toBe(modelPath);
      expect(model.hash).toBeDefined();
      expect(model.hash.length).toBe(64); // SHA256 hex length
    });

    it("should use model name from file when not in YAML", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);
      const modelsDir = path.join(nodePath, ".bozly", "models");
      await fs.mkdir(modelsDir, { recursive: true });

      const modelYaml = `version: 1.0.0
type: scoring`;

      const modelPath = path.join(modelsDir, "my-model.yaml");
      await fs.writeFile(modelPath, modelYaml, "utf-8");

      const model = await loadModel(nodePath, "my-model");

      expect(model.name).toBe("my-model");
    });

    it("should include all optional fields when present", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);
      const modelsDir = path.join(nodePath, ".bozly", "models");
      await fs.mkdir(modelsDir, { recursive: true });

      const modelYaml = `name: full-model
version: 2.1.0
type: scoring
description: Complete model with all fields
domain: music
created: 2025-01-01T00:00:00Z
updated: 2025-01-15T00:00:00Z
dimensions:
  - name: Test
    weight: 1.0
changelog:
  - version: 2.0.0
    date: 2025-01-10
    changes: Updated dimensions`;

      const modelPath = path.join(modelsDir, "full-model.yaml");
      await fs.writeFile(modelPath, modelYaml, "utf-8");

      const model = await loadModel(nodePath, "full-model");

      expect(model.description).toBe("Complete model with all fields");
      // YAML parser may convert timestamps to Date objects
      expect(model.created).toBeDefined();
      expect(model.updated).toBeDefined();
      expect(model.changelog).toHaveLength(1);
    });

    it("should throw error when model file not found", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      await expect(loadModel(nodePath, "nonexistent")).rejects.toThrow(
        "Failed to load model 'nonexistent'"
      );
    });

    it("should throw error when YAML is invalid", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);
      const modelsDir = path.join(nodePath, ".bozly", "models");
      await fs.mkdir(modelsDir, { recursive: true });

      const invalidYaml = `name: bad-model
version: 1.0.0
[invalid yaml`;

      const modelPath = path.join(modelsDir, "bad-model.yaml");
      await fs.writeFile(modelPath, invalidYaml, "utf-8");

      await expect(loadModel(nodePath, "bad-model")).rejects.toThrow(
        "Failed to load model 'bad-model'"
      );
    });

    it("should compute hash for change detection", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);
      const modelsDir = path.join(nodePath, ".bozly", "models");
      await fs.mkdir(modelsDir, { recursive: true });

      const modelYaml = `name: hash-test
version: 1.0.0`;

      const modelPath = path.join(modelsDir, "hash-test.yaml");
      await fs.writeFile(modelPath, modelYaml, "utf-8");

      const model1 = await loadModel(nodePath, "hash-test");
      const model2 = await loadModel(nodePath, "hash-test");

      expect(model1.hash).toBe(model2.hash);
    });
  });

  describe("listModels", () => {
    it("should return empty list when no models exist", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const models = await listModels(nodePath);

      expect(models).toEqual([]);
    });

    it("should list all models in vault", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);
      const modelsDir = path.join(nodePath, ".bozly", "models");
      await fs.mkdir(modelsDir, { recursive: true });

      // Create multiple model files
      for (const name of ["alpha", "beta", "gamma"]) {
        const yaml = `name: ${name}\nversion: 1.0.0`;
        await fs.writeFile(path.join(modelsDir, `${name}.yaml`), yaml, "utf-8");
      }

      const models = await listModels(nodePath);

      expect(models).toHaveLength(3);
      expect(models.map((m) => m.name).sort()).toEqual(["alpha", "beta", "gamma"]);
    });

    it("should sort models by name", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);
      const modelsDir = path.join(nodePath, ".bozly", "models");
      await fs.mkdir(modelsDir, { recursive: true });

      // Create in non-alphabetical order
      for (const name of ["zebra", "apple", "monkey"]) {
        const yaml = `name: ${name}\nversion: 1.0.0`;
        await fs.writeFile(path.join(modelsDir, `${name}.yaml`), yaml, "utf-8");
      }

      const models = await listModels(nodePath);
      const names = models.map((m) => m.name);

      expect(names).toEqual(["apple", "monkey", "zebra"]);
    });

    it("should skip invalid model files", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);
      const modelsDir = path.join(nodePath, ".bozly", "models");
      await fs.mkdir(modelsDir, { recursive: true });

      // Create valid and invalid models
      await fs.writeFile(
        path.join(modelsDir, "valid.yaml"),
        "name: valid\nversion: 1.0.0",
        "utf-8"
      );
      await fs.writeFile(
        path.join(modelsDir, "invalid.yaml"),
        "[invalid yaml",
        "utf-8"
      );

      const models = await listModels(nodePath);

      expect(models).toHaveLength(1);
      expect(models[0].name).toBe("valid");
    });

    it("should handle missing models directory gracefully", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);
      // Don't create models directory

      const models = await listModels(nodePath);

      expect(models).toEqual([]);
    });
  });

  describe("saveModel", () => {
    it("should save a new model to YAML file", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const model: Model = {
        name: "new-model",
        version: "1.0.0",
        type: "scoring",
        description: "A new model",
        path: "",
        hash: "",
        dimensions: [{ name: "Test", weight: 1.0 }],
      };

      await saveModel(nodePath, model);

      const modelPath = path.join(nodePath, ".bozly", "models", "new-model.yaml");
      expect(await fileExists(modelPath)).toBe(true);
    });

    it("should create models directory if it doesn't exist", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const model: Model = {
        name: "test",
        version: "1.0.0",
        path: "",
        hash: "",
      };

      await saveModel(nodePath, model);

      const modelsDir = path.join(nodePath, ".bozly", "models");
      expect(await dirExists(modelsDir)).toBe(true);
    });

    it("should overwrite existing model", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);
      const modelsDir = path.join(nodePath, ".bozly", "models");
      await fs.mkdir(modelsDir, { recursive: true });

      // Create initial model
      const model1: Model = {
        name: "overwrite-test",
        version: "1.0.0",
        description: "Original",
        path: "",
        hash: "",
      };

      await saveModel(nodePath, model1);

      // Overwrite with new version
      const model2: Model = {
        name: "overwrite-test",
        version: "2.0.0",
        description: "Updated",
        path: "",
        hash: "",
      };

      await saveModel(nodePath, model2);

      const loaded = await loadModel(nodePath, "overwrite-test");
      expect(loaded.version).toBe("2.0.0");
      expect(loaded.description).toBe("Updated");
    });

    it("should include all optional fields in saved YAML", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const model: Model = {
        name: "full",
        version: "1.0.0",
        type: "scoring",
        description: "Full model",
        domain: "music",
        created: "2025-01-01T00:00:00Z",
        updated: "2025-01-15T00:00:00Z",
        path: "",
        hash: "",
        dimensions: [{ name: "Test", weight: 1.0 }],
        changelog: [{ version: "1.0.0", date: "2025-01-01", changes: "Initial" }],
      };

      await saveModel(nodePath, model);

      const loaded = await loadModel(nodePath, "full");

      expect(loaded.type).toBe("scoring");
      expect(loaded.description).toBe("Full model");
      expect(loaded.domain).toBe("music");
      expect(loaded.created).toBe("2025-01-01T00:00:00Z");
      expect(loaded.updated).toBe("2025-01-15T00:00:00Z");
      expect(loaded.changelog).toBeDefined();
    });

    it("should omit undefined optional fields", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const model: Model = {
        name: "minimal",
        version: "1.0.0",
        path: "",
        hash: "",
      };

      await saveModel(nodePath, model);

      const modelPath = path.join(nodePath, ".bozly", "models", "minimal.yaml");
      const content = await fs.readFile(modelPath, "utf-8");

      // Should not have these fields
      expect(content).not.toContain("dimensions:");
      expect(content).not.toContain("changelog:");
    });

    it("should throw error on write failure", async () => {
      const nodePath = "/invalid/path/that/does/not/exist";

      const model: Model = {
        name: "test",
        version: "1.0.0",
        path: "",
        hash: "",
      };

      await expect(saveModel(nodePath, model)).rejects.toThrow(
        "Failed to save model"
      );
    });
  });

  describe("validateModel", () => {
    it("should validate a correct scoring model", () => {
      const model: Model = {
        name: "valid-scoring",
        version: "1.0.0",
        path: "/test/path",
        hash: "abc123",
        type: "scoring",
        dimensions: [
          { name: "A", weight: 0.5 },
          { name: "B", weight: 0.5 },
        ],
      };

      const result = validateModel(model);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("should validate a correct analysis model", () => {
      const model: Model = {
        name: "valid-analysis",
        version: "1.0.0",
        path: "/test/path",
        hash: "abc123",
        type: "analysis",
        metrics: [
          { name: "metric1", formula: "x * y" },
          { name: "metric2", formula: "x / y" },
        ],
      };

      const result = validateModel(model);

      expect(result.valid).toBe(true);
    });

    it("should reject model without name", () => {
      const model: Model = {
        name: "",
        version: "1.0.0",
        path: "/test",
        hash: "abc",
      };

      const result = validateModel(model);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Model must have a 'name' field (string)"
      );
    });

    it("should reject invalid semantic version", () => {
      const model: Model = {
        name: "test",
        version: "invalid",
        path: "/test",
        hash: "abc",
      };

      const result = validateModel(model);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Model must have a valid 'version' field (e.g., '1.0.0')"
      );
    });

    it("should accept valid semantic versions with prerelease", () => {
      const model: Model = {
        name: "test",
        version: "1.0.0-beta",
        path: "/test",
        hash: "abc",
      };

      const result = validateModel(model);

      expect(result.valid).toBe(true);
    });

    it("should reject model without path", () => {
      const model: Model = {
        name: "test",
        version: "1.0.0",
        path: "",
        hash: "abc",
      };

      const result = validateModel(model);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Model must have a 'path' field");
    });

    it("should reject invalid model type", () => {
      const model: Model = {
        name: "test",
        version: "1.0.0",
        path: "/test",
        hash: "abc",
        type: "invalid" as any,
      };

      const result = validateModel(model);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Model type must be 'scoring', 'analysis', 'classification', or 'prediction'"
      );
    });

    it("should validate scoring model dimensions", () => {
      const model: Model = {
        name: "scoring",
        version: "1.0.0",
        path: "/test",
        hash: "abc",
        type: "scoring",
        dimensions: [
          { name: "A", weight: 0.3 },
          { name: "B", weight: 0.3 },
          { name: "C", weight: 0.4 },
        ],
      };

      const result = validateModel(model);

      expect(result.valid).toBe(true);
    });

    it("should reject scoring model without dimensions", () => {
      const model: Model = {
        name: "scoring",
        version: "1.0.0",
        path: "/test",
        hash: "abc",
        type: "scoring",
        dimensions: [],
      };

      const result = validateModel(model);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Scoring models must have at least one dimension"
      );
    });

    it("should validate dimension weights sum to 1.0", () => {
      const model: Model = {
        name: "scoring",
        version: "1.0.0",
        path: "/test",
        hash: "abc",
        type: "scoring",
        dimensions: [
          { name: "A", weight: 0.34 },
          { name: "B", weight: 0.33 },
          { name: "C", weight: 0.33 },
        ],
      };

      const result = validateModel(model);

      expect(result.valid).toBe(true);
    });

    it("should reject dimension weights that don't sum to 1.0", () => {
      const model: Model = {
        name: "scoring",
        version: "1.0.0",
        path: "/test",
        hash: "abc",
        type: "scoring",
        dimensions: [
          { name: "A", weight: 0.5 },
          { name: "B", weight: 0.3 },
        ],
      };

      const result = validateModel(model);

      expect(result.valid).toBe(false);
      // Check that error message exists and includes the sum check
      expect(result.errors).toBeDefined();
      expect(result.errors?.some((e) => e.includes("Dimension weights should sum to 1.0"))).toBe(true);
    });

    it("should validate dimension weights are 0-1", () => {
      const model: Model = {
        name: "scoring",
        version: "1.0.0",
        path: "/test",
        hash: "abc",
        type: "scoring",
        dimensions: [{ name: "A", weight: 1.5 }],
      };

      const result = validateModel(model);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Dimension weights must be numbers between 0.0 and 1.0"
      );
    });

    it("should reject scoring model with dimension without name", () => {
      const model: Model = {
        name: "scoring",
        version: "1.0.0",
        path: "/test",
        hash: "abc",
        type: "scoring",
        dimensions: [{ name: "", weight: 1.0 }],
      };

      const result = validateModel(model);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("All dimensions must have a 'name' field");
    });

    it("should reject analysis model without metrics", () => {
      const model: Model = {
        name: "analysis",
        version: "1.0.0",
        path: "/test",
        hash: "abc",
        type: "analysis",
        metrics: [],
      };

      const result = validateModel(model);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Analysis models must have at least one metric"
      );
    });
  });

  describe("formatModelForPrompt", () => {
    it("should format basic model information", () => {
      const model: Model = {
        name: "test-model",
        version: "1.0.0",
        type: "scoring",
        description: "Test Description",
        path: "/test",
        hash: "abc",
      };

      const formatted = formatModelForPrompt(model);

      expect(formatted).toContain("## Model: test-model");
      expect(formatted).toContain("Test Description");
      expect(formatted).toContain("**Version:** 1.0.0");
      expect(formatted).toContain("**Type:** scoring");
    });

    it("should format scoring model with dimensions", () => {
      const model: Model = {
        name: "scoring-model",
        version: "1.0.0",
        type: "scoring",
        path: "/test",
        hash: "abc",
        dimensions: [
          {
            name: "Quality",
            weight: 0.6,
            description: "Quality score",
            criteria: ["Criterion 1", "Criterion 2"],
          },
          { name: "Speed", weight: 0.4 },
        ],
      };

      const formatted = formatModelForPrompt(model);

      expect(formatted).toContain("### Dimensions");
      expect(formatted).toContain("**Quality** (weight: 0.6)");
      expect(formatted).toContain("Quality score");
      expect(formatted).toContain("Criterion 1");
      expect(formatted).toContain("**Speed** (weight: 0.4)");
    });

    it("should format dimension scale information", () => {
      const model: Model = {
        name: "test",
        version: "1.0.0",
        type: "scoring",
        path: "/test",
        hash: "abc",
        dimensions: [
          {
            name: "Rating",
            weight: 1.0,
            scale: { min: 1, max: 5 },
          },
        ],
      };

      const formatted = formatModelForPrompt(model);

      expect(formatted).toContain("Scale: 1 to 5");
    });

    it("should format scoring levels", () => {
      const model: Model = {
        name: "test",
        version: "1.0.0",
        type: "scoring",
        path: "/test",
        hash: "abc",
        dimensions: [{ name: "Test", weight: 1.0 }],
        scoring: {
          levels: {
            excellent: { min: 85, max: 100 },
            good: { min: 70, max: 84 },
            okay: { min: 50, max: 69 },
            needsWork: { min: 0, max: 49 },
          },
        },
      };

      const formatted = formatModelForPrompt(model);

      expect(formatted).toContain("### Scoring Levels");
      expect(formatted).toContain("Excellent: 85-100");
      expect(formatted).toContain("Good: 70-84");
    });

    it("should format analysis model with metrics", () => {
      const model: Model = {
        name: "analysis-model",
        version: "1.0.0",
        type: "analysis",
        path: "/test",
        hash: "abc",
        metrics: [
          {
            name: "Performance",
            formula: "speed / time",
            weight: 0.7,
          },
          {
            name: "Efficiency",
            formula: "output / input",
            weight: 0.3,
          },
        ],
      };

      const formatted = formatModelForPrompt(model);

      expect(formatted).toContain("### Metrics");
      expect(formatted).toContain("**Performance**");
      expect(formatted).toContain("Formula: speed / time");
      expect(formatted).toContain("Weight: 0.7");
    });

    it("should omit sections for missing optional data", () => {
      const model: Model = {
        name: "minimal",
        version: "1.0.0",
        path: "/test",
        hash: "abc",
      };

      const formatted = formatModelForPrompt(model);

      expect(formatted).not.toContain("### Dimensions");
      expect(formatted).not.toContain("### Metrics");
      expect(formatted).not.toContain("### Scoring Levels");
    });
  });

  describe("computeModelHash", () => {
    it("should compute SHA256 hash of model file", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);
      const modelsDir = path.join(nodePath, ".bozly", "models");
      await fs.mkdir(modelsDir, { recursive: true });

      const modelYaml = "name: hash-model\nversion: 1.0.0";
      await fs.writeFile(
        path.join(modelsDir, "hash-model.yaml"),
        modelYaml,
        "utf-8"
      );

      const hash = await computeModelHash(nodePath, "hash-model");

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA256 hex is 64 chars
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });

    it("should produce consistent hash for same content", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);
      const modelsDir = path.join(nodePath, ".bozly", "models");
      await fs.mkdir(modelsDir, { recursive: true });

      const modelYaml = "name: consistent\nversion: 1.0.0";
      const modelPath = path.join(modelsDir, "consistent.yaml");
      await fs.writeFile(modelPath, modelYaml, "utf-8");

      const hash1 = await computeModelHash(nodePath, "consistent");
      const hash2 = await computeModelHash(nodePath, "consistent");

      expect(hash1).toBe(hash2);
    });

    it("should throw error if model doesn't exist", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      await expect(computeModelHash(nodePath, "nonexistent")).rejects.toThrow(
        "Failed to compute hash"
      );
    });
  });

  describe("modelExists", () => {
    it("should return true if model file exists", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);
      const modelsDir = path.join(nodePath, ".bozly", "models");
      await fs.mkdir(modelsDir, { recursive: true });

      await fs.writeFile(
        path.join(modelsDir, "exists.yaml"),
        "name: exists\nversion: 1.0.0",
        "utf-8"
      );

      const exists = await modelExists(nodePath, "exists");

      expect(exists).toBe(true);
    });

    it("should return false if model file doesn't exist", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const exists = await modelExists(nodePath, "nonexistent");

      expect(exists).toBe(false);
    });

    it("should return false for null model name", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const exists = await modelExists(nodePath, null as any);

      expect(exists).toBe(false);
    });

    it("should return false for undefined model name", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const exists = await modelExists(nodePath, undefined as any);

      expect(exists).toBe(false);
    });

    it("should return false for empty string model name", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      const exists = await modelExists(nodePath, "");

      expect(exists).toBe(false);
    });
  });

  describe("Integration scenarios", () => {
    it("should save, load, and format a model", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      // Create and save model
      const originalModel: Model = {
        name: "integration-test",
        version: "1.0.0",
        type: "scoring",
        description: "Integration test model",
        path: "",
        hash: "",
        dimensions: [
          { name: "A", weight: 0.5, description: "First dimension" },
          { name: "B", weight: 0.5 },
        ],
      };

      await saveModel(nodePath, originalModel);

      // Load and verify
      const loadedModel = await loadModel(nodePath, "integration-test");
      expect(loadedModel.name).toBe("integration-test");
      expect(loadedModel.type).toBe("scoring");
      expect(loadedModel.dimensions).toHaveLength(2);

      // Format for prompt
      const formatted = formatModelForPrompt(loadedModel);
      expect(formatted).toContain("integration-test");
      expect(formatted).toContain("First dimension");

      // Verify it's in list
      const models = await listModels(nodePath);
      expect(models.some((m) => m.name === "integration-test")).toBe(true);

      // Verify it exists
      const exists = await modelExists(nodePath, "integration-test");
      expect(exists).toBe(true);
    });

    it("should handle multiple models in one vault", async () => {
      const tempDir = getTempDir();
      const nodePath = await createMockVault(tempDir);

      // Save multiple models
      for (let i = 1; i <= 5; i++) {
        const model: Model = {
          name: `model-${i}`,
          version: "1.0.0",
          path: "",
          hash: "",
        };
        await saveModel(nodePath, model);
      }

      // List and verify
      const models = await listModels(nodePath);
      expect(models).toHaveLength(5);
      expect(models.map((m) => m.name)).toEqual([
        "model-1",
        "model-2",
        "model-3",
        "model-4",
        "model-5",
      ]);

      // Check each exists
      for (let i = 1; i <= 5; i++) {
        const exists = await modelExists(nodePath, `model-${i}`);
        expect(exists).toBe(true);
      }
    });
  });
});
