# Session 48: Build & Test Guide
## Step-by-Step Walkthrough for Manual Testing

**Purpose:** Walk through building the app, starting it, and verifying all core functionality works from a user perspective.

**Duration:** ~45-60 minutes total

**Goal:** You should be able to confidently say "the app works" and understand what a user will experience.

---

## PHASE 1: Clean Build (10 minutes)

### Step 1.1: Clean Previous Build
```bash
cd /Users/sbevere/IdeaProjects/personal/ai-vault-framework-workspace/release/bozly
npm run clean      # Remove dist/, build artifacts
rm -rf node_modules/.vite  # Clear vite cache if it exists
```

**What to look for:** No errors. Files should be removed cleanly.

### Step 1.2: Install Dependencies
```bash
npm install
```

**What to look for:**
- ✅ No ERR! messages
- ✅ "added X packages" (should be quick if already installed)
- ✅ No warnings about security vulnerabilities (or only low-risk ones)

### Step 1.3: Build TypeScript
```bash
npm run build
```

**What to look for:**
- ✅ No TS errors (error output would start with "src/")
- ✅ Command finishes with no output = success
- ✅ Check `dist/` folder exists with compiled JS

**If errors occur:**
- Note the exact error message
- Run `npm run build 2>&1 | head -50` to see first errors
- Stop and document the issue

---

## PHASE 2: Verify Installation (5 minutes)

### Step 2.1: Link CLI Globally
```bash
npm link
```

**What to look for:**
- ✅ No errors
- ✅ Output shows symlink created (or already exists)

### Step 2.2: Verify CLI is Installed
```bash
which bozly
```

**What to look for:**
- ✅ Should output a path (like `/usr/local/bin/bozly`)
- ❌ If "bozly not found", npm link failed

### Step 2.3: Test CLI Works
```bash
bozly --version
```

**What to look for:**
- ✅ Output: `0.3.0-alpha.1` (or similar version)
- ❌ "command not found" = npm link didn't work
- ❌ Error output = build failed

---

## PHASE 3: Basic Command Tests (10 minutes)

### Step 3.1: Help Command
```bash
bozly --help
```

**What to look for:**
- ✅ Shows usage information
- ✅ Lists all 7 commands:
  - init
  - list / ls
  - add
  - status
  - context
  - run
  - config
- ✅ Help text is readable (not truncated)

### Step 3.2: List Registered Vaults
```bash
bozly list
```

**What to look for:**
- ✅ Shows "Registered Vaults:" header
- ✅ Lists vaults (should show at least 1-2 from previous tests)
- ✅ Shows vault names, paths, and types
- ✅ Shows total count at bottom

### Step 3.3: Check AI Providers
```bash
bozly run --list-providers
```

**What to look for:**
- ✅ Shows "Available AI Providers:" header
- ✅ At least one provider marked with ✅ (installed)
- ✅ Helpful message about how to use providers
- ✅ No error messages

**Expected output looks like:**
```
Available AI Providers:

  ✅ Claude
  ✅ ChatGPT
  ✅ Gemini
  ❌ Ollama (Local)

To use a provider, first install it (see docs), then:
  bozly run <command> --ai <provider>
```

---

## PHASE 4: Create Fresh Test Vault (10 minutes)

### Step 4.1: Create Test Directory
```bash
mkdir -p /tmp/session-48-test && cd /tmp/session-48-test
pwd  # Verify you're in the right place
```

**What to look for:**
- ✅ `pwd` shows `/tmp/session-48-test`

### Step 4.2: Initialize Vault
```bash
bozly init --name "Session 48 Test" --type default
```

**What to look for:**
- ✅ Output shows "✔ Vault initialized successfully!"
- ✅ Shows created path: `/tmp/session-48-test`
- ✅ Shows next steps

### Step 4.3: Verify Vault Structure
```bash
ls -la .bozly/
```

**What to look for:**
- ✅ `config.json` exists (vault config)
- ✅ `context.md` exists (AI context file)
- ✅ `commands/` directory exists
- ✅ `models/` directory exists (Pattern 7)

### Step 4.4: Check Vault Config
```bash
cat .bozly/config.json | head -20
```

