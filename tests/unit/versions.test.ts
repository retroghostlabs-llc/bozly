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
      nodeVersion: "0.1.0",
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
    expect(loaded?.nodeVersion).toBe("0.1.0");
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

    expect(info.bozlyVersion).toBe("0.3.0-rc.1");
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

describe("Edge Cases - Semantic Version Parsing", () => {
  it("should parse version with leading zeros", () => {
    const parsed = parseSemVer("0.0.1");
    expect(parsed.major).toBe(0);
    expect(parsed.minor).toBe(0);
    expect(parsed.patch).toBe(1);
  });

  it("should parse large version numbers", () => {
    const parsed = parseSemVer("99.99.99");
    expect(parsed.major).toBe(99);
    expect(parsed.minor).toBe(99);
    expect(parsed.patch).toBe(99);
  });

  it("should parse complex prerelease versions", () => {
    const parsed = parseSemVer("1.0.0-alpha.1.2.3");
    expect(parsed.prerelease).toBe("alpha.1.2.3");
  });

  it("should parse beta and rc versions", () => {
    expect(parseSemVer("1.0.0-beta").prerelease).toBe("beta");
    expect(parseSemVer("1.0.0-rc.1").prerelease).toBe("rc.1");
  });

  it("should throw on versions with invalid characters", () => {
    expect(() => parseSemVer("1.0.0@")).toThrow();
    expect(() => parseSemVer("1.0.0-")).toThrow();
  });
});

describe("Edge Cases - Version Comparison", () => {
  it("should handle prerelease version ordering", () => {
    expect(compareVersions("1.0.0-alpha.1", "1.0.0-alpha.2")).toBe(-1);
    expect(compareVersions("1.0.0-rc.2", "1.0.0-rc.1")).toBe(1);
  });

  it("should compare versions with large numbers", () => {
    expect(compareVersions("10.0.0", "9.99.99")).toBe(1);
    expect(compareVersions("9.99.99", "10.0.0")).toBe(-1);
  });
});

describe("Edge Cases - Hash Computation", () => {
  it("should handle empty string content", () => {
    const hash = computeHash("");
    expect(hash.length).toBe(64);
    expect(typeof hash).toBe("string");
  });

  it("should handle very large content", () => {
    const largeContent = "x".repeat(10000);
    const hash = computeHash(largeContent);
    expect(hash.length).toBe(64);
  });

  it("should handle special characters in content", () => {
    const specialContent = "!@#$%^&*()_+-={}[]|:;<>?,./";
    const hash = computeHash(specialContent);
    expect(hash.length).toBe(64);
  });

  it("should handle unicode content", () => {
    const unicodeContent = "Hello 世界 🌍";
    const hash = computeHash(unicodeContent);
    expect(hash.length).toBe(64);
  });
});

describe("Edge Cases - File Tracking", () => {
  it("should track file with empty changes array", async () => {
    await trackFileVersion(testDir, "file.md", "content", "1.0.0", []);
    const history = await loadVersionHistory(testDir);
    expect(history?.files[0].changes).toEqual([]);
  });

  it("should track file with many changes", async () => {
    const changes = Array.from({ length: 50 }, (_, i) => `Change ${i + 1}`);
    await trackFileVersion(testDir, "file.md", "content", "1.0.0", changes);
    const history = await loadVersionHistory(testDir);
    expect(history?.files[0].changes?.length).toBe(50);
  });

  it("should update file timestamp on modification", async () => {
    await trackFileVersion(testDir, "file.md", "version 1");
    const history1 = await loadVersionHistory(testDir);
    const timestamp1 = history1?.files[0].timestamp;

    await new Promise((resolve) => setTimeout(resolve, 10));

    await trackFileVersion(testDir, "file.md", "version 2");
    const history2 = await loadVersionHistory(testDir);
    const timestamp2 = history2?.files[0].timestamp;

    expect(timestamp2).not.toBe(timestamp1);
  });

  it("should handle files with path separators", async () => {
    await trackFileVersion(testDir, "models/v1/scoring/model.yaml", "content");
    const history = await loadVersionHistory(testDir);
    expect(history?.files[0].file).toBe("models/v1/scoring/model.yaml");
  });
});

