# Contributing to BOZLY

Thank you for your interest in contributing to BOZLY!

---

## Ways to Contribute

### Report Bugs
Found a bug? [Open an issue](https://github.com/RetroGhostLabs/bozly/issues) with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Your environment (OS, Node version, AI CLI)

### Suggest Features
Have an idea? [Start a discussion](https://github.com/RetroGhostLabs/bozly/discussions) with:
- Use case description
- Proposed solution
- Alternatives considered

### Share Your Node
Built something cool? Share it:
- Create a GitHub repo with your node structure
- Post in [Discussions](https://github.com/RetroGhostLabs/bozly/discussions)
- We'll feature interesting nodes in the docs

### Improve Documentation
- Fix typos or unclear explanations
- Add examples
- Improve getting started guide
- Translate documentation

### Contribute Code
- Fix bugs
- Implement features
- Improve tests
- Enhance CLI commands

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm 8+
- Git

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/RetroGhostLabs/bozly.git
cd bozly

# Install dependencies
npm install

# Link for local development
npm link

# Verify installation
bozly --version
```

### Project Structure

```
bozly/
├── src/                    # TypeScript source
│   ├── cli/                # CLI commands
│   ├── core/               # Core functionality
│   └── utils/              # Utilities
├── dist/                   # Compiled JavaScript
├── docs/                   # Documentation
├── examples/               # Example nodes
├── tests/                  # Test files
├── package.json
└── tsconfig.json
```

### Build

```bash
# Compile TypeScript
npm run build

# Watch mode (development)
npm run dev
```

### Test

```bash
# Run all tests
npm test

# Run specific test
npm test -- --grep "init command"

# Test coverage
npm run coverage
```

---

## Code Guidelines

### TypeScript
- Use TypeScript for all source code
- Enable strict mode
- Document public APIs with JSDoc

### Style
- Use Prettier for formatting
- Use ESLint for linting
- Follow existing patterns in codebase

### Commits
Use conventional commits:
```
feat: add new command
fix: resolve config parsing issue
docs: update getting started guide
test: add init command tests
refactor: simplify node loading
```

### Pull Requests
1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Write/update tests
5. Update documentation
6. Submit PR with clear description

---

## Pull Request Checklist

Before submitting:

- [ ] Code compiles (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow convention
- [ ] PR description explains changes

---

## Architecture Overview

### Core Concepts

**Node:** Self-contained workspace with `.bozly/` folder
**Context:** AI context file (`.bozly/context.md`)
**Command:** User-invoked action (`.bozly/commands/*.md`)
**Session:** Conversation history (`.bozly/sessions/*.json`)

### Key Files

| File | Purpose |
|------|---------|
| `src/cli/index.ts` | CLI entry point |
| `src/core/node.ts` | Node operations |
| `src/core/context.ts` | Context management |
| `src/core/session.ts` | Session handling |

### Design Principles

1. **AI-Agnostic:** Works with any AI CLI
2. **User Owns Data:** Three-tier separation
3. **CLI-First:** No GUI required
4. **Simple Storage:** JSON files (for now)

---

## Getting Help

- **Questions:** [GitHub Discussions](https://github.com/RetroGhostLabs/bozly/discussions)
- **Bugs:** [GitHub Issues](https://github.com/RetroGhostLabs/bozly/issues)
- **Chat:** (Coming soon)

---

## Code of Conduct

Be respectful and constructive. We're all here to build something useful.

- Be welcoming to newcomers
- Assume good intent
- Focus on the work, not the person
- Give and receive feedback gracefully

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

*BOZLY: Build. OrganiZe. Link. Yield.*

*Last updated: 2025-12-16*
