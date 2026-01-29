# Context Engine Commands

## Global Options

```bash
ce --version    # Show version
ce --help       # Show help
```

---

## `ce init`

Initialize Context Engine in the current directory.

```bash
ce init [options]
```

**Options:**
- `--yes`, `-y` — Skip prompts, use defaults
- `--force` — Reinitialize even if already initialized

**Creates:**
- `context/` directory structure
- `.context-engine/` local state
- Adds entries to `.gitignore`

---

## `ce packet`

Manage work packets.

### `ce packet create <type> <title>`

Create a new work packet.

```bash
ce packet create feat "Add user authentication"
ce packet create bug "Fix login redirect"
ce packet create chore "Update dependencies"
```

**Types:** `feat`, `bug`, `chore`, `refactor`, `docs`, `test`

**Options:**
- `--no-anchors` — Skip interactive anchor creation

**Interactive prompts:**
1. Goal description
2. Definition of Done items
3. Constraints (optional)
4. Add semantic anchors (optional)

### `ce packet start <id>`

Set packet status to `active`.

```bash
ce packet start FEAT-001
```

### `ce packet status <id>`

Show packet details.

```bash
ce packet status FEAT-001
```

### `ce packet complete <id>`

Mark packet as completed and move to `completed/` folder.

```bash
ce packet complete FEAT-001
```

**Status transitions:**
- `draft` → `active`
- `active` → `blocked`, `completed`, `cancelled`
- `blocked` → `active`, `cancelled`

---

## `ce switch <id>`

Switch to a packet (set as current context).

```bash
ce switch FEAT-001
```

**Options:**
- `--no-clipboard` — Don't prompt to copy context

**After switching:**
- Updates `.context-engine/current-context.json`
- Displays packet summary
- Optionally assembles context to clipboard

---

## `ce assemble <id>`

Build an agent context pack.

```bash
ce assemble FEAT-001
ce assemble FEAT-001 --clipboard
ce assemble FEAT-001 --out context.md
ce assemble FEAT-001 --max-tokens 4000
```

**Options:**
- `-t, --max-tokens <n>` — Token limit (default: 8000)
- `-c, --clipboard` — Copy to clipboard
- `-o, --out <file>` — Write to file

**Output includes:**
- Packet summary (goal, constraints, DoD)
- Semantic anchors (repo truth)
- Related ADRs (ranked by relevance)
- Recent journal entries (ranked by relevance)
- Agent rules

---

## `ce scribe <id>`

Create journal entry from git diff.

```bash
ce scribe FEAT-001
ce scribe FEAT-001 --local
ce scribe FEAT-001 --include-working-tree
```

**Options:**
- `--local` — Manual prompts, no LLM
- `--no-llm` — Disable LLM summarization
- `--include-working-tree` — Include uncommitted changes

**Default behavior:**
- Uses `HEAD` commit diff (deterministic)
- Requires consent for LLM (first time)
- Sanitizes diff (removes secrets)
- Appends to monthly journal file
- Checks anchors for drift
- Offers to mark packet completed

---

## `ce anchor`

Manage semantic anchors.

### `ce anchor check <id>`

Check anchors for drift.

```bash
ce anchor check FEAT-001
```

**Exit codes:**
- `0` — All anchors valid
- `1` — Drift or deleted anchors found

**Statuses:**
- `valid` — Hash matches current code
- `semantic_drift` — Logic changed
- `deleted` — Symbol/file not found

### `ce anchor refresh <id>`

Update anchors to current code.

```bash
ce anchor refresh FEAT-001
ce anchor refresh FEAT-001 --yes
```

**Options:**
- `-y, --yes` — Skip confirmation

---

## `ce validate`

Validate context files against schemas.

### `ce validate file <path>`

Validate a specific file.

```bash
ce validate file context/packets/active/FEAT-001.md
```

### `ce validate all`

Validate all context files.

```bash
ce validate all
ce validate all --fail
```

**Options:**
- `--fail` — Exit with error code if invalid

---

## `ce index build`

Build or rebuild the context index.

```bash
ce index build
```

**Indexes:**
- Packets (keywords, symbols, paths)
- ADRs (keywords, affected areas)
- Journal entries (keywords, files, timestamps)

**Output:** `context/.index/index.json`

---

## `ce health`

Check context health.

```bash
ce health
ce health --fail
```

**Options:**
- `--fail` — Exit with error code if issues found

**Checks:**
- Semantic drift in active packets
- Orphan packets (no anchors)
- Stale packets (no journal in 14 days)
- Missing REPO_MAP.md

---

## `ce query <text>`

Search context files.

```bash
ce query "authentication"
ce query "oauth" --packet FEAT-001
ce query "login" --type packet,adr
ce query "fix" --max 5
```

**Options:**
- `-p, --packet <id>` — Use packet for relevance ranking
- `-t, --type <types>` — Filter by type (comma-separated)
- `-n, --max <n>` — Maximum results (default: 10)

**Types:** `packet`, `adr`, `journal`, `repo-map`

**Ranking:**
- Exact ID/title match (highest)
- Symbol matches
- Keyword overlap
- Recency (journals)
