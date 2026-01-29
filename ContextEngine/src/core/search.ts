import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import { PATHS } from './config.js';
import { loadIndex } from './indexer.js';
import { readMarkdownFile } from './frontmatter.js';
import { extractKeywords, jaccardOverlap } from './relevance-engine.js';
import type { QueryResult, Packet, ADR, ContextIndex, SearchOptions } from '../types/index.js';

export type { SearchOptions };

export async function search(
  query: string,
  cwd: string = process.cwd(),
  options: SearchOptions = {}
): Promise<QueryResult[]> {
  const { maxResults = 10, types } = options;
  const results: QueryResult[] = [];
  const queryKeywords = new Set(extractKeywords(query));
  const queryLower = query.toLowerCase();
  
  const index = await loadIndex(cwd);
  
  if (!types || types.includes('packet')) {
    const packetResults = await searchPackets(queryLower, queryKeywords, cwd, index);
    results.push(...packetResults);
  }
  
  if (!types || types.includes('adr')) {
    const adrResults = await searchADRs(queryLower, queryKeywords, cwd, index);
    results.push(...adrResults);
  }
  
  if (!types || types.includes('journal')) {
    const journalResults = await searchJournal(queryLower, queryKeywords, cwd, index);
    results.push(...journalResults);
  }
  
  if (!types || types.includes('repo-map')) {
    const repoMapResult = await searchRepoMap(queryLower, cwd);
    if (repoMapResult) {
      results.push(repoMapResult);
    }
  }
  
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, maxResults);
}

async function searchPackets(
  queryLower: string,
  queryKeywords: Set<string>,
  cwd: string,
  index: ContextIndex | null
): Promise<QueryResult[]> {
  const results: QueryResult[] = [];
  
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
      const { data, content } = await readMarkdownFile<Packet>(packetPath);
      const fullText = `${data.id} ${data.title} ${data.goal} ${content}`.toLowerCase();
      
      let score = 0;
      const matches: string[] = [];
      
      if (data.id.toLowerCase() === queryLower || data.title.toLowerCase().includes(queryLower)) {
        score += 1.0;
        matches.push('title/id match');
      }
      
      const indexEntry = index?.entries.find((e) => e.id === data.id);
      if (indexEntry) {
        for (const symbol of indexEntry.symbols ?? []) {
          if (queryLower.includes(symbol.toLowerCase())) {
            score += 0.5;
            matches.push(`symbol: ${symbol}`);
          }
        }
      }
      
      const packetKeywords = new Set(extractKeywords(fullText));
      const overlap = jaccardOverlap(queryKeywords, packetKeywords);
      if (overlap > 0) {
        score += overlap * 0.3;
        matches.push(`keyword overlap: ${(overlap * 100).toFixed(0)}%`);
      }
      
      if (score > 0) {
        results.push({
          id: data.id,
          type: 'packet',
          title: data.title,
          path: path.relative(cwd, packetPath),
          snippet: data.goal.slice(0, 200),
          score,
          matches,
        });
      }
    } catch {
      // Skip invalid files
    }
  }
  
  return results;
}

async function searchADRs(
  queryLower: string,
  queryKeywords: Set<string>,
  cwd: string,
  _index: ContextIndex | null
): Promise<QueryResult[]> {
  const results: QueryResult[] = [];
  
  const adrFiles = await fg('*.md', {
    cwd: path.join(cwd, PATHS.adrs),
    absolute: true,
  });
  
  for (const adrPath of adrFiles) {
    try {
      const { data, content } = await readMarkdownFile<ADR>(adrPath);
      const fullText = `${data.id} ${data.title} ${data.decision} ${content}`.toLowerCase();
      
      let score = 0;
      const matches: string[] = [];
      
      if (data.id.toLowerCase() === queryLower || data.title.toLowerCase().includes(queryLower)) {
        score += 1.0;
        matches.push('title/id match');
      }
      
      const adrKeywords = new Set(extractKeywords(fullText));
      const overlap = jaccardOverlap(queryKeywords, adrKeywords);
      if (overlap > 0) {
        score += overlap * 0.3;
        matches.push(`keyword overlap: ${(overlap * 100).toFixed(0)}%`);
      }
      
      if (score > 0) {
        results.push({
          id: data.id,
          type: 'adr',
          title: data.title,
          path: path.relative(cwd, adrPath),
          snippet: data.decision.slice(0, 200),
          score,
          matches,
        });
      }
    } catch {
      // Skip invalid files
    }
  }
  
  return results;
}

async function searchJournal(
  queryLower: string,
  queryKeywords: Set<string>,
  cwd: string,
  _index: ContextIndex | null
): Promise<QueryResult[]> {
  const results: QueryResult[] = [];
  
  const journalFiles = await fg('**/*.md', {
    cwd: path.join(cwd, PATHS.journal),
    absolute: true,
  });
  
  for (const journalPath of journalFiles) {
    try {
      const content = await fs.readFile(journalPath, 'utf-8');
      const contentLower = content.toLowerCase();
      
      if (contentLower.includes(queryLower)) {
        const journalKeywords = new Set(extractKeywords(content));
        const overlap = jaccardOverlap(queryKeywords, journalKeywords);
        
        results.push({
          id: `journal-${path.basename(journalPath, '.md')}`,
          type: 'journal',
          title: path.basename(journalPath, '.md'),
          path: path.relative(cwd, journalPath),
          snippet: content.slice(0, 200),
          score: 0.5 + overlap * 0.3,
          matches: ['content match'],
        });
      }
    } catch {
      // Skip invalid files
    }
  }
  
  return results;
}

async function searchRepoMap(queryLower: string, cwd: string): Promise<QueryResult | null> {
  const repoMapPath = path.join(cwd, PATHS.repoMap);
  
  if (!fs.existsSync(repoMapPath)) {
    return null;
  }
  
  try {
    const content = await fs.readFile(repoMapPath, 'utf-8');
    
    if (content.toLowerCase().includes(queryLower)) {
      return {
        id: 'repo-map',
        type: 'repo-map',
        title: 'Repository Map',
        path: PATHS.repoMap,
        snippet: content.slice(0, 200),
        score: 0.4,
        matches: ['content match'],
      };
    }
  } catch {
    // Skip if unreadable
  }
  
  return null;
}