**What to look for:**
- ✅ JSON is valid (no parsing errors)
- ✅ Contains: name, type, defaultProvider
- ✅ Looks like: `{ "name": "Session 48 Test", "type": "default", ... }`

---

## PHASE 5: Context Generation (5 minutes)

### Step 5.1: Generate Context
```bash
bozly context
```

**What to look for:**
- ✅ Output shows markdown context
- ✅ Starts with YAML frontmatter:
  ```
  ---
  vault: Session 48 Test
  type: default
  path: /tmp/session-48-test
  provider: claude
  ---
  ```
- ✅ Has vault description section
- ✅ Has "Available Commands" section (even if empty)
- ✅ Ends cleanly (no truncation)

### Step 5.2: Check Context Size
```bash
bozly context | wc -c
```

**What to look for:**
- ✅ Should output a number (e.g., `391`)
- ✅ Should be 300-500 characters for empty vault
- ✅ Makes sense: context is being generated

---

## PHASE 6: Create Test Commands (10 minutes)

### Step 6.1: Create First Command
```bash
cat > .bozly/commands/hello.md << 'EOF'
---
name: hello
description: Greet the user and ask what they're working on
model: null
---

Say hello in a friendly way and ask the user what they're working on today.
Keep it brief and conversational.
EOF
cat .bozly/commands/hello.md
```

**What to look for:**
- ✅ File created successfully
- ✅ Content shows the command YAML frontmatter
- ✅ Content shows the prompt text

### Step 6.2: Create Model-Based Command
```bash
mkdir -p .bozly/models && cat > .bozly/models/test-score.yaml << 'EOF'
name: test-score
type: scoring
version: 1.0.0
description: Test scoring model

dimensions:
  - name: quality
    weight: 0.6
    description: Overall quality
  - name: clarity
    weight: 0.4
    description: How clear it is

levels:
  excellent:
    min: 90
  good:
    min: 70
  okay:
    min: 50
  needsWork:
    min: 0
EOF
cat .bozly/models/test-score.yaml
```

**What to look for:**
- ✅ File created successfully
- ✅ YAML is properly formatted
- ✅ Has all required fields: name, type, version, dimensions, levels

### Step 6.3: Create Model-Based Command
```bash
cat > .bozly/commands/score.md << 'EOF'
---
name: score
description: Score something using the test model
model: test-score
---

Using the test-score model, evaluate the following:
"A well-organized document with clear structure"

Provide scores for each dimension and overall assessment.
EOF
cat .bozly/commands/score.md
```

**What to look for:**
- ✅ File created
- ✅ References model: `model: test-score`
- ✅ Prompt is clear

---

## PHASE 7: Dry-Run Testing (15 minutes)

### Step 7.1: Test Simple Command (--dry)
```bash
bozly run hello --dry
```

**What to look for:**
- ✅ Output shows: "▶ Dry run mode — showing what would be executed"
- ✅ Shows full prompt between dividers:
  ```
  ─ Full Prompt (will be sent to AI)
  ─────────────────────────────────
  ```
- ✅ Prompt includes:
  - Vault context (YAML frontmatter)
  - Vault description
  - Available Commands list
  - Command content (hello.md)
- ✅ Shows execution hint at bottom: `bozly run hello --ai claude`
- ✅ No errors or warnings

**Check the formatting:**
- Is the markdown readable?
- Are command descriptions visible?
- Can you understand what would be sent to Claude?

### Step 7.2: Test Model-Based Command (--dry)
```bash
bozly run score --dry
```

**What to look for:**
- ✅ Output shows "▶ Dry run mode"
- ✅ Prompt includes model section (NEW!):
  ```
  ## Model: test-score

  Test scoring model

  **Version:** 1.0.0
  **Type:** scoring

  ### Dimensions

  **quality** (weight: 0.6)
  - Overall quality

  **clarity** (weight: 0.4)
  - How clear it is
  ```
- ✅ Model appears BEFORE the command content
- ✅ Full prompt is readable
- ✅ Shows context size in characters (should be 500+)

**This is critical:** Model integration should be seamless. Does it look good?

### Step 7.3: Test --verbose Flag (NEW in Sprint 2)
```bash
bozly run hello --dry --verbose
```

