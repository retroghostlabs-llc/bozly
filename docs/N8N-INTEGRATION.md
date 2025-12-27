# n8n + BOZLY Integration Guide

**Orchestrating multi-vault automation with n8n workflow platform**

---

## Overview

n8n is a workflow automation platform that can orchestrate BOZLY nodes, enabling:
- **Multi-vault coordination** — Chain commands across multiple BOZLY nodes
- **External event triggers** — Discord, webhooks, APIs → trigger `bozly run` commands
- **Session automation** — Monitor `.bozly/sessions/` and process results
- **Data pipelines** — External data → BOZLY context → AI processing → external services
- **Cost-effective** — Self-hosted is free (vs $20-54/month cloud)

---

## Architecture

```
External Event (Discord, Webhook, API)
    ↓
n8n Workflow (Docker)
    ↓
Execute Command: bozly run <command>
    ↓
BOZLY Vault (context.md + commands/)
    ↓
AI CLI (Claude, GPT, Ollama)
    ↓
Session Output → .bozly/sessions/SESSION.json
    ↓
n8n processes results → External Service (Discord, Database, etc.)
```

---

## Two-Phase Implementation

### Phase 1: n8n Local Setup (Foundation)
**Location:** `/Users/sbevere/my-obsidian/02-Areas/Ready-to-Build/n8n-local-setup/`

**What:** Basic n8n deployment + tunnel access

**Includes:**
- Docker setup on home server
- Cloudflare Tunnel configuration (webhook accessibility)
- Basic workflow testing
- Cost analysis (personalized recommendation for your setup)

**Time:** 5-7 hours
**Cost:** $5-14/month (free n8n + free Cloudflare Tunnel)

**When Ready to Build:**
```bash
cd /Users/sbevere/my-obsidian/02-Areas/Ready-to-Build/n8n-local-setup/
# Read IMPLEMENTATION-PLAN.md
# Follow 4 setup phases
```

### Phase 2: n8n + BOZLY Integration (Advanced)
**Location:** `/Users/sbevere/my-obsidian/02-Areas/Ready-to-Build/n8n-bozly-integration/`

**What:** BOZLY-specific integration patterns + POC

**Includes:**
- 5 integration approaches:
  1. **CLI-Based** (Execute Command node) — Low complexity, most reliable
  2. **File System Monitoring** (watch `.bozly/sessions/`) — Low-medium complexity
  3. **Webhook Orchestration** (expose webhooks via custom commands) — Medium complexity
  4. **Session Automation Pipeline** (auto-chain commands) — Medium complexity
  5. **Context Injection** (update context.md from external data) — Medium-high complexity
- POC workflow example: Discord → n8n → bozly run
- Session monitoring patterns
- Real-world use cases

**Time:** 6-8 hours
**Prerequisites:** Phase 1 (n8n local setup) completed

**When Ready to Build:**
```bash
cd /Users/sbevere/my-obsidian/02-Areas/Ready-to-Build/n8n-bozly-integration/
# Read implementation plan
# Follow POC walkthrough
```

---

## Integration Patterns Explained

### Pattern 1: CLI-Based (Simplest)
```
n8n Execute Command node
  ↓
bozly run music complete-album
  ↓
BOZLY loads node context + command
  ↓
Pipes to Claude/GPT/Ollama
  ↓
Session saved to .bozly/sessions/
```

**Best for:** Triggered workflows, Discord commands, webhooks

**Example Workflow:**
```
Discord message "Analyze this album"
  → n8n webhook trigger
  → Parse message text
  → bozly run music analyze --input "message text"
  → Save session
  → Reply in Discord with session results
```

### Pattern 2: File System Monitoring

**NEW (Phase 1+):** Session recording creates multi-file structure

**Session Directory Structure:**
```
~/.bozly/sessions/{vault_id}/{YYYY}/{MM}/{DD}/{uuid}/
├── session.json          (UUID, status, provider, timestamp, command)
├── context.md            (what the AI knew - audit trail)
├── prompt.txt            (raw prompt sent to AI)
├── execution.json        (technical: request, response, timing, logs)
├── results.md            (human-readable AI output)
└── changes.json          (files modified, diffs)
```

**How It Works:**
```
n8n File Watcher monitors ~/.bozly/sessions/ (or specific node path)
  ↓
Detects new directory: vault_id/YYYY/MM/DD/uuid/
  ↓
Reads session.json for metadata (status, provider, command)
  ↓
If status="completed": reads results.md + changes.json
  ↓
Routes to external service (Discord, database, Slack, etc.)
```

**Best for:** Continuous monitoring, session tracking, result logging, real-time integration

### Pattern 3: Webhook Orchestration
```
n8n triggers webhook from custom bozly command
  ↓
Webhook contains execution context/results
  ↓
n8n receives webhook response
  ↓
Chain to next workflow step
```

**Best for:** Real-time feedback, command chaining, error handling

