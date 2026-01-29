# Context Engine Architecture

## Overview

Context Engine is a CLI tool that helps developers maintain living context for AI-assisted coding. It uses semantic anchors (AST-based code references) to track code locations without line number brittleness.

## Core Principles

1. **Repo Truth > Chat Truth** — Context lives in the repository, not in chat history
2. **WASM-Only Parsing** — No native dependencies, works everywhere
3. **Privacy-First** — Explicit consent, automatic redaction, local fallback
4. **Low Friction** — Default workflows complete in seconds
5. **Explainable Relevance** — Every selection includes reasons

## Module Structure

```
src/
├── cli.ts                    # Main entry point, command routing
├── index.ts                  # Library exports
├── commands/                 # CLI command handlers
│   ├── init.ts              # Project initialization
│   ├── packet.ts            # Packet lifecycle
│   ├── switch.ts            # Context switching
│   ├── assemble.ts          # Context pack assembly
│   ├── scribe.ts            # Journal from git diff
│   ├── anchor.ts            # Anchor check/refresh
│   ├── validate.ts          # Schema validation
│   ├── index.ts             # Index building
│   ├── health.ts            # Health checks
│   └── query.ts             # Search
├── core/                     # Core business logic
│   ├── config.ts            # Configuration management
│   ├── frontmatter.ts       # Markdown parsing
│   ├── validator.ts         # AJV schema validation
│   ├── git.ts               # Git operations
│   ├── symbol-finder.ts     # WASM tree-sitter parsing
│   ├── semantic-anchor.ts   # Hash computation, drift detection
│   ├── relevance-engine.ts  # Keyword scoring, ranking
│   ├── assembler.ts         # Context pack building
│   ├── indexer.ts           # Index generation
│   ├── search.ts            # Query execution
│   ├── scribe-llm.ts        # LLM provider interface
│   └── privacy.ts           # Consent, sanitization
└── types/                    # TypeScript interfaces
    └── index.ts
```

## Data Flow

### Semantic Anchoring

```
Source Code → WASM Parser → AST → Normalize → SHA-256 Hash
                                   (strip comments/whitespace)
```

### Context Assembly

```
Packet → Load Anchors → Gather Candidates → Rank by Relevance → Select by Budget → Format Output
                              ↓
                        ADRs + Journals
                              ↓
                     Keyword Extraction
                              ↓
                    Jaccard Overlap + Boosts
```

### Scribe Flow

```
Git Diff → Sanitize → LLM (optional) → Journal Entry → Drift Check → Offer Refresh
    ↓
  HEAD or Working Tree
```

## Relevance Engine

No vector embeddings — uses deterministic keyword matching:

### Scoring Formula

```
score = overlap + boosts + recency

where:
  overlap = |A ∩ B| / |A ∪ B|  (Jaccard)
  boosts = symbol_match(0.3) + path_overlap(0.2) + explicit_link(0.5)
  recency = max(0, 0.2 - (days_ago / 100))  [journals only]
```

### Keyword Sources

**Packet:**
- title, goal, dod, constraints
- repo_truth[].symbol
- repo_truth[].path (split segments)

**Candidate:**
- ADR: title, decision, consequences, affected_areas
- Journal: summary, changed_files

### Token Budget Packing

```
1. Reserve space for packet + anchors + rules
2. Rank candidates by score
3. Add candidates until budget exhausted
4. Include reasons for each selection
```

## File Formats

### Packet (Markdown + YAML frontmatter)

```markdown
---
id: FEAT-001
type: feat
title: User Authentication
status: active
goal: Implement secure login
dod:
  - Login form works
  - Session management
repo_truth:
  - path: src/auth/login.ts
    symbol: handleLogin
    language: ts
    symbol_type: function
    anchor_type: semantic_hash
    semantic_hash: sha256:abc123...
    git_ref: abc123
    captured_at: 2026-01-29T10:00:00.000Z
metadata:
  created_at: 2026-01-29T10:00:00.000Z
  updated_at: 2026-01-29T10:00:00.000Z
---

## Notes

Implementation notes here.
```

### Journal Entry (Markdown append)

```markdown
## [2026-01-29T10:00:00.000Z]

**Packet:** FEAT-001
**Commit:** abc123

### Changed Files
- src/auth/login.ts
- src/auth/session.ts

### Summary
Implemented login form with session management.

### Risks
- Session timeout edge cases

### Next Steps
- Add remember me functionality
```

## WASM Parsing

Uses `web-tree-sitter` with grammars loaded from CDN:

```typescript
const GRAMMAR_URLS = {
  ts: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
  js: 'tree-sitter-javascript.wasm',
  jsx: 'tree-sitter-javascript.wasm',  // JSX uses JS grammar
  py: 'tree-sitter-python.wasm',
};
```

### Symbol Detection

Finds:
- Function declarations
- Class declarations
- Method definitions
- Exported const arrow functions
- Exported function expressions

### AST Normalization

```
[node_type
  [child_type:text]
  [child_type:text]
/node_type]
```

Comments and whitespace are stripped before hashing.

## Privacy System

### Consent Gate

```typescript
if (!hasConsent()) {
  showPrivacyNotice();
  if (!userConsents()) {
    return localMode();
  }
  grantConsent(provider);
}
```

### Sanitization Patterns

```typescript
const SECRET_PATTERNS = [
  /api[_-]?key/,
  /secret|password/,
  /token|auth_token/,
  /-----BEGIN.*PRIVATE KEY-----/,
  /ghp_|gho_|github_pat_/,
  /sk-|sk-proj-/,
  // ... etc
];
```

## Error Handling

- All commands check for initialization first
- Invalid status transitions are rejected
- Missing files produce clear error messages
- Exit codes: 0 (success), 1 (error)

## Testing Strategy

### Unit Tests

- Relevance engine scoring
- Keyword extraction
- Semantic hash stability
- Drift classification

### Integration Tests

- Full workflow: init → create → start → assemble → scribe → health

## Future Considerations (Post-MVP)

- VS Code LSP extension
- Background watcher (`ce watch`)
- Embedding vectors for semantic search
- Graph visualization
- External integrations (Linear, Slack, Notion)
