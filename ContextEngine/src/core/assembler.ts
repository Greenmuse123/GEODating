import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import { Tiktoken, encodingForModel } from 'js-tiktoken';
import { PATHS, loadConfig } from './config.js';
import { readMarkdownFile } from './frontmatter.js';
import { parseJournalEntries } from './indexer.js';
import { rankCandidates, selectByTokenBudget } from './relevance-engine.js';
import type {
  Packet,
  ADR,
  Candidate,
  AssembleOptions,
  RelevanceResult,
} from '../types/index.js';

let tokenizer: Tiktoken | null = null;

function getTokenizer(): Tiktoken {
  if (!tokenizer) {
    tokenizer = encodingForModel('gpt-4');
  }
  return tokenizer;
}

export function countTokens(text: string): number {
  const enc = getTokenizer();
  return enc.encode(text).length;
}

export async function assembleContextPack(
  packetId: string,
  options: AssembleOptions,
  cwd: string = process.cwd()
): Promise<string> {
  const config = await loadConfig(cwd);
  const packet = await loadPacket(packetId, cwd);
  
  if (!packet) {
    throw new Error(`Packet not found: ${packetId}`);
  }
  
  const sections: string[] = [];
  let usedTokens = 0;
  
  const headerSection = buildHeaderSection(packet);
  sections.push(headerSection);
  usedTokens += countTokens(headerSection);
  
  const anchorsSection = buildAnchorsSection(packet);
  sections.push(anchorsSection);
  usedTokens += countTokens(anchorsSection);
  
  const rulesSection = buildRulesSection();
  sections.push(rulesSection);
  usedTokens += countTokens(rulesSection);
  
  const remainingBudget = options.maxTokens - usedTokens - 200;
  
  const candidates = await gatherCandidates(packet, config.relevance.journal_window_days, cwd);
  const ranked = rankCandidates(packet, candidates, config.relevance);
  
  const tokenEstimates = new Map<string, number>();
  for (const candidate of candidates) {
    tokenEstimates.set(candidate.id, countTokens(candidate.text));
  }
  
  const { selected } = selectByTokenBudget(ranked, tokenEstimates, remainingBudget);
  
  if (selected.length > 0) {
    const contextSection = await buildContextSection(selected, candidates, cwd);
    sections.push(contextSection);
  }
  
  return sections.join('\n\n---\n\n');
}

async function loadPacket(packetId: string, cwd: string): Promise<Packet | null> {
  const activePath = path.join(cwd, PATHS.packetsActive, `${packetId}.md`);
  const completedPath = path.join(cwd, PATHS.packetsCompleted, `${packetId}.md`);
  
  const packetPath = fs.existsSync(activePath) ? activePath : fs.existsSync(completedPath) ? completedPath : null;
  
  if (!packetPath) {
    return null;
  }
  
  const { data } = await readMarkdownFile<Packet>(packetPath);
  return data;
}

function buildHeaderSection(packet: Packet): string {
  const lines = [
    `# Context Pack: ${packet.id}`,
    '',
    `**Title:** ${packet.title}`,
    `**Status:** ${packet.status}`,
    '',
    '## Goal',
    packet.goal,
    '',
    '## Definition of Done',
    ...packet.dod.map((d) => `- [ ] ${d}`),
  ];
  
  if (packet.constraints && packet.constraints.length > 0) {
    lines.push('', '## Constraints', ...packet.constraints.map((c) => `- ${c}`));
  }
  
  return lines.join('\n');
}

function buildAnchorsSection(packet: Packet): string {
  if (packet.repo_truth.length === 0) {
    return '## Repo Truth\n\n_No anchors defined._';
  }
  
  const lines = ['## Repo Truth (Semantic Anchors)', ''];
  
  for (const anchor of packet.repo_truth) {
    lines.push(`### \`${anchor.symbol}\``);
    lines.push(`- **Path:** \`${anchor.path}\``);
    lines.push(`- **Type:** ${anchor.symbol_type}`);
    lines.push(`- **Hash:** \`${anchor.semantic_hash.slice(0, 20)}...\``);
    lines.push(`- **Captured:** ${anchor.captured_at}`);
    if (anchor.signature) {
      lines.push(`- **Signature:** \`${anchor.signature}\``);
    }
    if (anchor.line_start && anchor.line_end) {
      lines.push(`- **Lines:** ${anchor.line_start}-${anchor.line_end}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

function buildRulesSection(): string {
  return `## Rules for Agent

When working on this packet:

1. **Cite file paths and symbols** — Always reference the exact file paths and symbol names from the anchors above.
2. **Do not assume line numbers** — Line numbers may have changed; use semantic anchors to locate code.
3. **Check for drift** — If code structure seems different from the anchors, flag it for review.
4. **Respect constraints** — Follow all constraints listed above.
5. **Complete DoD items** — Work toward completing each definition-of-done item.
`;
}

async function gatherCandidates(
  _packet: Packet,
  journalWindowDays: number,
  cwd: string
): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  
  const adrFiles = await fg('*.md', {
    cwd: path.join(cwd, PATHS.adrs),
    absolute: true,
  });
  
  for (const adrPath of adrFiles) {
    try {
      const { data } = await readMarkdownFile<ADR>(adrPath);
      candidates.push({
        id: data.id,
        type: 'adr',
        title: data.title,
        text: `${data.title}\n${data.decision}\n${data.consequences.join('\n')}`,
        paths: data.affected_areas,
        timestamp: data.created_at,
      });
    } catch {
      // Skip invalid files
    }
  }
  
  const journalFiles = await fg('**/*.md', {
    cwd: path.join(cwd, PATHS.journal),
    absolute: true,
  });
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - journalWindowDays);
  
  for (const journalPath of journalFiles) {
    try {
      const content = await fs.readFile(journalPath, 'utf-8');
      const entries = parseJournalEntries(content);
      
      for (const entry of entries) {
        const entryDate = new Date(entry.timestamp);
        if (entryDate >= cutoffDate) {
          candidates.push({
            id: `journal-${entry.commit_sha.slice(0, 8)}`,
            type: 'journal',
            title: `Journal: ${entry.summary.slice(0, 50)}...`,
            text: `${entry.summary}\n${entry.changed_files.join('\n')}`,
            paths: entry.changed_files,
            timestamp: entry.timestamp,
          });
        }
      }
    } catch {
      // Skip invalid files
    }
  }
  
  return candidates;
}

async function buildContextSection(
  selected: RelevanceResult[],
  candidates: Candidate[],
  _cwd: string
): Promise<string> {
  const lines = ['## Related Context', ''];
  
  const adrs = selected.filter((s) => s.type === 'adr');
  if (adrs.length > 0) {
    lines.push('### Related ADRs', '');
    for (const adr of adrs) {
      const candidate = candidates.find((c) => c.id === adr.id);
      if (candidate) {
        lines.push(`**${candidate.title}** (score: ${adr.score.toFixed(2)})`);
        lines.push(`_Reasons: ${adr.reasons.join(', ')}_`);
        lines.push('');
      }
    }
  }
  
  const journals = selected.filter((s) => s.type === 'journal');
  if (journals.length > 0) {
    lines.push('### Recent Journal Entries', '');
    for (const journal of journals) {
      const candidate = candidates.find((c) => c.id === journal.id);
      if (candidate) {
        lines.push(`**${candidate.title}**`);
        lines.push(`_Timestamp: ${candidate.timestamp}_`);
        lines.push(`_Reasons: ${journal.reasons.join(', ')}_`);
        lines.push('');
      }
    }
  }
  
  return lines.join('\n');
}
