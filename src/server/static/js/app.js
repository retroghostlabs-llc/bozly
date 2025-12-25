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
    }
    this.render();
  }

  async render() {
    const root = document.getElementById('app-root');
    if (!root) return;

    if (this.currentPage === 'dashboard') {
      root.innerHTML = this.renderDashboard();
      await this.renderDashboardContent();
    } else if (this.currentPage === 'sessions') {
      root.innerHTML = this.renderSessions();
      await this.renderSessionsContent();
    } else if (this.currentPage === 'session-detail') {
      root.innerHTML = this.renderSessionDetail();
      await this.renderSessionDetailContent();
    } else if (this.currentPage === 'commands') {
      root.innerHTML = this.renderCommands();
      await this.renderCommandsContent();
    }
  }

  renderDashboard() {
    return `
      <div class="dashboard-container">
        <h1>Dashboard</h1>
        <section id="vaults-stats">
          <h2>Vaults</h2>
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
        </section>
        <section id="recent-sessions">
          <h2>Recent Sessions</h2>
          <div id="sessions-table-container"></div>
        </section>
        <section id="quick-stats">
          <h2>Quick Stats</h2>
          <div class="grid">
            <div>
              <p><strong id="stat-total-sessions">0</strong></p>
              <p><small>Total Sessions</small></p>
            </div>
            <div>
              <p><strong id="stat-successful">0</strong></p>
              <p><small>Successful</small></p>
            </div>
            <div>
              <p><strong id="stat-failed">0</strong></p>
              <p><small>Failed</small></p>
            </div>
            <div>
              <p><strong id="stat-providers">0</strong></p>
              <p><small>Providers</small></p>
            </div>
          </div>
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
    }

    document.getElementById('stat-total-sessions').textContent = totalSessions;
    document.getElementById('stat-successful').textContent = totalSuccessful;
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
