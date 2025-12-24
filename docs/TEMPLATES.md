# BOZLY Templates System

Templates are pre-configured vault blueprints that define domain-specific structures, contexts, commands, and models. Use them to quickly bootstrap new vaults with best practices built-in.

## Overview

A **template** in BOZLY is:
- A complete vault structure (config, context, commands, models, workflows)
- Associated metadata (`template.json`) with version, author, requirements
- Shipped builtin (default, music, journal, content) or user-created
- Applied during `bozly init --type <name>` with variable substitution

## Template Types

### Builtin Templates

BOZLY ships with 4 builtin templates:

#### 1. Default Template
General-purpose template for any domain
- **Category**: general
- **Use Case**: Projects, workflows, general notes
- **Features**: Basic structure, essential commands

#### 2. Music Template
Specialized for music discovery and analysis
- **Category**: creative
- **Use Case**: Album tracking, discovery, curation
- **Features**: Scoring models, music-specific commands
- **Models**: Triple-score rating system

#### 3. Journal Template
Structured for daily journaling and reflection
- **Category**: personal
- **Use Case**: Daily entries, mood tracking, retrospectives
- **Features**: Reflection templates, mood scale
- **Models**: Sentiment analysis

#### 4. Content Template
Workflow for content creation and publishing
- **Category**: creative
- **Use Case**: Video/article creation, production management
- **Features**: Production pipeline, stage tracking
- **Commands**: Ideation, scripting, production checklists

### User Templates

Create custom templates for your specific domains:
```bash
bozly template create
```

## Template Structure

### File Organization

```
~/.bozly/templates/my-template/
├── template.json          # Metadata
├── .bozly/
│   ├── config.json       # Node configuration template
│   ├── context.md        # AI context template
│   ├── index.json        # Empty task index
│   ├── commands/         # Template commands
│   │   └── example.md
│   ├── models/           # Domain models
│   │   └── scoring.yaml
│   └── workflows/        # Automation workflows
│       └── daily.yaml
└── README.md             # Template documentation
```

### template.json Metadata

```json
{
  "name": "music",
  "displayName": "Music Production Template",
  "description": "A specialized template for music discovery, analysis, curation, and production workflow.",
  "version": "1.0.0",
  "author": {
    "name": "BOZLY Team",
    "url": "https://bozly.io"
  },
  "license": "MIT",
  "tags": ["music", "discovery", "production", "curation"],
  "category": "creative",
  "requires": {
    "bozly": ">=0.3.0"
  },
  "variables": {
    "SCORING_SYSTEM": {
      "prompt": "Which scoring system? (triple/dual/simple)",
      "default": "triple",
      "type": "string"
    },
    "ENABLE_CURATION": {
      "prompt": "Enable music curation features?",
      "default": true,
      "type": "boolean"
    }
  },
  "postInit": {
    "message": "✓ Music vault created! Next steps:\n  1. Edit .bozly/context.md with your listening preferences\n  2. Run 'bozly run daily' to start tracking",
    "commands": [
      "bozly status",
      "bozly run daily"
    ]
  }
}
```

## Template Variables

Templates support variable substitution during initialization. Variables are replaced in all template files (.md, .json, .yaml).

### System Variables

Available to all templates:

| Variable | Format | Example |
|----------|--------|---------|
| `{{VAULT_NAME}}` | String | "my-music-vault" |
| `{{CREATED_DATE}}` | YYYY-MM-DD | "2025-12-23" |
| `{{CREATED_DATETIME}}` | ISO 8601 | "2025-12-23T15:30:00Z" |
| `{{BOZLY_VERSION}}` | SemVer | "0.3.0-rc.1" |
| `{{USER_NAME}}` | String | "john" |

### Custom Variables

Define custom variables in `template.json`:

```json
{
  "variables": {
    "MUSIC_GENRE": {
      "prompt": "What's your primary music genre?",
      "default": "indie",
      "type": "string"
    },
    "ENABLE_SCORING": {
      "prompt": "Enable scoring system?",
      "default": true,
      "type": "boolean"
    }
  }
}
```

### Variable Usage

Reference variables in template files:

```markdown
# {{VAULT_NAME}}

Created: {{CREATED_DATE}}
Version: {{BOZLY_VERSION}}
User: {{USER_NAME}}

## Primary Genre
{{MUSIC_GENRE}}

## Features
{{ if ENABLE_SCORING }}
- Album scoring system
- Comparative analysis
{{ endif }}
```

## Creating Templates

### Interactive Creation

```bash
bozly template create
```

This wizard guides you through:
1. Template name (validated)
2. Display name
3. Description
4. Category selection
5. Author information

Scaffolds directory structure with defaults.

### Manual Creation

Create template directory with metadata:

```bash
mkdir -p ~/.bozly/templates/my-template/.bozly/{commands,models,workflows}
```

Then create `template.json`:

```json
{
  "name": "my-template",
  "displayName": "My Custom Template",
  "description": "A template for my specific workflow",
  "version": "1.0.0",
  "category": "custom"
}
```

### Adding to Templates

Structure templates like vaults:

```bash
# Create context
cat > ~/.bozly/templates/my-template/.bozly/context.md << 'EOF'
# {{VAULT_NAME}}

Created: {{CREATED_DATE}}

## Overview
[Your context here]
EOF

# Create commands
cat > ~/.bozly/templates/my-template/.bozly/commands/example.md << 'EOF'
# Example Command

## Instructions
[Your instructions]
EOF
```

