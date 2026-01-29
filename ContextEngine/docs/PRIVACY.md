# Privacy Policy

Context Engine is designed with privacy as a core principle.

## Data Handling

### What Stays Local

- **All context files** — Stored in your repository under `context/`
- **Local state** — Stored in `.context-engine/` (gitignored)
- **Search index** — Stored locally in `context/.index/`
- **Consent status** — Stored locally in `.context-engine/consent.json`

### What Can Be Sent (With Consent)

Only when using `ce scribe` with LLM enabled:
- **Git diffs** — Sanitized before sending
- **Packet context** — Title and goal only

## Consent System

### First-Time Consent

On first LLM use, you'll see:

```
╔══════════════════════════════════════════════════════════════════╗
║                     PRIVACY NOTICE                                ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Context Engine can use an LLM to automatically summarize your   ║
║  git diffs and generate journal entries.                         ║
║                                                                   ║
║  By granting consent, you acknowledge that:                      ║
║                                                                   ║
║  • Your code diffs will be sent to a cloud LLM provider          ║
║  • Obvious secrets (API keys, tokens) are automatically redacted ║
║  • You can revoke consent at any time                            ║
║  • You can always use --local mode (no cloud calls)              ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝

Do you consent to sending diffs to an LLM provider? (y/N)
```

You must explicitly opt-in. Default is `N` (no).

### Consent Storage

Consent is stored in `.context-engine/consent.json`:

```json
{
  "llm_consent": true,
  "consented_at": "2026-01-29T10:00:00.000Z",
  "provider": "anthropic"
}
```

This file is gitignored and never shared.

### Revoking Consent

Delete or edit `.context-engine/consent.json`:

```json
{
  "llm_consent": false
}
```

Or simply use `--local` mode going forward.

## Secret Redaction

Before any diff is sent to an LLM, it's automatically sanitized:

### Detected Patterns

- API keys (`api_key`, `apikey`)
- Secrets (`secret`, `password`, `passwd`, `pwd`)
- Tokens (`token`, `auth_token`, `access_token`)
- AWS credentials (`aws_access_key_id`, `aws_secret_access_key`)
- Private keys (`-----BEGIN PRIVATE KEY-----`)
- GitHub tokens (`ghp_`, `gho_`, `github_pat_`)
- OpenAI keys (`sk-`, `sk-proj-`)
- Slack tokens (`xox[baprs]-`)
- JWTs (`eyJ...`)

### Warning System

If potential secrets are detected:

```
⚠️  POTENTIAL SECRETS DETECTED

The following patterns were found that may contain sensitive data:
  • sk-abc123...
  • ghp_xyz789...

These will be redacted before sending to the LLM.
Please review carefully before proceeding.

Continue with redacted diff? (Y/n)
```

## Local Mode

Use `--local` to skip all LLM calls:

```bash
ce scribe FEAT-001 --local
```

In local mode:
- You manually enter the summary
- No network requests are made
- No consent required

## Gitignored Files

The following are never committed:

```gitignore
.context-engine/        # Local state
context/.index/         # Search index
context/.assembled/     # Temporary outputs
```

## LLM Providers

### Anthropic (Default)

- Model: Claude 3 Haiku
- API: `https://api.anthropic.com/v1/messages`
- Data retention: See [Anthropic's privacy policy](https://www.anthropic.com/privacy)

### OpenAI (Alternative)

- Model: GPT-4o-mini
- API: `https://api.openai.com/v1/chat/completions`
- Data retention: See [OpenAI's privacy policy](https://openai.com/privacy)

## Enterprise Considerations

For enterprise deployments:

1. **Self-hosted LLMs** — Configure custom API endpoints in config
2. **Air-gapped environments** — Use `--local` mode exclusively
3. **Audit trails** — Journal entries provide commit-linked documentation
4. **Policy enforcement** — Use `ce validate all --fail` in CI

## Questions

If you have privacy concerns, please:
1. Review this document
2. Use `--local` mode when uncertain
3. Open an issue for clarification
