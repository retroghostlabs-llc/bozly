/**
 * BOZLY Dashboard App
 * Client-side SPA for vault browsing
 */

class BozlyApp {
  constructor() {
    this.currentPage = 'dashboard';
    this.vaults = [];
    this.sessions = {};
    this.currentVault = null;
    this.currentSession = null;
    this.sessionPage = 1;
    this.sessionPageSize = 20;
    // New pages data
    this.memories = [];
    this.workflows = [];
    this.config = {};
    this.health = {};
    this.logs = [];
    this.logsFilter = 'ALL'; // ALL, INFO, DEBUG, ERROR
    // Memory management data
    this.cacheStats = null;
    this.archiveStats = null;
    this.archivedMemories = [];
    this.memoryView = 'dashboard'; // 'dashboard' or 'archive'
    this.restoreMode = 'all';
  }

  async init() {
    // Load initial data
    await this.loadVaults();
    this.setupRouting();
    this.render();
  }

  async loadVaults() {
    try {
      const response = await fetch('/api/vaults');
      const result = await response.json();
      if (result.success) {
        this.vaults = result.data;
      }
    } catch (error) {
      console.error('Failed to load vaults:', error);
    }
  }

  async loadSessions(vaultId, page = 1) {
    try {
      const offset = (page - 1) * this.sessionPageSize;
      const response = await fetch(
        `/api/vaults/${vaultId}/sessions?limit=${this.sessionPageSize}&offset=${offset}`
      );
      const result = await response.json();
      if (result.success) {
        this.sessions[vaultId] = result.data;
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  async loadSession(vaultId, sessionId) {
    try {
      const response = await fetch(`/api/vaults/${vaultId}/sessions/${sessionId}`);
      const result = await response.json();
      if (result.success) {
        this.currentSession = result.data;
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }

  async loadCommands(vaultId) {
    try {
      const response = await fetch(`/api/vaults/${vaultId}/commands`);
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
    } catch (error) {
      console.error('Failed to load commands:', error);
      return [];
    }
  }

  async loadMemories() {
    try {
      const response = await fetch('/api/memory');
      const result = await response.json();
      if (result.success) {
        this.memories = result.data || [];
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
      this.memories = [];
    }
  }

  async loadCacheStats() {
    try {
      const response = await fetch('/api/memory/cache-stats');
      const result = await response.json();
      if (result.success) {
        this.cacheStats = result.data;
      }
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      this.cacheStats = null;
    }
  }

  async loadArchiveStats() {
    try {
      const response = await fetch('/api/memory/archive-stats');
      const result = await response.json();
      if (result.success) {
        this.archiveStats = result.data;
      }
    } catch (error) {
      console.error('Failed to load archive stats:', error);
      this.archiveStats = null;
    }
  }

  async loadArchivedMemories(searchQuery = '') {
    try {
      const params = new URLSearchParams({
        archived: 'true',
        limit: '100',
      });
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const response = await fetch(`/api/memory?${params}`);
      const result = await response.json();
      if (result.success) {
        this.archivedMemories = result.data || [];
      }
    } catch (error) {
      console.error('Failed to load archived memories:', error);
      this.archivedMemories = [];
    }
  }

  async loadWorkflows() {
    try {
      const response = await fetch('/api/workflows');
      const result = await response.json();
      if (result.success) {
        this.workflows = result.data || [];
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
      this.workflows = [];
    }
  }

  async loadConfig() {
    try {
      const response = await fetch('/api/config');
      const result = await response.json();
      if (result.success) {
        this.config = result.data || {};
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      this.config = {};
    }
  }

  async loadHealth() {
    try {
      const response = await fetch('/api/health');
      const result = await response.json();
      if (result.success) {
        this.health = result.data || {};
      }
    } catch (error) {
      console.error('Failed to load health:', error);
      this.health = {};
    }
  }

  async loadLogs() {
    try {
      const params = new URLSearchParams({
        level: this.logsFilter,
        limit: '100',
      });
      const response = await fetch(`/api/logs?${params}`);
      const result = await response.json();
      if (result.success) {
        this.logs = result.data || [];
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      this.logs = [];
    }
  }

  setupRouting() {
    window.addEventListener('popstate', () => {
      this.handleNavigation();
    });

    // Navigation links
    document.getElementById('nav-dashboard')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.currentPage = 'dashboard';
      this.render();
    });
  }

  handleNavigation() {
    const hash = window.location.hash;
    if (hash === '' || hash === '#/') {
      this.currentPage = 'dashboard';
    } else if (hash.startsWith('#/sessions/')) {
      const [vaultId, sessionId] = hash.replace('#/sessions/', '').split('/');
      if (sessionId) {
        this.currentVault = vaultId;
        this.currentPage = 'session-detail';
        this.loadSession(vaultId, sessionId);
      } else {
        this.currentVault = vaultId;
        this.currentPage = 'sessions';
        this.loadSessions(vaultId);
      }
    } else if (hash.startsWith('#/commands/')) {
      this.currentVault = hash.replace('#/commands/', '');
      this.currentPage = 'commands';
    } else if (hash === '#/memory') {
      this.currentPage = 'memory';
      this.loadMemories();
    } else if (hash === '#/workflows') {
      this.currentPage = 'workflows';
      this.loadWorkflows();
    } else if (hash === '#/config') {
      this.currentPage = 'config';
      this.loadConfig();
    } else if (hash === '#/health') {
      this.currentPage = 'health';
      this.loadHealth();
    } else if (hash === '#/logs') {
      this.currentPage = 'logs';
      this.loadLogs();
    } else if (hash === '#/help') {
      this.currentPage = 'help';
    } else if (hash === '#/vaults') {
      this.currentPage = 'vaults';
    }
    this.render();
  }

  async render() {
    const root = document.getElementById('app-root');
    if (!root) return;

    if (this.currentPage === 'dashboard') {
      root.innerHTML = this.renderDashboard();
      await this.renderDashboardContent();
    } else if (this.currentPage === 'vaults') {
      root.innerHTML = this.renderVaults();
      await this.renderVaultsContent();
    } else if (this.currentPage === 'sessions') {
      root.innerHTML = this.renderSessions();
      await this.renderSessionsContent();
    } else if (this.currentPage === 'session-detail') {
      root.innerHTML = this.renderSessionDetail();
      await this.renderSessionDetailContent();
    } else if (this.currentPage === 'commands') {
      root.innerHTML = this.renderCommands();
      await this.renderCommandsContent();
    } else if (this.currentPage === 'memory') {
      root.innerHTML = this.renderMemory();
      await this.renderMemoryContent();
    } else if (this.currentPage === 'workflows') {
      root.innerHTML = this.renderWorkflows();
      await this.renderWorkflowsContent();
    } else if (this.currentPage === 'config') {
      root.innerHTML = this.renderConfig();
      await this.renderConfigContent();
    } else if (this.currentPage === 'health') {
      root.innerHTML = this.renderHealth();
      await this.renderHealthContent();
    } else if (this.currentPage === 'logs') {
      root.innerHTML = this.renderLogs();
      await this.renderLogsContent();
    } else if (this.currentPage === 'help') {
      root.innerHTML = this.renderHelp();
    }
  }

  renderDashboard() {
    return `
      <div class="dashboard-container">
        <h1>🏠 Dashboard</h1>
        <section id="quick-stats">
          <h2>Quick Stats</h2>
          <div class="grid">
            <div>
              <p><strong id="stat-vaults">0</strong></p>
              <p><small>Registered Vaults</small></p>
            </div>
            <div>
              <p><strong id="stat-total-sessions">0</strong></p>
              <p><small>Total Sessions</small></p>
            </div>
            <div>
              <p><strong id="stat-successful">0</strong></p>
              <p><small>Successful</small></p>
            </div>
            <div>
              <p><strong id="stat-success-rate">0%</strong></p>
              <p><small>Success Rate</small></p>
            </div>
            <div>
              <p><strong id="stat-failed">0</strong></p>
              <p><small>Failed</small></p>
            </div>
            <div>
              <p><strong id="stat-providers">0</strong></p>
              <p><small>AI Providers</small></p>
            </div>
          </div>
        </section>
        <section id="vaults-stats">
          <h2>📦 Vaults</h2>
          <div id="vaults-grid" class="grid">
            ${this.vaults
              .map(
                (v) => `
              <div class="vault-card" onclick="window.app.goToSessions('${v.id}')">
                <h3>${v.name || 'Unnamed'}</h3>
                <p><small>${v.path}</small></p>
                <p><small>AI: ${v.ai || 'claude'}</small></p>
                <p id="vault-session-count-${v.id}"><small>Sessions: <strong>—</strong></small></p>
              </div>
            `
              )
              .join('')}
          </div>
        </section>
        <section id="recent-sessions">
          <h2>📅 Recent Sessions</h2>
          <div id="sessions-table-container"></div>
        </section>
      </div>
    `;
  }

  async renderDashboardContent() {
    // Load stats for all vaults
    let totalSessions = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    const providers = new Set();

    for (const vault of this.vaults) {
      await this.loadSessions(vault.id);
      const sessions = this.sessions[vault.id] || [];
      totalSessions += sessions.length;
      totalSuccessful += sessions.filter((s) => s.status === 'success').length;
      totalFailed += sessions.filter((s) => s.status === 'error').length;
      sessions.forEach((s) => {
        if (s.provider) providers.add(s.provider);
      });

      // Update per-vault session count
      const vaultCountEl = document.getElementById(`vault-session-count-${vault.id}`);
      if (vaultCountEl) {
        vaultCountEl.innerHTML = `<small>Sessions: <strong>${sessions.length}</strong></small>`;
      }
    }

    // Calculate success rate
    const successRate = totalSessions > 0 ? Math.round((totalSuccessful / totalSessions) * 100) : 0;

    // Update all stats
    document.getElementById('stat-vaults').textContent = this.vaults.length;
    document.getElementById('stat-total-sessions').textContent = totalSessions;
    document.getElementById('stat-successful').textContent = totalSuccessful;
    document.getElementById('stat-success-rate').textContent = successRate + '%';
    document.getElementById('stat-failed').textContent = totalFailed;
    document.getElementById('stat-providers').textContent = providers.size;

    // Render recent sessions table
    const allSessions = Object.values(this.sessions)
      .flat()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    const container = document.getElementById('sessions-table-container');
    if (allSessions.length > 0) {
      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Vault</th>
              <th>Date</th>
              <th>Command</th>
              <th>Status</th>
              <th>Provider</th>
            </tr>
          </thead>
          <tbody>
            ${allSessions
              .map(
                (s) => `
              <tr onclick="window.app.goToSession('${s.vaultId}', '${s.id}')">
                <td>${s.vaultId}</td>
                <td>${new Date(s.createdAt).toLocaleDateString()}</td>
                <td>${s.command || '—'}</td>
                <td><span class="status-badge status-${s.status}">${s.status}</span></td>
                <td>${s.provider || '—'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    } else {
      container.innerHTML = '<p><em>No sessions yet</em></p>';
    }
  }

  renderSessions() {
    return `
      <div class="sessions-container">
        <h1>Sessions - ${this.currentVault}</h1>
        <div class="filters">
          <input type="text" id="sessions-search" placeholder="Search sessions..." />
          <select id="sessions-status-filter">
            <option value="">All Statuses</option>
            <option value="success">Successful</option>
            <option value="error">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div id="sessions-table-container"></div>
        <div id="sessions-pagination" class="pagination"></div>
      </div>
    `;
  }

  async renderSessionsContent() {
    await this.loadSessions(this.currentVault, this.sessionPage);
    const sessions = this.sessions[this.currentVault] || [];

    const container = document.getElementById('sessions-table-container');
    if (sessions.length > 0) {
      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Command</th>
              <th>Status</th>
              <th>Provider</th>
            </tr>
          </thead>
          <tbody>
            ${sessions
              .map(
                (s) => `
              <tr onclick="window.app.goToSession('${s.vaultId}', '${s.id}')">
                <td>${new Date(s.createdAt).toLocaleDateString()}</td>
                <td>${s.command || '—'}</td>
                <td><span class="status-badge status-${s.status}">${s.status}</span></td>
                <td>${s.provider || '—'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    } else {
      container.innerHTML = '<p><em>No sessions found</em></p>';
    }

    // Pagination
    const paginationContainer = document.getElementById('sessions-pagination');
    paginationContainer.innerHTML = `
      <button onclick="window.app.sessionPage = Math.max(1, window.app.sessionPage - 1); window.app.render();">
        ← Previous
      </button>
      <span>Page ${this.sessionPage}</span>
      <button onclick="window.app.sessionPage++; window.app.render();">
        Next →
      </button>
    `;
  }

  renderSessionDetail() {
    if (!this.currentSession) {
      return '<p>Loading session...</p>';
    }

    const s = this.currentSession;
    return `
      <div class="session-detail-container">
        <div class="session-header">
          <h1>${s.command || 'Session'}</h1>
          <p>
            <small>
              <span>ID: ${s.id}</span> •
              <span>Date: ${new Date(s.createdAt).toLocaleString()}</span> •
              <span class="status-badge status-${s.status}">${s.status}</span>
            </small>
          </p>
        </div>

        <div class="session-tabs">
          <button class="tab-button active" data-tab="metadata" onclick="window.app.switchTab('metadata')">
            Metadata
          </button>
          <button class="tab-button" data-tab="context" onclick="window.app.switchTab('context')">
            Context
          </button>
          <button class="tab-button" data-tab="prompt" onclick="window.app.switchTab('prompt')">
            Prompt
          </button>
          <button class="tab-button" data-tab="results" onclick="window.app.switchTab('results')">
            Results
          </button>
          <button class="tab-button" data-tab="execution" onclick="window.app.switchTab('execution')">
            Execution
          </button>
          <button class="tab-button" data-tab="changes" onclick="window.app.switchTab('changes')">
            Changes
          </button>
        </div>

        <div class="session-tabs-content">
          <div id="tab-metadata" class="tab-content active">
            <table>
              <tbody>
                <tr><td><strong>ID</strong></td><td>${s.id}</td></tr>
                <tr><td><strong>Vault</strong></td><td>${s.vaultId}</td></tr>
                <tr><td><strong>Command</strong></td><td>${s.command || '—'}</td></tr>
                <tr><td><strong>Provider</strong></td><td>${s.provider || '—'}</td></tr>
                <tr><td><strong>Model</strong></td><td>${s.model || '—'}</td></tr>
                <tr><td><strong>Status</strong></td><td><span class="status-badge status-${s.status}">${s.status}</span></td></tr>
                <tr><td><strong>Created</strong></td><td>${new Date(s.createdAt).toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>

          <div id="tab-context" class="tab-content">
            <pre>${this.escapeHtml(s.context || '—')}</pre>
          </div>

          <div id="tab-prompt" class="tab-content">
            <pre>${this.escapeHtml(s.prompt || '—')}</pre>
          </div>

          <div id="tab-results" class="tab-content">
            <div>${marked.parse(s.results || '—')}</div>
          </div>

          <div id="tab-execution" class="tab-content">
            <table>
              <tbody>
                <tr><td><strong>Duration</strong></td><td>${s.execution?.duration || '—'} ms</td></tr>
                <tr><td><strong>Tokens In</strong></td><td>${s.execution?.tokensIn || '—'}</td></tr>
                <tr><td><strong>Tokens Out</strong></td><td>${s.execution?.tokensOut || '—'}</td></tr>
                <tr><td><strong>Cost</strong></td><td>${s.execution?.cost || '—'}</td></tr>
              </tbody>
            </table>
          </div>

          <div id="tab-changes" class="tab-content">
            <pre>${this.escapeHtml(JSON.stringify(s.changes || {}, null, 2))}</pre>
          </div>
        </div>

        <div class="session-actions">
          <button onclick="window.history.back()">← Back</button>
          <button class="secondary" onclick="window.app.goToDashboard()">Dashboard</button>
        </div>
      </div>
    `;
  }

  async renderSessionDetailContent() {
    // Already rendered in renderSessionDetail
  }

  renderCommands() {
    return `
      <div class="commands-container">
        <h1>Commands - ${this.currentVault}</h1>
        <div class="commands-header">
          <input type="text" id="commands-search" placeholder="Search commands..." />
        </div>
        <div id="commands-grid" class="grid"></div>
        <div id="commands-empty" style="display: none; text-align: center; padding: 2rem;">
          <p><em>No commands found</em></p>
        </div>
      </div>
    `;
  }

  async renderCommandsContent() {
    const commands = await this.loadCommands(this.currentVault);
    const grid = document.getElementById('commands-grid');
    const empty = document.getElementById('commands-empty');

    if (commands.length > 0) {
      grid.innerHTML = commands
        .map(
          (c) => `
          <div class="command-card">
            <h3>${c.name}</h3>
            <p>${c.description || 'No description'}</p>
            <p><small>Source: ${c.source}</small></p>
          </div>
        `
        )
        .join('');
      empty.style.display = 'none';
    } else {
      grid.innerHTML = '';
      empty.style.display = 'block';
    }
  }

  renderVaults() {
    return `
      <div class="vaults-container">
        <h1>📁 Vaults</h1>
        <div id="vaults-grid" class="grid">
          ${this.vaults
            .map(
              (v) => `
            <div class="vault-card" onclick="window.app.goToSessions('${v.id}')">
              <h3>${v.name || 'Unnamed'}</h3>
              <p><small>${v.path}</small></p>
              <p><small>AI: ${v.ai || 'claude'}</small></p>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  async renderVaultsContent() {
    // Vaults already rendered
  }

  renderMemory() {
    return `
      <div class="memory-container">
        <h1>💾 Memory Management</h1>

        <div style="margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
          <button class="contrast" onclick="window.app.setMemoryView('dashboard')" style="margin-right: 10px;">📊 Dashboard</button>
          <button class="contrast" onclick="window.app.setMemoryView('archive')" style="margin-right: 10px;">📦 Archive Browser</button>
          <button class="contrast" onclick="window.app.openRestoreModal()">↩️ Restore</button>
        </div>

        <div id="memory-dashboard" style="display: ${this.memoryView === 'dashboard' ? 'block' : 'none'};">
          <!-- Cache Stats Section -->
          <section style="margin-bottom: 30px;">
            <h2>📈 Cache Statistics</h2>
            <div class="grid">
              <div style="padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
                <h4 id="cache-size-value">—</h4>
                <p><small>Total Cache Size</small></p>
              </div>
              <div style="padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
                <h4 id="cache-files-value">—</h4>
                <p><small>Cache Files</small></p>
              </div>
              <div style="padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
                <h4 id="cache-health" style="color: #666;">—</h4>
                <p><small>Cache Health</small></p>
              </div>
            </div>
          </section>

          <!-- Archive Stats Section -->
          <section style="margin-bottom: 30px;">
            <h2>🗂️ Archive Statistics</h2>
            <div class="grid">
              <div style="padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
                <h4 id="archive-count-value">—</h4>
                <p><small>Archived Memories</small></p>
              </div>
              <div style="padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
                <h4 id="archive-size-value">—</h4>
                <p><small>Archive Size</small></p>
              </div>
            </div>
          </section>

          <!-- Vault Breakdown -->
          <section style="margin-bottom: 30px;">
            <h2>📁 Archive Breakdown by Vault</h2>
            <div id="vault-breakdown-table"></div>
          </section>
        </div>

        <div id="memory-archive" style="display: ${this.memoryView === 'archive' ? 'block' : 'none'};">
          <h2>Archive Browser</h2>
          <div style="margin-bottom: 15px;">
            <input type="text" id="archive-search" placeholder="Search archived memories..." style="width: 100%; padding: 10px;" />
          </div>
          <button onclick="window.app.searchArchivedMemories()">Search</button>
          <div id="archived-memories-list" style="margin-top: 20px;"></div>
        </div>

        <div id="memory-detail-modal" style="display: none;"></div>
        <div id="restore-modal" style="display: none;"></div>
      </div>
    `;
  }

  async renderMemoryContent() {
    // Load all memory data
    await this.loadCacheStats();
    await this.loadArchiveStats();
    await this.loadArchivedMemories();

    // Render dashboard stats
    if (this.cacheStats) {
      document.getElementById('cache-size-value').textContent = this.cacheStats.totalCacheMB.toFixed(1) + ' MB';
      document.getElementById('cache-files-value').textContent = (this.cacheStats.cacheFileCount || Object.keys(this.cacheStats.byVault).length) + ' files';

      // Calculate health
      const health = this.calculateCacheHealth(this.cacheStats.totalCacheMB);
      const healthEl = document.getElementById('cache-health');
      if (healthEl) {
        healthEl.textContent = health.status;
        healthEl.style.color = health.color;
      }
    }

    if (this.archiveStats) {
      document.getElementById('archive-count-value').textContent = this.archiveStats.totalArchivedCount + ' memories';
      document.getElementById('archive-size-value').textContent = this.archiveStats.totalArchivedMB.toFixed(1) + ' MB';

      // Render vault breakdown
      const breakdownTable = document.getElementById('vault-breakdown-table');
      if (breakdownTable && Object.keys(this.archiveStats.byVault).length > 0) {
        const rows = Object.entries(this.archiveStats.byVault)
          .map(
            ([vault, stats]) => `
          <tr>
            <td><strong>${vault}</strong></td>
            <td>${stats.count}</td>
            <td>${stats.sizeMB.toFixed(1)} MB</td>
          </tr>
        `
          )
          .join('');

        breakdownTable.innerHTML = `
          <table>
            <thead>
              <tr>
                <th>Vault</th>
                <th>Archived Memories</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        `;
      }
    }

    // Setup archive search
    const searchInput = document.getElementById('archive-search');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          window.app.searchArchivedMemories();
        }
      });
    }
  }

  calculateCacheHealth(cacheSizeMB) {
    const thresholdMB = 5; // Default threshold
    const percentage = (cacheSizeMB / thresholdMB) * 100;

    if (percentage < 50) {
      return { status: '✅ Healthy', color: '#28a745' };
    } else if (percentage < 80) {
      return { status: '⚠️ Warning', color: '#ffc107' };
    } else {
      return { status: '❌ Critical', color: '#dc3545' };
    }
  }

  setMemoryView(view) {
    this.memoryView = view;
    const dashEl = document.getElementById('memory-dashboard');
    const archEl = document.getElementById('memory-archive');
    if (dashEl && archEl) {
      dashEl.style.display = view === 'dashboard' ? 'block' : 'none';
      archEl.style.display = view === 'archive' ? 'block' : 'none';
    }
  }

  async searchArchivedMemories() {
    const searchInput = document.getElementById('archive-search');
    const query = searchInput ? searchInput.value : '';
    await this.loadArchivedMemories(query);

    const container = document.getElementById('archived-memories-list');
    if (!container) return;

    if (this.archivedMemories.length > 0) {
      container.innerHTML = `
        <div style="display: grid; gap: 15px;">
          ${this.archivedMemories
            .map(
              (m, idx) => `
            <div style="padding: 15px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" onclick="window.app.openArchivedMemoryDetail(${idx})">
              <h4>${m.summary || m.title || 'Untitled'}</h4>
              <p><small><strong>${m.command || 'unknown'}</strong> | ${new Date(m.timestamp).toLocaleString()}</small></p>
              <p><small>${m.summary?.substring(150) || 'No summary'}...</small></p>
              <small style="color: #666;">Click to restore</small>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    } else {
      container.innerHTML = '<p><em>No archived memories found</em></p>';
    }
  }

  openArchivedMemoryDetail(index) {
    const memory = this.archivedMemories[index];
    if (!memory) return;

    const modal = document.getElementById('memory-detail-modal');
    const timestamp = new Date(memory.timestamp).toLocaleString();

    modal.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;" onclick="if(event.target === this) window.app.closeMemoryDetail()">
        <div style="background-color: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 90%; max-height: 90vh; overflow-y: auto; padding: 30px; position: relative;">
          <button onclick="window.app.closeMemoryDetail()" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>

          <h2 style="margin-top: 0; color: #333;">${memory.summary || memory.title || 'Untitled'}</h2>

          <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>Command:</strong> ${memory.command || 'unknown'}</p>
            <p style="margin: 5px 0;"><strong>Vault:</strong> ${memory.vaultId || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Archived:</strong> ${timestamp}</p>
          </div>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 20px; max-height: 400px; overflow-y: auto; white-space: pre-wrap; word-break: break-word;">
            ${memory.preview || 'No content available'}
          </div>

          <button class="contrast" onclick="window.app.restoreFromModal('${memory.sessionId}')">↩️ Restore This Memory</button>
        </div>
      </div>
    `;
    modal.style.display = 'block';
  }

  openMemoryDetail(index) {
    const memory = this.memories[index];
    if (!memory) return;

    const modal = document.getElementById('memory-detail-modal');
    const timestamp = new Date(memory.timestamp).toLocaleString();

    modal.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;" onclick="if(event.target === this) window.app.closeMemoryDetail()">
        <div style="background-color: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 90%; max-height: 90vh; overflow-y: auto; padding: 30px; position: relative;">
          <button onclick="window.app.closeMemoryDetail()" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>

          <h2 style="margin-top: 0; color: #333;">${memory.summary || memory.title || 'Untitled'}</h2>

          <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>Command:</strong> ${memory.command || 'unknown'}</p>
            <p style="margin: 5px 0;"><strong>Session ID:</strong> <code>${memory.sessionId}</code></p>
            <p style="margin: 5px 0;"><strong>Vault:</strong> ${memory.nodeName || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${timestamp}</p>
            ${memory.tags && memory.tags.length > 0 ? `<p style="margin: 5px 0;"><strong>Tags:</strong> ${memory.tags.map(t => `<span style="background-color: #e0e0e0; padding: 2px 6px; border-radius: 3px; margin-right: 5px;">${t}</span>`).join('')}</p>` : ''}
          </div>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; word-break: break-word; max-height: 400px; overflow-y: auto;">
            <p style="margin-top: 0; color: #666; font-family: sans-serif;">Full memory content not yet available. Visit the file directly:</p>
            <p style="margin: 0; color: #007bff;">${memory.filePath || 'No file path'}</p>
          </div>
        </div>
      </div>
    `;
    modal.style.display = 'block';
  }

  closeMemoryDetail() {
    const modal = document.getElementById('memory-detail-modal');
    modal.style.display = 'none';
  }

  openRestoreModal() {
    const modal = document.getElementById('restore-modal');
    modal.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;" onclick="if(event.target === this) window.app.closeRestoreModal()">
        <div style="background-color: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 90%; max-height: 90vh; overflow-y: auto; padding: 30px; position: relative; min-width: 400px;">
          <button onclick="window.app.closeRestoreModal()" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>

          <h2 style="margin-top: 0; color: #333;">↩️ Restore Memories</h2>

          <p style="margin-bottom: 20px; color: #666;">Select which memories to restore from the archive:</p>

          <div style="margin-bottom: 20px;">
            <label style="display: flex; margin-bottom: 10px; cursor: pointer;">
              <input type="radio" name="restore-mode" value="all" ${this.restoreMode === 'all' ? 'checked' : ''} style="margin-right: 10px;" onchange="window.app.restoreMode = 'all'" />
              <span><strong>Restore All Archived Memories</strong><br/><small>Restore all ${this.archiveStats?.totalArchivedCount || 0} archived memories</small></span>
            </label>

            <label style="display: flex; margin-bottom: 10px; cursor: pointer;">
              <input type="radio" name="restore-mode" value="date" ${this.restoreMode === 'date' ? 'checked' : ''} style="margin-right: 10px;" onchange="window.app.restoreMode = 'date'" />
              <span><strong>Restore by Date Range</strong><br/><small>Choose a specific date range</small></span>
            </label>

            <label style="display: flex; cursor: pointer;">
              <input type="radio" name="restore-mode" value="search" ${this.restoreMode === 'search' ? 'checked' : ''} style="margin-right: 10px;" onchange="window.app.restoreMode = 'search'" />
              <span><strong>Restore by Search</strong><br/><small>Search for specific memories</small></span>
            </label>
          </div>

          <div id="restore-options" style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;"></div>

          <div id="restore-progress" style="display: none; margin: 20px 0;">
            <p><strong>Restoring memories...</strong></p>
            <div style="background-color: #ddd; height: 20px; border-radius: 4px; overflow: hidden;">
              <div id="progress-bar" style="background-color: #007bff; height: 100%; width: 0%; transition: width 0.3s;"></div>
            </div>
            <p id="progress-text" style="margin-top: 10px; font-size: 14px;">0 / 0</p>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button class="contrast" onclick="window.app.executeRestore()">↩️ Restore</button>
            <button class="secondary" onclick="window.app.closeRestoreModal()">Cancel</button>
          </div>
        </div>
      </div>
    `;

    // Render options based on mode
    this.updateRestoreOptions();
    modal.style.display = 'block';
  }

  updateRestoreOptions() {
    const container = document.getElementById('restore-options');
    if (!container) return;

    if (this.restoreMode === 'date') {
      container.innerHTML = `
        <div>
          <label>Start Date: <input type="date" id="restore-start-date" /></label>
          <label style="margin-top: 10px; display: block;">End Date: <input type="date" id="restore-end-date" /></label>
        </div>
      `;
    } else if (this.restoreMode === 'search') {
      container.innerHTML = `
        <input type="text" id="restore-search" placeholder="Search for memories..." style="width: 100%; padding: 10px;" />
      `;
    } else {
      container.innerHTML = `
        <p><strong>Ready to restore ${this.archiveStats?.totalArchivedCount || 0} archived memories.</strong></p>
      `;
    }
  }

  async executeRestore() {
    const progressDiv = document.getElementById('restore-progress');
    if (progressDiv) progressDiv.style.display = 'block';

    try {
      const request = {
        mode: this.restoreMode,
      };

      if (this.restoreMode === 'date') {
        const startDate = document.getElementById('restore-start-date')?.value;
        const endDate = document.getElementById('restore-end-date')?.value;
        if (startDate) request.startDate = startDate;
        if (endDate) request.endDate = endDate;
      } else if (this.restoreMode === 'search') {
        const searchQuery = document.getElementById('restore-search')?.value;
        if (searchQuery) request.searchQuery = searchQuery;
      }

      // Simulate progress (real implementation would stream from server)
      const progressBar = document.getElementById('progress-bar');
      const progressText = document.getElementById('progress-text');
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress > 95) progress = 95;
        if (progressBar) progressBar.style.width = progress + '%';
      }, 300);

      const response = await fetch('/api/memory/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      clearInterval(progressInterval);
      if (progressBar) progressBar.style.width = '100%';

      const result = await response.json();
      if (result.success) {
        const data = result.data;
        if (progressText) {
          progressText.textContent = `✅ Restored ${data.restored} memories${data.failed > 0 ? ` (${data.failed} failed)` : ''}`;
        }

        // Refresh data
        setTimeout(() => {
          this.loadArchiveStats();
          this.loadCacheStats();
        }, 1500);
      } else {
        throw new Error(result.error || 'Restore failed');
      }
    } catch (error) {
      console.error('Restore error:', error);
      const progressDiv = document.getElementById('restore-progress');
      if (progressDiv) {
        progressDiv.innerHTML = `<p style="color: #dc3545;">❌ Restore failed: ${error.message}</p>`;
      }
    }
  }

  restoreFromModal(sessionId) {
    this.restoreMode = 'session';
    this.executeRestore = async () => {
      try {
        const response = await fetch('/api/memory/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'session',
            sessionIds: [sessionId],
          }),
        });

        const result = await response.json();
        if (result.success) {
          alert(`✅ Memory restored successfully`);
          this.closeMemoryDetail();
          this.loadArchiveStats();
          this.loadCacheStats();
        } else {
          alert(`❌ Restore failed: ${result.error}`);
        }
      } catch (error) {
        alert(`❌ Restore error: ${error.message}`);
      }
    };
    this.executeRestore();
  }

  closeRestoreModal() {
    const modal = document.getElementById('restore-modal');
    modal.style.display = 'none';
  }

  renderWorkflows() {
    return `
      <div class="workflows-container">
        <h1>⚙️ Workflows</h1>
        <div id="workflows-list"></div>
      </div>
    `;
  }

  async renderWorkflowsContent() {
    const container = document.getElementById('workflows-list');
    if (this.workflows.length > 0) {
      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Steps</th>
              <th>Status</th>
              <th>Last Run</th>
            </tr>
          </thead>
          <tbody>
            ${this.workflows
              .map(
                (w) => `
              <tr>
                <td>${w.name || 'Untitled'}</td>
                <td>${w.steps?.length || 0}</td>
                <td><span class="status-badge status-${w.status || 'unknown'}">${w.status || 'unknown'}</span></td>
                <td>${w.lastRun ? new Date(w.lastRun).toLocaleDateString() : '—'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    } else {
      container.innerHTML = '<p><em>No workflows found</em></p>';
    }
  }

  renderConfig() {
    return `
      <div class="config-container">
        <h1>⚙️ Configuration</h1>
        <div id="config-tree"></div>
      </div>
    `;
  }

  async renderConfigContent() {
    const container = document.getElementById('config-tree');
    container.innerHTML = `
      <pre>${this.escapeHtml(JSON.stringify(this.config, null, 2))}</pre>
    `;
  }

  renderHealth() {
    return `
      <div class="health-container">
        <h1>🏥 Health Monitor</h1>
        <div id="health-metrics"></div>
      </div>
    `;
  }

  async renderHealthContent() {
    const container = document.getElementById('health-metrics');
    if (this.health && Object.keys(this.health).length > 0) {
      const h = this.health;
      container.innerHTML = `
        <div class="health-grid">
          <div><strong>Status:</strong> <span class="status-badge status-${h.status || 'unknown'}">${h.status || 'unknown'}</span></div>
          <div><strong>Version:</strong> ${h.version || '—'}</div>
          <div><strong>Uptime:</strong> ${h.uptime || '—'} seconds</div>
          <div><strong>Memory:</strong> ${h.memory?.used || '—'} MB / ${h.memory?.total || '—'} MB</div>
          <div><strong>Requests:</strong> ${h.requestCount || '0'}</div>
          <div><strong>Errors:</strong> ${h.errorCount || '0'}</div>
        </div>
      `;
    } else {
      container.innerHTML = '<p><em>Health data unavailable</em></p>';
    }
  }

  renderLogs() {
    return `
      <div class="logs-container">
        <h1>📋 System Logs</h1>
        <div class="logs-filters">
          <button class="filter-btn ${this.logsFilter === 'ALL' ? 'active' : ''}" onclick="window.app.filterLogs('ALL')">All</button>
          <button class="filter-btn ${this.logsFilter === 'INFO' ? 'active' : ''}" onclick="window.app.filterLogs('INFO')">Info</button>
          <button class="filter-btn ${this.logsFilter === 'DEBUG' ? 'active' : ''}" onclick="window.app.filterLogs('DEBUG')">Debug</button>
          <button class="filter-btn ${this.logsFilter === 'ERROR' ? 'active' : ''}" onclick="window.app.filterLogs('ERROR')">Error</button>
        </div>
        <div id="logs-list"></div>
      </div>
    `;
  }

  async renderLogsContent() {
    const container = document.getElementById('logs-list');
    if (this.logs.length > 0) {
      container.innerHTML = `
        <div class="logs-table">
          ${this.logs
            .map(
              (l) => `
            <div class="log-entry log-${l.level?.toLowerCase() || 'info'}">
              <span class="log-timestamp">${l.timestamp || '—'}</span>
              <span class="log-level">[${l.level || 'INFO'}]</span>
              <span class="log-source">${l.source || 'Global'}</span>
              <span class="log-message">${this.escapeHtml(l.message || '')}</span>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    } else {
      container.innerHTML = '<p><em>No logs found</em></p>';
    }
  }

  renderHelp() {
    return `
      <div class="help-container">
        <h1>❓ Help & Documentation</h1>
        <section>
          <h2>Navigation</h2>
          <ul>
            <li><strong>Dashboard</strong> — Overview of your vaults and recent activity</li>
            <li><strong>Vaults</strong> — Browse all registered vaults</li>
            <li><strong>Sessions</strong> — View command execution history</li>
            <li><strong>Commands</strong> — Browse available commands per vault</li>
            <li><strong>Memory</strong> — View extracted knowledge from sessions</li>
            <li><strong>Workflows</strong> — Manage multi-step automation</li>
            <li><strong>Config</strong> — View and edit system settings</li>
            <li><strong>Health</strong> — Monitor API server health and metrics</li>
            <li><strong>Logs</strong> — View and filter system logs</li>
          </ul>
        </section>
        <section>
          <h2>Tips</h2>
          <ul>
            <li>Click on vault cards to view sessions for that vault</li>
            <li>Use search and filters to find specific sessions or commands</li>
            <li>Check Health page to monitor API server status</li>
            <li>View Logs to debug issues and monitor activity</li>
          </ul>
        </section>
        <section>
          <h2>About BOZLY</h2>
          <p><strong>Build. Organize. Link. Yield.</strong></p>
          <p>BOZLY is an AI-agnostic framework for deploying domain-specific workspaces.</p>
        </section>
      </div>
    `;
  }

  switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach((t) => {
      t.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach((b) => {
      b.classList.remove('active');
    });

    // Show selected tab
    const tabContent = document.getElementById(`tab-${tabName}`);
    const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabContent) tabContent.classList.add('active');
    if (tabButton) tabButton.classList.add('active');
  }

  filterLogs(level) {
    this.logsFilter = level;
    this.loadLogs().then(() => this.render());
  }

  // Navigation helpers
  goToDashboard() {
    this.currentPage = 'dashboard';
    window.location.hash = '#/';
    this.render();
  }

  goToSessions(vaultId) {
    this.currentVault = vaultId;
    this.currentPage = 'sessions';
    this.sessionPage = 1;
    window.location.hash = `#/sessions/${vaultId}`;
    this.render();
  }

  goToSession(vaultId, sessionId) {
    this.currentVault = vaultId;
    this.currentPage = 'session-detail';
    window.location.hash = `#/sessions/${vaultId}/${sessionId}`;
    this.loadSession(vaultId, sessionId).then(() => this.render());
  }

  goToCommands(vaultId) {
    this.currentVault = vaultId;
    this.currentPage = 'commands';
    window.location.hash = `#/commands/${vaultId}`;
    this.render();
  }

  goToVaults() {
    this.currentPage = 'vaults';
    window.location.hash = '#/vaults';
    this.render();
  }

  goToMemory() {
    this.currentPage = 'memory';
    window.location.hash = '#/memory';
    this.loadMemories().then(() => this.render());
  }

  goToWorkflows() {
    this.currentPage = 'workflows';
    window.location.hash = '#/workflows';
    this.loadWorkflows().then(() => this.render());
  }

  goToConfig() {
    this.currentPage = 'config';
    window.location.hash = '#/config';
    this.loadConfig().then(() => this.render());
  }

  goToHealth() {
    this.currentPage = 'health';
    window.location.hash = '#/health';
    this.loadHealth().then(() => this.render());
  }

  goToLogs() {
    this.currentPage = 'logs';
    window.location.hash = '#/logs';
    this.loadLogs().then(() => this.render());
  }

  goToHelp() {
    this.currentPage = 'help';
    window.location.hash = '#/help';
    this.render();
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
