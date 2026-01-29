import type { Candidate, RelevanceResult, RelevanceConfig, Packet } from '../types/index.js';

const STOPWORDS = new Set([
  'the', 'and', 'with', 'from', 'this', 'that', 'into', 'over', 'for',
  'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'having',
  'does', 'did', 'doing', 'will', 'would', 'could', 'should', 'shall',
  'can', 'may', 'might', 'must', 'need', 'use', 'used', 'using',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'than', 'too', 'very', 'just', 'also', 'now', 'only',
  'src', 'lib', 'app', 'apps', 'index', 'main', 'test', 'tests',
]);

export function splitIdentifier(identifier: string): string[] {
  const parts: string[] = [];
  
  const camelSplit = identifier.replace(/([a-z])([A-Z])/g, '$1 $2');
  const snakeSplit = camelSplit.replace(/[_-]/g, ' ');
  
  const words = snakeSplit.split(/\s+/).filter((w) => w.length > 0);
  
  for (const word of words) {
    const lower = word.toLowerCase();
    if (lower.length >= 3 && !STOPWORDS.has(lower)) {
      parts.push(lower);
    }
  }
  
  const fullLower = identifier.toLowerCase();
  if (fullLower.length >= 3 && !STOPWORDS.has(fullLower) && !parts.includes(fullLower)) {
    parts.push(fullLower);
  }
  
  return parts;
}

export function extractKeywords(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s_-]/g, ' ');
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 0);
  
  const keywords = new Set<string>();
  
  for (const token of tokens) {
    const parts = splitIdentifier(token);
    for (const part of parts) {
      keywords.add(part);
    }
  }
  
  return Array.from(keywords);
}

export function extractPacketKeywords(packet: Packet): string[] {
  const sources: string[] = [
    packet.title,
    packet.goal,
    ...(packet.constraints ?? []),
    ...packet.dod,
  ];
  
  for (const anchor of packet.repo_truth) {
    sources.push(anchor.symbol);
    const pathParts = anchor.path.split(/[/\\]/).filter((p) => p.length > 0);
    sources.push(...pathParts);
  }
  
  const allKeywords = new Set<string>();
  for (const source of sources) {
    const kws = extractKeywords(source);
    for (const kw of kws) {
      allKeywords.add(kw);
    }
  }
  
  return Array.from(allKeywords);
}

export function extractCandidateKeywords(candidate: Candidate): string[] {
  if (candidate.keywords && candidate.keywords.length > 0) {
    return candidate.keywords;
  }
  
  const sources: string[] = [candidate.text];
  if (candidate.title) sources.push(candidate.title);
  if (candidate.paths) sources.push(...candidate.paths);
  if (candidate.symbols) sources.push(...candidate.symbols);
  
  const allKeywords = new Set<string>();
  for (const source of sources) {
    const kws = extractKeywords(source);
    for (const kw of kws) {
      allKeywords.add(kw);
    }
  }
  
  return Array.from(allKeywords);
}

export function jaccardOverlap(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++;
    }
  }
  
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function calculateRecencyBoost(timestamp: string | undefined, config: RelevanceConfig): number {
  if (!timestamp) return 0;
  
  const candidateDate = new Date(timestamp);
  const now = new Date();
  const daysDiff = (now.getTime() - candidateDate.getTime()) / (1000 * 60 * 60 * 24);
  
  const boost = Math.max(0, config.recency.journal_max - (daysDiff * config.recency.decay_per_day));
  return boost;
}

export function scoreCandidate(
  packet: Packet,
  candidate: Candidate,
  config: RelevanceConfig
): RelevanceResult {
  const packetKeywords = new Set(extractPacketKeywords(packet));
  const candidateKeywords = new Set(extractCandidateKeywords(candidate));
  
  const overlapKeywords: string[] = [];
  for (const kw of packetKeywords) {
    if (candidateKeywords.has(kw)) {
      overlapKeywords.push(kw);
    }
  }
  
  const overlap = jaccardOverlap(packetKeywords, candidateKeywords);
  const reasons: string[] = [];
  
  if (overlapKeywords.length > 0) {
    reasons.push(`keyword_overlap: ${overlapKeywords.slice(0, 5).join(', ')}`);
  }
  
  let symbolBoost = 0;
  const matchedSymbols: string[] = [];
  for (const anchor of packet.repo_truth) {
    const symbolLower = anchor.symbol.toLowerCase();
    if (candidateKeywords.has(symbolLower) || candidate.symbols?.includes(anchor.symbol)) {
      symbolBoost = config.boosts.symbol_match;
      matchedSymbols.push(anchor.symbol);
    }
  }
  if (matchedSymbols.length > 0) {
    reasons.push(`symbol_match: ${matchedSymbols.join(', ')}`);
  }
  
  let pathBoost = 0;
  const matchedPaths: string[] = [];
  if (candidate.paths) {
    for (const anchor of packet.repo_truth) {
      for (const candidatePath of candidate.paths) {
        if (candidatePath.includes(anchor.path) || anchor.path.includes(candidatePath)) {
          pathBoost = config.boosts.path_overlap;
          matchedPaths.push(candidatePath);
        }
      }
    }
  }
  if (matchedPaths.length > 0) {
    reasons.push(`path_overlap: ${matchedPaths.slice(0, 3).join(', ')}`);
  }
  
  let explicitBoost = 0;
  if (candidate.type === 'adr' && packet.metadata.related_adrs?.includes(candidate.id)) {
    explicitBoost = config.boosts.explicit_link;
    reasons.push('explicit_link: linked in packet');
  }
  
  let recencyBoost = 0;
  if (candidate.type === 'journal') {
    recencyBoost = calculateRecencyBoost(candidate.timestamp, config);
    if (recencyBoost > 0) {
      const daysAgo = candidate.timestamp
        ? Math.floor((Date.now() - new Date(candidate.timestamp).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      reasons.push(`recency: ${daysAgo} days ago`);
    }
  }
  
  const score = Math.min(1.5, overlap + symbolBoost + pathBoost + explicitBoost + recencyBoost);
  
  return {
    id: candidate.id,
    type: candidate.type,
    score,
    reasons,
  };
}

export function rankCandidates(
  packet: Packet,
  candidates: Candidate[],
  config: RelevanceConfig
): RelevanceResult[] {
  const results: RelevanceResult[] = [];
  
  for (const candidate of candidates) {
    const result = scoreCandidate(packet, candidate, config);
    if (result.score >= config.min_score) {
      results.push(result);
    }
  }
  
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, config.max_candidates);
}

export interface SelectionResult {
  selected: RelevanceResult[];
  totalTokens: number;
}

export function selectByTokenBudget(
  ranked: RelevanceResult[],
  tokenEstimates: Map<string, number>,
  maxTokens: number,
  reservedTokens: number = 0
): SelectionResult {
  const selected: RelevanceResult[] = [];
  let totalTokens = reservedTokens;
  const available = maxTokens - reservedTokens;
  
  for (const result of ranked) {
    const estimate = tokenEstimates.get(result.id) ?? 500;
    if (totalTokens + estimate <= maxTokens) {
      selected.push(result);
      totalTokens += estimate;
    }
    
    if (totalTokens >= available * 0.95) {
      break;
    }
  }
  
  return { selected, totalTokens };
}
