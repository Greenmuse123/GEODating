export type PacketType = 'feat' | 'bug' | 'chore' | 'refactor' | 'docs' | 'test';

export type PacketStatus = 'draft' | 'active' | 'blocked' | 'completed' | 'cancelled';

export type Language = 'ts' | 'tsx' | 'js' | 'jsx' | 'py';

export type SymbolType = 'function' | 'class' | 'method' | 'variable' | 'interface' | 'type' | 'enum';

export type AnchorType = 'semantic_hash';

export type DriftStatus = 'valid' | 'semantic_drift' | 'deleted';

export interface SemanticAnchor {
  path: string;
  symbol: string;
  language: Language;
  symbol_type: SymbolType;
  anchor_type: AnchorType;
  semantic_hash: string;
  git_ref: string;
  captured_at: string;
  signature?: string;
  line_start?: number;
  line_end?: number;
}

export interface PacketMetadata {
  created_at: string;
  updated_at: string;
  author?: string;
  branch_name?: string;
  related_adrs?: string[];
  related_packets?: string[];
}

export interface Packet {
  id: string;
  type: PacketType;
  title: string;
  status: PacketStatus;
  goal: string;
  dod: string[];
  constraints?: string[];
  tests?: string[];
  repo_truth: SemanticAnchor[];
  metadata: PacketMetadata;
}

export type ADRStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded';

export interface ADR {
  id: string;
  title: string;
  status: ADRStatus;
  decision: string;
  context: string;
  consequences: string[];
  affected_areas: string[];
  created_at: string;
  updated_at?: string;
}

export interface JournalEntry {
  packet_id: string;
  commit_sha: string;
  changed_files: string[];
  summary: string;
  risks?: string[] | undefined;
  next_steps?: string[] | undefined;
  timestamp: string;
}

export interface RelevanceBoosts {
  symbol_match: number;
  path_overlap: number;
  explicit_link: number;
}

export interface RecencyConfig {
  journal_max: number;
  decay_per_day: number;
}

export interface RelevanceConfig {
  journal_window_days: number;
  max_candidates: number;
  boosts: RelevanceBoosts;
  recency: RecencyConfig;
  min_score: number;
}

export interface LLMConfig {
  provider?: 'anthropic' | 'openai' | undefined;
  model?: string | undefined;
  consent_required: boolean;
}

export interface ProjectConfig {
  name: string;
  description?: string;
}

export interface ContextConfig {
  version: string;
  project: ProjectConfig;
  relevance: RelevanceConfig;
  llm: LLMConfig;
}

export interface CurrentContext {
  packet_id: string | null;
  switched_at: string | null;
}

export interface ConsentData {
  llm_consent: boolean;
  consented_at?: string;
  provider?: string;
}

export type CandidateType = 'adr' | 'journal' | 'packet';

export interface Candidate {
  id: string;
  type: CandidateType;
  title?: string;
  text: string;
  keywords?: string[];
  timestamp?: string;
  paths?: string[];
  symbols?: string[];
}

export interface RelevanceResult {
  id: string;
  type: CandidateType;
  score: number;
  reasons: string[];
}

export interface AnchorCheckResult {
  anchor: SemanticAnchor;
  status: DriftStatus;
  current_hash?: string;
  message: string;
}

export interface HealthReport {
  drift_count: number;
  orphan_count: number;
  stale_count: number;
  missing_repo_map: boolean;
  issues: HealthIssue[];
}

export interface HealthIssue {
  type: 'drift' | 'orphan' | 'stale' | 'missing';
  packet_id?: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface IndexEntry {
  id: string;
  type: 'packet' | 'adr' | 'journal';
  keywords: string[];
  paths?: string[];
  symbols?: string[];
  timestamp?: string;
  status?: string;
}

export interface ContextIndex {
  version: string;
  built_at: string;
  entries: IndexEntry[];
  symbol_map: Record<string, string[] | undefined>;
  path_map: Record<string, string[] | undefined>;
}

export interface QueryResult {
  id: string;
  type: 'packet' | 'adr' | 'journal' | 'repo-map';
  title: string;
  path: string;
  snippet?: string | undefined;
  score: number;
  matches: string[];
}

export interface SearchOptions {
  packetId?: string | undefined;
  maxResults?: number | undefined;
  types?: ('packet' | 'adr' | 'journal' | 'repo-map')[] | undefined;
}

export interface AssembleOptions {
  maxTokens: number;
  clipboard?: boolean | undefined;
  outFile?: string | undefined;
}

export interface ScribeOptions {
  local: boolean;
  noLlm: boolean;
  includeWorkingTree: boolean;
}

export const VALID_STATUS_TRANSITIONS: Record<PacketStatus, PacketStatus[]> = {
  draft: ['active'],
  active: ['blocked', 'completed', 'cancelled'],
  blocked: ['active', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const PACKET_TYPES: PacketType[] = ['feat', 'bug', 'chore', 'refactor', 'docs', 'test'];

export const LANGUAGES: Language[] = ['ts', 'tsx', 'js', 'jsx', 'py'];

export const FILE_EXTENSIONS: Record<string, Language> = {
  '.ts': 'ts',
  '.tsx': 'tsx',
  '.js': 'js',
  '.jsx': 'jsx',
  '.py': 'py',
};
