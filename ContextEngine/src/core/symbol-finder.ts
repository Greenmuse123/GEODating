import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { Language, SymbolType } from '../types/index.js';

export interface FoundSymbol {
  name: string;
  type: SymbolType;
  language: Language;
  hash: string;
  signature: string;
  startLine: number;
  endLine: number;
  normalizedAst: string;
}

interface ParserState {
  initialized: boolean;
  Parser: typeof import('web-tree-sitter') | null;
  parsers: Map<Language, import('web-tree-sitter')>;
}

const state: ParserState = {
  initialized: false,
  Parser: null,
  parsers: new Map(),
};

const GRAMMAR_URLS: Record<Language, string> = {
  ts: 'https://unpkg.com/tree-sitter-wasms@0.1.13/out/tree-sitter-typescript.wasm',
  tsx: 'https://unpkg.com/tree-sitter-wasms@0.1.13/out/tree-sitter-tsx.wasm',
  js: 'https://unpkg.com/tree-sitter-wasms@0.1.13/out/tree-sitter-javascript.wasm',
  jsx: 'https://unpkg.com/tree-sitter-wasms@0.1.13/out/tree-sitter-javascript.wasm',
  py: 'https://unpkg.com/tree-sitter-wasms@0.1.13/out/tree-sitter-python.wasm',
};

const CACHE_DIR = path.join(os.tmpdir(), 'context-engine-grammars');

async function fetchGrammar(language: Language): Promise<string> {
  const url = GRAMMAR_URLS[language];
  if (!url) {
    throw new Error(`Unsupported language: ${language}`);
  }
  
  const filename = `tree-sitter-${language}.wasm`;
  const cachePath = path.join(CACHE_DIR, filename);
  
  if (await fs.pathExists(cachePath)) {
    return cachePath;
  }
  
  await fs.ensureDir(CACHE_DIR);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch grammar: ${response.statusText}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(cachePath, buffer);
  
  return cachePath;
}

async function initializeParser(): Promise<void> {
  if (state.initialized) return;
  
  const Parser = await import('web-tree-sitter');
  await Parser.default.init();
  state.Parser = Parser.default;
  state.initialized = true;
}

async function getParser(language: Language): Promise<import('web-tree-sitter')> {
  await initializeParser();
  
  if (state.parsers.has(language)) {
    return state.parsers.get(language)!;
  }
  
  if (!state.Parser) {
    throw new Error('Parser not initialized');
  }
  
  const parser = new state.Parser();
  
  try {
    const grammarPath = await fetchGrammar(language);
    const lang = await state.Parser.Language.load(grammarPath);
    parser.setLanguage(lang);
    state.parsers.set(language, parser);
    return parser;
  } catch (error) {
    throw new Error(`Failed to load grammar for ${language}: ${error}`);
  }
}

function isComment(nodeType: string): boolean {
  return nodeType === 'comment' || nodeType === 'line_comment' || nodeType === 'block_comment';
}

function normalizeAst(node: import('web-tree-sitter').SyntaxNode): string {
  const parts: string[] = [];
  
  function walk(n: import('web-tree-sitter').SyntaxNode): void {
    if (isComment(n.type)) {
      return;
    }
    
    if (n.childCount === 0) {
      const text = n.text.trim();
      if (text.length > 0) {
        parts.push(`[${n.type}:${text}]`);
      }
    } else {
      parts.push(`[${n.type}`);
      for (let i = 0; i < n.childCount; i++) {
        const child = n.child(i);
        if (child) {
          walk(child);
        }
      }
      parts.push(`/${n.type}]`);
    }
  }
  
  walk(node);
  return parts.join('');
}

function computeHash(normalizedAst: string): string {
  const hash = crypto.createHash('sha256').update(normalizedAst).digest('hex');
  return `sha256:${hash}`;
}

function getSymbolType(nodeType: string): SymbolType | null {
  switch (nodeType) {
    case 'function_declaration':
    case 'function_expression':
    case 'arrow_function':
    case 'function_definition':
      return 'function';
    case 'class_declaration':
    case 'class_definition':
      return 'class';
    case 'method_definition':
    case 'method_signature':
      return 'method';
    case 'interface_declaration':
      return 'interface';
    case 'type_alias_declaration':
      return 'type';
    case 'enum_declaration':
      return 'enum';
    case 'variable_declarator':
    case 'lexical_declaration':
      return 'variable';
    default:
      return null;
  }
}

function extractSignature(node: import('web-tree-sitter').SyntaxNode, source: string): string {
  const startLine = node.startPosition.row;
  const lines = source.split('\n');
  const firstLine = lines[startLine] ?? '';
  
  const signature = firstLine.trim();
  if (signature.length > 100) {
    return signature.slice(0, 100) + '...';
  }
  return signature;
}

function findName(node: import('web-tree-sitter').SyntaxNode): string | null {
  const nameChild = node.childForFieldName('name');
  if (nameChild) {
    return nameChild.text;
  }
  
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && (child.type === 'identifier' || child.type === 'property_identifier' || child.type === 'type_identifier')) {
      return child.text;
    }
  }
  return null;
}

export async function parseFile(content: string, language: Language): Promise<import('web-tree-sitter').Tree> {
  const parser = await getParser(language);
  return parser.parse(content);
}

export async function findAllSymbols(content: string, language: Language): Promise<FoundSymbol[]> {
  const tree = await parseFile(content, language);
  const symbols: FoundSymbol[] = [];
  const visited = new Set<number>();
  
  function walk(node: import('web-tree-sitter').SyntaxNode): void {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    
    const symbolType = getSymbolType(node.type);
    
    if (symbolType) {
      let name = findName(node);
      
      if (node.type === 'variable_declarator') {
        const init = node.childForFieldName('value') ?? node.namedChild(1);
        if (init && (init.type === 'arrow_function' || init.type === 'function_expression')) {
          name = findName(node);
          if (name) {
            const normalized = normalizeAst(node);
            symbols.push({
              name,
              type: 'function',
              language,
              hash: computeHash(normalized),
              signature: extractSignature(node, content),
              startLine: node.startPosition.row + 1,
              endLine: node.endPosition.row + 1,
              normalizedAst: normalized,
            });
            return;
          }
        }
      }
      
      if (name && symbolType !== 'variable') {
        const normalized = normalizeAst(node);
        symbols.push({
          name,
          type: symbolType,
          language,
          hash: computeHash(normalized),
          signature: extractSignature(node, content),
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          normalizedAst: normalized,
        });
      }
    }
    
    if (node.type === 'export_statement' || node.type === 'export_named_declaration') {
      const declaration = node.namedChild(0);
      if (declaration) {
        walk(declaration);
        return;
      }
    }
    
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        walk(child);
      }
    }
  }
  
  walk(tree.rootNode);
  return symbols;
}

export async function findSymbol(
  content: string,
  symbolName: string,
  language: Language
): Promise<FoundSymbol | null> {
  const symbols = await findAllSymbols(content, language);
  return symbols.find((s) => s.name === symbolName) ?? null;
}

export function getLanguageFromExtension(filePath: string): Language | null {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  const mapping: Record<string, Language> = {
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.js': 'js',
    '.jsx': 'jsx',
    '.py': 'py',
  };
  return mapping[ext] ?? null;
}