### Pattern 4: Session Automation
```
n8n monitors session completion
  ↓
Extracts execution metadata
  ↓
Chains to next bozly command
  ↓
Passes previous output as context
```

**Best for:** Multi-node workflows, sequential processing

### Pattern 5: Context Injection
```
n8n fetches external data (API, database)
  ↓
Updates .bozly/context.md with live data
  ↓
Triggers bozly run
  ↓
BOZLY context now includes fresh external data
```

**Best for:** Data-driven nodes, real-time updates, dynamic context

---

## Real-World Use Cases

### Content Production Pipeline
```
1. Content idea → Discord
2. n8n webhook trigger
3. bozly run content-vault outline-script
4. Claude writes outline
5. n8n monitors completion
6. Posts outline back to Discord
7. Manual approval
8. Triggers production phase (bozly run production-vault)
```

### Multi-Vault Daily Routine
```
Morning trigger (n8n cron)
  ↓
1. bozly run journal morning-entry
  ↓
2. bozly run music album-discovery
  ↓
3. bozly run content-vault daily-plan
  ↓
All sessions logged and tracked
  ↓
Summary email sent
```

### Network Monitoring + Documentation
```
1. Hourly n8n trigger (cron)
2. SSH to home server
3. bozly run network-vault health-check
4. Claude analyzes network status
5. Updates vault documentation
6. Alert if issues detected
7. Historical session data tracks trends
```

---

## Documentation Structure

**In BOZLY Project:**
- `/docs/N8N-INTEGRATION.md` — This file
- `/docs/ECOSYSTEM.md` — External integrations overview
- `/ROADMAP.md` — Phase 2+ features reference n8n

**In Obsidian Vault (Ready-to-Build):**
- `/02-Areas/Ready-to-Build/n8n-local-setup/` — Phase 1 implementation
- `/02-Areas/Ready-to-Build/n8n-bozly-integration/` — Phase 2 implementation
- `/02-Areas/Research/02-Review/20251219-n8n-local-vs-cloud.md` — Detailed research + cost analysis

---

## For AI Agents Building BOZLY

When planning features or suggesting integrations, reference:

1. **Cost Decision:** See research findings in `/02-Areas/Research/02-Review/20251219-n8n-local-vs-cloud.md`
   - Self-hosted recommended: $5-14/month total cost
   - Saves $8-49/month vs cloud
   - No additional cost for Cloudflare/Tailscale tunneling

2. **Integration Patterns:** See `/02-Areas/Ready-to-Build/n8n-bozly-integration/` for implementation details
   - CLI-based is simplest starting point
   - File system monitoring for continuous workflows
   - Webhook approach for real-time coordination

3. **Implementation Timeline:**
   - Phase 1: 5-7 hours (n8n local setup)
   - Phase 2: 6-8 hours (BOZLY integration patterns)
   - Total: 11-15 hours for full n8n + BOZLY foundation

4. **Dependencies:**
   - n8n Phase 1 must complete before Phase 2
   - Docker and Cloudflare Tunnel setup required
   - BOZLY must be functional (Sprint 2 complete: context loading + AI CLI integration)

---

## Next Steps

1. **Read Phase 1:** `/02-Areas/Ready-to-Build/n8n-local-setup/IMPLEMENTATION-PLAN.md`
2. **Understand costs:** Reference `/02-Areas/Research/02-Review/20251219-n8n-local-vs-cloud.md` for personalized recommendation
3. **When ready:** Execute Phase 1 setup (5-7 hours)
4. **Then Phase 2:** Build POC workflow with one of the 5 integration patterns
5. **Extend:** Use patterns to build multi-vault automation

---

## Reference Paths

**For AI agents, reference these paths:**

```
Obsidian Vault (Knowledge)
└─ /Users/sbevere/my-obsidian/02-Areas/Ready-to-Build/
   ├─ n8n-local-setup/          (Phase 1: Foundation)
   ├─ n8n-bozly-integration/     (Phase 2: Integration patterns)
   └─ ../Research/02-Review/20251219-n8n-local-vs-cloud.md (Research + costs)

BOZLY Project (Code)
└─ /Users/sbevere/IdeaProjects/personal/ai-vault-framework-workspace/release/bozly/
   ├─ docs/N8N-INTEGRATION.md    (This guide)
   ├─ docs/ECOSYSTEM.md          (External integrations)
   └─ ROADMAP.md                 (Phase 2+ features)
```

---

**Status:** Ready for Phase 1 implementation
**Last Updated:** 2025-12-20
**For Questions:** See Ready-to-Build implementation guides

---

## See Also

- [GETTING-STARTED.md](GETTING-STARTED.md) — Getting started with BOZLY
- [ECOSYSTEM.md](ECOSYSTEM.md) — External integrations overview
- [WORKFLOWS-GUIDE.md](WORKFLOWS-GUIDE.md) — Workflow automation
- [API-REFERENCE.md](API-REFERENCE.md) — API for n8n integration

*Last updated: 2025-12-27 (Session 122)*
