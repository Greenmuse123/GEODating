Context Engine v2.0 — Complete MVP Spec (Shippable)

Goal of MVP: Make context inevitable for real work by (1) anchoring context to code robustly, (2) auto-scribing from git, and (3) assembling a reliable agent-ready context pack in one command.

0) MVP Scope
In scope (MVP)

ce init scaffolding + config

Context Packets (create/start/switch/complete)

Semantic Anchors (WASM tree-sitter)

ce assemble (agent context pack to clipboard/file)

ce scribe (auto diff → journal entry, privacy-first)

ce health (semantic drift + missing context basics)

ce query (search packets/ADRs/journal via local index)

Minimal indexer (symbols ↔ packets)

Out of scope (post-MVP)

VS Code LSP extension

Embedding vectors / semantic search beyond keyword scoring

Auto ADR detection (you can suggest, but not enforce)

Slack/Linear/Notion syncing

Graph visualization

1) Non-negotiable principles

Repo Truth > Chat Truth

No native dependencies: WASM-only parsing runtime

Privacy-first: explicit consent before cloud LLM; --local always works

Low friction: default flows should take <30 seconds

2) Installation & Packaging
Package

Name: @context-engine/cli

Node: >=18

Ships:

CLI JS

Schemas

Templates

WASM grammars OR vendored wasm assets from a pinned source

WASM strategy (MVP-approved options)

