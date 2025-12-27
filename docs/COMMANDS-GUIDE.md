# BOZLY Commands Guide

Complete guide to creating, managing, and using commands in BOZLY.

**Last updated:** 2025-12-27 (Session 122)

---

## Table of Contents

1. [What Are Commands?](#what-are-commands)
2. [Command Basics](#command-basics)
3. [Creating Commands](#creating-commands)
4. [Command Structure](#command-structure)
5. [Running Commands](#running-commands)
6. [Command Resolution](#command-resolution)
7. [Real Examples](#real-examples)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## What Are Commands?

A **command** is a reusable prompt that defines a specific AI task in your vault.

### Key Points

- Written in markdown (`.md` format)
- Stored in `commands/` directory
- Executed with `bozly run <command-name>`
- Automatically gets your vault's context
- Saves results to session history

### Examples of Commands

**Music Vault:**
- `album-review.md` — Deep dive analysis of an album
- `discovery-session.md` — Find new music to listen to
- `artist-spotlight.md` — Learn about a specific artist

**Journal Vault:**
- `daily-reflection.md` — End-of-day journaling
- `weekly-review.md` — Week in review
- `gratitude-practice.md` — Gratitude journaling

**Project Vault:**
- `sprint-planning.md` — Plan upcoming sprint
- `standup.md` — Daily standup meeting notes
- `retrospective.md` — Sprint retrospective

---

## Command Basics

### Simple Example

Here's the simplest possible command:

```markdown
# Quick Idea

I have an idea to capture. Help me:
1. Summarize it in one sentence
2. Break it into key points
3. Suggest next steps
```

Save as: `.bozly/commands/quick-idea.md`

Run with:
```bash
bozly run quick-idea
```

### How It Works

When you run a command:

1. BOZLY loads your vault's **context** (`.bozly/context.md`)
2. BOZLY loads the **command** (`.bozly/commands/quick-idea.md`)
3. BOZLY combines them into a single prompt
4. BOZLY pipes the prompt to your AI
5. BOZLY saves the session

**In code:**
```
Context: "I'm a music enthusiast. I like jazz fusion..."
Command: "I have an idea to capture..."
Combined: [context] + [command]
→ Send to AI
→ Save session
```

---

## Creating Commands

### Method 1: Interactive Creation (Recommended)

```bash
bozly command create
```

This launches a wizard:

```
? What's the name of this command?
> album-analysis

? Brief description:
> Deep analysis of an album's production and composition

? Where should this command live?
> This vault (album-analysis in .bozly/commands/)

? Template to start with?
> blank

Creating command: album-analysis.md
```

### Method 2: Manual Creation

Create a markdown file directly:

```bash
cat > .bozly/commands/album-analysis.md << 'EOF'
# Album Analysis

I'm going to tell you about an album. Please help me:

1. **What's Your First Impression?**
2. **Production Quality** — How would you rate the production? (1-10)
3. **Best Tracks** — What are the 3-5 essential tracks?
4. **Overall Rating** — Where does this rank for me?

Please be specific with production details and comparisons.
EOF
```

### Method 3: Copy & Modify

Start with an existing command and adapt it:

```bash
cp .bozly/commands/quick-note.md .bozly/commands/music-note.md
vim .bozly/commands/music-note.md  # Edit as needed
```

---

## Command Structure

### Complete Example

```markdown
# Album Deep Dive

## Purpose
Detailed analysis of an album with production focus.

## Context
This vault focuses on music discovery and production analysis.
I want detailed technical insights, not just casual commentary.

## Instructions
I'm going to tell you about an album. Please help me understand it:

1. **First Impressions**
   - What stands out immediately?
   - Mood/vibe overall?

2. **Production & Sound Design**
   - Production quality rating (1-10)
   - Key production choices
   - Mixing and mastering notes
   - Sonic innovations

3. **Composition & Arrangement**
   - Song structures (verses, choruses, bridges)
   - Harmonic interesting elements
   - Standout compositional moments

4. **Best Tracks (Top 3-5)**
   - Track names with timestamps of best moments
   - Why each is essential
   - How they fit in the album

5. **Artist Context**
   - Where does this fit in their discography?
   - Evolution from previous work?
   - What makes this album unique?

6. **Recommendations**
   - Similar albums or artists
   - Suggested listening order if non-linear
   - Where to listen (streaming service/format)

7. **Overall Rating & Summary**
   - Personal rating (1-10)
   - One-sentence summary
   - Who should listen to this?

## Format Guidelines
- Be specific with timestamps and production details
- Reference other albums for comparison
- Include audio quality recommendations
- Suggest YouTube videos or reviews to watch

## Output Format
Use clear headings and bullet points for readability.
Include sections for each analysis point above.
```

### Key Components

#### 1. **Title**
```markdown
# Album Deep Dive
```
- Use clear, descriptive title
- Becomes the command's display name
- Visible when users list commands

#### 2. **Purpose Section (Optional)**
```markdown
## Purpose
What this command is for, when to use it.
```
- Why this command exists
- When users should run it
- What problem it solves

#### 3. **Instructions**
```markdown
## Instructions
The actual prompt that goes to the AI.
```
- Your complete instructions to the AI
- What questions to answer
- What analysis to provide
- How to format output
- Most important part!

#### 4. **Format Guidelines (Optional)**
```markdown
## Format Guidelines
How to structure the output.
```
- Output format preferences
- Markdown conventions
- Length expectations
- Special formatting

#### 5. **Examples (Optional)**
```markdown
## Examples
Sample inputs/outputs showing expected behavior.
```
- Example questions
- Example outputs
- Shows what "good" looks like

---

## Running Commands

### Basic Execution

```bash
# Run a command
bozly run album-review

# The AI will prompt you for input
# Type/paste your response
# Results saved to .bozly/sessions/
```

### With Specific AI Provider

```bash
# Use GPT instead of your default
bozly run album-review --ai gpt

# Use Gemini
bozly run album-review --ai gemini

# Use local Ollama
bozly run album-review --ai ollama
```

### With Input Directly

```bash
# Provide input inline (non-interactive)
bozly run summarize --input "Your content here..."

# Useful for piping from other commands
cat my-notes.txt | bozly run summarize --input -
```

### View Available Commands

```bash
# List all commands
bozly command list

# Shows output like:
# Vault Commands (3):
#   album-review       Album Deep Dive
#   discovery          Music Discovery Session
#   artist-spotlight   Learn About an Artist
#
# Global Commands (2):
#   quick-note         Quick idea capture
#   weekly-review      Week in review
```

---

## Command Resolution

BOZLY looks for commands in this order:

```
1. .bozly/commands/album-review.md     (vault-specific)
           ↓ (if not found)
2. ~/.bozly/commands/album-review.md   (global)
           ↓ (if not found)
3. Framework defaults                   (builtin)
           ↓ (if not found)
4. Command not found error
```

### Practical Example

You have these commands:

```
~/.bozly/commands/
└── summarize.md          (global summarize)

~/music/.bozly/commands/
└── summarize.md          (music-specific summarize)
```

When you run `bozly run summarize` in music vault:
- Uses the vault version (more specific)
- The global version is ignored
- Perfect for specialized behavior per vault

### Using Global Commands from Any Vault

```bash
# Create global command
bozly command create

# When asked where:
# > Global (~/.bozly/commands/)

# Now available in ANY vault
cd ~/music
bozly run my-global-command

cd ~/journal
bozly run my-global-command  # Still works!
```

---

## Real Examples

### Example 1: Music Discovery Command

**File:** `.bozly/commands/discovery-session.md`

```markdown
# Music Discovery Session

## Purpose
Find new music aligned with my taste.

## Instructions
Based on my music taste profile, help me discover new albums.

### My Taste Profile
- Favorite genres: Jazz, Soul, Hip-Hop, Electronic
- Era preference: 60s-90s primarily
- Artists I love: Miles Davis, D'Angelo, J. Dilla, Madlib
- What I'm exploring: Modern jazz fusion, contemporary soul

### Discovery Process

1. **Identify Gaps**
   - What genres am I under-explored in?
   - What eras haven't I heard?
   - What subgenres fit my taste?

2. **Bridge Recommendations**
   - Albums that bridge my current taste to new territory
   - Not too radical, not too safe

3. **Specific Artist Recommendations**
   - Suggest 5-7 artists I haven't heard
   - For each: name, album recommendation, why I'd love it
   - How they connect to my favorite artists

4. **Listening Plan**
   - Recommended album to start with
   - Why start with that one
   - What to listen for (production, composition, vibe)

### Format
- Use artist names in BOLD **Miles Davis**
- Album titles in quotes "Kind of Blue"
- Include Spotify/Apple Music links if possible

## Execution Tips
- Be specific about musical elements, not just "sounds good"
- Reference my favorite artists explicitly
- Explain the musical connection, not just the recommendation
```

### Example 2: Journal Reflection Command

**File:** `.bozly/commands/daily-reflection.md`

```markdown
# Daily Reflection

## Purpose
End-of-day journaling with AI guidance.

## Instructions
Help me reflect on my day through guided prompts and synthesis.

### The Day's Overview
Tell me about your day. Include:
- Major events/moments
- How you felt throughout the day
- Interactions with people
- Work/personal accomplishments
- Challenges you faced

### Reflection Prompts

Based on what you share, I'll help you:

1. **Wins & Accomplishments**
   - What went well today?
   - What are you proud of?
   - Small victories matter!

2. **Challenges & Learnings**
   - What was difficult?
   - What did you learn?
   - How did you handle challenges?

3. **Emotional Check-In**
   - How do you feel right now?
   - Any emotions to explore?
   - What triggered those emotions?

4. **Tomorrow's Focus**
   - One thing to prioritize tomorrow
   - How to apply today's learnings
   - What you're looking forward to

### Synthesis
After I share insights from each section, help me:
- See patterns in my thinking
- Identify areas for growth
- Acknowledge my progress
- Set intentions for tomorrow

## Format Guidelines
- Be warm and encouraging, not clinical
- Use specific moments from their day
- Validate emotions while offering perspective
- End with hopeful, actionable insights
```

### Example 3: Project Sprint Planning

**File:** `.bozly/commands/sprint-planning.md`

```markdown
# Sprint Planning

## Purpose
Kickoff meeting agenda and planning session.

## Pre-Session Preparation
Before running this command, gather:
- Last sprint notes
- Backlog items
- Team capacity
- Known blockers

## Instructions

Help me plan the upcoming sprint with structure and clarity.

### Part 1: Last Sprint Review
- What we accomplished
- What we didn't finish (and why)
- Velocity assessment
- Quality/tech debt notes

### Part 2: Capacity Assessment
- Team size and availability
- Time off or reduced capacity
- Expected capacity for this sprint

### Part 3: Backlog Prioritization
- Top priorities for the business
- Dependencies between tasks
- Estimated effort for each item
- Risk assessment

### Part 4: Sprint Planning

Based on capacity and priorities:

1. **Sprint Goal** (1-2 sentences)
   - What are we trying to achieve?
   - Why is this important?

2. **Prioritized Task List**
   - Ranked by importance and dependencies
   - Story points or T-shirt sizing
   - Assigned owners (if applicable)

3. **Risk & Mitigation**
   - Identified risks
   - Mitigation strategies
   - Contingency plans

4. **Success Metrics**
   - How will we know we succeeded?
   - What does done look like?
   - How we'll measure quality

5. **Standup Format**
   - Propose daily standup time
   - Duration and format
   - Key check-in points

## Output
- Create a sprint planning document
- Include timeline/schedule
- Outline daily standup prompts
- List key milestones

## Notes
- Be realistic about capacity
- Build in buffer for unknowns
- Encourage team input
- Document assumptions
```

---

## Best Practices

### 1. Clear Naming
```bash
✅ Good
- album-review.md
- discovery-session.md
- daily-reflection.md
- sprint-planning.md

❌ Avoid
- command1.md
- my_command.md
- AlbumReview.md
- the command for reviewing music albums.md
```

Use kebab-case: all lowercase, words separated by hyphens.

### 2. Comprehensive Instructions

Good instructions include:

```markdown
## Instructions

What I want: [Be specific]
How to analyze it: [Step-by-step]
What format: [What output should look like]
Special focus: [What matters most]

Example input: [What does good input look like?]
Example output: [Show format/style]
```

### 3. Context Awareness

Make commands aware of your vault's context:

```markdown
## Instructions

Based on my music taste (jazz, soul, hip-hop):
- Suggest 5 albums in a specific sub-genre
- Explain why each fits my taste
- Include production analysis
```

### 4. Domain Specificity

Tailor commands to your domain:

**Music vault:** Focus on production, composition, artists
**Journal vault:** Focus on emotions, patterns, growth
**Project vault:** Focus on timeline, risks, priorities

### 5. Iterative Improvement

Start simple, improve over time:

```bash
# Version 1: Basic
bozly command create quick-review

# Version 2: Add details
bozly command edit quick-review  # Make it more detailed

# Version 3: Add format guidelines
bozly command edit quick-review  # Add output format

# Version 4: Perfect it based on results
# Keep refining as you learn what works
```

### 6. Version Your Commands

Track changes:

```markdown
# Album Review

**Version:** 2.0
**Last Updated:** 2025-12-27
**Changes in 2.0:**
- Added production focus
- Expanded artist context section
- Improved output formatting

## Instructions
...
```

### 7. Command Chaining

Combine commands in order:

```bash
# Run multiple commands in sequence
bozly run discovery-session && bozly run album-review

# Save output of one for next
OUTPUT=$(bozly run discovery-session)
bozly run album-review --input "$OUTPUT"
```

---

## Advanced Techniques

### Conditional Commands

Commands that behave differently based on input:

```markdown
# Smart Analysis

Based on input type:

If you're analyzing an album:
- Focus on production and composition
- Compare to similar albums

If you're analyzing an artist:
- Focus on discography and evolution
- Compare to peer artists

If you're analyzing a genre:
- Focus on history and key figures
- Identify subgenres

Tell me what you're analyzing and I'll adjust my analysis!
```

### Commands with Multiple Modes

```markdown
# Music Exploration

## Modes

Pick one:

**Discovery Mode**
- Find new music to explore

**Deep Dive Mode**
- Analyze a specific album in detail

**Comparison Mode**
- Compare two artists or albums

**Learning Mode**
- Teach me about a genre or artist

Just let me know which mode you want!
```

### Building Command Libraries

Organize related commands:

```
.bozly/commands/
├── analysis/
│   ├── album-review.md
│   ├── artist-analysis.md
│   └── genre-exploration.md
├── discovery/
│   ├── album-discovery.md
│   ├── artist-discovery.md
│   └── playlist-creation.md
└── reflection/
    ├── weekly-review.md
    ├── monthly-analysis.md
    └── year-retrospective.md
```

---

## Troubleshooting

### Command Not Found

```bash
# List available commands
bozly command list

# Check your spelling
bozly run album-review  # Good
bozly run albumReview   # Wrong - not found!

# Verify file exists
ls .bozly/commands/
```

### Command Not Executing

```bash
# Check vault is initialized
bozly status

# Verify command syntax
bozly command validate album-review

# Check for errors
bozly run album-review --verbose
```

### Poor AI Results

- Improve command instructions (be more specific)
- Update vault context (help AI understand your domain)
- Try different AI provider (GPT vs Claude)
- Provide better input to the command

### Command Takes Too Long

- Split into multiple smaller commands
- Use faster model: `bozly run cmd --model claude-3-haiku`
- Remove unnecessary sections from instructions
- Cache results if repeating command

---

## Tips & Tricks

### Command Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
alias br="bozly run"
alias brm="bozly run music-discovery"
alias brj="bozly run daily-reflection"
```

Then:
```bash
br album-review      # instead of: bozly run album-review
brm                  # instead of: bozly run music-discovery
```

### View Command Content

```bash
# See command details
bozly command view album-review

# Or directly
cat .bozly/commands/album-review.md
```

### Edit Command

```bash
# Open in default editor
bozly command edit album-review

# Or directly
vim .bozly/commands/album-review.md
```

### Test Command

```bash
# Run with verbose output to see what's happening
bozly run album-review --verbose

# Run with specific AI to test
bozly run album-review --ai gpt
```

---

## See Also

- [GETTING-STARTED.md](GETTING-STARTED.md) — Getting started guide
- [CLI-REFERENCE.md](CLI-REFERENCE.md) — bozly command reference
- [WORKFLOWS-GUIDE.md](WORKFLOWS-GUIDE.md) — Multi-step automation
- [CONTEXT-GUIDE.md](CONTEXT-GUIDE.md) — How context works

---

*BOZLY: Build. OrganiZe. Link. Yield.*

*Last updated: 2025-12-27 (Session 122)*
