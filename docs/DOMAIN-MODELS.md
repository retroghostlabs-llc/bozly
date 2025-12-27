# Domain Models in BOZLY

Domain Models (Pattern 7) are reusable, structured definitions that teach AI assistants how to analyze, evaluate, and classify information within your domain.

## What Are Domain Models?

A domain model is a formalized framework for decision-making or analysis. Instead of explaining your methodology in natural language every time, you define it once as a model and reference it in commands.

**Example:** Rather than writing "rate albums on personal enjoyment, technical quality, and emotional impact with weights 0.35, 0.30, and 0.35," you create a reusable `triple-score` model.

## Supported Model Types

### 1. Scoring Models

Evaluate items using weighted dimensions.

**Use cases:**
- Album ratings (music)
- Project quality assessment
- Content quality evaluation
- Performance reviews

**Example:**
```yaml
name: Triple Score Rating
type: scoring
dimensions:
  - name: Personal Enjoyment
    weight: 0.35
    scale: { min: 1, max: 10 }
  - name: Technical Quality
    weight: 0.30
    scale: { min: 1, max: 10 }
  - name: Emotional Impact
    weight: 0.35
    scale: { min: 1, max: 10 }
```

### 2. Analysis Models

Extract and compute metrics from data.

**Use cases:**
- Financial analysis (revenue, growth, margins)
- Performance metrics (engagement, retention, churn)
- Health tracking (sleep, exercise, stress)

**Example:**
```yaml
name: Project Health Analysis
type: analysis
metrics:
  - name: Velocity
    formula: "completed_tasks / sprint_days"
  - name: Quality
    formula: "bug_count / completed_tasks"
```

### 3. Classification Models

Categorize items into groups.

**Use cases:**
- Content tagging (music genre, post type)
- Priority classification (urgent, important, low)
- Risk assessment (high risk, medium, low)

### 4. Prediction Models

Forecast trends and patterns.

**Use cases:**
- Trend prediction (trending genres, topics)
- Growth forecasting (subscriber predictions)
- Anomaly detection (unusual patterns)

## Creating a Model

Models are YAML files stored in `.bozly/models/` directory.

### Directory Structure

```
my-vault/
├── .bozly/
│   ├── models/
│   │   ├── triple-score.yaml       ← Scoring model
│   │   ├── project-health.yaml     ← Analysis model
│   │   └── content-classifier.yaml ← Classification model
│   └── commands/
│       └── rate-album.md           ← Command using model
```

### Model File Structure

```yaml
# Required fields
name: "Triple Score Rating"
version: "1.0.0"
type: "scoring"

# Optional metadata
description: "Multi-dimensional album evaluation framework"
domain: "music"
created: "2025-12-19T00:00:00Z"
updated: "2025-12-19T00:00:00Z"

# Type-specific content
dimensions: [...]        # For scoring models
metrics: [...]          # For analysis models
scoring: [...]          # Scoring levels and thresholds
changelog: [...]        # Version history

```

## Scoring Model Details

Scoring models use **weighted dimensions** for evaluation.

### Dimensions

Each dimension has:
- **name** (required): Dimension name (e.g., "Personal Enjoyment")
- **weight** (required): Decimal 0.0-1.0 (weights should sum to 1.0)
- **description**: What this dimension measures
- **criteria**: Array of evaluation criteria
- **scale**: min and max values (usually 1-10)

```yaml
dimensions:
  - name: Personal Enjoyment
    weight: 0.35
    description: How much you personally enjoyed the album
    criteria:
      - Did it resonate with your current mood?
      - Would you return to this album?
    scale:
      min: 1
      max: 10
```

### Scoring Levels

Define thresholds for composite scores:

```yaml
scoring:
  scale: "1-10 weighted composite"
  levels:
    excellent:
      min: 9
      max: 10
    good:
      min: 7
      max: 8.9
    okay:
      min: 5
      max: 6.9
    needsWork:
      min: 1
      max: 4.9
```

## Using Models in Commands

Reference a model in your command's YAML frontmatter:

```yaml
---
description: Rate an album using the triple-score methodology
model: triple-score
---

# Rate Album

[Command content here...]
```

When you run the command, BOZLY automatically:
1. Loads the `triple-score` model
2. Formats it as markdown
3. Includes it in the prompt before your command

## Complete Example: Music Rating Model

```yaml
# .bozly/models/triple-score.yaml

name: Triple Score Rating
version: 1.0.0
description: Multi-dimensional album evaluation
domain: music
type: scoring

dimensions:
  - name: Personal Enjoyment
    weight: 0.35
    description: How much you personally enjoyed listening
    criteria:
      - Resonance with your current mood
      - Replay value
      - Live performance interest
    scale:
      min: 1
      max: 10

  - name: Technical Quality
    weight: 0.30
    description: Production, musicianship, arrangement
    criteria:
      - Mixing and mastering clarity
      - Instrumentalskill and performance
      - Song structure and arrangement
    scale:
      min: 1
      max: 10

  - name: Emotional Impact
    weight: 0.35
    description: Emotional depth and artistic expression
    criteria:
      - Emotional authenticity
      - Lyrical depth
      - Artistic uniqueness
    scale:
      min: 1
      max: 10

scoring:
  scale: "1-10 weighted composite"
  levels:
    excellent:
      min: 9
      max: 10
    good:
      min: 7
      max: 8.9
    okay:
      min: 5
      max: 6.9
    needsWork:
      min: 1
      max: 4.9

changelog:
  - version: 1.0.0
    date: "2025-12-19"
    changes:
      - Initial model creation
      - Defined three weighted dimensions
      - Set scoring thresholds
```

