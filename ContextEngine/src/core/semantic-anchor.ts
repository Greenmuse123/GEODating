import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import type { SemanticAnchor, AnchorCheckResult } from '../types/index.js';
import { getCurrentCommitSha } from './git.js';
import { findSymbol, type FoundSymbol } from './symbol-finder.js';

export function computeSemanticHash(normalizedAst: string): string {
  const hash = crypto.createHash('sha256').update(normalizedAst).digest('hex');
  return `sha256:${hash}`;
}

export async function createAnchor(
  filePath: string,
  symbol: FoundSymbol,
  cwd: string = process.cwd()
): Promise<SemanticAnchor> {
  const gitRef = await getCurrentCommitSha(cwd);
  const relativePath = path.relative(cwd, filePath);
  
  return {
    path: relativePath.replace(/\\/g, '/'),
    symbol: symbol.name,
    language: symbol.language,
    symbol_type: symbol.type,
    anchor_type: 'semantic_hash',
    semantic_hash: symbol.hash,
    git_ref: gitRef,
    captured_at: new Date().toISOString(),
    signature: symbol.signature,
    line_start: symbol.startLine,
    line_end: symbol.endLine,
  };
}

export async function checkAnchor(
  anchor: SemanticAnchor,
  cwd: string = process.cwd()
): Promise<AnchorCheckResult> {
  const fullPath = path.join(cwd, anchor.path);
  
  if (!fs.existsSync(fullPath)) {
    return {
      anchor,
      status: 'deleted',
      message: `File not found: ${anchor.path}`,
    };
  }
  
  const content = await fs.readFile(fullPath, 'utf-8');
  const foundSymbol = await findSymbol(content, anchor.symbol, anchor.language);
  
  if (!foundSymbol) {
    return {
      anchor,
      status: 'deleted',
      message: `Symbol '${anchor.symbol}' not found in ${anchor.path}`,
    };
  }
  
  if (foundSymbol.hash === anchor.semantic_hash) {
    return {
      anchor,
      status: 'valid',
      current_hash: foundSymbol.hash,
      message: 'Anchor is valid',
    };
  }
  
  return {
    anchor,
    status: 'semantic_drift',
    current_hash: foundSymbol.hash,
    message: `Semantic drift detected in '${anchor.symbol}'`,
  };
}

export async function refreshAnchor(
  anchor: SemanticAnchor,
  cwd: string = process.cwd()
): Promise<SemanticAnchor> {
  const fullPath = path.join(cwd, anchor.path);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${anchor.path}`);
  }
  
  const content = await fs.readFile(fullPath, 'utf-8');
  const foundSymbol = await findSymbol(content, anchor.symbol, anchor.language);
  
  if (!foundSymbol) {
    throw new Error(`Symbol '${anchor.symbol}' not found in ${anchor.path}`);
  }
  
  const gitRef = await getCurrentCommitSha(cwd);
  
  return {
    ...anchor,
    semantic_hash: foundSymbol.hash,
    git_ref: gitRef,
    captured_at: new Date().toISOString(),
    signature: foundSymbol.signature,
    line_start: foundSymbol.startLine,
    line_end: foundSymbol.endLine,
  };
}

export function formatAnchorStatus(result: AnchorCheckResult): string {
  const statusIcon = {
    valid: '✓',
    semantic_drift: '⚠',
    deleted: '✗',
  }[result.status];
  
  return `${statusIcon} ${result.anchor.symbol} (${result.anchor.path}): ${result.message}`;
}
