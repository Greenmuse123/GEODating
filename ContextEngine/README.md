# Context Engine v2.0

**Development companion, not documentation.** Context Engine helps you maintain living context that AI assistants can actually use.

## Key Features

- **Semantic Anchors**: Code references that survive refactoring (AST-based hashing)
- **Auto-Scribe**: Generate journal entries from git diffs (LLM optional)
- **Smart Assembly**: Build agent context packs with intelligent relevance pruning
- **Privacy-First**: Explicit consent before any cloud LLM calls, `--local` always works
- **WASM-Only**: No native dependencies, works everywhere Node runs

## Quick Start

```bash
# Install globally
npm install -g @context-engine/cli

# Or use npx
npx @context-engine/cli init

# Initialize in your project
ce init

# Create a work packet
ce packet create feat "Add user authentication"

# Start working on it
ce packet start FEAT-001
ce switch FEAT-001

# Assemble context for your AI assistant
ce assemble FEAT-001 --clipboard

# After committing, document your changes
ce scribe FEAT-001

# Check project health
ce health
```

## Commands

| Command | Description |
|---------|-------------|
| `ce init` | Initialize Context Engine in your project |
| `ce packet create <type> <title>` | Create a new work packet |
| `ce packet start <id>` | Set packet status to active |
| `ce packet status <id>` | Show packet details |
| `ce packet complete <id>` | Mark packet as completed |
| `ce switch <id>` | Switch to a packet (set as current context) |
| `ce assemble <id>` | Build an agent context pack |
| `ce scribe <id>` | Create journal entry from git diff |
| `ce anchor check <id>` | Check anchors for drift |
| `ce anchor refresh <id>` | Update anchors to current code |
| `ce validate file <path>` | Validate a context file |
| `ce validate all` | Validate all context files |
| `ce index build` | Build the context index |
| `ce health` | Check context health |
| `ce query <text>` | Search context files |

## Project Structure

After `ce init`, your project will have:

```
your-project/
├── context/
│   ├── config/context.config.json   # Configuration
│   ├── repo-map/REPO_MAP.md         # Repository overview
│   ├── packets/
│   │   ├── active/                  # Work in progress
│   │   └── completed/               # Finished work
│   ├── adrs/                        # Architecture Decision Records
│   ├── journal/                     # Development journal
│   │   └── 2026/01-january.md
│   └── .index/                      # Search index (gitignored)
└── .context-engine/                 # Local state (gitignored)
    ├── current-context.json
    ├── consent.json
    └── cache/
```

## Semantic Anchors

Anchors are code references that don't break when you refactor. They use AST-based hashing to detect meaningful changes while ignoring formatting and comments.

```yaml
repo_truth:
  - path: src/auth/oauth.ts
    symbol: handleOAuthCallback
    language: ts
    symbol_type: function
    anchor_type: semantic_hash
    semantic_hash: sha256:a1b2c3...
    git_ref: abc123
```

**Drift Detection:**
- `valid` — Code matches the anchor
- `semantic_drift` — Logic has changed
- `deleted` — Symbol or file no longer exists

## Privacy

Context Engine respects your code privacy:

1. **Consent Required**: First LLM use shows a privacy notice and requires explicit consent
2. **Secret Redaction**: API keys, tokens, and passwords are automatically redacted
3. **Local Mode**: Use `--local` to skip LLM entirely (manual prompts)
4. **Nothing Committed**: Generated files (`.context-engine/`, `.index/`) are gitignored

## Configuration

Edit `context/config/context.config.json`:

```json
{
  "version": "2.0.0",
  "project": {
    "name": "my-project",
    "description": "My awesome project"
  },
  "relevance": {
    "journal_window_days": 30,
    "boosts": {
      "symbol_match": 0.3,
      "path_overlap": 0.2,
      "explicit_link": 0.5
    }
  },
  "llm": {
    "provider": "anthropic",
    "consent_required": true
  }
}
```

## Development Workflow

**Morning:**
```bash
ce health              # Check for issues
ce switch FEAT-001     # Resume work
```

**During Work:**
```bash
ce assemble FEAT-001 --clipboard    # Get context for AI
# Paste into Cursor/Windsurf/etc.
```

**After Commit:**
```bash
ce scribe FEAT-001     # Document changes
# Optionally refresh drifted anchors
```

**When Done:**
```bash
ce packet complete FEAT-001    # Move to completed
```

## Supported Languages

- TypeScript (`.ts`)
- TSX (`.tsx`)
- JavaScript (`.js`)
- JSX (`.jsx`)
- Python (`.py`) — optional

## License

MIT
