import { loadConsent, saveConsent } from './config.js';
import type { ConsentData } from '../types/index.js';

const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
  /(?:secret|password|passwd|pwd)\s*[:=]\s*['"]?([^\s'"]{8,})['"]?/gi,
  /(?:token|auth[_-]?token|access[_-]?token)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
  /(?:aws[_-]?access[_-]?key[_-]?id)\s*[:=]\s*['"]?(AKIA[A-Z0-9]{16})['"]?/gi,
  /(?:aws[_-]?secret[_-]?access[_-]?key)\s*[:=]\s*['"]?([a-zA-Z0-9/+=]{40})['"]?/gi,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
  /-----BEGIN\s+(?:OPENSSH\s+)?PRIVATE\s+KEY-----/gi,
  /ghp_[a-zA-Z0-9]{36}/g,
  /gho_[a-zA-Z0-9]{36}/g,
  /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g,
  /sk-[a-zA-Z0-9]{48}/g,
  /sk-proj-[a-zA-Z0-9]{48}/g,
  /xox[baprs]-[a-zA-Z0-9-]+/g,
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
];

export interface SanitizeResult {
  sanitized: string;
  secretsFound: number;
  warnings: string[];
}

export function sanitizeDiff(diff: string): SanitizeResult {
  let sanitized = diff;
  let secretsFound = 0;
  const warnings: string[] = [];
  
  for (const pattern of SECRET_PATTERNS) {
    const matches = sanitized.match(pattern);
    if (matches) {
      secretsFound += matches.length;
      warnings.push(`Found ${matches.length} potential secret(s) matching: ${pattern.source.slice(0, 30)}...`);
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
  }
  
  return {
    sanitized,
    secretsFound,
    warnings,
  };
}

export function detectSecrets(content: string): string[] {
  const found: string[] = [];
  
  for (const pattern of SECRET_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      found.push(...matches.map((m) => m.slice(0, 20) + '...'));
    }
  }
  
  return found;
}

export async function hasConsent(dir: string = process.cwd()): Promise<boolean> {
  const consent = await loadConsent(dir);
  return consent.llm_consent === true;
}

export async function grantConsent(provider: string, dir: string = process.cwd()): Promise<void> {
  const consent: ConsentData = {
    llm_consent: true,
    consented_at: new Date().toISOString(),
    provider,
  };
  await saveConsent(consent, dir);
}

export async function revokeConsent(dir: string = process.cwd()): Promise<void> {
  const consent: ConsentData = {
    llm_consent: false,
  };
  await saveConsent(consent, dir);
}

export const PRIVACY_NOTICE = `
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
║  Your consent is stored locally in .context-engine/consent.json  ║
║  and is NOT committed to your repository.                        ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
`;

export function formatSecretsWarning(secrets: string[]): string {
  return `
⚠️  POTENTIAL SECRETS DETECTED

The following patterns were found that may contain sensitive data:
${secrets.map((s) => `  • ${s}`).join('\n')}

These will be redacted before sending to the LLM.
Please review carefully before proceeding.
`;
}
