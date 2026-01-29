import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { Packet, ADR, SemanticAnchor, ContextConfig } from '../types/index.js';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const semanticAnchorSchema = {
  type: 'object',
  required: ['path', 'symbol', 'language', 'symbol_type', 'anchor_type', 'semantic_hash', 'git_ref', 'captured_at'],
  properties: {
    path: { type: 'string', minLength: 1 },
    symbol: { type: 'string', minLength: 1 },
    language: { type: 'string', enum: ['ts', 'tsx', 'js', 'jsx', 'py'] },
    symbol_type: { type: 'string', enum: ['function', 'class', 'method', 'variable', 'interface', 'type', 'enum'] },
    anchor_type: { type: 'string', const: 'semantic_hash' },
    semantic_hash: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
    git_ref: { type: 'string', minLength: 1 },
    captured_at: { type: 'string', format: 'date-time' },
    signature: { type: 'string' },
    line_start: { type: 'integer', minimum: 1 },
    line_end: { type: 'integer', minimum: 1 },
  },
  additionalProperties: false,
};

const packetSchema = {
  type: 'object',
  required: ['id', 'type', 'title', 'status', 'goal', 'dod', 'repo_truth', 'metadata'],
  properties: {
    id: { type: 'string', pattern: '^(FEAT|BUG|CHORE|REFACTOR|DOCS|TEST)-\\d{3,}$' },
    type: { type: 'string', enum: ['feat', 'bug', 'chore', 'refactor', 'docs', 'test'] },
    title: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: ['draft', 'active', 'blocked', 'completed', 'cancelled'] },
    goal: { type: 'string', minLength: 1 },
    dod: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      minItems: 1,
    },
    constraints: {
      type: 'array',
      items: { type: 'string' },
    },
    tests: {
      type: 'array',
      items: { type: 'string' },
    },
    repo_truth: {
      type: 'array',
      items: semanticAnchorSchema,
    },
    metadata: {
      type: 'object',
      required: ['created_at', 'updated_at'],
      properties: {
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        author: { type: 'string' },
        branch_name: { type: 'string' },
        related_adrs: {
          type: 'array',
          items: { type: 'string' },
        },
        related_packets: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

const adrSchema = {
  type: 'object',
  required: ['id', 'title', 'status', 'decision', 'context', 'consequences', 'affected_areas', 'created_at'],
  properties: {
    id: { type: 'string', pattern: '^ADR-\\d{4}$' },
    title: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: ['proposed', 'accepted', 'deprecated', 'superseded'] },
    decision: { type: 'string', minLength: 1 },
    context: { type: 'string', minLength: 1 },
    consequences: {
      type: 'array',
      items: { type: 'string' },
    },
    affected_areas: {
      type: 'array',
      items: { type: 'string' },
    },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
  additionalProperties: false,
};

const configSchema = {
  type: 'object',
  required: ['version', 'project', 'relevance', 'llm'],
  properties: {
    version: { type: 'string' },
    project: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
      },
    },
    relevance: {
      type: 'object',
      properties: {
        journal_window_days: { type: 'integer', minimum: 1 },
        max_candidates: { type: 'integer', minimum: 1 },
        boosts: {
          type: 'object',
          properties: {
            symbol_match: { type: 'number', minimum: 0 },
            path_overlap: { type: 'number', minimum: 0 },
            explicit_link: { type: 'number', minimum: 0 },
          },
        },
        recency: {
          type: 'object',
          properties: {
            journal_max: { type: 'number', minimum: 0 },
            decay_per_day: { type: 'number', minimum: 0 },
          },
        },
        min_score: { type: 'number', minimum: 0 },
      },
    },
    llm: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['anthropic', 'openai'] },
        model: { type: 'string' },
        consent_required: { type: 'boolean' },
      },
    },
  },
};

const validatePacketFn = ajv.compile(packetSchema);
const validateADRFn = ajv.compile(adrSchema);
const validateConfigFn = ajv.compile(configSchema);
const validateAnchorFn = ajv.compile(semanticAnchorSchema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function formatErrors(errors: typeof ajv.errors): string[] {
  if (!errors) return [];
  return errors.map((e) => {
    const path = e.instancePath || 'root';
    return `${path}: ${e.message ?? 'unknown error'}`;
  });
}

export function validatePacket(data: unknown): ValidationResult {
  const valid = validatePacketFn(data);
  return {
    valid,
    errors: formatErrors(validatePacketFn.errors),
  };
}

export function validateADR(data: unknown): ValidationResult {
  const valid = validateADRFn(data);
  return {
    valid,
    errors: formatErrors(validateADRFn.errors),
  };
}

export function validateConfig(data: unknown): ValidationResult {
  const valid = validateConfigFn(data);
  return {
    valid,
    errors: formatErrors(validateConfigFn.errors),
  };
}

export function validateAnchor(data: unknown): ValidationResult {
  const valid = validateAnchorFn(data);
  return {
    valid,
    errors: formatErrors(validateAnchorFn.errors),
  };
}

export function assertValidPacket(data: unknown): asserts data is Packet {
  const result = validatePacket(data);
  if (!result.valid) {
    throw new Error(`Invalid packet: ${result.errors.join(', ')}`);
  }
}

export function assertValidADR(data: unknown): asserts data is ADR {
  const result = validateADR(data);
  if (!result.valid) {
    throw new Error(`Invalid ADR: ${result.errors.join(', ')}`);
  }
}

export function assertValidConfig(data: unknown): asserts data is ContextConfig {
  const result = validateConfig(data);
  if (!result.valid) {
    throw new Error(`Invalid config: ${result.errors.join(', ')}`);
  }
}

export function assertValidAnchor(data: unknown): asserts data is SemanticAnchor {
  const result = validateAnchor(data);
  if (!result.valid) {
    throw new Error(`Invalid anchor: ${result.errors.join(', ')}`);
  }
}
