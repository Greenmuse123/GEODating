import matter from 'gray-matter';
import fs from 'fs-extra';

export interface ParsedDocument<T> {
  data: T;
  content: string;
  raw: string;
}

export function parseFrontmatter<T>(content: string): ParsedDocument<T> {
  const parsed = matter(content);
  return {
    data: parsed.data as T,
    content: parsed.content,
    raw: content,
  };
}

export function stringifyFrontmatter<T extends object>(data: T, content: string = ''): string {
  return matter.stringify(content, data);
}

export async function readMarkdownFile<T>(filePath: string): Promise<ParsedDocument<T>> {
  const content = await fs.readFile(filePath, 'utf-8');
  return parseFrontmatter<T>(content);
}

export async function writeMarkdownFile<T extends object>(
  filePath: string,
  data: T,
  content: string = ''
): Promise<void> {
  const output = stringifyFrontmatter(data, content);
  await fs.ensureDir(require('path').dirname(filePath));
  await fs.writeFile(filePath, output);
}

export function extractPacketId(filename: string): string {
  return filename.replace(/\.md$/, '');
}

export function generatePacketFilename(id: string): string {
  return `${id}.md`;
}
