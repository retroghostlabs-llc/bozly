import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { APIClient } from "@/cli/tui/core/api-client.js";

// Mock axios
vi.mock("axios");

describe("APIClient Comprehensive", () => {
  let mockAxios: {
    create: ReturnType<typeof vi.fn>;
  };
  let mockClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let client: APIClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    vi.mocked(axios.create).mockReturnValue(mockClient as any);
    vi.mocked(axios.isAxiosError).mockReturnValue(false);

    client = new APIClient();
  });

  describe("Constructor", () => {
    it("should initialize with default base URL", () => {
      const newClient = new APIClient();
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: "http://localhost:3000/api",
        })
      );
    });

    it("should initialize with custom base URL", () => {
      new APIClient("http://custom:8000/api");
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: "http://custom:8000/api",
        })
      );
    });

    it("should set correct timeout", () => {
      new APIClient();
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 10000,
        })
      );
    });

    it("should set JSON headers", () => {
      new APIClient();
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
    });
  });

  describe("Health Check", () => {
    it("should return true when API is healthy", async () => {
      mockClient.get.mockResolvedValue({ data: { status: "ok" } });
      const healthy = await client.isHealthy();
      expect(healthy).toBe(true);
      expect(mockClient.get).toHaveBeenCalledWith("/health");
    });

    it("should return false when API is unhealthy", async () => {
      mockClient.get.mockRejectedValue(new Error("Connection failed"));
      const healthy = await client.isHealthy();
      expect(healthy).toBe(false);
    });

    it("should handle network errors gracefully", async () => {
      mockClient.get.mockRejectedValue(new Error("Network error"));
      const healthy = await client.isHealthy();
      expect(healthy).toBe(false);
    });
  });

  describe("Vault Operations", () => {
    describe("getVaults()", () => {
      it("should fetch vaults list", async () => {
        const vaults = [{ id: "1", name: "vault1" }];
        mockClient.get.mockResolvedValue({ data: { data: vaults } });

        const result = await client.getVaults();
        expect(result).toEqual(vaults);
        expect(mockClient.get).toHaveBeenCalledWith("/vaults");
      });

      it("should use cache for subsequent calls", async () => {
        const vaults = [{ id: "1", name: "vault1" }];
        mockClient.get.mockResolvedValue({ data: { data: vaults } });

        await client.getVaults();
        await client.getVaults();

        // Should only call once due to cache
        expect(mockClient.get).toHaveBeenCalledTimes(1);
      });

      it("should handle response without data wrapper", async () => {
        const vaults = [{ id: "1", name: "vault1" }];
        mockClient.get.mockResolvedValue({ data: vaults });

        const result = await client.getVaults();
        expect(result).toEqual(vaults);
      });
    });

    describe("getVault()", () => {
      it("should fetch single vault", async () => {
        const vault = { id: "1", name: "vault1" };
        mockClient.get.mockResolvedValue({ data: { data: vault } });

        const result = await client.getVault("1");
        expect(result).toEqual(vault);
        expect(mockClient.get).toHaveBeenCalledWith("/vaults/1");
      });

      it("should not cache single vault calls", async () => {
        const vault = { id: "1", name: "vault1" };
        mockClient.get.mockResolvedValue({ data: { data: vault } });

        await client.getVault("1");
        await client.getVault("1");

        // Should call twice (no cache for single fetches)
        expect(mockClient.get).toHaveBeenCalledTimes(2);
      });
    });

    describe("createVault()", () => {
      it("should create new vault", async () => {
        const vault = { id: "new", name: "new-vault" };
        mockClient.post.mockResolvedValue({ data: { data: vault } });

        const result = await client.createVault({ name: "new-vault" });
        expect(result).toEqual(vault);
        expect(mockClient.post).toHaveBeenCalledWith("/vaults", {
          name: "new-vault",
        });
      });

      it("should invalidate vaults cache on create", async () => {
        const vault = { id: "new", name: "new-vault" };
        mockClient.post.mockResolvedValue({ data: { data: vault } });
        mockClient.get.mockResolvedValue({ data: { data: [vault] } });

        // Populate cache
        await client.getVaults();
        const cacheFillCalls = mockClient.get.mock.calls.length;

        // Create new vault (should invalidate cache)
        await client.createVault({ name: "new-vault" });

        // Next getVaults should refetch
        await client.getVaults();
        expect(mockClient.get.mock.calls.length).toBeGreaterThan(
          cacheFillCalls
        );
      });
    });

    describe("updateVault()", () => {
      it("should update vault", async () => {
        const updated = { id: "1", name: "updated" };
        mockClient.put.mockResolvedValue({ data: { data: updated } });

        const result = await client.updateVault("1", { name: "updated" });
        expect(result).toEqual(updated);
        expect(mockClient.put).toHaveBeenCalledWith("/vaults/1", {
          name: "updated",
        });
      });

      it("should invalidate cache on update", async () => {
        mockClient.get.mockResolvedValue({ data: { data: [] } });
        mockClient.put.mockResolvedValue({ data: { data: {} } });

        await client.getVaults();
        const initialCalls = mockClient.get.mock.calls.length;

        await client.updateVault("1", {});
        await client.getVaults();

        expect(mockClient.get.mock.calls.length).toBeGreaterThan(initialCalls);
      });
    });

    describe("deleteVault()", () => {
      it("should delete vault", async () => {
        mockClient.delete.mockResolvedValue({});

        await expect(client.deleteVault("1")).resolves.toBeUndefined();
        expect(mockClient.delete).toHaveBeenCalledWith("/vaults/1");
      });

      it("should invalidate cache on delete", async () => {
        mockClient.get.mockResolvedValue({ data: { data: [] } });
        mockClient.delete.mockResolvedValue({});

        await client.getVaults();
        await client.deleteVault("1");
        await client.getVaults();

        expect(mockClient.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Session Operations", () => {
    describe("getSessions()", () => {
      it("should fetch sessions", async () => {
        const sessions = [{ id: "1", command: "test" }];
        mockClient.get.mockResolvedValue({ data: { data: sessions } });

        const result = await client.getSessions();
        expect(result).toEqual(sessions);
        expect(mockClient.get).toHaveBeenCalledWith("/sessions?");
      });

      it("should filter by vaultId", async () => {
        const sessions = [{ id: "1" }];
        mockClient.get.mockResolvedValue({ data: { data: sessions } });

        await client.getSessions("vault1");
        expect(mockClient.get).toHaveBeenCalledWith(
          expect.stringContaining("vaultId=vault1")
        );
      });

      it("should apply limit", async () => {
        const sessions = [{ id: "1" }];
        mockClient.get.mockResolvedValue({ data: { data: sessions } });

        await client.getSessions(undefined, 10);
        expect(mockClient.get).toHaveBeenCalledWith(
          expect.stringContaining("limit=10")
        );
      });
    });

    describe("getSession()", () => {
      it("should fetch single session", async () => {
        const session = { id: "1", command: "test" };
        mockClient.get.mockResolvedValue({ data: { data: session } });

        const result = await client.getSession("1");
        expect(result).toEqual(session);
        expect(mockClient.get).toHaveBeenCalledWith("/sessions/1");
      });
    });

    describe("searchSessions()", () => {
      it("should search sessions", async () => {
        const results = [{ id: "1", command: "test" }];
        mockClient.get.mockResolvedValue({ data: { data: results } });

        const found = await client.searchSessions("query");
        expect(found).toEqual(results);
        expect(mockClient.get).toHaveBeenCalledWith("/sessions/search", {
          params: { q: "query" },
        });
      });

      it("should support search filters", async () => {
        mockClient.get.mockResolvedValue({ data: { data: [] } });

        await client.searchSessions("query", { status: "success" });
        expect(mockClient.get).toHaveBeenCalledWith("/sessions/search", {
          params: { q: "query", status: "success" },
        });
      });
    });

    describe("compareSessions()", () => {
      it("should compare two sessions", async () => {
        const comparison = { differences: [] };
        mockClient.get.mockResolvedValue({ data: { data: comparison } });

        const result = await client.compareSessions("1", "2");
        expect(result).toEqual(comparison);
        expect(mockClient.get).toHaveBeenCalledWith("/sessions/1/compare/2");
      });
    });

    describe("deleteSession()", () => {
      it("should delete session", async () => {
        mockClient.delete.mockResolvedValue({});

        await client.deleteSession("1");
        expect(mockClient.delete).toHaveBeenCalledWith("/sessions/1");
      });
    });
  });

  describe("Command Operations", () => {
    describe("getCommands()", () => {
      it("should fetch commands", async () => {
        const commands = [{ id: "1", name: "test" }];
        mockClient.get.mockResolvedValue({ data: { data: commands } });

        const result = await client.getCommands();
        expect(result).toEqual(commands);
        expect(mockClient.get).toHaveBeenCalledWith("/commands");
      });

      it("should filter by vaultId", async () => {
        mockClient.get.mockResolvedValue({ data: { data: [] } });

        await client.getCommands("vault1");
        expect(mockClient.get).toHaveBeenCalledWith(
          "/commands?vaultId=vault1"
        );
      });
    });

    describe("getCommand()", () => {
      it("should fetch single command", async () => {
        const command = { id: "1", name: "test" };
        mockClient.get.mockResolvedValue({ data: { data: command } });

        const result = await client.getCommand("1");
        expect(result).toEqual(command);
      });
    });

    describe("createCommand()", () => {
      it("should create command", async () => {
        const command = { id: "new", name: "test" };
        mockClient.post.mockResolvedValue({ data: { data: command } });

        const result = await client.createCommand({ name: "test" });
        expect(result).toEqual(command);
        expect(mockClient.post).toHaveBeenCalledWith("/commands", {
          name: "test",
        });
      });
    });

    describe("updateCommand()", () => {
      it("should update command", async () => {
        const updated = { id: "1", name: "updated" };
        mockClient.put.mockResolvedValue({ data: { data: updated } });

        const result = await client.updateCommand("1", { name: "updated" });
        expect(result).toEqual(updated);
      });
    });

    describe("runCommand()", () => {
      it("should run command", async () => {
        const result = { status: "success" };
        mockClient.post.mockResolvedValue({ data: { data: result } });

        const output = await client.runCommand("1", { arg: "value" });
        expect(output).toEqual(result);
        expect(mockClient.post).toHaveBeenCalledWith("/commands/1/run", {
          args: { arg: "value" },
        });
      });
    });

    describe("deleteCommand()", () => {
      it("should delete command", async () => {
        mockClient.delete.mockResolvedValue({});

        await client.deleteCommand("1");
        expect(mockClient.delete).toHaveBeenCalledWith("/commands/1");
      });
    });
  });

  describe("Workflow Operations", () => {
    describe("getWorkflows()", () => {
      it("should fetch workflows", async () => {
        const workflows = [{ id: "1", name: "test" }];
        mockClient.get.mockResolvedValue({ data: { data: workflows } });

        const result = await client.getWorkflows();
        expect(result).toEqual(workflows);
      });
    });

    describe("getWorkflow()", () => {
      it("should fetch single workflow", async () => {
        const workflow = { id: "1", name: "test" };
        mockClient.get.mockResolvedValue({ data: { data: workflow } });

        const result = await client.getWorkflow("1");
        expect(result).toEqual(workflow);
      });
    });

    describe("createWorkflow()", () => {
      it("should create workflow", async () => {
        const workflow = { id: "new", name: "test" };
        mockClient.post.mockResolvedValue({ data: { data: workflow } });

        const result = await client.createWorkflow({ name: "test" });
        expect(result).toEqual(workflow);
      });
    });

    describe("updateWorkflow()", () => {
      it("should update workflow", async () => {
        const updated = { id: "1", name: "updated" };
        mockClient.put.mockResolvedValue({ data: { data: updated } });

        const result = await client.updateWorkflow("1", { name: "updated" });
        expect(result).toEqual(updated);
      });
    });

    describe("runWorkflow()", () => {
      it("should run workflow", async () => {
        const result = { status: "success" };
        mockClient.post.mockResolvedValue({ data: { data: result } });

        const output = await client.runWorkflow("1");
        expect(output).toEqual(result);
        expect(mockClient.post).toHaveBeenCalledWith("/workflows/1/run");
      });
    });

    describe("deleteWorkflow()", () => {
      it("should delete workflow", async () => {
        mockClient.delete.mockResolvedValue({});

        await client.deleteWorkflow("1");
        expect(mockClient.delete).toHaveBeenCalledWith("/workflows/1");
      });
    });
  });

  describe("Memory Operations", () => {
    describe("getMemories()", () => {
      it("should fetch memories", async () => {
        const memories = [{ id: "1", content: "test" }];
        mockClient.get.mockResolvedValue({ data: { data: memories } });

        const result = await client.getMemories();
        expect(result).toEqual(memories);
      });
    });

    describe("getMemory()", () => {
      it("should fetch single memory", async () => {
        const memory = { id: "1", content: "test" };
        mockClient.get.mockResolvedValue({ data: { data: memory } });

        const result = await client.getMemory("1");
        expect(result).toEqual(memory);
      });
    });

    describe("extractMemory()", () => {
      it("should extract memory from sessions", async () => {
        const extracted = { id: "new", content: "summary" };
        mockClient.post.mockResolvedValue({ data: { data: extracted } });

        const result = await client.extractMemory(["session1", "session2"]);
        expect(result).toEqual(extracted);
        expect(mockClient.post).toHaveBeenCalledWith("/memory/extract", {
          sessions: ["session1", "session2"],
        });
      });

      it("should support vaultId parameter", async () => {
        mockClient.post.mockResolvedValue({ data: { data: {} } });

        await client.extractMemory(["session1"], "vault1");
        expect(mockClient.post).toHaveBeenCalledWith("/memory/extract", {
          sessions: ["session1"],
          vaultId: "vault1",
        });
      });
    });

    describe("deleteMemory()", () => {
      it("should delete memory", async () => {
        mockClient.delete.mockResolvedValue({});

        await client.deleteMemory("1");
        expect(mockClient.delete).toHaveBeenCalledWith("/memory/1");
      });
    });
  });

  describe("Config Operations", () => {
    describe("getConfig()", () => {
      it("should fetch config", async () => {
        const config = { setting: "value" };
        mockClient.get.mockResolvedValue({ data: { data: config } });

        const result = await client.getConfig();
        expect(result).toEqual(config);
      });

      it("should cache config", async () => {
        const config = { setting: "value" };
        mockClient.get.mockResolvedValue({ data: { data: config } });

        await client.getConfig();
        await client.getConfig();

        expect(mockClient.get).toHaveBeenCalledTimes(1);
      });
    });

    describe("updateConfig()", () => {
      it("should update config", async () => {
        const updated = { setting: "new-value" };
        mockClient.put.mockResolvedValue({ data: { data: updated } });

        const result = await client.updateConfig(updated);
        expect(result).toEqual(updated);
        expect(mockClient.put).toHaveBeenCalledWith("/config", updated);
      });
    });
  });

  describe("Health Operations", () => {
    describe("getHealth()", () => {
      it("should fetch health status", async () => {
        const health = { status: "healthy", uptime: 3600 };
        mockClient.get.mockResolvedValue({ data: { data: health } });

        const result = await client.getHealth();
        expect(result).toEqual(health);
        expect(mockClient.get).toHaveBeenCalledWith("/health");
      });
    });
  });

  describe("Caching", () => {
    it("should use cache for subsequent calls within timeout", async () => {
      const data = [{ id: "1" }];
      mockClient.get.mockResolvedValue({ data: { data } });

      await client.getVaults();
      await client.getVaults();

      expect(mockClient.get).toHaveBeenCalledTimes(1);
    });

    it("should invalidate cache after timeout", async () => {
      vi.useFakeTimers();
      const data = [{ id: "1" }];
      mockClient.get.mockResolvedValue({ data: { data } });

      await client.getVaults();
      expect(mockClient.get).toHaveBeenCalledTimes(1);

      // Advance time beyond cache timeout (5000ms)
      vi.advanceTimersByTime(6000);

      await client.getVaults();
      expect(mockClient.get).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it("should invalidate matching patterns", async () => {
      mockClient.get.mockResolvedValue({ data: { data: [] } });
      mockClient.post.mockResolvedValue({ data: { data: {} } });
      mockClient.delete.mockResolvedValue({});

      // Fill cache
      await client.getVaults();
      const calls1 = mockClient.get.mock.calls.length;

      // Delete vault should invalidate /vaults pattern
      await client.deleteVault("1");

      // Next getVaults should refetch
      await client.getVaults();
      expect(mockClient.get.mock.calls.length).toBeGreaterThan(calls1);
    });
  });

  describe("Error Handling", () => {
    describe("parseError()", () => {
      it("should parse axios errors", () => {
        const error = new Error("Network error");
        vi.mocked(axios.isAxiosError).mockReturnValue(true);

        const parsed = client.parseError(error);
        expect(parsed.code).toBe("UNKNOWN");
        expect(parsed.message).toContain("Network error");
      });

      it("should handle non-axios errors", () => {
        const error = new Error("Generic error");
        vi.mocked(axios.isAxiosError).mockReturnValue(false);

        const parsed = client.parseError(error);
        expect(parsed.code).toBe("UNKNOWN");
        expect(parsed.message).toContain("Generic error");
      });

      it("should extract error details from response", () => {
        const error = {
          code: "ERR_404",
          message: "Not found",
          response: { data: { reason: "Resource not found" } },
        };
        vi.mocked(axios.isAxiosError).mockReturnValue(true);

        const parsed = client.parseError(error as any);
        expect(parsed.code).toBe("ERR_404");
        expect(parsed.details).toEqual({ reason: "Resource not found" });
      });
    });
  });

  describe("Integration", () => {
    it("should handle CRUD operations", async () => {
      const newItem = { id: "new", name: "test" };
      const updated = { id: "new", name: "updated" };

      mockClient.post.mockResolvedValue({ data: { data: newItem } });
      mockClient.get.mockResolvedValue({ data: { data: newItem } });
      mockClient.put.mockResolvedValue({ data: { data: updated } });
      mockClient.delete.mockResolvedValue({});

      // Create
      const created = await client.createVault({ name: "test" });
      expect(created).toEqual(newItem);

      // Read
      const read = await client.getVault("new");
      expect(read).toEqual(newItem);

      // Update
      const updated2 = await client.updateVault("new", { name: "updated" });
      expect(updated2).toEqual(updated);

      // Delete
      await expect(client.deleteVault("new")).resolves.toBeUndefined();
    });
  });
});
