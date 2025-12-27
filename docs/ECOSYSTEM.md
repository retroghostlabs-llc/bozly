# BOZLY Ecosystem & External Integrations

**Extending BOZLY with automation platforms, MCP servers, and AI services**

---

## Overview

BOZLY can integrate with external services to enable powerful automation workflows:

| Integration | Purpose | Status | Phase |
|-------------|---------|--------|-------|
| **n8n** | Multi-vault orchestration, event-driven automation | Ready to Build | Phase 2+ |
| **Claude Code** | AI-powered context understanding and execution | Integrated | Phase 1 ✅ |
| **MCP Servers** | External tool access (UniFi, Slack, Discord, etc.) | Future | Phase 3 |
| **Webhooks** | External event triggers (Discord, GitHub, etc.) | Via n8n | Phase 2+ |
| **APIs** | Custom integrations with any HTTP endpoint | Via n8n | Phase 2+ |

---

## n8n (Workflow Automation Platform)

**Purpose:** Orchestrate BOZLY nodes, trigger commands from external events, monitor sessions, automate multi-node workflows

**Integration Level:** Medium (requires Docker, basic n8n knowledge)

**Implementation Phases:**
1. **Phase 1 (Ready):** n8n local setup (Docker, tunneling)
   - Duration: 5-7 hours
   - Cost: $5-14/month self-hosted
   - Documentation: `/02-Areas/Ready-to-Build/n8n-local-setup/`

2. **Phase 2 (Ready):** n8n + BOZLY integration patterns
   - Duration: 6-8 hours (depends on Phase 1)
   - Requires: Phase 1 complete
   - Documentation: `/02-Areas/Ready-to-Build/n8n-bozly-integration/`

**Key Capabilities:**
- Trigger `bozly run` via webhooks (Discord, APIs, crons)
- Monitor vault sessions in real-time
- Chain commands across multiple nodes
- Inject external data into node context
- Automate multi-step workflows

**Example Workflows:**
- Discord command → n8n → bozly run music
- Daily cron → chain journal + content + music nodes
- API webhook → n8n → bozly run analysis → return results

**Documentation:**
- [N8N-INTEGRATION.md](./N8N-INTEGRATION.md) — Complete guide with patterns
- [Research & Cost Analysis](/Users/sbevere/my-obsidian/02-Areas/Research/02-Review/20251219-n8n-local-vs-cloud.md)
- [Ready-to-Build Implementation Plans](/Users/sbevere/my-obsidian/02-Areas/Ready-to-Build/)

---

## Session Recording & Audit Trail

**Purpose:** Track all vault executions for debugging, analysis, and future automation

**Status:** ✅ Fully designed (Phase 1)

**Architecture:**
```
~/.bozly/sessions/{vault_id}/{YYYY}/{MM}/{DD}/{uuid}/
├── session.json          (metadata, id, timestamp, status)
├── context.md            (what the AI knew)
├── prompt.txt            (raw prompt sent to AI)
├── execution.json        (technical details, timing, logs)
├── results.md            (human-readable output)
└── changes.json          (files modified)
```

**Key Features:**
- ✅ Multi-file architecture (separation of concerns)
- ✅ Vault-based organization (filter by vault)
- ✅ Date hierarchy (easy archival)
- ✅ UUID session IDs (collision-free)
- ✅ Full audit trail (what, when, why)

**Commands:**
```bash
bozly logs                          # Show recent sessions (last 20)
bozly logs --node music      # Filter by vault
bozly logs --status failed          # Show only failures
bozly logs --limit 5 --verbose      # Show 5 with details

bozly diff session-id-1 session-id-2 # Compare two session prompts
```

**Future Integration (Phase 2+):**
- n8n workflow monitoring (Pattern 2: watch `.bozly/sessions/`)
- Claude memory extraction (auto-summary generation)
- Session archival by date
- Cross-node session analysis

**Reference:** [SESSION-44-SESSIONS-REFACTORING-DESIGN.md](../planning/SESSION-44-SESSIONS-REFACTORING-DESIGN.md)

---

## Claude Code Integration

**Purpose:** Execute BOZLY commands with AI reasoning

**Integration Level:** Built-in (core feature)

**Status:** ✅ Fully integrated (Phase 1)

**Capabilities:**
- AI-agnostic context provider (works with Claude, GPT, Ollama, Gemini)
- Streaming response support
- Session recording for audit trail
- Provider detection and automatic setup instructions

**How It Works:**
```bash
bozly run daily                    # Uses configured AI CLI
bozly run daily --ai claude        # Explicit provider selection
bozly run daily --ai ollama        # Local/private AI
```

