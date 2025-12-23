# IntelliJ IDE Setup Guide for BOZLY Development

**Status:** Latest | **Updated:** 2025-12-22

Complete guide to setting up your IntelliJ IDE for BOZLY development, including run configurations, keyboard shortcuts, and best practices.

---

## Quick Start (2 minutes)

### 1. Open the Project

```bash
# Clone or open the bozly project in IntelliJ
open -a "IntelliJ IDEA" /path/to/bozly
```

### 2. First Build

1. **IntelliJ should auto-detect Node.js and npm**
2. Open the "Run" menu → Select "Build"
3. Watch the output in the "Run" tool window

That's it! IntelliJ is configured and ready to go.

---

## What's Pre-Configured

### EditorConfig (`.editorconfig`)

**What it does:** Ensures consistent coding style across all IDEs
- 2-space indentation for TypeScript/JavaScript
- UTF-8 charset
- LF line endings
- Trim trailing whitespace

**You don't need to do anything** — IntelliJ respects `.editorconfig` automatically.

### Run Configurations (`.idea/runConfigurations/`)

**What it does:** Pre-configured buttons in IntelliJ Run menu for common tasks

IntelliJ automatically loads these:
- **Build** — Compile TypeScript
- **Dev Watch** — Watch mode (auto-compile on save)
- **Test** — Run test suite once
- **Test Watch** — Watch mode for tests
- **Validate** — Full pre-commit validation
- **CLI** — Run bozly command

### Makefile (`Makefile`)

**What it does:** Alternative way to run commands (optional)

```bash
make build           # or npm run build
make test            # or npm run test
make validate        # or npm run validate
```

Use whichever you prefer — npm scripts or make.

---

## Typical Development Workflow

### Scenario 1: Building Your Changes

**Option A: Using IntelliJ Run Menu**
1. Edit TypeScript files in `src/`
2. Top menu → **Run** → Click **"Build"**
3. Watch output in "Run" tool window
4. If errors, fix them and rebuild

**Option B: Using Dev Watch (Recommended)**
1. Top menu → **Run** → Click **"Dev Watch"**
2. Leave it running in the background
3. Every time you save a file, it auto-compiles
4. No need to manually rebuild

**Option C: Using Terminal**
```bash
npm run dev         # or: make dev
```

### Scenario 2: Running Tests

**While Coding (Watch Mode)**
1. Top menu → **Run** → Click **"Test Watch"**
2. Leave it running
3. Every time you save, tests re-run
4. See failures immediately

**Before Committing (Full Suite)**
1. Top menu → **Run** → Click **"Test"**
2. Runs all tests once
3. Shows coverage report

**With UI (Visual)**
1. Top menu → **Run** → Click in "Run" tool window
2. Look for "Test UI" option
3. Opens browser with interactive test UI

### Scenario 3: Full Validation Before Commit

```bash
# Recommended: Run this before git commit
make validate
# or
npm run validate
```

This runs:
1. ESLint (code quality)
2. Prettier (formatting)
3. TypeScript compilation
4. Full test suite with coverage

If everything passes ✅, safe to commit.

---

## Using IntelliJ's Run Menu

### Access Run Configurations

```
Top Menu → Run
```

You'll see:
```
├─ Build
├─ Dev Watch
├─ Test
├─ Test Watch
├─ Validate
├─ CLI
└─ ... other configs
```

### Modify or Create Configurations

1. Top Menu → **Run** → **Edit Configurations**
2. Modify existing or create new
3. Changes are saved to `.idea/runConfigurations/`

### Run with Keyboard Shortcut

- **Mac:** `Control + R` (currently selected)
- **Windows/Linux:** `Shift + F10`

---

## IntelliJ Built-In Features

### TypeScript Compilation

IntelliJ can auto-compile TypeScript:
1. Top Menu → **Settings** → **Languages & Frameworks** → **TypeScript**
2. Enable "Recompile on changes"
3. Now IntelliJ auto-compiles in background

**But we recommend using `npm run dev`** instead (better control).

### ESLint Integration

IntelliJ shows ESLint errors **inline in your editor**:

1. Top Menu → **Settings** → **Languages & Frameworks** → **JavaScript** → **Code Quality Tools** → **ESLint**
2. Enable "ESLint"
3. Choose "Automatic ESLint configuration"
4. Now you see errors as you type (red squiggles)

### Prettier Integration

IntelliJ can auto-format on save:

1. Top Menu → **Settings** → **Languages & Frameworks** → **JavaScript** → **Prettier**
2. Enable "Prettier"
3. Set "Run for files": `*.{ts,tsx,js,jsx,json}`
4. Enable "On code reformat"
5. Enable "On save"

Now your code auto-formats when you save!

---

## Debugging TypeScript

### Debug a Test

1. Right-click on a test file in Project view
2. Select **Run** (to run once) or **Debug** (with debugger)
3. Debugger opens with breakpoints

### Debug the CLI

1. Create a debug configuration:
   - Top Menu → **Run** → **Edit Configurations**
   - Click **+** → **Node.js**
   - Set JavaScript file: `dist/cli/index.js`
   - Set arguments: `run daily` (or your command)
2. Click **Debug** button

### Set Breakpoints

1. Click in the margin left of line number
2. Red dot appears (breakpoint)
3. Run in debug mode and execution pauses at breakpoint

---

## Project Structure in IntelliJ

```
bozly/
├── src/
│   ├── core/              ← Core library
│   ├── cli/               ← CLI commands
│   └── index.ts
├── tests/
│   ├── unit/              ← Unit tests
│   ├── integration/       ← Integration tests
│   └── fixtures/          ← Test data
├── dist/                  ← Compiled output (generated)
├── coverage/              ← Coverage reports (generated)
├── .idea/                 ← IntelliJ configuration
│   └── runConfigurations/ ← Run button configs
├── .editorconfig          ← Shared IDE formatting
├── Makefile               ← Optional: make commands
├── tsconfig.json          ← TypeScript config
├── package.json           ← npm config & scripts
└── README.md
```