**What to look for:**
- ✅ Doesn't error (verbose flag should be accepted)
- ✅ Might show additional metadata
- ✅ Full prompt still visible

---

## PHASE 8: Provider Detection (5 minutes)

### Step 8.1: Test Multiple Providers
```bash
bozly run hello --dry --ai claude
bozly run hello --dry --ai gpt
```

**What to look for:**
- ✅ Both commands work (don't error)
- ✅ Dry-run output appears for both
- ✅ Shows: "Provider: claude" or "Provider: gpt"

### Step 8.2: Test Missing Provider (Error Handling)
```bash
bozly run hello --ai nonexistent
```

**What to look for:**
- ✅ Shows helpful error message
- ✅ Message suggests available providers
- ✅ Suggests how to install missing provider
- ❌ Should NOT crash with stack trace

---

## PHASE 9: User Experience Check (10 minutes)

### Step 9.1: Overall UX Assessment

Run through the user journey once more:

```bash
cd /tmp/session-48-test
bozly run hello --dry
```

**Ask yourself these questions:**

1. **Clarity**: Can a non-technical user understand what's happening?
   - [ ] Command name is clear: "hello"
   - [ ] Output explains what it's doing
   - [ ] Shows what will be sent to AI
   - [ ] Shows how to actually execute

2. **Error Messages**: Are errors helpful?
   - [ ] Missing commands tell you what's available
   - [ ] Missing providers show setup instructions
   - [ ] File errors point to the right location

3. **Visual Formatting**: Is the output readable?
   - [ ] Dividers separate sections
   - [ ] Markdown is properly formatted
   - [ ] No text is truncated or jumbled
   - [ ] Emojis/symbols are clear (✅, ❌, ▶)

4. **Documentation**: Are hints helpful?
   - [ ] Shows next steps
   - [ ] Explains what each part means
   - [ ] Links to more info (if applicable)

### Step 9.2: Screenshot Comparison

If you want to compare with Session 47 test:
```bash
bozly run hello --dry > /tmp/session-48-output.txt
cat /tmp/session-48-output.txt
```

**What to check:**
- Is the output identical to Session 47?
- Are there any new features visible?
- Is anything missing or broken?

---

## PHASE 10: Session Recording (NEXT STEPS - Session 48 Work)

### Step 10.1: Check Session Recording Infrastructure (Preview)
```bash
ls -la .bozly/sessions/ 2>&1
```

**Expected:** Directory might not exist yet (that's Session 48 work)

**What will happen in Session 48:**
- Executing `bozly run hello` will create session files
- `.bozly/sessions/` will have JSON recordings
- `bozly logs` will show session history
- `bozly diff` will compare sessions

---

## TROUBLESHOOTING

### Build Fails
```bash
npm run build 2>&1 | head -20
```
Share the error message.

### CLI Not Found
```bash
npm link
which bozly
echo $PATH
```

### Command Fails with "Not found"
```bash
bozly init --name test
ls -la .bozly/commands/
bozly run hello --dry
```

---

## Summary Checklist

After going through all phases, verify:

- [ ] Build: `npm run build` succeeds with 0 errors
- [ ] CLI: `bozly --version` works
- [ ] Vault: `bozly init` creates proper structure
- [ ] Context: `bozly context` generates markdown
- [ ] Commands: `bozly run <cmd> --dry` shows full prompt
- [ ] Models: Model-based commands include model in prompt
- [ ] Providers: `bozly run --list-providers` shows options
- [ ] UX: Output is readable and user-friendly
- [ ] Error Handling: Missing features show helpful messages

**If all checkboxes pass:** ✅ The app is ready!

**If any fail:** Note the issue for the next session.

---

## What's Next (Session 48)

Once you've walked through all of this and verified it works:

1. We'll integrate session recording into executeWithProvider
2. Sessions will be saved to `.bozly/sessions/`
3. We'll implement `bozly logs` command
4. We'll implement `bozly diff` command
5. Full end-to-end testing with real AI execution

---

**Notes for Session 48:**
- This guide is to be followed step-by-step in real-time
- You should run each command and report what you see
- We'll document any issues or surprises
- This validates the UX before we do session recording work
