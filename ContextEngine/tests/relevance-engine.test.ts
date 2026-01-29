import { describe, it, expect } from 'vitest';
import {
  splitIdentifier,
  extractKeywords,
  jaccardOverlap,
  scoreCandidate,
  rankCandidates,
  extractPacketKeywords,
} from '../src/core/relevance-engine.js';
import type { Packet, Candidate, RelevanceConfig } from '../src/types/index.js';

const defaultConfig: RelevanceConfig = {
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
};

describe('splitIdentifier', () => {
  it('should split camelCase identifiers', () => {
    const parts = splitIdentifier('handleOAuthCallback');
    expect(parts).toContain('handle');
    expect(parts).toContain('oauth');
    expect(parts).toContain('callback');
  });

  it('should split snake_case identifiers', () => {
    const parts = splitIdentifier('user_auth_token');
    expect(parts).toContain('user');
    expect(parts).toContain('auth');
    expect(parts).toContain('token');
  });

  it('should split PascalCase identifiers', () => {
    const parts = splitIdentifier('UserAuthService');
    expect(parts).toContain('user');
    expect(parts).toContain('auth');
    expect(parts).toContain('service');
  });

  it('should preserve full identifier', () => {
    const parts = splitIdentifier('handleOAuthCallback');
    expect(parts).toContain('handleoauthcallback');
  });

  it('should filter out short tokens', () => {
    const parts = splitIdentifier('aB');
    expect(parts.every((p) => p.length >= 3)).toBe(true);
  });
});

describe('extractKeywords', () => {
  it('should extract keywords from text', () => {
    const keywords = extractKeywords('Handle OAuth callback for user authentication');
    expect(keywords).toContain('handle');
    expect(keywords).toContain('oauth');
    expect(keywords).toContain('callback');
    expect(keywords).toContain('user');
    expect(keywords).toContain('authentication');
  });

  it('should filter stopwords', () => {
    const keywords = extractKeywords('the user and the system');
    expect(keywords).not.toContain('the');
    expect(keywords).not.toContain('and');
    expect(keywords).toContain('user');
    expect(keywords).toContain('system');
  });
});

describe('jaccardOverlap', () => {
  it('should return 1 for identical sets', () => {
    const setA = new Set(['a', 'b', 'c']);
    const setB = new Set(['a', 'b', 'c']);
    expect(jaccardOverlap(setA, setB)).toBe(1);
  });

  it('should return 0 for disjoint sets', () => {
    const setA = new Set(['a', 'b', 'c']);
    const setB = new Set(['d', 'e', 'f']);
    expect(jaccardOverlap(setA, setB)).toBe(0);
  });

  it('should return correct overlap for partial match', () => {
    const setA = new Set(['a', 'b', 'c']);
    const setB = new Set(['b', 'c', 'd']);
    expect(jaccardOverlap(setA, setB)).toBe(0.5);
  });

  it('should handle empty sets', () => {
    const setA = new Set<string>([]);
    const setB = new Set<string>([]);
    expect(jaccardOverlap(setA, setB)).toBe(0);
  });
});

