# BOZLY Documentation

Complete user-facing documentation for the BOZLY framework.

**Last updated:** 2025-12-27 (Session 122)

---

## Getting Started

Start here if you're new to BOZLY.

### Essential First Reads

1. **[QUICK-START.md](QUICK-START.md)** ⚡ (5 minutes)
   - Install BOZLY
   - Create your first vault
   - Run your first command
   - **Read this first if you want to get started quickly**

2. **[GETTING-STARTED.md](GETTING-STARTED.md)** 📖 (20 minutes)
   - Detailed installation guide
   - Step-by-step vault creation
   - Real-world walkthroughs (music, journal, project)
   - Complete reference guide
   - **Read this for comprehensive getting started**

3. **[CONCEPTS.md](CONCEPTS.md)** 💡 (15 minutes)
   - Understand nodes (vaults)
   - How context works
   - Commands explained
   - Session recording
   - AI-agnostic design
   - **Read this to understand how BOZLY works**

4. **[FOLDER-STRUCTURE.md](FOLDER-STRUCTURE.md)** 📁 (15 minutes)
   - Complete directory layout
   - Every file explained
   - Session storage structure
   - Example vault layouts
   - **Read this to know where everything lives**

---

## Core Features (How-To Guides)

Learn how to use BOZLY's main features.

### Commands

**[COMMANDS-GUIDE.md](COMMANDS-GUIDE.md)**
- Creating custom commands
- Command structure & anatomy
- Real-world examples (3+ domains)
- Best practices
- Troubleshooting

### Workflows

**[WORKFLOWS-GUIDE.md](WORKFLOWS-GUIDE.md)** (Creating multi-step automation)
- What workflows are
- Creating workflows
- Running workflows
- Examples: discovery chains, analysis pipelines
- Condition logic
- Error handling

### Hooks

**[HOOKS-GUIDE.md](HOOKS-GUIDE.md)** (Automation triggers)
- Event-based automation
- Builtin hooks: on-init, on-command, on-session, on-cleanup
- Creating custom hooks
- Real examples

### Templates

**[TEMPLATES-GUIDE.md](TEMPLATES-GUIDE.md)** (Pre-configured vaults)
- Using starter templates
- Creating custom templates
- Sharing templates
- Template structure

### Context

**[CONTEXT-GUIDE.md](CONTEXT-GUIDE.md)** (AI knowledge management)
- What goes in context
- Writing effective context
- Updating context
- Context best practices
- Examples for different domains

### Sessions

**[SESSIONS-GUIDE.md](SESSIONS-GUIDE.md)** (Session history & management)
- Viewing sessions
- Querying sessions
- Session analytics
- Exporting sessions
- Session cleanup

### Memory

**[MEMORY-GUIDE.md](MEMORY-GUIDE.md)** (Knowledge extraction & injection)
- Memory system overview
- Extracting from sessions
- Injecting into context
- Building your knowledge base
- Advanced patterns

### AI Providers

**[AI-PROVIDERS-GUIDE.md](AI-PROVIDERS-GUIDE.md)** (Configuring AI)
- Supported providers: Claude, GPT, Gemini, Ollama
- Installation & setup
- Configuration
- Switching providers
- Cost tracking

---

## Advanced Features

Power user capabilities.

### Search

**[SEARCH-GUIDE.md](SEARCH-GUIDE.md)**
- Cross-node search
- Query syntax
- Filtering sessions
- Finding patterns
- Advanced queries

### Smart Routing

**[SMART-ROUTING.md](SMART-ROUTING.md)**
- Intelligent command routing
- Context-aware execution
- Conditional logic
- Performance optimization

### Suggestions

**[SUGGESTIONS-GUIDE.md](SUGGESTIONS-GUIDE.md)**
- AI-powered suggestions
- Command recommendations
- Usage pattern analysis
- Optimization hints

### Cleanup

**[CLEANUP-GUIDE.md](CLEANUP-GUIDE.md)**
- Automatic session cleanup
- Duration parsing
- Retention policies
- Archive strategies

### Versioning

**[VERSIONING-GUIDE.md](VERSIONING-GUIDE.md)**
- Command versioning
- Version management
- Migration guides
- Backwards compatibility

### Domain Models

**[DOMAIN-MODELS-GUIDE.md](DOMAIN-MODELS-GUIDE.md)**
- Domain-specific models
- Creating domain models
- Using with context
- Model inheritance

---

## Technical Reference

Complete technical documentation.

### CLI Reference