---

## Common Tasks

### Task 1: Add a New Command

```bash
# 1. Create file
touch src/cli/commands/mycommand.ts

# 2. Implement command
# (Use existing commands as template)

# 3. Test it
make test-watch

# 4. Validate before commit
make validate
```

### Task 2: Fix a Bug

```bash
# 1. Start dev watch
make dev

# 2. Also start test watch
make test-watch
# (In separate terminal)

# 3. Edit files in src/
# (They auto-compile and tests re-run)

# 4. When fixed, run validate
make validate

# 5. Commit
git commit -m "fix: description of fix"
```

### Task 3: Add a Feature

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Start dev watch + test watch
make dev
make test-watch

# 3. Write code + tests
# (Auto-compile and test as you go)

# 4. Validate before commit
make validate

# 5. Commit
git commit -m "feat: description of feature"

# 6. Push and create PR
git push origin feature/my-feature
```

### Task 4: Before Committing

**Always run this:**
```bash
make validate
```

This ensures:
- ✅ Code passes ESLint
- ✅ Code is properly formatted
- ✅ TypeScript compiles
- ✅ All tests pass with coverage

If all green ✅, safe to commit.

---

## Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Run selected config | Control + R | Shift + F10 |
| Stop running task | Control + C | Control + C |
| Format code | Option + Command + L | Ctrl + Alt + L |
| Reformat selection | Option + Command + L | Ctrl + Alt + L |
| Go to definition | Command + Click or Command + B | Ctrl + Click or Ctrl + B |
| Find usages | Option + F7 | Alt + F7 |
| Rename symbol | Shift + F6 | Shift + F6 |
| Find in files | Command + Shift + F | Ctrl + Shift + F |

---

## Troubleshooting

### "Node interpreter not found"

**Problem:** IntelliJ can't find Node.js

**Solution:**
1. Top Menu → **Settings** → **Languages & Frameworks** → **Node.js**
2. Click **"..."** button to configure Node interpreter
3. Select your Node.js installation (should be auto-detected)

### "npm scripts not showing in Run menu"

**Problem:** Run configurations aren't showing

**Solution:**
1. Close IntelliJ completely
2. Delete `.idea/` folder (or just the runConfigurations subfolder)
3. Reopen project
4. IntelliJ will regenerate configurations

### Build output is messy / unclear

**Problem:** Console output is hard to read

**Solution:**
1. Open **Settings** → **Editor** → **Color Scheme** → **Console**
2. Configure colors to your preference
3. Or just run commands in terminal instead: `npm run build`

### Tests not running

**Problem:** Tests fail or don't run

**Solution:**
1. Verify Node.js is installed: `node --version`
2. Verify dependencies are installed: `npm ci`
3. Try manual run in terminal: `npm run test`
4. Check test files don't have `it.skip()` or `describe.skip()`

---

## Tips & Best Practices

### Tip 1: Use Dev Watch + Test Watch Together

Open two IntelliJ "Run" tabs:
1. **Tab 1:** Dev Watch (TypeScript compilation)
2. **Tab 2:** Test Watch (test execution)

Now both auto-run as you edit.

### Tip 2: Terminal is Still Useful

For some tasks, terminal is faster:
```bash
npm run build           # Faster than clicking buttons
npm run validate        # Shows full output clearer
make help              # See all commands
```

### Tip 3: Commit Often

With auto-compile and auto-test, you're safe to commit frequently.

### Tip 4: Use `.only` for Focused Testing

```typescript
// Only this test runs (great for debugging)
it.only("should do X", async () => {
  // test code
});
```

Remove `.only` before committing!

### Tip 5: Read the Output

When tests fail:
1. Read the full error message in the Run output
2. It usually tells you exactly what's wrong
3. Line numbers point to the problem

---

## Integration with Git/GitHub

### Before Pushing a Branch

```bash
# Verify everything passes
make validate

# If all green, safe to push
git push origin feature/my-feature
```

### Before Creating a Release

See `RELEASE.md` for complete release workflow, but the quick version:

```bash
make validate                    # Verify code locally
make clean                       # Clean build artifacts
npm run build                    # Fresh build
docker compose ... up            # Run Docker tests
npm version patch|minor|major    # Bump version & create tag
git push origin main --tags      # Push (GitHub Actions takes over)
```

---

## Future: VS Code Support

This project currently targets IntelliJ. If you use VS Code:

1. `.editorconfig` still works (universal)
2. You can create `.vscode/settings.json` (auto-format on save, etc.)
3. Run commands still work from terminal

VS Code support can be added in a future session. For now, use IntelliJ or terminal.

---

## Quick Reference

```bash
# Development
npm run dev              # Watch mode compilation
npm run test:watch      # Watch mode tests
npm run test:ui         # Browser-based test UI

# Before committing
npm run validate        # Lint → Format → Build → Test

# Utility commands
npm run build           # One-time compile
npm run test            # Run tests once
npm run lint            # Check for errors
npm run lint:fix        # Auto-fix errors
npm run format          # Auto-format code
npm run clean           # Remove artifacts

# Or use make
make dev
make test-watch
make validate
make help              # See all make commands
```

---

## Questions?

- **TypeScript issues?** Check `tsconfig.json`
- **Test issues?** Run `npm run test` in terminal for clearer output
- **Build issues?** Run `npm run build` and read error messages
- **ESLint issues?** Run `npm run lint` to see all errors

---

**Last Updated:** 2025-12-22
**Maintainers:** BOZLY Development Team