describe('scoreCandidate', () => {
  const basePacket: Packet = {
    id: 'FEAT-001',
    type: 'feat',
    title: 'OAuth Login Feature',
    status: 'active',
    goal: 'Implement OAuth authentication',
    dod: ['Login works', 'Logout works'],
    repo_truth: [
      {
        path: 'src/auth/oauth.ts',
        symbol: 'handleOAuthCallback',
        language: 'ts',
        symbol_type: 'function',
        anchor_type: 'semantic_hash',
        semantic_hash: 'sha256:abc123',
        git_ref: 'abc123',
        captured_at: new Date().toISOString(),
      },
    ],
    metadata: {
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  it('should score based on keyword overlap', () => {
    const candidate: Candidate = {
      id: 'ADR-001',
      type: 'adr',
      title: 'OAuth Provider Selection',
      text: 'Decided to use OAuth for authentication',
    };

    const result = scoreCandidate(basePacket, candidate, defaultConfig);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.includes('keyword_overlap'))).toBe(true);
  });

  it('should boost for symbol match', () => {
    const candidateWithSymbol: Candidate = {
      id: 'journal-1',
      type: 'journal',
      title: 'Journal Entry',
      text: 'Updated handleOAuthCallback to fix bug',
      symbols: ['handleOAuthCallback'],
    };

    const candidateWithoutSymbol: Candidate = {
      id: 'journal-2',
      type: 'journal',
      title: 'Journal Entry',
      text: 'Updated some other function',
    };

    const scoreWith = scoreCandidate(basePacket, candidateWithSymbol, defaultConfig);
    const scoreWithout = scoreCandidate(basePacket, candidateWithoutSymbol, defaultConfig);

    expect(scoreWith.score).toBeGreaterThan(scoreWithout.score);
    expect(scoreWith.reasons.some((r) => r.includes('symbol_match'))).toBe(true);
  });

  it('should boost for path overlap', () => {
    const candidateWithPath: Candidate = {
      id: 'journal-1',
      type: 'journal',
      title: 'Journal Entry',
      text: 'Fixed auth issue',
      paths: ['src/auth/oauth.ts'],
    };

    const result = scoreCandidate(basePacket, candidateWithPath, defaultConfig);
    expect(result.reasons.some((r) => r.includes('path_overlap'))).toBe(true);
  });

  it('should apply recency boost for journals', () => {
    const recentJournal: Candidate = {
      id: 'journal-1',
      type: 'journal',
      title: 'Recent Entry',
      text: 'OAuth authentication update',
      timestamp: new Date().toISOString(),
    };

    const oldJournal: Candidate = {
      id: 'journal-2',
      type: 'journal',
      title: 'Old Entry',
      text: 'OAuth authentication update',
      timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const recentScore = scoreCandidate(basePacket, recentJournal, defaultConfig);
    const oldScore = scoreCandidate(basePacket, oldJournal, defaultConfig);

    expect(recentScore.score).toBeGreaterThan(oldScore.score);
    expect(recentScore.reasons.some((r) => r.includes('recency'))).toBe(true);
  });
});

describe('rankCandidates', () => {
  const packet: Packet = {
    id: 'FEAT-001',
    type: 'feat',
    title: 'OAuth Login',
    status: 'active',
    goal: 'Implement OAuth',
    dod: ['Login works'],
    repo_truth: [],
    metadata: {
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  it('should rank candidates by score descending', () => {
    const candidates: Candidate[] = [
      { id: '1', type: 'adr', text: 'Something unrelated' },
      { id: '2', type: 'adr', text: 'OAuth authentication decision' },
      { id: '3', type: 'adr', text: 'Login implementation approach' },
    ];

    const ranked = rankCandidates(packet, candidates, defaultConfig);

    for (let i = 1; i < ranked.length; i++) {
      const prev = ranked[i - 1];
      const curr = ranked[i];
      if (prev && curr) {
        expect(prev.score).toBeGreaterThanOrEqual(curr.score);
      }
    }
  });

  it('should filter out candidates below min_score', () => {
    const candidates: Candidate[] = [
      { id: '1', type: 'adr', text: 'Completely unrelated topic xyz' },
    ];

    const ranked = rankCandidates(packet, candidates, defaultConfig);
    expect(ranked.every((r) => r.score >= defaultConfig.min_score)).toBe(true);
  });

  it('should include reasons for each ranked item', () => {
    const candidates: Candidate[] = [
      { id: '1', type: 'adr', text: 'OAuth authentication decision' },
    ];

    const ranked = rankCandidates(packet, candidates, defaultConfig);
    
    for (const result of ranked) {
      expect(Array.isArray(result.reasons)).toBe(true);
    }
  });
});

describe('extractPacketKeywords', () => {
  it('should extract keywords from packet fields', () => {
    const packet: Packet = {
      id: 'FEAT-001',
      type: 'feat',
      title: 'User Authentication',
      status: 'active',
      goal: 'Implement secure login',
      dod: ['Login form works', 'Session management'],
      constraints: ['Use OAuth 2.0'],
      repo_truth: [
        {
          path: 'src/auth/login.ts',
          symbol: 'handleLogin',
          language: 'ts',
          symbol_type: 'function',
          anchor_type: 'semantic_hash',
          semantic_hash: 'sha256:abc',
          git_ref: 'abc',
          captured_at: new Date().toISOString(),
        },
      ],
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    const keywords = extractPacketKeywords(packet);

    expect(keywords).toContain('user');
    expect(keywords).toContain('authentication');
    expect(keywords).toContain('login');
    expect(keywords).toContain('handlelogin');
    expect(keywords).toContain('auth');
  });
});
