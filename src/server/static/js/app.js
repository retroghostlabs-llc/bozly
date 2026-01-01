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
        <h1>💾 Memory</h1>
        <div class="search-box">
          <input type="text" id="memory-search" placeholder="Search memories..." />
        </div>
        <div id="memories-list"></div>
        <div id="memory-detail-modal" style="display: none;"></div>
      </div>
    `;
  }

  async renderMemoryContent() {
    const container = document.getElementById('memories-list');
    if (this.memories.length > 0) {
      container.innerHTML = `
        <div class="memories-grid">
          ${this.memories
            .map(
              (m, idx) => `
            <div class="memory-card" onclick="window.app.openMemoryDetail(${idx})" style="cursor: pointer;">
              <h3>${m.summary || m.title || 'Untitled'}</h3>
              <p><strong>${m.command || 'unknown'}</strong></p>
              <p>${m.summary?.substring(100) || 'No summary'}...</p>
              ${m.tags && m.tags.length > 0 ? `<small>Tags: ${m.tags.join(', ')}</small>` : ''}
              <small style="color: #666;">Click to view full details</small>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    } else {
      container.innerHTML = '<p><em>No memories found</em></p>';
    }
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
