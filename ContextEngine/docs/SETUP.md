# Context Engine Setup Guide

## Requirements

- **Node.js 18+** — Required for ESM and modern APIs
- **Git** — Required for diff and commit operations

## Installation

### Global Install (Recommended)

```bash
npm install -g @context-engine/cli
```

After installation, the `ce` command is available globally.

### Local Install (Per Project)

```bash
npm install --save-dev @context-engine/cli
```

Then use via `npx ce` or add scripts to `package.json`.

### Development Setup

```bash
git clone https://github.com/your-org/context-engine.git
cd context-engine
npm install
npm run build
npm link
```

## Initialize Your Project

Navigate to your project root and run:

```bash
ce init
```

This creates:
- `context/` — Main context directory (committed)
- `.context-engine/` — Local state (gitignored)

### Interactive Mode

By default, `ce init` prompts for project name and description.

### Non-Interactive Mode

```bash
ce init --yes
```

Uses defaults (current directory name as project name).

## Configure LLM (Optional)

For AI-powered journal entries, set your API key:

```bash
# For Anthropic (default)
export ANTHROPIC_API_KEY=your-key-here

# For OpenAI
export OPENAI_API_KEY=your-key-here
```

Update `context/config/context.config.json`:

```json
{
  "llm": {
    "provider": "anthropic",
    "consent_required": true
  }
}
```

LLM is **optional** — use `--local` mode for manual summaries.

## Git Hooks (Optional)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
ce validate all --fail
```

Add to `.git/hooks/pre-push`:

```bash
#!/bin/sh
ce health --fail
```

Make them executable:

```bash
chmod +x .git/hooks/pre-commit .git/hooks/pre-push
```

## CI Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Validate Context
  run: |
    npx @context-engine/cli validate all --fail
    npx @context-engine/cli health --fail
```

## Troubleshooting

### "Context Engine not initialized"

Run `ce init` in your project root.

### "Packet not found"

Check that the packet ID exists:
```bash
ls context/packets/active/
ls context/packets/completed/
```

### WASM Grammar Loading Issues

Grammars are loaded from CDN on first use. Ensure network access or pre-cache:

```bash
ce index build  # Forces grammar initialization
```

### LLM Errors

1. Check API key is set: `echo $ANTHROPIC_API_KEY`
2. Verify consent is granted in `.context-engine/consent.json`
3. Use `--local` mode as fallback

## Directory Structure Reference

```
project/
├── context/
│   ├── config/
│   │   └── context.config.json    # Project configuration
│   ├── repo-map/
│   │   └── REPO_MAP.md            # Repository overview
│   ├── packets/
│   │   ├── active/                # Current work packets
│   │   │   └── FEAT-001.md
│   │   └── completed/             # Finished packets
│   ├── adrs/                      # Architecture decisions
│   ├── journal/                   # Development logs
│   │   └── 2026/
│   │       └── 01-january.md
│   ├── .index/                    # Search index (gitignored)
│   │   └── index.json
│   └── .ce-version               # Schema version
│
└── .context-engine/               # Local state (gitignored)
    ├── current-context.json       # Active packet
    ├── consent.json               # LLM consent
    └── cache/                     # Temporary files
```