**[CLI-REFERENCE.md](CLI-REFERENCE.md)**
- All 19 BOZLY commands
- Options & flags for each
- Usage examples
- Output formats
- Exit codes

### API Reference

**[API-REFERENCE.md](API-REFERENCE.md)**
- TypeScript API
- Core functions
- Type definitions
- Examples
- Error handling

### Configuration Reference

**[CONFIGURATION-REFERENCE.md](CONFIGURATION-REFERENCE.md)**
- All config options
- File locations
- Environment variables
- Defaults
- Schema

---

## System Architecture

Deep dives into system design.

### Architecture

**[ARCHITECTURE.md](ARCHITECTURE.md)**
- System design overview
- Component breakdown
- Data flow
- Storage design
- Scalability considerations

### Context Loading

**[CONTEXT-LOADING.md](CONTEXT-LOADING.md)**
- How context is loaded
- Loading order
- Caching
- Performance
- Troubleshooting

### Session Recording

**[SESSION-RECORDING-GUIDE.md](SESSION-RECORDING-GUIDE.md)**
- Session format
- What's recorded
- Session metadata
- Querying sessions
- Archival

---

## Infrastructure & Tools

Server, integrations, and tools.

### Web Dashboard

**[SERVE.md](SERVE.md)**
- Starting the web server
- Dashboard features
- REST API endpoints
- Web interface usage
- Configuration

### n8n Integration

**[N8N-INTEGRATION.md](N8N-INTEGRATION.md)**
- BOZLY in n8n
- Workflow automations
- Integration patterns
- Examples

---

## Project Information

### Roadmap

**[ROADMAP.md](ROADMAP.md)**
- Phase 1-4 roadmap
- Feature timeline
- Version releases
- Future direction

### Ecosystem

**[ECOSYSTEM.md](ECOSYSTEM.md)**
- Integrations
- MCP servers
- Plugins
- Community tools
- Contributing

---

## Documentation Navigation

### By User Level

**Beginner**
1. [QUICK-START.md](QUICK-START.md)
2. [GETTING-STARTED.md](GETTING-STARTED.md)
3. [CONCEPTS.md](CONCEPTS.md)

**Intermediate**
1. [COMMANDS-GUIDE.md](COMMANDS-GUIDE.md)
2. [FOLDER-STRUCTURE.md](FOLDER-STRUCTURE.md)
3. [SESSIONS-GUIDE.md](SESSIONS-GUIDE.md)
4. [CONTEXT-GUIDE.md](CONTEXT-GUIDE.md)

**Advanced**
1. [WORKFLOWS-GUIDE.md](WORKFLOWS-GUIDE.md)
2. [HOOKS-GUIDE.md](HOOKS-GUIDE.md)
3. [SMART-ROUTING.md](SMART-ROUTING.md)
4. [SUGGESTIONS-GUIDE.md](SUGGESTIONS-GUIDE.md)
5. [SEARCH-GUIDE.md](SEARCH-GUIDE.md)

**Developer**
1. [CLI-REFERENCE.md](CLI-REFERENCE.md)
2. [API-REFERENCE.md](API-REFERENCE.md)
3. [ARCHITECTURE.md](ARCHITECTURE.md)
4. [CONFIGURATION-REFERENCE.md](CONFIGURATION-REFERENCE.md)

### By Task

**I want to...**

| Task | Read |
|------|------|
| Get started quickly | [QUICK-START.md](QUICK-START.md) |
| Understand how BOZLY works | [CONCEPTS.md](CONCEPTS.md) |
| Create a vault | [GETTING-STARTED.md](GETTING-STARTED.md) |
| Know where files live | [FOLDER-STRUCTURE.md](FOLDER-STRUCTURE.md) |
| Write better commands | [COMMANDS-GUIDE.md](COMMANDS-GUIDE.md) |
| Automate workflows | [WORKFLOWS-GUIDE.md](WORKFLOWS-GUIDE.md) |
| Setup automation triggers | [HOOKS-GUIDE.md](HOOKS-GUIDE.md) |
| Use templates | [TEMPLATES-GUIDE.md](TEMPLATES-GUIDE.md) |
| Write AI context | [CONTEXT-GUIDE.md](CONTEXT-GUIDE.md) |
| Manage sessions | [SESSIONS-GUIDE.md](SESSIONS-GUIDE.md) |
| Setup memory system | [MEMORY-GUIDE.md](MEMORY-GUIDE.md) |
| Use different AI | [AI-PROVIDERS-GUIDE.md](AI-PROVIDERS-GUIDE.md) |
| Search across vaults | [SEARCH-GUIDE.md](SEARCH-GUIDE.md) |
| Find CLI commands | [CLI-REFERENCE.md](CLI-REFERENCE.md) |
| Use the API | [API-REFERENCE.md](API-REFERENCE.md) |
| Setup the web server | [SERVE.md](SERVE.md) |
| See the roadmap | [ROADMAP.md](ROADMAP.md) |

