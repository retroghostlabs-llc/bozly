# Changelog

All notable changes to BOZLY will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0-beta.1] - 2025-12-21

### Added - Release Preparation
- [x] **Version bump to 0.3.0-beta.1**
  - Framework ready for public beta testing
  - All Phase 1 features implemented and tested
  - Comprehensive documentation in place

### Added - Vault Removal & Cleanup
- [x] **Vault Removal** (`bozly remove` command)
  - Remove vault by name or path
  - Optional timestamped backups (`--backup`, stored in `~/.bozly/backups/`)
  - Delete vault files from disk with confirmation
  - Keep files option (`--keep-files`) - remove from registry only
  - Force flag (`--force`) to skip confirmation
  - Full logging and user-friendly output
- [x] **Test Cleanup Infrastructure**
  - Auto-cleanup of test vaults in `afterEach()` hook
  - Removes vaults with `/.tmp/` in path
  - Global registry cleanup after test runs
  - Non-blocking failures (don't fail tests if cleanup fails)
- [x] **Bug Fixes**
  - Fixed BOZLY acronym display: "Build. OrganiZe. Link. Yield." (capital Z)
  - Updated across all source files, docs, and examples

### Planned for v0.3.0 (Phase 1 Beta)
- [x] TypeScript CLI (`bozly` command)
- [x] Vault initialization (`bozly init`)
- [x] Vault registry (`bozly list`, `bozly add`)
- [x] Vault removal (`bozly remove`)
- [x] Context generation (`bozly context`)
- [x] AI piping (`bozly run`)
- [ ] npm package distribution
- [ ] Homebrew formula
- [ ] 3 example vaults (music, journal, content)

### Planned for v0.4.0-v0.5.0 (Phase 2 Polish)
- [ ] Hooks system (session-start, session-end, post-tool)
- [ ] Workflows (multi-step processes)
- [ ] Cross-vault queries (`bozly search --all`)
- [ ] Session history viewer (`bozly history`)
- [ ] Task tracking (`bozly tasks`)
- [ ] Comprehensive test suite

### Planned for v1.0.0 (Phase 3 Ecosystem)
- [ ] Community vault registry
- [ ] `bozly search <query>` — Search community vaults
- [ ] `bozly install <vault>` — Install vault templates
- [ ] Vault publishing (`bozly publish`)
- [ ] Optional SDK integration

### Planned for v2.0.0+ (Phase 4 Advanced)
- [ ] Shadow Git checkpoints (undo/rollback)
- [ ] SQLite storage option
- [ ] Skills system (auto-invoke based on context)
- [ ] Full marketplace (if demand exists)
- [ ] Desktop app (Electron, if demand exists)

---

## [0.3.0-dev] - 2025-12-16

### Added - Architecture & Design

#### BOZLY Rebrand
- **New name:** BOZLY (Build. OrganiZe. Link. Yield.)
- **New tagline:** "Build. OrganiZe. Link. Yield."
- **New folder convention:** `.bozly/` (was `.ai-vault/` and `.claude/`)

#### AI-Agnostic Architecture
- **Context provider model:** BOZLY prepares prompts, any AI CLI executes
- **Multi-AI support:** Claude, GPT, Gemini, Ollama, any CLI
- **Single context file:** `.bozly/context.md` works with all AIs
- **AI switching:** `bozly run daily --ai gpt`

#### TypeScript Foundation
- **Language:** TypeScript from start (was Python/Bash)
- **Distribution:** npm, Homebrew (was git clone + setup.sh)
- **Architecture:** Cline-style task folders

#### Three-Tier Safety Model
- **Tier 1:** Framework core (BOZLY releases update)
- **Tier 2:** Global user config (`~/.bozly/`) — user-owned
- **Tier 3:** Vault config (`.bozly/`) — user-owned

#### Documentation
- Updated all docs for BOZLY architecture
- New CLI-DESIGN.md with complete command reference
- New BOZLY-ROADMAP.md with phased plan
- Architecture decisions documented (21 total)

### Changed

#### Folder Structure
- `~/.ai-vault/` → `~/.bozly/`
- `.claude/` → `.bozly/`
- `CLAUDE.md` → `.bozly/context.md`
- `WORK-LOG.md` → `.bozly/sessions/`

#### Technology
- Python scripts → TypeScript modules
- Bash setup → npm install
- Claude-focused → AI-agnostic

### Removed
- AI adapter system (replaced by AI-agnostic piping)
- VAULT-CONTEXT.md symlinks (single context.md file)
- Python dependencies (TypeScript only)

---

## Migration from AI Vault Framework

If upgrading from AI Vault Framework (v0.2.0-beta):

| Old | New |
|-----|-----|
| `ai-vault-framework` | `bozly` |
| `~/.ai-vault/` | `~/.bozly/` |
| `.claude/` | `.bozly/` |
| `CLAUDE.md` | `.bozly/context.md` |
| `WORK-LOG.md` | `.bozly/sessions/` |
| `setup.sh` | `npm install -g bozly` |

Run `bozly migrate` to convert existing vaults.

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 0.3.0-dev | 2025-12-16 | BOZLY rebrand, TypeScript, AI-agnostic |
| 0.2.0-beta | 2025-12-12 | AI Vault Framework (Python/Bash) |
| 0.1.0-alpha | 2025-11-15 | Initial framework concept |

---

*BOZLY: Build. OrganiZe. Link. Yield.*