## Model API Reference

### Load a Model

```typescript
import { loadModel } from './core/models.js';

const model = await loadModel('/path/to/vault', 'triple-score');
console.log(model.name);        // "Triple Score Rating"
console.log(model.dimensions);  // [...]
```

### List All Models

```typescript
import { listModels } from './core/models.js';

const models = await listModels('/path/to/vault');
console.log(models.map(m => m.name));
// ["triple-score", "project-health", ...]
```

### Format for Prompt

```typescript
import { formatModelForPrompt } from './core/models.js';

const model = await loadModel(vaultPath, 'triple-score');
const formatted = formatModelForPrompt(model);
// Returns markdown string suitable for prompts
```

### Check if Model Exists

```typescript
import { modelExists } from './core/models.js';

const exists = await modelExists(vaultPath, 'triple-score');
if (exists) {
  const model = await loadModel(vaultPath, 'triple-score');
}
```

### Validate Model

```typescript
import { validateModel } from './core/models.js';

const { valid, errors } = validateModel(model);
if (!valid) {
  console.error('Validation errors:', errors);
}
```

## Best Practices

### 1. Clear Naming

Use descriptive names:
- ✅ `triple-score` (clear what it does)
- ✅ `project-health-analysis`
- ❌ `model1` (unclear)
- ❌ `rate` (too generic)

### 2. Document Dimensions

Explain what each dimension measures and why:

```yaml
dimensions:
  - name: Technical Quality
    description: Production quality, musicianship, arrangement
    criteria:
      - Production clarity and mixing
      - Instrumentalskill
      - Song arrangement
```

### 3. Balance Weights

Weights should sum to 1.0 and reflect importance:

```yaml
dimensions:
  - name: Technical Quality
    weight: 0.30    # 30%
  - name: Personal Enjoyment
    weight: 0.35    # 35%
  - name: Emotional Impact
    weight: 0.35    # 35%
    # Total: 1.00 ✓
```

### 4. Use Semantic Versioning

Version models as you refine them:

```yaml
version: "1.0.0"  # Initial release
version: "1.1.0"  # Added criteria
version: "2.0.0"  # Changed weights
```

### 5. Document Changes

Track what changed in each version:

```yaml
changelog:
  - version: 1.1.0
    date: "2025-12-20"
    changes:
      - Added "Artistic Uniqueness" criterion
      - Adjusted emotional weight from 0.30 to 0.35

  - version: 1.0.0
    date: "2025-12-19"
    changes:
      - Initial model creation
```

## Testing Models

### Dry-run Mode

Test how models appear in prompts:

```bash
bozly run rate-album --dry
```

This shows:
- Full prompt with context
- Model formatted for AI
- Command content
- Context size

### Create Test Commands

```markdown
---
description: Test the triple-score model
model: triple-score
---

# Model Test

Using the triple-score methodology,rate:
1. A recent album you loved
2. A recent album you didn't enjoy
3. A medium album you're unsure about
```

Run with `--dry` to verify the model appears correctly.

## Model Limitations

### What Models Don't Do

- **Models don't execute logic** — AI still performs the analysis
- **Models don't validate** — AI isn't forced to follow weights exactly
- **Models aren't persistent** — Each command run is independent

### Strengths

- **Consistency** — Same methodology for every analysis
- **Transparency** — AI sees exact evaluation framework
- **Reusability** — Use one model across many commands
- **Versionability** — Track model changes over time

## Examples by Domain

### Music Vault

```yaml
# Models for album/artist evaluation
- triple-score.yaml (rating)
- audio-quality.yaml (technical analysis)
- genre-analyzer.yaml (classification)
```

### Project Vault

```yaml
# Models for sprint/project evaluation
- project-health.yaml (analysis)
- velocity-tracker.yaml (metrics)
- risk-assessment.yaml (classification)
```

### Journal Node

```yaml
# Models for mood/reflection analysis
- emotional-score.yaml (scoring)
- mood-analyzer.yaml (classification)
- week-review.yaml (analysis)
```

### Content Vault

```yaml
# Models for content evaluation
- engagement-predictor.yaml (prediction)
- quality-scorer.yaml (scoring)
- topic-classifier.yaml (classification)
```

## Implementation Summary

✅ **Pattern 7: Domain Models Fully Implemented**

- Models.ts module complete (800+ lines with full logging)
- Type definitions added to types.ts (Model, ModelDimension, etc.)
- Integration with commands.ts for automatic model loading
- Model extraction from command frontmatter
- Model formatting for AI prompt inclusion
- Full YAML parsing with js-yaml
- Comprehensive error handling and validation

✅ **Testing & Validation**
- Build passes with no errors
- Triple-score example model created
- Rate-album command created with model reference
- Dry-run test shows correct model formatting
- Model dimensions, weights, and scoring levels all included
- Context + Model + Command all properly combined

✅ **Documentation**
- DOMAIN-MODELS.md (this file) with complete reference
- API documentation for all model functions
- Best practices and examples
- Domain-specific model collections

**Next Steps:**
- Future: AI provider integration (claude, gpt, gemini, ollama)
---

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture overview
- [CONCEPTS.md](CONCEPTS.md) — Core concepts
- [API-REFERENCE.md](API-REFERENCE.md) — API for working with domain models
- [GETTING-STARTED.md](GETTING-STARTED.md) — Real-world domain examples

*Last updated: 2025-12-27 (Session 122)*
*Pattern 7 (Domain Models) Status: COMPLETE ✅*
