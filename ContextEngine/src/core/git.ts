import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';

export interface GitDiff {
  sha: string;
  files: string[];
  patch: string;
  message: string;
  author: string;
  date: string;
}

export interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
}

let git: SimpleGit | null = null;

export function getGit(cwd: string = process.cwd()): SimpleGit {
  if (!git) {
    git = simpleGit(cwd);
  }
  return git;
}

export async function isGitRepo(cwd: string = process.cwd()): Promise<boolean> {
  try {
    const g = simpleGit(cwd);
    await g.revparse(['--git-dir']);
    return true;
  } catch {
    return false;
  }
}

export async function getCurrentBranch(cwd: string = process.cwd()): Promise<string> {
  const g = getGit(cwd);
  const branch = await g.revparse(['--abbrev-ref', 'HEAD']);
  return branch.trim();
}

export async function getCurrentCommitSha(cwd: string = process.cwd()): Promise<string> {
  const g = getGit(cwd);
  const sha = await g.revparse(['HEAD']);
  return sha.trim();
}

export async function getHeadDiff(cwd: string = process.cwd()): Promise<GitDiff> {
  const g = getGit(cwd);
  
  const log = await g.log({ maxCount: 1 });
  const latest = log.latest;
  
  if (!latest) {
    throw new Error('No commits found in repository');
  }
  
  const patch = await g.show(['--patch', 'HEAD']);
  const diffSummary = await g.diffSummary(['HEAD~1', 'HEAD']);
  
  return {
    sha: latest.hash,
    files: diffSummary.files.map((f) => f.file),
    patch,
    message: latest.message,
    author: latest.author_name,
    date: latest.date,
  };
}

export async function getWorkingTreeDiff(cwd: string = process.cwd()): Promise<GitDiff> {
  const g = getGit(cwd);
  
  const sha = await getCurrentCommitSha(cwd);
  const status = await g.status();
  const patch = await g.diff(['HEAD']);
  
  const files: string[] = [
    ...status.modified,
    ...status.created,
    ...status.deleted,
    ...status.renamed.map((r) => r.to),
  ];
  
  return {
    sha,
    files,
    patch,
    message: '(working tree changes)',
    author: '',
    date: new Date().toISOString(),
  };
}

export async function getChangedFiles(ref: string = 'HEAD', cwd: string = process.cwd()): Promise<ChangedFile[]> {
  const g = getGit(cwd);
  
  const diffSummary = await g.diffSummary([`${ref}~1`, ref]);
  
  return diffSummary.files.map((f) => {
    let status: ChangedFile['status'] = 'modified';
    const insertions = 'insertions' in f ? (f as { insertions: number }).insertions : 0;
    const deletions = 'deletions' in f ? (f as { deletions: number }).deletions : 0;
    const changes = 'changes' in f ? (f as { changes: number }).changes : 0;
    
    if (insertions > 0 && deletions === 0 && changes === insertions) {
      status = 'added';
    } else if (deletions > 0 && insertions === 0) {
      status = 'deleted';
    }
    
    return {
      path: f.file,
      status,
    };
  });
}

export async function getFileAtRef(filePath: string, ref: string, cwd: string = process.cwd()): Promise<string | null> {
  const g = getGit(cwd);
  
  try {
    const content = await g.show([`${ref}:${filePath}`]);
    return content;
  } catch {
    return null;
  }
}

export async function createBranch(branchName: string, cwd: string = process.cwd()): Promise<void> {
  const g = getGit(cwd);
  await g.checkoutLocalBranch(branchName);
}

export async function branchExists(branchName: string, cwd: string = process.cwd()): Promise<boolean> {
  const g = getGit(cwd);
  const branches = await g.branchLocal();
  return branches.all.includes(branchName);
}

export function resolvePath(filePath: string, cwd: string = process.cwd()): string {
  if (path.isAbsolute(filePath)) {
    return path.relative(cwd, filePath);
  }
  return filePath;
}