**Reference:** [AI-PROVIDERS.md](./AI-PROVIDERS.md) in BOZLY docs

---

## MCP Servers (Future)

**Purpose:** Extend BOZLY with specialized tool access

**Status:** Planned for Phase 3

**Potential Integrations:**
- **UniFi Network:** Query network status, security events
- **Slack:** Post results, receive commands
- **Discord:** Channel messages, user interactions
- **GitHub:** Pull requests, issues, repository data
- **Airtable:** Database queries and updates
- **Obsidian:** Vault queries and note creation

**How They'd Work:**
```bash
bozly run network-vault health-check \
  --mcp unifi-network \
  --mcp slack
```

BOZLY would:
1. Load node context
2. Load command prompt
3. Inject available MCP tools
4. Pipe to AI with tool access
5. AI uses tools as needed
6. Save session with tool call logs

---

## Webhooks & Event Triggers

**Purpose:** React to external events

**How to Access:**
1. **Via n8n** (recommended) — n8n acts as webhook receiver
2. **Direct webhooks** — Future: custom webhook nodes in BOZLY

**Current Pattern (Phase 2+):**
```
External Service (Discord, GitHub, API)
  ↓
n8n receives webhook
  ↓
n8n triggers bozly run command
  ↓
Monitor .bozly/sessions/ for results
  ↓
n8n processes and replies
```

---

## Custom APIs & HTTP Integration

**Via n8n HTTP Request Nodes:**

```
n8n HTTP Request
  ↓
Query external API (OpenAI, databases, etc.)
  ↓
Format data for BOZLY context
  ↓
Update .bozly/context.md
  ↓
Trigger bozly run
  ↓
Return results to API consumer
```

---

## Implementation Timeline

### Phase 1: Foundation ✅ (COMPLETE)
- Core BOZLY framework
- AI CLI integration
- Session recording
- Logging infrastructure

### Phase 2: Automation 🚀 (READY TO BUILD)
- **n8n local setup** (5-7 hours) — `/02-Areas/Ready-to-Build/n8n-local-setup/`
- **n8n + BOZLY integration** (6-8 hours) — `/02-Areas/Ready-to-Build/n8n-bozly-integration/`
- Event-driven automation
- Multi-vault orchestration

### Phase 3: Ecosystem (PLANNED)
- MCP server integration
- Native webhook nodes
- Skill publishing system
- Community integrations

### Phase 4: Distribution (PLANNED)
- npm/Homebrew packages
- Obsidian plugin
- Community node registry

---

## For AI Agents Building BOZLY

When planning Phase 2+ features:

1. **n8n is required first** — See Phase 1 implementation plan
2. **Integration patterns are documented** — Refer to `N8N-INTEGRATION.md` for 5 specific approaches
3. **Research is complete** — Cost/benefit analysis at `/02-Areas/Research/02-Review/20251219-n8n-local-vs-cloud.md`
4. **Ready-to-Build items are prepared** — Full implementation guides with all decisions pre-made

**Reference these paths:**
```
Ecosystem Planning
├─ BOZLY Docs
│  ├─ /docs/ECOSYSTEM.md (this file)
│  ├─ /docs/N8N-INTEGRATION.md (detailed guide)
│  └─ /ROADMAP.md (timeline)
│
└─ Obsidian Vault (Ready-to-Build)
   ├─ /n8n-local-setup/ (Phase 1)
   ├─ /n8n-bozly-integration/ (Phase 2)
   └─ /Research/02-Review/20251219-n8n-local-vs-cloud.md (research)
```

---

## Current Ecosystem Status

| Component | Status | Where |
|-----------|--------|-------|
| BOZLY Core | ✅ Complete | Release/bozly/ |
| Claude Code Integration | ✅ Complete | src/core/providers.ts |
| n8n Planning | ✅ Complete | Obsidian Ready-to-Build |
| n8n Implementation | 🚀 Ready to Start | Ready-to-Build/n8n-local-setup/ |
| MCP Support | ⏳ Planned | Phase 3 |
| Webhook Nodes | ⏳ Planned | Phase 3 |

---

## See Also

- [GETTING-STARTED.md](GETTING-STARTED.md) — Getting started with BOZLY
- [N8N-INTEGRATION.md](N8N-INTEGRATION.md) — n8n integration guide
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture
- [API-REFERENCE.md](API-REFERENCE.md) — API reference for integrations

---

**Last Updated:** 2025-12-27 (Session 122)
**For Implementation:** See `/02-Areas/Ready-to-Build/` in Obsidian vault
