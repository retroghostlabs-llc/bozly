import axios, { AxiosInstance } from "axios";
import { getAPIURL } from "../../../core/port-config.js";
import { ConfigManager } from "../../../core/config-manager.js";

export interface APIError {
  code: string;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any;
}

export class APIClient {
  private client: AxiosInstance;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(baseUrl: string = getAPIURL()) {
    const config = ConfigManager.getInstance().getClient();
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: config.apiTimeoutMs,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Check if API is available
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.get("/health");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Vault operations
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getVaults(): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.getCachedOrFetch("/vaults", async () => {
      const response = await this.client.get("/vaults");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data.data || response.data;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getVault(id: string): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.fetch(`/vaults/${id}`, async () => {
      const response = await this.client.get(`/vaults/${id}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data.data || response.data;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createVault(config: any): Promise<any> {
    const response = await this.client.post("/vaults", config);
    this.invalidateCache("/vaults");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.data.data || response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateVault(id: string, config: any): Promise<any> {
    const response = await this.client.put(`/vaults/${id}`, config);
    this.invalidateCache("/vaults");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.data.data || response.data;
  }

  async deleteVault(id: string): Promise<void> {
    await this.client.delete(`/vaults/${id}`);
    this.invalidateCache("/vaults");
  }

  /**
   * Session operations
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getSessions(vaultId?: string, limit?: number): Promise<any[]> {
    const query = new URLSearchParams();
    if (vaultId) {
      query.append("vaultId", vaultId);
    }
    if (limit) {
      query.append("limit", limit.toString());
    }

    const queryStr = query.toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.fetch(`/sessions?${queryStr}`, async () => {
      const response = await this.client.get(`/sessions?${queryStr}`);
      const data = response.data.data || response.data;
      // Ensure we always return an array
      const result = Array.isArray(data)
        ? data
        : typeof data === "object" && data !== null
          ? Object.values(data)
          : [];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getSession(id: string): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.fetch(`/sessions/${id}`, async () => {
      const response = await this.client.get(`/sessions/${id}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data.data || response.data;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async searchSessions(query: string, filters?: any): Promise<any[]> {
    const response = await this.client.get("/sessions/search", {
      params: { q: query, ...filters },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.data.data || response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async compareSessions(id1: string, id2: string): Promise<any> {
    const response = await this.client.get(`/sessions/${id1}/compare/${id2}`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.data.data || response.data;
  }

  async deleteSession(id: string): Promise<void> {
    await this.client.delete(`/sessions/${id}`);
    this.invalidateCache("/sessions");
  }

  /**
   * Command operations
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getCommands(vaultId?: string): Promise<any[]> {
    const query = vaultId ? `?vaultId=${vaultId}` : "";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.getCachedOrFetch(`/commands${query}`, async () => {
      const response = await this.client.get(`/commands${query}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data.data || response.data;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getCommand(id: string): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.fetch(`/commands/${id}`, async () => {
      const response = await this.client.get(`/commands/${id}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data.data || response.data;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createCommand(command: any): Promise<any> {
    const response = await this.client.post("/commands", command);
    this.invalidateCache("/commands");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.data.data || response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateCommand(id: string, command: any): Promise<any> {
    const response = await this.client.put(`/commands/${id}`, command);
    this.invalidateCache("/commands");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.data.data || response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async runCommand(id: string, args?: any): Promise<any> {
    const response = await this.client.post(`/commands/${id}/run`, { args });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.data.data || response.data;
  }

  async deleteCommand(id: string): Promise<void> {
    await this.client.delete(`/commands/${id}`);
    this.invalidateCache("/commands");
  }

  /**
   * Workflow operations
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getWorkflows(vaultId?: string): Promise<any[]> {
    const query = vaultId ? `?vaultId=${vaultId}` : "";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.getCachedOrFetch(`/workflows${query}`, async () => {
      const response = await this.client.get(`/workflows${query}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data.data || response.data;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getWorkflow(id: string): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.fetch(`/workflows/${id}`, async () => {
      const response = await this.client.get(`/workflows/${id}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data.data || response.data;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createWorkflow(workflow: any): Promise<any> {
    const response = await this.client.post("/workflows", workflow);
    this.invalidateCache("/workflows");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.data.data || response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateWorkflow(id: string, workflow: any): Promise<any> {
    const response = await this.client.put(`/workflows/${id}`, workflow);
    this.invalidateCache("/workflows");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.data.data || response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async runWorkflow(id: string): Promise<any> {
    const response = await this.client.post(`/workflows/${id}/run`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.data.data || response.data;
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.client.delete(`/workflows/${id}`);
    this.invalidateCache("/workflows");
  }

  /**
   * Memory operations
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getMemories(vaultId?: string): Promise<any[]> {
    const query = vaultId ? `?vaultId=${vaultId}` : "";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.getCachedOrFetch(`/memory${query}`, async () => {
      const response = await this.client.get(`/memory${query}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data.data || response.data;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getMemory(id: string): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.fetch(`/memory/${id}`, async () => {
      const response = await this.client.get(`/memory/${id}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data.data || response.data;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async extractMemory(sessions: string[], vaultId?: string): Promise<any> {
    const response = await this.client.post("/memory/extract", { sessions, vaultId });
    this.invalidateCache("/memory");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.data.data || response.data;
  }

  async deleteMemory(id: string): Promise<void> {
    await this.client.delete(`/memory/${id}`);
    this.invalidateCache("/memory");
  }

  /**
   * Config operations
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getConfig(): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.getCachedOrFetch("/config", async () => {
      const response = await this.client.get("/config");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data.data || response.data;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateConfig(config: any): Promise<any> {
    const response = await this.client.put("/config", config);
    this.invalidateCache("/config");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.data.data || response.data;
  }

  /**
   * Health operations
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getHealth(): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.fetch("/health", async () => {
      const response = await this.client.get("/health");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data.data || response.data;
    });
  }

  /**
   * Private helper methods
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getCachedOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cacheTimeout = ConfigManager.getInstance().getClient().apiCacheTimeoutMs;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return Promise.resolve(cached.data as T);
    }

    return fetcher().then((data) => {
      this.cache.set(key, { data, timestamp: Date.now() });
      return data;
    });
  }

  private fetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    return fetcher().then((data) => {
      this.cache.set(key, { data, timestamp: Date.now() });
      return data;
    });
  }

  private invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Error handling helper
   */
  parseError(error: unknown): APIError {
    if (axios.isAxiosError(error)) {
      return {
        code: error.code ?? "UNKNOWN",
        message: error.message,
        details: error.response?.data,
      };
    }

    return {
      code: "UNKNOWN",
      message: String(error),
    };
  }
}
