import fs from 'fs-extra';
import path from 'path';
import type { ContextConfig, CurrentContext, ConsentData } from '../types/index.js';

const CONTEXT_DIR = 'context';
const CONFIG_DIR = 'config';
const CE_DIR = '.context-engine';

export const PATHS = {
  context: CONTEXT_DIR,
  config: path.join(CONTEXT_DIR, CONFIG_DIR, 'context.config.json'),
  repoMap: path.join(CONTEXT_DIR, 'repo-map', 'REPO_MAP.md'),
  packetsActive: path.join(CONTEXT_DIR, 'packets', 'active'),
  packetsCompleted: path.join(CONTEXT_DIR, 'packets', 'completed'),
  adrs: path.join(CONTEXT_DIR, 'adrs'),
  journal: path.join(CONTEXT_DIR, 'journal'),
  index: path.join(CONTEXT_DIR, '.index', 'index.json'),
  ceVersion: path.join(CONTEXT_DIR, '.ce-version'),
  ceDir: CE_DIR,
  currentContext: path.join(CE_DIR, 'current-context.json'),
  consent: path.join(CE_DIR, 'consent.json'),
  cache: path.join(CE_DIR, 'cache'),
} as const;

export const DEFAULT_CONFIG: ContextConfig = {
  version: '2.0.0',
  project: {
    name: '',
    description: '',
  },
  relevance: {
    journal_window_days: 30,
    max_candidates: 200,
    boosts: {
      symbol_match: 0.3,
      path_overlap: 0.2,
      explicit_link: 0.5,
    },
    recency: {
      journal_max: 0.2,
      decay_per_day: 0.002,
    },
    min_score: 0.05,
  },
  llm: {
    provider: undefined,
    model: undefined,
    consent_required: true,
  },
};

export function findProjectRoot(startDir: string = process.cwd()): string | null {
  let currentDir = startDir;

  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, CONTEXT_DIR))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

export function isInitialized(dir: string = process.cwd()): boolean {
  return fs.existsSync(path.join(dir, PATHS.config));
}

export function requireInitialized(dir: string = process.cwd()): void {
  if (!isInitialized(dir)) {
    throw new Error('Context Engine not initialized. Run `ce init` first.');
  }
}

export async function loadConfig(dir: string = process.cwd()): Promise<ContextConfig> {
  requireInitialized(dir);
  const configPath = path.join(dir, PATHS.config);
  const content = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(content) as ContextConfig;
}

export async function saveConfig(config: ContextConfig, dir: string = process.cwd()): Promise<void> {
  const configPath = path.join(dir, PATHS.config);
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function loadCurrentContext(dir: string = process.cwd()): Promise<CurrentContext> {
  const contextPath = path.join(dir, PATHS.currentContext);
  
  if (!fs.existsSync(contextPath)) {
    return { packet_id: null, switched_at: null };
  }
  
  const content = await fs.readFile(contextPath, 'utf-8');
  return JSON.parse(content) as CurrentContext;
}

export async function saveCurrentContext(context: CurrentContext, dir: string = process.cwd()): Promise<void> {
  const contextPath = path.join(dir, PATHS.currentContext);
  await fs.ensureDir(path.dirname(contextPath));
  await fs.writeFile(contextPath, JSON.stringify(context, null, 2));
}

export async function loadConsent(dir: string = process.cwd()): Promise<ConsentData> {
  const consentPath = path.join(dir, PATHS.consent);
  
  if (!fs.existsSync(consentPath)) {
    return { llm_consent: false };
  }
  
  const content = await fs.readFile(consentPath, 'utf-8');
  return JSON.parse(content) as ConsentData;
}

export async function saveConsent(consent: ConsentData, dir: string = process.cwd()): Promise<void> {
  const consentPath = path.join(dir, PATHS.consent);
  await fs.ensureDir(path.dirname(consentPath));
  await fs.writeFile(consentPath, JSON.stringify(consent, null, 2));
}

export function getPacketPath(id: string, status: 'active' | 'completed', dir: string = process.cwd()): string {
  const folder = status === 'active' ? PATHS.packetsActive : PATHS.packetsCompleted;
  return path.join(dir, folder, `${id}.md`);
}

export function getJournalPath(date: Date, dir: string = process.cwd()): string {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const monthName = date.toLocaleString('en-US', { month: 'long' }).toLowerCase();
  return path.join(dir, PATHS.journal, year, `${month}-${monthName}.md`);
}

export function getADRPath(id: string, title: string, dir: string = process.cwd()): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return path.join(dir, PATHS.adrs, `${id}-${slug}.md`);
}
