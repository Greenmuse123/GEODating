import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import { PATHS } from './config.js';
import { readMarkdownFile } from './frontmatter.js';
import { extractKeywords } from './relevance-engine.js';
import type { ContextIndex, IndexEntry, Packet, ADR, JournalEntry } from '../types/index.js';

export async function buildIndex(cwd: string = process.cwd()): Promise<ContextIndex> {
  const entries: IndexEntry[] = [];
  const symbolMap: Record<string, string[]> = {};
  const pathMap: Record<string, string[]> = {};
  
  const activePackets = await fg('*.md', {
    cwd: path.join(cwd, PATHS.packetsActive),
    absolute: true,
  });
  
  const completedPackets = await fg('*.md', {
    cwd: path.join(cwd, PATHS.packetsCompleted),
    absolute: true,
  });
  
  for (const packetPath of [...activePackets, ...completedPackets]) {
    try {
      const { data } = await readMarkdownFile<Packet>(packetPath);
      const keywords = extractKeywords(`${data.title} ${data.goal} ${data.dod.join(' ')}`);
      const paths = data.repo_truth.map((a) => a.path);
      const symbols = data.repo_truth.map((a) => a.symbol);
      
      entries.push({
        id: data.id,
        type: 'packet',
        keywords,
        paths,
        symbols,
        status: data.status,
      });
      
      for (const symbol of symbols) {
        if (!symbolMap[symbol]) {
          symbolMap[symbol] = [];
        }
        symbolMap[symbol].push(data.id);
      }
      
      for (const p of paths) {
        if (!pathMap[p]) {
          pathMap[p] = [];
        }
        pathMap[p].push(data.id);
      }
    } catch {
      // Skip invalid files
    }
  }
  
  const adrFiles = await fg('*.md', {
    cwd: path.join(cwd, PATHS.adrs),
    absolute: true,
  });
  
  for (const adrPath of adrFiles) {
    try {
      const { data } = await readMarkdownFile<ADR>(adrPath);
      const keywords = extractKeywords(
        `${data.title} ${data.decision} ${data.consequences.join(' ')} ${data.affected_areas.join(' ')}`
      );
      
      entries.push({
        id: data.id,
        type: 'adr',
        keywords,
        paths: data.affected_areas,
        status: data.status,
      });
    } catch {
      // Skip invalid files
    }
  }
  
  const journalFiles = await fg('**/*.md', {
    cwd: path.join(cwd, PATHS.journal),
    absolute: true,
  });
  
  for (const journalPath of journalFiles) {
    try {
      const content = await fs.readFile(journalPath, 'utf-8');
      const entries_parsed = parseJournalEntries(content);
      
      for (const entry of entries_parsed) {
        const keywords = extractKeywords(`${entry.summary} ${entry.changed_files.join(' ')}`);
        
        entries.push({
          id: `journal-${entry.commit_sha.slice(0, 8)}`,
          type: 'journal',
          keywords,
          paths: entry.changed_files,
          timestamp: entry.timestamp,
        });
      }
    } catch {
      // Skip invalid files
    }
  }
  
  const index: ContextIndex = {
    version: '2.0.0',
    built_at: new Date().toISOString(),
    entries,
    symbol_map: symbolMap,
    path_map: pathMap,
  };
  
  return index;
}

export async function saveIndex(index: ContextIndex, cwd: string = process.cwd()): Promise<void> {
  const indexPath = path.join(cwd, PATHS.index);
  await fs.ensureDir(path.dirname(indexPath));
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
}

export async function loadIndex(cwd: string = process.cwd()): Promise<ContextIndex | null> {
  const indexPath = path.join(cwd, PATHS.index);
  
  if (!fs.existsSync(indexPath)) {
    return null;
  }
  
  const content = await fs.readFile(indexPath, 'utf-8');
  return JSON.parse(content) as ContextIndex;
}

function parseJournalEntries(content: string): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const entryBlocks = content.split(/^## /gm).filter((b) => b.trim());
  
  for (const block of entryBlocks) {
    try {
      const lines = block.split('\n');
      const headerMatch = lines[0]?.match(/\[(.*?)\]/);
      const timestamp = headerMatch?.[1] ?? new Date().toISOString();
      
      let packetId = '';
      let commitSha = '';
      const changedFiles: string[] = [];
      let summary = '';
      const risks: string[] = [];
      const nextSteps: string[] = [];
      
      let currentSection = '';
      
      for (const line of lines.slice(1)) {
        if (line.startsWith('**Packet:**')) {
          packetId = line.replace('**Packet:**', '').trim();
        } else if (line.startsWith('**Commit:**')) {
          commitSha = line.replace('**Commit:**', '').trim();
        } else if (line.startsWith('### Changed Files')) {
          currentSection = 'files';
        } else if (line.startsWith('### Summary')) {
          currentSection = 'summary';
        } else if (line.startsWith('### Risks')) {
          currentSection = 'risks';
        } else if (line.startsWith('### Next Steps')) {
          currentSection = 'next';
        } else if (line.startsWith('- ')) {
          const item = line.slice(2).trim();
          if (currentSection === 'files') changedFiles.push(item);
          if (currentSection === 'risks') risks.push(item);
          if (currentSection === 'next') nextSteps.push(item);
        } else if (currentSection === 'summary' && line.trim()) {
          summary += line + ' ';
        }
      }
      
      if (packetId && commitSha) {
        const entry: JournalEntry = {
          packet_id: packetId,
          commit_sha: commitSha,
          changed_files: changedFiles,
          summary: summary.trim(),
          timestamp,
        };
        if (risks.length > 0) entry.risks = risks;
        if (nextSteps.length > 0) entry.next_steps = nextSteps;
        entries.push(entry);
      }
    } catch {
      // Skip malformed entries
    }
  }
  
  return entries;
}

export { parseJournalEntries };