Option A (fastest): depend on tree-sitter-wasms and copy out/*.wasm into your package at build time.
Option B (most enterprise): build/ship your own pinned wasm set using a reproducible pipeline (VS Code’s repo is a good reference).

3) Repo layout (MVP)
In context-engine/ repo
src/
  cli.ts
  commands/
    init.ts
    packet.ts
    switch.ts
    assemble.ts
    scribe.ts
    health.ts
    query.ts
    anchor.ts
    index.ts
    validate.ts
  core/
    config.ts
    validator.ts
    git.ts
    semantic-anchor.ts
    symbol-finder.ts
    assembler.ts
    scribe-llm.ts
    privacy.ts
    indexer.ts
    search.ts
schemas/
templates/
wasm/ (or build-time generated)

In each target project after ce init
context/
  config/context.config.json
  repo-map/REPO_MAP.md
  packets/active/
  packets/completed/
  adrs/
  journal/2026/01-january.md
  .index/index.json
.context-engine/   (gitignored)
  current-context.json
  cache/
  consent.json

4) Data contracts (Schemas)
4.1 Packet (required fields)

Packet ID format: FEAT-001, BUG-042, etc.

Packet fields

id, type, title

goal (string)

status: draft|active|blocked|completed|cancelled

repo_truth[]: semantic anchors (below)

constraints[] (optional)

dod[] definition-of-done (required, min 1)

tests[] (optional)

metadata: timestamps, author, branch_name, related_adrs, related_packets

4.2 Semantic Anchor (repo_truth item)

Required:

path

symbol

language (ts/tsx/js/jsx/py)

symbol_type (function/class/method/var/etc.)

anchor_type: "semantic_hash"

semantic_hash: "sha256:..." (hash of normalized AST)

git_ref (commit SHA at capture)

captured_at (ISO time)
Fallback display-only:

signature

line_start, line_end

MVP drift semantics: if semantic_hash differs, it’s drift. Don’t overfit “cosmetic” in v1.

5) Semantic hashing (MVP definition)
Normalization rules (MVP)

Strip:

whitespace

comments

Keep:

node structure ([node_type] ... [/node_type])

leaf token types + text (identifiers/keywords/operators/literals)

This yields stable hashes across formatting/comment churn, while still flagging “real” changes.

6) CLI Commands (complete MVP behavior)
6.1 ce init

Creates context/ tree, config, repo map skeleton, index file.
Adds .context-engine/ to .gitignore.

6.2 ce packet create <type> "<title>"

Interactive flow:

Generates next ID

Prompts for goal, dod[], constraints[]

Prompts: add anchors now? (Y/n)

enter file path(s)

list symbols found

select symbol(s)

store anchors in repo_truth

Writes packet file: context/packets/active/FEAT-001.md (frontmatter JSON/YAML + body)

6.3 ce packet start <id>

Sets status → active

Writes metadata.last_active

(Optional) creates/switches branch if configured

6.4 ce switch <id> (MVP-critical)

Updates .context-engine/current-context.json

Prints packet summary

Offers: assemble to clipboard?

6.5 ce assemble <id> [--max-tokens 8000] [--out file] [--clipboard]

Produces an Agent Context Pack (markdown) containing:

Packet summary (goal, constraints, DoD)

Repo truth anchors (path, symbol, signature, hash, git_ref)

Related ADR titles (if linked)

Last N journal entries mentioning those paths/symbols (default N=5)

“Rules for agent” header:

cite file paths + symbols

do not assume line numbers

MVP pruning rule (no embeddings):

Include only:

explicitly linked ADRs

journal entries referencing same path OR symbol

most recent first until token cap

6.6 ce scribe <id> [--local] [--no-llm] [--include-working-tree]

Default behavior:

Uses git show --patch HEAD as diff input (deterministic)

Detects changed files

If LLM enabled + consent present:

sanitize diff

generate summary + risks + next steps

Else:

prompt for 1–2 sentence summary + optional risks/next steps (minimal)

Writes journal entry into context/journal/YYYY/MM-month.md including:

packet id

commit sha

files changed

summary

risks

next steps

Then:

runs anchor drift check for that packet

offers ce anchor refresh <id> if drift found

offers “mark packet completed?”

6.7 ce anchor check <id>

For each anchor:

recompute hash from current code

status: valid|semantic_drift|deleted

Exit code non-zero if any semantic_drift|deleted

6.8 ce anchor refresh <id>

Recomputes and updates anchors to current hash/git_ref

Requires confirmation if drift exists (guardrail)

6.9 ce health

MVP health report:

Drift summary across all active packets

Orphan packets (active but no anchors)

Stale packets (active, no journal in 14 days)

Missing repo-map (REPO_MAP absent)

6.10 ce query "<text>"

Search sources:

packets

adrs

journal

index.json

Ranking MVP:

exact match in title/id > symbol matches > body keyword matches

output top 10 with file paths

6.11 ce index build

Build context/.index/index.json:

symbols -> { anchors[], packets[] }

packets -> { paths[], symbols[], status }

7) Privacy (MVP requirements)
Consent gate

On first LLM scribe attempt:

show privacy notice

user must opt-in

consent stored in .context-engine/consent.json (gitignored)

Sanitization

Before sending diff:

redact obvious secrets (API keys, tokens, private keys, env assignments)

if sanitizer detects likely secrets, warn and require confirmation

(Your sanitizer direction is good; just treat it as “best effort” and still warn.)

8) Supported languages (MVP)

TS / TSX / JS / JSX (required)

Python (optional, but fine if you already have wasm)

Note: TS and TSX grammars must be distinct.

9) MVP Acceptance Criteria (Definition of Done)

You can call MVP “done” when:

A new repo can run ce init and commit context/

ce packet create can add anchors for TS/TSX files

Editing code formatting/comments does not create drift

Changing logic does create drift

ce scribe produces a useful journal entry in <30 seconds

ce assemble produces a clean pack that devs can paste into Cursor/Windsurf

ce health catches at least:

drift in active packets

stale active packets

orphan packets

10) What I would cut for MVP (even if it’s cool)

ce watch (ship after you prove the workflow)

“vector store” naming (keep simple keyword index first)

cosmetic-vs-semantic drift classification (add later as a second hash)

If you ship the workflow first, adoption happens. Then you add the “nice stuff.”

Final take

This is now a real product spec, not a fantasy architecture doc.

If you want the highest-leverage next move: build (1) symbol finder + semantic hash and (2) ce scribe deterministic HEAD diff + consent first. Those two pieces decide whether Context Engine lives or dies.

If you paste me your intended packet file format (markdown frontmatter style) and how you want IDs allocated (global vs per-type sequences), I’ll lock the exact schema + file naming so implementation doesn’t drift.

The Adjusted Plan is the correct one to execute, with one modification:

Drop the "Pseudo-Embedding" implementation. Replace src/core/vector-store.ts with a src/core/relevance-engine.ts that implements the logic from the Notebook (Section 4.2 in your source text):

Extract keywords (identifiers/symbols) from the Packet.

Extract keywords from the target (ADR/Journal).

Score based on overlap + Recency Boost.

This ensures you don't ship a "dumb" vector store that ruins trust in the system's intelligence.
Thought for 28s

Agreed — dropping “pseudo-embeddings” is the right call. Shipping a fake vector system is worse than shipping none, because it creates false confidence and kills trust the first time it returns junk.

Below is the exact adjustment to the “Adjusted Plan” MVP, with a concrete relevance-engine spec that implements your Notebook Section 4.2 logic (keyword overlap + recency boost), and plugs cleanly into ce assemble and ce query.

MVP Update: Replace vector-store.ts with relevance-engine.ts
What changes
Remove (entirely)

src/core/vector-store.ts

schemas/vector-store.schema.json

any ce index embed / embedding toggles

Add

src/core/relevance-engine.ts

(optional) src/core/keyword-extractor.ts (if you want separation)

schemas/relevance.schema.json (optional; only if you want config validation)

Update

ce assemble to select ADRs/journals/related packets by relevance score

ce query to optionally rank results using the relevance engine

relevance-engine.ts — Contract + Behavior (MVP)
1) Inputs / Outputs
Inputs

Packet (current work packet)

Candidates[] where candidates are:

ADRs

Journal entries (recent window)

Related packets (optional)

Output

ranked list of candidates with score + reasons

selection function that respects token budget

export type CandidateType = "adr" | "journal" | "packet";

export interface Candidate {
  id: string;
  type: CandidateType;
  title?: string;
  text: string;          // condensed summary text (frontmatter + key body lines)
  keywords?: string[];   // optional precomputed (indexer can fill)
  timestamp?: string;    // ISO time; required for recency boost
  paths?: string[];      // affected_areas or changed_files
  symbols?: string[];    // extracted or declared
}

export interface RelevanceResult {
  id: string;
  type: CandidateType;
  score: number;         // 0..1+ (boosts can exceed 1; clamp if you want)
  reasons: string[];     // human-readable why it ranked
}

2) Keyword extraction rules (Deterministic + Local)
Packet keywords come from:

High-signal sources only

packet.title

packet.goal

packet.tags[]

packet.constraints[]

packet.dod[]

packet.repo_truth[].symbol

packet.repo_truth[].path (split segments, drop “src”, etc.)

ADR keywords come from:

adr.title

adr.decision

adr.consequences[]

adr.affected_areas[]

Journal keywords come from:

journal.summary

journal.changed_files[]

(optional) first bullet section of “What changed”

Normalization

lowercase

split on non-alphanum

drop stopwords + tokens length < 3

keep identifiers: camelCase, snake_case, PascalCase split into components

preserve originals too (so handleOAuthCallback yields handle, oauth, callback, plus full token)

MVP stopword list: small and hardcoded (the/and/with/from/this/that/into/over/etc.)

3) Scoring model (Notebook 4.2)
Base overlap score (core)

Use Jaccard overlap or overlap ratio. MVP: Jaccard is fine.

overlap = |A ∩ B| / |A ∪ B|

Boosts (simple, explainable)

Add small boosts for “strong signals”:

Symbol boost: if any packet repo_truth symbol matches candidate symbols/text
+ 0.30

Path overlap boost: if packet repo_truth paths overlap candidate paths
+ 0.20

Explicit link boost: if ADR is in packet.related_adrs
+ 0.50

Recency boost (journals mainly)

Only apply recency to journals by default (ADRs change slower).

MVP recency boost:

days = daysSince(candidate.timestamp)
recency = max(0, 0.20 - (days / 100))


So:

today: +0.20

10 days ago: +0.10

20 days ago: +0.00 (roughly)

Final score
score = overlap
      + boosts(symbol/path/explicit)
      + (candidate.type === "journal" ? recency : 0)


Optional: clamp to 0..1.5 to keep it sane.

Reasons (trust-preserving UX)

Every ranked item includes reasons like:

keyword_overlap: oauth, login, session

symbol_match: handleOAuthCallback

path_overlap: apps/api/src/auth/oauth.ts

recency: 4 days ago

This is what prevents the “dumb system” vibe.

4) Where it plugs in
A) ce assemble <packet>

Replace the “include all related content” approach with:

Always include:

packet summary

repo_truth anchors (snippets + hashes)

Candidates pool:

ADRs (all or active-only)

Journals (last N days, default 30)

Packets (active + recently completed, optional)

Rank with relevance engine

Select top candidates until token budget remaining is exhausted

Token budget packing rule

sort by score desc

add candidate section if it fits

stop when full

This gives you “intelligent pruning” without pretending you have embeddings.

B) ce query "<text>" (optional upgrade)

You can keep query as plain keyword search for MVP and only use relevance ranking when user does:

ce query "<text>" --packet FEAT-001

In that case:

treat query string as a “mini packet keyword set”

rank results using overlap + recency (journals)

5) Index implications (still local, still honest)

You can (optionally) precompute keywords into .index/index.json to speed up ranking:

index.json stores:

doc id → keywords[]

doc id → timestamp/paths/symbols (when available)

This is not “vector intelligence.” It’s just cached tokens, rebuildable, and transparent.

6) Config knobs (minimal)

In context/config/context.config.json:

{
  "relevance": {
    "journal_window_days": 30,
    "max_candidates": 200,
    "boosts": {
      "symbol_match": 0.3,
      "path_overlap": 0.2,
      "explicit_link": 0.5
    },
    "recency": {
      "journal_max": 0.2,
      "decay_per_day": 0.002
    },
    "min_score": 0.05
  }
}


Defaults should work out-of-the-box.

7) Acceptance tests (MVP must pass)

Overlap ranks correctly

Packet keywords include oauth, login

ADR A contains both → ranks above ADR B with only login

Symbol match outranks pure keyword

Candidate mentions handleOAuthCallback → boosted above others

Recency works

Two journal entries same overlap; newer ranks higher

Assemble respects token budget

Adds highest scores first; stops cleanly when full

Reasons are present

Every selected section includes at least 1 reason line

Summary decision

✅ You’re making the right trade: explainable, deterministic relevance beats “fake embeddings” every time for early trust.

If you want, I’ll now rewrite your “Ultimate Shippable MVP” doc into a single clean spec (file tree + command behaviors + schemas + relevance engine) with this modification fully integrated, so you can hand it straight to your build agent.

alright now provide the ultimate MVP plan all ina a nice format I can copy and paste so we have our game plan
# Context Engine v2.0 — Ultimate Shippable MVP Game Plan (Copy/Paste)

**Philosophy:** Development companion, not documentation.  
**Non-negotiables:** WASM-only (no native deps), local-first, privacy-first, semantic anchors, low friction, explainable relevance.

---

## 0) MVP Objective (What “Done” Means)

Ship an NPM CLI (`ce`) that can be installed into any repo and reliably:
1) Scaffold `/context` + config
2) Create/start/switch/complete work packets
3) Attach **semantic anchors** (AST-hash) to repo truth
4) Assemble an **agent-ready context pack** with **intelligent pruning** (keyword overlap + recency boost)
5) Scribe journal entries automatically from git diffs (LLM optional + consent)
6) Run health checks (semantic drift / orphans / stale packets)
7) Query context quickly (packets/ADRs/journal ranked)

**Success criteria:** A developer uses it daily because it removes friction, not adds it.

---

## 1) MVP Scope

### In Scope (MVP)
- CLI: `ce init`, `ce packet create/start/status/complete`, `ce switch`, `ce assemble`, `ce scribe`, `ce anchor check/refresh`, `ce validate/all`, `ce index build`, `ce health`, `ce query`
- Storage: Markdown files with YAML frontmatter + JSON Schema validation
- Semantic Anchors: web-tree-sitter (WASM) hashing for TS/TSX/JS/JSX (Python optional)
- Privacy-first LLM Scribe: explicit consent, diff sanitization, `--local` fallback
- Relevance Engine: keyword overlap + recency boost (no pseudo-embeddings)
- Generated output is gitignored (no merge-conflict churn)

### Out of Scope (Post-MVP)
- VS Code LSP extension
- Embeddings/vector DB
- Background watcher (`ce watch`) (ship after adoption)
- External integrations (Linear/Slack/Notion)
- Knowledge graph UI

---

## 2) Non-Negotiable Principles (Enforced)

1) **Repo Truth > Chat Truth**
2) **WASM-only parsing** (no node-gyp)
3) **Consent before cloud LLM** (`ce scribe` must never send code without opt-in)
4) **Deterministic scribe by default** (summarize `HEAD` unless user opts into working tree)
5) **Explainable relevance** (every selection includes reasons)

---

## 3) Package + Dependencies

### Package
- `@context-engine/cli` (Node >= 18, ESM)
- Binary: `ce`

### Required dependencies (high level)
- CLI: commander/yargs, inquirer, chalk, ora
- Files: fs-extra, glob/fast-glob
- Validation: ajv + formats
- Parsing: `web-tree-sitter` (WASM)
- Git: simple-git or execa wrappers
- LLM (optional): Anthropic SDK + OpenAI SDK (provider pluggable)
- Clipboard: clipboardy

### WASM strategy (MVP)
- Ship grammars for: `typescript`, `tsx`, `javascript`, `jsx` (python optional)
- **Do not rely on flaky GitHub release URLs** at runtime.
- Prefer vendoring WASM assets into package at build/publish time.

---

## 4) Directory Layout (What `ce init` Creates)



your-project/
├── context/
│ ├── config/
│ │ └── context.config.json
│ ├── repo-map/
│ │ └── REPO_MAP.md
│ ├── packets/
│ │ ├── active/
│ │ └── completed/
│ ├── adrs/
│ ├── journal/
│ │ └── 2026/01-january.md
│ ├── .index/ (gitignored)
│ │ └── index.json
│ └── .ce-version
│
└── .context-engine/ (gitignored)
├── current-context.json
├── consent.json
└── cache/


### `.gitignore` additions (MVP REQUIRED)


.context-engine/
context/.index/
context/.assembled/


---

## 5) Core Data Contracts

### 5.1 Packets (Markdown + YAML frontmatter)
Path:
- `context/packets/active/FEAT-001.md`
- `context/packets/completed/FEAT-001.md`

Frontmatter required:
- `id`, `type`, `title`, `status`
- `goal`
- `dod[]`
- `repo_truth[]` (semantic anchors)
- `metadata` (timestamps, author, branch_name optional)

Allowed status transitions (enforced):
- `draft → active`
- `active → blocked | completed | cancelled`
- `blocked → active | cancelled`
- `completed → (moved to completed folder)`

### 5.2 ADRs (Markdown + YAML frontmatter)
- `context/adrs/ADR-0001-title.md`
Required: `id`, `title`, `status`, `decision`, `context`, `consequences[]`, `affected_areas[]`

### 5.3 Journal (Monthly file, appended entries)
- `context/journal/YYYY/MM-month.md`
Each entry stores:
- packet_id, commit_sha, changed_files[], summary, risks[], next_steps[], timestamp

---

## 6) Semantic Anchors (Repo Truth that doesn’t rot)

### 6.1 Anchor shape (repo_truth item)
Required:
- `path`, `symbol`, `language`, `symbol_type`
- `anchor_type: semantic_hash`
- `semantic_hash: sha256:...`
- `git_ref` (capture SHA)
- `captured_at`

Fallback (display only):
- `signature`, `line_start`, `line_end`

### 6.2 Hash definition (MVP)
- Parse symbol node via WASM tree-sitter
- Normalize AST:
  - skip comments + whitespace
  - include node structure + leaf token types/text
- Hash normalized representation with SHA-256
- Cosmetic edits should not change hash; logic edits should.

### 6.3 Drift classification (MVP)
- `valid` (hash matches)
- `semantic_drift` (hash differs)
- `deleted` (file/symbol missing)

(No cosmetic-vs-semantic in MVP.)

---

## 7) Relevance Engine (Replaces “Pseudo-Embeddings”)

### 7.1 File
- `src/core/relevance-engine.ts`

### 7.2 Purpose
Used by:
- `ce assemble` for intelligent pruning under token budget
- optionally `ce query` for ranking

### 7.3 Keyword sources (deterministic)
Packet keywords:
- title, goal, tags, constraints, dod
- repo_truth symbols + path segments

Candidate keywords:
- ADR: title/decision/consequences/affected_areas
- Journal: summary + changed_files

Normalization:
- lowercase
- split identifiers (camel/snake/pascal)
- remove stopwords + tokens < 3
- keep both full identifier + split parts

### 7.4 Scoring (Notebook logic)
Base: Jaccard overlap
- overlap = |A ∩ B| / |A ∪ B|

Boosts:
- +0.50 explicit link (ADR in packet.related_adrs)
- +0.30 symbol match (repo_truth symbol appears)
- +0.20 path overlap (repo_truth path overlaps candidate paths)

Recency boost (journals only):
- recency = max(0, 0.20 - (daysAgo / 100))

Final:
- score = overlap + boosts + recency(journal)

**Explainability requirement:** every ranked item emits reasons (overlap tokens, symbol/path match, daysAgo).

---

## 8) CLI Command Surface (MVP)

### 8.1 `ce init`
- scaffold folder tree + config + repo map
- add gitignore entries
- write `.ce-version`

### 8.2 `ce packet create <type> "<title>"`
Flow:
- allocate next ID
- prompt: goal, DoD, constraints
- prompt to add anchors:
  - enter file path
  - list symbols found
  - select symbol(s)
  - write semantic anchors

### 8.3 `ce packet start <id>`
- status → active
- optional branch creation: `feature/FEAT-001-slug`

### 8.4 `ce switch <id>` ⭐ critical
- update `.context-engine/current-context.json`
- show summary (title/status/goal)
- optionally `ce assemble --clipboard`

### 8.5 `ce assemble <id> [--max-tokens 8000] [--clipboard] [--out file]`
Always include:
- packet summary + DoD + constraints
- repo_truth anchors (path/symbol/hash/signature)
Then fill remaining budget by relevance ranking over:
- ADRs (active, plus linked)
- journals (last 30 days default)
- related packets (optional)

### 8.6 `ce scribe <id> [--local] [--no-llm] [--include-working-tree]`
Default diff: `HEAD` (deterministic)
- detect changed files + commit sha
- consent gate if LLM is used
- sanitize diff before sending
- auto-generate: summary, risks, next steps
- append journal entry
- check anchors for drift; offer refresh
- offer mark packet completed

### 8.7 `ce anchor check <id>`
- recompute hashes for anchors
- report drift/deleted
- nonzero exit if any drift/deleted

### 8.8 `ce anchor refresh <id>`
- update anchors to current code (confirmation required if drift)

### 8.9 `ce validate [file|id]` + `ce validate-all`
- validates YAML frontmatter against schemas
- refuses invalid operations

### 8.10 `ce index build`
- generate `context/.index/index.json`:
  - symbol → packets/anchors
  - packet → paths/symbols/status
  - adr → affected_areas
  - journal → changed_files + timestamp

### 8.11 `ce health [--fail]`
Report:
- semantic drift across active packets
- orphan packets (active with no anchors)
- stale packets (active with no journal in N days)
- missing repo-map/config/schema version mismatch

### 8.12 `ce query "<text>" [--packet FEAT-001]`
- default: keyword search across packets/adrs/journal/repo-map
- `--packet` ranks results using relevance engine

---

## 9) Privacy System (MVP REQUIRED)

### 9.1 Consent gate
On first LLM usage:
- show privacy notice
- ask user to grant consent
- store consent in `.context-engine/consent.json` (gitignored)
- if no consent → force `--local`

### 9.2 Diff sanitization
Before sending diff:
- redact obvious secrets:
  - api keys, tokens, private keys, passwords, AWS keys, emails (optional)
- if potential secrets detected:
  - warn + require confirmation

### 9.3 Local mode
`--local` produces:
- manual 1–2 sentence summary prompt
- optional risks/next steps prompts
- same journal + drift flow
(No cloud calls.)

---

## 10) Enforcement (MVP)

### Local hooks (lightweight)
- pre-commit: `ce validate-all` (fast)
- pre-push: `ce health --fail` (optional, configurable)

### CI gate (recommended)
- run `ce validate-all`
- run `ce health --fail`
This is where “decay prevention” actually happens.

---

## 11) Implementation Roadmap (Shippable)

### Week 1 — Core + WASM Anchors (Foundation)
- CLI scaffold + `ce init`
- YAML frontmatter parser + AJV validation
- `ce packet create/start/status/complete`
- WASM loader + TS/TSX/JS/JSX parsers
- symbol finder (handles function, class, methods, const arrow functions, exports)
- semantic hash + anchor creation
- `ce anchor check/refresh`

**Milestone:** anchors survive formatting/comment churn and detect logic changes.

### Week 2 — Assemble + Relevance Engine + Index
- `ce index build` (keywords, paths, symbols, timestamps)
- `relevance-engine.ts` (overlap + boosts + recency + reasons)
- `ce assemble` with token budget pruning using relevance engine
- `ce switch` + current-context state file

**Milestone:** assemble outputs an agent pack that “feels smart” and explains why.

### Week 3 — Scribe + Privacy + Health + Query
- git diff collector (default HEAD) + changed file detection
- privacy consent + sanitizer + local mode
- LLM scribe provider interface (Anthropic/OpenAI)
- journal append format + minimal prompts
- `ce health` (drift/orphans/stale)
- `ce query` baseline + optional packet-ranked query

**Milestone:** daily flow is fast: create → work → scribe → health green.

### Week 4 — Polish + Publish
- improved errors + colored output + spinners
- docs: SETUP, COMMANDS, PRIVACY
- example repo template
- publish to npm

---

## 12) MVP Definition of Done (Acceptance Tests)

1) `ce init` creates expected structure + gitignore entries
2) `ce packet create` creates valid packet and anchors (TS/TSX)
3) Formatting-only edits do NOT cause drift
4) Logic edits DO cause drift
5) `ce assemble` respects token limit and selects relevant ADR/journal with reasons
6) `ce scribe`:
   - summarizes HEAD deterministically
   - works with `--local` without any API keys
   - requires consent before cloud LLM
7) `ce health` catches:
   - drift in active packets
   - stale active packets
   - orphan packets
8) No generated files are committed by default (gitignored)

---

## 13) Daily Developer Workflow (The Point)

Morning:
- `ce health`
- `ce switch FEAT-001` (or `ce packet create ...`)

During work:
- `ce assemble FEAT-001 --clipboard` → paste into Cursor/Windsurf

After commit:
- `ce scribe FEAT-001` (LLM if consent, else `--local`)
- if drift found: `ce anchor refresh FEAT-001`

Close:
- `ce packet complete FEAT-001` (or via scribe prompt)

---

## 14) Build Order (Highest Leverage First)

1) WASM parser loader + symbol finder + semantic hash
2) Packet lifecycle + validation
3) Assemble + relevance engine (pruning with reasons)
4) Scribe + privacy + local mode
5) Health + index + query
6) Polish + publish

---

✅ This is the ultimate shippable MVP: portable, privacy-safe, low-friction, and trustworthy.