# Context Engine v2.0 — Implementation Plan

> Generated from MVP.md. This document tracks implementation progress.

---

## Commands Checklist

| Command | Status | Notes |
|---------|--------|-------|
| `ce init` | ⬜ | Scaffold context/, config, repo-map, .gitignore entries |
| `ce packet create <type> "<title>"` | ⬜ | Interactive flow with anchors |
| `ce packet start <id>` | ⬜ | Status → active |
| `ce packet status <id>` | ⬜ | Show packet status |
| `ce packet complete <id>` | ⬜ | Move to completed/ |
| `ce switch <id>` | ⬜ | Update current-context.json |
| `ce assemble <id>` | ⬜ | Agent pack with token budget |
| `ce scribe <id>` | ⬜ | Journal from git diff |
| `ce anchor check <id>` | ⬜ | Validate semantic hashes |
| `ce anchor refresh <id>` | ⬜ | Update anchors |
| `ce validate [file]` | ⬜ | Schema validation |
| `ce validate-all` | ⬜ | Validate all context files |
| `ce index build` | ⬜ | Build index.json |
| `ce health` | ⬜ | Drift/orphan/stale report |
| `ce query "<text>"` | ⬜ | Search with ranking |

---

## Data Schemas Required

### Packet Schema
- `id`: string (FEAT-001, BUG-042, etc.)
- `type`: string (feat, bug, chore, refactor)
- `title`: string
- `status`: draft | active | blocked | completed | cancelled
- `goal`: string
- `dod[]`: array of strings (min 1)
- `constraints[]`: array of strings (optional)
- `repo_truth[]`: array of semantic anchors
- `metadata`: { timestamps, author, branch_name, related_adrs, related_packets }

### Semantic Anchor Schema
- `path`: string
- `symbol`: string
- `language`: ts | tsx | js | jsx | py
- `symbol_type`: function | class | method | var
- `anchor_type`: "semantic_hash"
- `semantic_hash`: "sha256:..."
- `git_ref`: string (commit SHA)
- `captured_at`: ISO timestamp
- Fallback: `signature`, `line_start`, `line_end`

### ADR Schema
- `id`: string (ADR-0001)
- `title`: string
- `status`: proposed | accepted | deprecated | superseded
- `decision`: string
- `context`: string
- `consequences[]`: array
- `affected_areas[]`: array

### Journal Entry Schema
- `packet_id`: string
- `commit_sha`: string
- `changed_files[]`: array
- `summary`: string
- `risks[]`: array (optional)
- `next_steps[]`: array (optional)
- `timestamp`: ISO

### Config Schema
- `version`: string
- `project`: { name, description }
- `relevance`: { journal_window_days, max_candidates, boosts, recency, min_score }
- `llm`: { provider, model, consent_required }

---

## Folder Structure (ce init creates)

```
context/
  config/context.config.json
  repo-map/REPO_MAP.md
  packets/active/
  packets/completed/
  adrs/
  journal/YYYY/MM-month.md
  .index/index.json (gitignored)
  .ce-version
.context-engine/ (gitignored)
  current-context.json
  consent.json
  cache/
```

---

## Core Modules Required

| Module | File | Purpose |
|--------|------|---------|
| CLI Router | src/cli.ts | Main entry, command routing |
| Config | src/core/config.ts | Load/save config |
| Validator | src/core/validator.ts | AJV schema validation |
| Git | src/core/git.ts | Diff, commit info |
| Semantic Anchor | src/core/semantic-anchor.ts | Hash computation |
| Symbol Finder | src/core/symbol-finder.ts | WASM tree-sitter parsing |
| Assembler | src/core/assembler.ts | Build agent pack |
| Scribe LLM | src/core/scribe-llm.ts | LLM provider interface |
| Privacy | src/core/privacy.ts | Consent, sanitization |
| Indexer | src/core/indexer.ts | Build index.json |
| Search | src/core/search.ts | Query implementation |
| Relevance Engine | src/core/relevance-engine.ts | Keyword overlap + scoring |

---

## Acceptance Tests (MVP Definition of Done)

1. [ ] `ce init` creates expected structure + gitignore entries
2. [ ] `ce packet create` creates valid packet and anchors (TS/TSX)
3. [ ] Formatting-only edits do NOT cause drift
4. [ ] Logic edits DO cause drift
5. [ ] `ce assemble` respects token limit and selects relevant ADR/journal with reasons
6. [ ] `ce scribe` summarizes HEAD deterministically
7. [ ] `ce scribe --local` works without any API keys
8. [ ] `ce scribe` requires consent before cloud LLM
9. [ ] `ce health` catches drift in active packets
10. [ ] `ce health` catches stale active packets
11. [ ] `ce health` catches orphan packets
12. [ ] No generated files are committed by default (gitignored)

---

## Unit Tests Required

- [ ] Relevance engine scoring + reasons
- [ ] Keyword extraction (identifier splitting)
- [ ] Semantic hash normalization invariants
- [ ] Drift classification (valid/drift/deleted)
- [ ] Packet status transitions

## Integration Tests Required

- [ ] init → create packet → start → assemble → scribe (local) → index → query → health

---

## Implementation Milestones

### Milestone 1: CLI Skeleton + Init + Validation
- [ ] CLI router with commander
- [ ] `ce init` command
- [ ] Frontmatter parsing utilities
- [ ] AJV schema validation
- [ ] `ce validate` and `ce validate-all`
- [ ] Tests for init + validation

### Milestone 2: Packets Lifecycle + Switch State
- [ ] `ce packet create`
- [ ] `ce packet start/status/complete`
- [ ] Status transitions enforcement
- [ ] `ce switch`
- [ ] Tests for status transitions

### Milestone 3: WASM Parsers + Symbol Finder + Semantic Anchors
- [ ] WASM loader for web-tree-sitter
- [ ] TS/TSX/JS/JSX grammar loading
- [ ] Symbol finder (functions, classes, methods, arrow functions, exports)
- [ ] Semantic normalization + hash
- [ ] `ce anchor check` and `ce anchor refresh`
- [ ] Tests for hash stability

### Milestone 4: Relevance Engine + Index + Assemble
- [ ] Keyword extraction
- [ ] Overlap scoring + boosts + recency
- [ ] `ce index build`
- [ ] `ce assemble` with token budget
- [ ] Tests for ranking

### Milestone 5: Scribe + Privacy + Health + Query
- [ ] Git diff utilities
- [ ] Privacy consent + sanitizer
- [ ] `ce scribe` (LLM + local)
- [ ] `ce health`
- [ ] `ce query`
- [ ] Integration tests

---

## Non-Negotiables (Enforced)

1. **WASM-only parsing** — no native dependencies
2. **Privacy-first** — consent before cloud LLM, `--local` always works
3. **Deterministic scribe** — default to HEAD diff
4. **Explainable relevance** — every selection includes reasons
5. **TypeScript strict mode**
6. **No silent failures** — meaningful exit codes + errors

---

## Dependencies

### Production
- commander (CLI)
- inquirer (prompts)
- chalk (colors)
- ora (spinners)
- fs-extra (file operations)
- fast-glob (file matching)
- ajv + ajv-formats (validation)
- web-tree-sitter (WASM parsing)
- simple-git (git operations)
- clipboardy (clipboard)
- gray-matter (frontmatter parsing)
- tiktoken (token counting)

### Development
- typescript
- vitest
- eslint
- prettier
- tsx (dev runner)
- tsup (build)

---

## Build Outputs

- `dist/` — compiled JS
- `bin/ce` — CLI entry point
- Schemas bundled
- WASM grammars bundled