---

## Documentation Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| QUICK-START | ✅ | 2025-12-27 |
| GETTING-STARTED | ✅ | 2025-12-27 |
| CONCEPTS | ✅ | 2025-12-27 |
| FOLDER-STRUCTURE | ✅ | 2025-12-27 |
| COMMANDS-GUIDE | 🔄 | In Progress |
| WORKFLOWS-GUIDE | 🔄 | In Progress |
| HOOKS-GUIDE | 🔄 | In Progress |
| TEMPLATES-GUIDE | 🔄 | In Progress |
| CONTEXT-GUIDE | 🔄 | In Progress |
| SESSIONS-GUIDE | 🔄 | In Progress |
| MEMORY-GUIDE | ✅ | 2025-12-24 |
| AI-PROVIDERS-GUIDE | 🔄 | In Progress |
| SEARCH-GUIDE | ✅ | 2025-12-24 |
| SMART-ROUTING | ✅ | 2025-12-24 |
| SUGGESTIONS-GUIDE | ✅ | 2025-12-24 |
| CLEANUP-GUIDE | ✅ | 2025-12-23 |
| VERSIONING-GUIDE | ✅ | 2025-12-22 |
| DOMAIN-MODELS-GUIDE | ✅ | 2025-12-22 |
| CLI-REFERENCE | 🔄 | In Progress |
| API-REFERENCE | 🔄 | In Progress |
| CONFIGURATION-REFERENCE | 🔄 | In Progress |
| ARCHITECTURE | ✅ | 2025-12-22 |
| CONTEXT-LOADING | ✅ | 2025-12-22 |
| SESSION-RECORDING-GUIDE | ✅ | 2025-12-22 |
| SERVE | ✅ | 2025-12-25 |
| N8N-INTEGRATION | ✅ | 2025-12-22 |
| ROADMAP | ✅ | 2025-12-24 |
| ECOSYSTEM | ✅ | 2025-12-22 |

---

## Key Documentation Principles

### 1. Clear Organization
- By user journey (beginner → advanced)
- By feature
- By task
- Multiple navigation paths

### 2. Real Examples
- Music domain (album reviews, discovery)
- Journal domain (reflection, tracking)
- Project domain (sprint planning, standup)
- General examples (quick notes, brainstorm)

### 3. Complete Information
- What & why (purpose)
- How to (walkthrough)
- Real examples (3-5 per feature)
- Troubleshooting (common issues)

### 4. Consistency
- Same structure across guides
- Consistent terminology
- Cross-references between docs
- Updated timestamps

### 5. Accessibility
- Quick start for impatient users
- Detailed guides for learners
- Reference for developers
- Examples for all domains

---

## Getting Help

### Within Documentation

- **Search:** Use your browser's find (Ctrl+F or Cmd+F)
- **Navigation:** Use "Next Steps" at end of each doc
- **Examples:** Look for domain-specific examples
- **Troubleshooting:** Check the Troubleshooting section

### Online

- **GitHub Issues:** [github.com/RetroGhostLabs/bozly/issues](https://github.com/RetroGhostLabs/bozly/issues)
- **Discussions:** [github.com/RetroGhostLabs/bozly/discussions](https://github.com/RetroGhostLabs/bozly/discussions)

### In the CLI

```bash
bozly --help              # General help
bozly <command> --help    # Command-specific help
bozly doctor              # Diagnose issues
```

---

## How Documentation Is Organized

### By Audience

- **Getting Started** → For new users
- **How-To Guides** → For learning features
- **Reference** → For technical details
- **Architecture** → For system understanding

### By Scope

- **Quick Start** → 5 minutes
- **Getting Started** → 20 minutes
- **Feature Guides** → 10-30 minutes each
- **Reference** → As-needed lookup

### By Completeness

- **Concept docs** → Why & how
- **Feature guides** → All aspects of a feature
- **Reference** → Comprehensive technical details
- **Examples** → Real-world usage

---

## Contributing to Documentation

See [CONTRIBUTING.md](../CONTRIBUTING.md) in the root of the repository.

---

*BOZLY: Build. OrganiZe. Link. Yield.*

*Last updated: 2025-12-27 (Session 122)*