## Using Templates

### Initialize from Template

```bash
bozly init --type music ~/my-music-vault
```

This:
1. Discovers the "music" template
2. Prompts for template variables (if defined)
3. Substitutes variables in all template files
4. Creates vault with populated structure
5. Registers vault in global registry

### List Available Templates

```bash
bozly template list
```

Shows:
- Builtin templates
- User templates (if any)
- Template descriptions and versions

### Filter by Category

```bash
bozly template list --category creative
```

Shows only templates matching category:
- creative
- productivity
- personal
- professional
- custom

## Template Best Practices

### 1. Clear Naming and Descriptions

```json
{
  "name": "music-discovery",
  "displayName": "Music Discovery & Curation",
  "description": "Complete workflow for album discovery, rating, and playlist creation"
}
```

### 2. Meaningful Variables

Define variables for customization:

```json
{
  "variables": {
    "RATING_SCALE": {
      "prompt": "Rating scale (1-5 or 1-10)?",
      "default": "1-10"
    }
  }
}
```

### 3. Versioning

Use semantic versioning for template updates:

```json
{
  "version": "1.0.0"  // major.minor.patch
}
```

### 4. Requirements Declaration

Specify minimum BOZLY version:

```json
{
  "requires": {
    "bozly": ">=0.3.0"
  }
}
```

### 5. Post-Init Guidance

Guide users after template creation:

```json
{
  "postInit": {
    "message": "✓ Template applied!\n\nNext steps:\n  1. Edit .bozly/context.md\n  2. Add your commands\n  3. Run 'bozly run daily'",
    "commands": ["bozly status", "bozly run daily"]
  }
}
```

### 6. Consistent Structure

Organize templates logically:

```
- .bozly/
  - config.json (required)
  - context.md (required)
  - commands/ (optional, but common)
  - models/ (optional)
  - workflows/ (optional)
- README.md (document template)
- template.json (metadata)
```

## Advanced Template Usage

### Template Inheritance

Create specialized templates from existing ones:

```bash
# Start with music template
cp -r ~/.bozly/templates/music ~/.bozly/templates/music-curation

# Customize for curation workflow
# Edit template.json, add/remove commands, etc.
```

### Sharing Templates

Share templates via:

1. **GitHub**: Create a repo with template directory
2. **Community Registry**: Submit via PR (Phase 3 feature)
3. **Direct File Sharing**: zip and distribute

Structure for sharing:

```bash
music-template/
├── template.json
├── .bozly/
│   ├── config.json
│   ├── context.md
│   ├── commands/
│   └── models/
├── README.md
└── CHANGELOG.md
```

### Template Customization During Init

Provide variables on command line (Phase 2.5 feature):

```bash
bozly init --type music \
  --set RATING_SCALE=1-10 \
  --set ENABLE_CURATION=true \
  ~/my-music-vault
```

## Template Examples

### Example 1: Music Discovery Template

```json
{
  "name": "music-discovery",
  "displayName": "Music Discovery & Rating",
  "description": "Complete workflow for album discovery, listening, and curation",
  "version": "1.0.0",
  "category": "creative",
  "tags": ["music", "discovery", "curation"],
  "variables": {
    "RATING_SYSTEM": {
      "prompt": "Rating system? (triple/dual/simple)",
      "default": "triple"
    }
  }
}
```

### Example 2: Project Management Template

```json
{
  "name": "project-management",
  "displayName": "Project Management",
  "description": "Sprint planning, task tracking, and retrospectives",
  "version": "1.0.0",
  "category": "productivity",
  "tags": ["project", "management", "sprint"]
}
```

### Example 3: Creative Writing Template

```json
{
  "name": "creative-writing",
  "displayName": "Creative Writing Studio",
  "description": "Novel/short story writing with planning and feedback",
  "version": "1.0.0",
  "category": "creative",
  "tags": ["writing", "fiction", "creative"],
  "variables": {
    "GENRE": {
      "prompt": "Primary genre?",
      "default": "fiction"
    },
    "TARGET_LENGTH": {
      "prompt": "Target word count?",
      "default": "50000"
    }
  }
}
```

## Troubleshooting

### Template Not Found

If template isn't found during init:
1. Check template exists: `bozly template list`
2. Verify name: Use exact template name from list
3. Check category filter: `bozly template list --category <cat>`

### Variable Substitution Failed

If variables aren't substituting:
1. Verify variable name: Use `{{VARIABLE_NAME}}`
2. Check whitespace: `{{ VAR }}` (spaces OK)
3. Verify file type: Only .md, .json, .yaml files substituted

### Template Variables Not Prompted

If custom variables aren't prompting:
1. Check `template.json` syntax (valid JSON)
2. Verify `variables` section exists
3. Each variable must have `prompt` field

## Related Topics

- **Commands**: Create and execute commands
- **Workflows**: Multi-step automation
- **Initialization**: `bozly init` command
- **Context**: Node context and AI awareness
- **Models**: Domain-specific data structures

## See Also

- `docs/COMMANDS.md` - Command system documentation
- `docs/CLI.md` - Complete CLI reference
- `docs/GETTING-STARTED.md` - Quick start guide
