/**
 * Tests for Versions Module (Pattern 4)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  parseSemVer,
  compareVersions,
  getVersionDifference,
  computeHash,
  loadVersionHistory,
  saveVersionHistory,
  trackFileVersion,
  trackModelVersion,
  getVersionInfo,
  isVersionCompatible,
  getFrameworkVersion,
  formatVersionInfo,
  getFileVersionHistory,
  getModelVersionHistory,
  hasFileChanged,
  incrementVersion,
} from "../../dist/core/versions.js";
import type {
  VaultVersionHistory,
  ModelVersionInfo,
  VersionEntry,
} from "../../dist/core/versions.js";
import type { Model } from "../../dist/core/types.js";

// Test utilities
let testDir: string;

beforeEach(async () => {
  testDir = path.join(os.tmpdir(), `bozly-test-versions-${Date.now()}`);
  await fs.mkdir(path.join(testDir, ".bozly"), { recursive: true });
});

afterEach(async () => {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

describe("Semantic Version Parsing", () => {
  it("should parse valid semantic version", () => {
    const parsed = parseSemVer("1.2.3");
    expect(parsed.major).toBe(1);
    expect(parsed.minor).toBe(2);
    expect(parsed.patch).toBe(3);
    expect(parsed.prerelease).toBeUndefined();
  });

  it("should parse semantic version with prerelease", () => {
    const parsed = parseSemVer("1.0.0-alpha.1");
    expect(parsed.major).toBe(1);
    expect(parsed.minor).toBe(0);
    expect(parsed.patch).toBe(0);
    expect(parsed.prerelease).toBe("alpha.1");
  });

  it("should throw on invalid version", () => {
    expect(() => parseSemVer("invalid")).toThrow();
    expect(() => parseSemVer("1.2")).toThrow();
    expect(() => parseSemVer("1.2.3.4")).toThrow();
  });
});

describe("Version Comparison", () => {
  it("should return -1 when first version is less", () => {
    expect(compareVersions("1.0.0", "2.0.0")).toBe(-1);
    expect(compareVersions("1.0.0", "1.1.0")).toBe(-1);
    expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
  });

  it("should return 0 when versions are equal", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
    expect(compareVersions("0.0.0", "0.0.0")).toBe(0);
  });

  it("should return 1 when first version is greater", () => {
    expect(compareVersions("2.0.0", "1.0.0")).toBe(1);
    expect(compareVersions("1.1.0", "1.0.0")).toBe(1);
    expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
  });

  it("should handle prerelease versions correctly", () => {
    expect(compareVersions("1.0.0-alpha", "1.0.0")).toBe(-1);
    expect(compareVersions("1.0.0", "1.0.0-beta")).toBe(1);
    expect(compareVersions("1.0.0-alpha", "1.0.0-beta")).toBe(-1);
  });
});

describe("Version Difference Detection", () => {
  it("should detect major version change", () => {
    expect(getVersionDifference("1.0.0", "2.0.0")).toBe("major");
  });

  it("should detect minor version change", () => {
    expect(getVersionDifference("1.0.0", "1.1.0")).toBe("minor");
  });

  it("should detect patch version change", () => {
    expect(getVersionDifference("1.0.0", "1.0.1")).toBe("patch");
  });

  it("should detect equal versions", () => {
    expect(getVersionDifference("1.0.0", "1.0.0")).toBe("equal");
  });
});

describe("Hash Computation", () => {
  it("should compute hash for content", () => {
    const hash1 = computeHash("test content");
    const hash2 = computeHash("test content");
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA256 produces 64 hex characters
  });

  it("should produce different hashes for different content", () => {
    const hash1 = computeHash("content 1");
    const hash2 = computeHash("content 2");
    expect(hash1).not.toBe(hash2);
  });
});

describe("Version History Management", () => {
  it("should save and load version history", async () => {
    const history: VaultVersionHistory = {
      nodeId: "test-vault",
      vaultVersion: "0.1.0",
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      frameworkVersion: "0.3.0",
      files: [],
      models: [],
    };

    await saveVersionHistory(testDir, history);
    const loaded = await loadVersionHistory(testDir);

    expect(loaded).toBeDefined();
    expect(loaded?.nodeId).toBe("test-vault");
    expect(loaded?.vaultVersion).toBe("0.1.0");
  });

  it("should return undefined for non-existent version file", async () => {
    const loaded = await loadVersionHistory(testDir);
    expect(loaded).toBeUndefined();
  });

  it("should track file version", async () => {
    const fileContent = "test context file";
    await trackFileVersion(testDir, "context.md", fileContent);

    const history = await loadVersionHistory(testDir);
    expect(history).toBeDefined();
    expect(history?.files.length).toBe(1);
    expect(history?.files[0].file).toBe("context.md");
    expect(history?.files[0].hash).toBe(computeHash(fileContent));
  });

  it("should update existing file entry", async () => {
    await trackFileVersion(testDir, "context.md", "version 1");
    await trackFileVersion(testDir, "context.md", "version 2");

    const history = await loadVersionHistory(testDir);
    expect(history?.files.length).toBe(1); // Should update, not add
    expect(history?.files[0].hash).toBe(computeHash("version 2"));
  });

  it("should track multiple files", async () => {
    await trackFileVersion(testDir, "context.md", "context");
    await trackFileVersion(testDir, "commands/daily.md", "command");

    const history = await loadVersionHistory(testDir);
    expect(history?.files.length).toBe(2);
  });

  it("should track file with semantic version and changes", async () => {
    const changes = ["Added new dimension", "Updated description"];
    await trackFileVersion(testDir, "models/triple-score.yaml", "content", "1.1.0", changes);

    const history = await loadVersionHistory(testDir);
    const entry = history?.files[0];
    expect(entry?.version).toBe("1.1.0");
    expect(entry?.changes).toEqual(changes);
  });
});

describe("Model Version Tracking", () => {
  it("should track model version", async () => {
    const model: Model = {
      name: "test-model",
      version: "1.0.0",
      description: "Test model",
      path: "/test/path",
      changelog: [
        {
          version: "1.0.0",
          date: new Date().toISOString().split("T")[0],
          changes: ["Initial release"],
        },
      ],
    };

    await trackModelVersion(testDir, model);

    const history = await loadVersionHistory(testDir);
    expect(history?.models.length).toBe(1);
    expect(history?.models[0].name).toBe("test-model");
    expect(history?.models[0].currentVersion).toBe("1.0.0");
  });

  it("should update model version", async () => {
    const model1: Model = {
      name: "test-model",
      version: "1.0.0",
      path: "/test/path",
    };

    const model2: Model = {
      name: "test-model",
      version: "1.1.0",
      path: "/test/path",
      changelog: [
        {
          version: "1.1.0",
          date: new Date().toISOString().split("T")[0],
          changes: ["Bug fix"],
        },
      ],
    };

    await trackModelVersion(testDir, model1);
    // Small delay to ensure timestamp changes
    await new Promise((resolve) => setTimeout(resolve, 10));
    await trackModelVersion(testDir, model2);

    const history = await loadVersionHistory(testDir);
    expect(history?.models.length).toBe(1); // Updated, not added
    expect(history?.models[0].currentVersion).toBe("1.1.0");
  });
});

describe("Version Information Retrieval", () => {
  it("should get version info for vault", async () => {
    await trackFileVersion(testDir, "context.md", "content");
    const info = await getVersionInfo(testDir);

    expect(info).toBeDefined();
    expect(info?.nodeId).toBeDefined();
    expect(info?.files.length).toBe(1);
  });

  it("should get file version history", async () => {
    await trackFileVersion(testDir, "context.md", "version 1");
    await trackFileVersion(testDir, "context.md", "version 2");

    const fileHistory = await getFileVersionHistory(testDir, "context.md");
    expect(fileHistory.length).toBe(1); // Latest entry overwrites
  });

  it("should get model version history", async () => {
    const model: Model = {
      name: "test-model",
      version: "1.0.0",
      path: "/test/path",
    };

    await trackModelVersion(testDir, model);
    const modelHistory = await getModelVersionHistory(testDir, "test-model");

    expect(modelHistory).toBeDefined();
    expect(modelHistory?.currentVersion).toBe("1.0.0");
  });

  it("should return undefined for non-existent model", async () => {
    const modelHistory = await getModelVersionHistory(testDir, "non-existent");
    expect(modelHistory).toBeUndefined();
  });
});

describe("File Change Detection", () => {
  it("should detect file has changed", async () => {
    await trackFileVersion(testDir, "context.md", "original content");

    const hasChanged = await hasFileChanged(
      testDir,
      "context.md",
      computeHash("modified content")
    );
    expect(hasChanged).toBe(true);
  });

  it("should detect file has not changed", async () => {
    const content = "original content";
    const hash = computeHash(content);
    await trackFileVersion(testDir, "context.md", content);

    const hasChanged = await hasFileChanged(testDir, "context.md", hash);
    expect(hasChanged).toBe(false);
  });

  it("should detect new file as changed", async () => {
    const hasChanged = await hasFileChanged(
      testDir,
      "new-file.md",
      computeHash("content")
    );
    expect(hasChanged).toBe(true);
  });
});

describe("Version Compatibility", () => {
  it("should check version compatibility", () => {
    expect(isVersionCompatible("2.0.0", "1.0.0")).toBe(true);
    expect(isVersionCompatible("1.0.0", "1.0.0")).toBe(true);
    expect(isVersionCompatible("0.5.0", "1.0.0")).toBe(false);
  });
});

describe("Framework Version Information", () => {
  it("should get framework version info", () => {
    const info = getFrameworkVersion();

    expect(info.bozlyVersion).toBe("0.3.0-alpha.1");
    expect(info.nodeVersion).toBeDefined();
    expect(info.platform).toBeDefined();
  });
});

describe("Version Formatting", () => {
  it("should format version info for display", async () => {
    await trackFileVersion(testDir, "context.md", "content");
    const history = await getVersionInfo(testDir);

    if (history) {
      const formatted = formatVersionInfo(history);
      expect(formatted).toContain("Vault Version");
      expect(formatted).toContain("Framework Version");
      expect(formatted).toContain("context.md");
    }
  });

  it("should format version with changes", async () => {
    const changes = ["Updated dimensions", "Fixed scoring logic"];
    await trackFileVersion(testDir, "models/model.yaml", "content", "1.1.0", changes);
    const history = await getVersionInfo(testDir);

    if (history) {
      const formatted = formatVersionInfo(history);
      expect(formatted).toContain("Updated dimensions");
      expect(formatted).toContain("Fixed scoring logic");
    }
  });
});

describe("Version Increment", () => {
  it("should increment major version", () => {
    const next = incrementVersion("1.2.3", "major");
    expect(next).toBe("2.0.0");
  });

  it("should increment minor version", () => {
    const next = incrementVersion("1.2.3", "minor");
    expect(next).toBe("1.3.0");
  });

  it("should increment patch version", () => {
    const next = incrementVersion("1.2.3", "patch");
    expect(next).toBe("1.2.4");
  });

  it("should reset minor/patch on major bump", () => {
    const next = incrementVersion("1.5.7", "major");
    expect(next).toBe("2.0.0");
  });

  it("should reset patch on minor bump", () => {
    const next = incrementVersion("1.5.7", "minor");
    expect(next).toBe("1.6.0");
  });
});

describe("Integration Tests", () => {
  it("should manage complete vault version lifecycle", async () => {
    // Initial setup
    const model: Model = {
      name: "scoring",
      version: "1.0.0",
      description: "Scoring model",
      path: "/path/to/model",
    };

    // Track versions
    await trackModelVersion(testDir, model);
    await trackFileVersion(testDir, "context.md", "initial context");

    // Verify tracking
    const history1 = await getVersionInfo(testDir);
    expect(history1?.models.length).toBe(1);
    expect(history1?.files.length).toBe(1);

    // Update model
    const updatedModel: Model = {
      ...model,
      version: "1.1.0",
      changelog: [
        {
          version: "1.1.0",
          date: new Date().toISOString().split("T")[0],
          changes: ["Added new dimension"],
        },
      ],
    };

    await trackModelVersion(testDir, updatedModel);

    // Small delay to ensure timestamp changes
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify update
    const history2 = await getVersionInfo(testDir);
    expect(history2?.models[0].currentVersion).toBe("1.1.0");
    // lastUpdated should be updated (compare as dates to avoid millisecond issues)
    if (history1 && history2) {
      expect(new Date(history2.lastUpdated).getTime()).toBeGreaterThanOrEqual(
        new Date(history1.lastUpdated).getTime()
      );
    }
  });

  it("should handle multiple models and files", async () => {
    // Add multiple models
    const models: Model[] = [
      {
        name: "model1",
        version: "1.0.0",
        path: "/path/1",
      },
      {
        name: "model2",
        version: "2.0.0",
        path: "/path/2",
      },
      {
        name: "model3",
        version: "1.5.0",
        path: "/path/3",
      },
    ];

    for (const model of models) {
      await trackModelVersion(testDir, model);
    }

    // Add multiple files
    await trackFileVersion(testDir, "context.md", "context");
    await trackFileVersion(testDir, "commands/daily.md", "command1");
    await trackFileVersion(testDir, "commands/weekly.md", "command2");

    // Verify
    const history = await getVersionInfo(testDir);
    expect(history?.models.length).toBe(3);
    expect(history?.files.length).toBe(3);
  });
});