describe("Edge Cases - Model Tracking", () => {
  it("should track model with hash in object", async () => {
    const model: Model = {
      name: "test",
      version: "1.0.0",
      path: "/test",
      hash: "abc123def456",
    };
    await trackModelVersion(testDir, model);
    const history = await loadVersionHistory(testDir);
    expect(history?.models[0].hash).toBe("abc123def456");
  });

  it("should compute hash for model without explicit hash", async () => {
    const model: Model = {
      name: "test",
      version: "1.0.0",
      path: "/test",
    };
    await trackModelVersion(testDir, model);
    const history = await loadVersionHistory(testDir);
    expect(history?.models[0].hash.length).toBe(64);
  });

  it("should track model changelog with multiple versions", async () => {
    const model: Model = {
      name: "test",
      version: "2.0.0",
      path: "/test",
      changelog: [
        {
          version: "1.0.0",
          date: "2025-01-01",
          changes: ["Initial release"],
        },
        {
          version: "2.0.0",
          date: "2025-12-25",
          changes: ["Major refactor", "New features"],
        },
      ],
    };
    await trackModelVersion(testDir, model);
    const history = await loadVersionHistory(testDir);
    expect(history?.models[0].changelog?.length).toBe(2);
  });
});

describe("Edge Cases - File Change Detection", () => {
  it("should handle hash comparison with non-existent file", async () => {
    const hasChanged = await hasFileChanged(
      testDir,
      "nonexistent.md",
      computeHash("content")
    );
    expect(hasChanged).toBe(true);
  });

  it("should handle empty content hash", async () => {
    const emptyHash = computeHash("");
    await trackFileVersion(testDir, "file.md", "");

    const hasChanged = await hasFileChanged(testDir, "file.md", emptyHash);
    expect(hasChanged).toBe(false);
  });
});

describe("Edge Cases - Version Compatibility", () => {
  it("should handle prerelease compatibility checks", () => {
    expect(isVersionCompatible("1.0.0-alpha", "1.0.0-beta")).toBe(false);
    expect(isVersionCompatible("1.0.0", "1.0.0-alpha")).toBe(true);
  });

  it("should handle edge case versions", () => {
    expect(isVersionCompatible("0.0.1", "0.0.0")).toBe(true);
    expect(isVersionCompatible("0.0.0", "0.0.1")).toBe(false);
  });
});

describe("Edge Cases - Version Formatting", () => {
  it("should format empty version history", async () => {
    const history: VaultVersionHistory = {
      nodeId: "test",
      nodeVersion: "1.0.0",
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      frameworkVersion: "0.3.0",
      files: [],
      models: [],
    };

    const formatted = formatVersionInfo(history);
    expect(formatted).toContain("Vault Version");
    expect(formatted).not.toContain("File Versions:");
  });

  it("should format version with many file entries", async () => {
    for (let i = 0; i < 10; i++) {
      await trackFileVersion(testDir, `file${i}.md`, `content ${i}`);
    }
    const history = await getVersionInfo(testDir);

    if (history) {
      const formatted = formatVersionInfo(history);
      expect(formatted).toContain("File Versions:");
      for (let i = 0; i < 10; i++) {
        expect(formatted).toContain(`file${i}.md`);
      }
    }
  });

  it("should format model with no changelog", async () => {
    const model: Model = {
      name: "test",
      version: "1.0.0",
      path: "/test",
    };
    await trackModelVersion(testDir, model);
    const history = await getVersionInfo(testDir);

    if (history) {
      const formatted = formatVersionInfo(history);
      expect(formatted).toContain("Model Versions:");
      expect(formatted).toContain("test");
    }
  });
});

describe("Edge Cases - Version Increment", () => {
  it("should increment from 0.0.0", () => {
    expect(incrementVersion("0.0.0", "patch")).toBe("0.0.1");
    expect(incrementVersion("0.0.0", "minor")).toBe("0.1.0");
    expect(incrementVersion("0.0.0", "major")).toBe("1.0.0");
  });

  it("should increment large version numbers", () => {
    expect(incrementVersion("99.99.99", "patch")).toBe("99.99.100");
    expect(incrementVersion("99.99.99", "minor")).toBe("99.100.0");
    expect(incrementVersion("99.99.99", "major")).toBe("100.0.0");
  });
});
