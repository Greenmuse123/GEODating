import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { PATHS, requireInitialized, getPacketPath } from '../core/config.js';
import { readMarkdownFile, writeMarkdownFile } from '../core/frontmatter.js';
import { validatePacket } from '../core/validator.js';
import { findAllSymbols, getLanguageFromExtension } from '../core/symbol-finder.js';
import { createAnchor } from '../core/semantic-anchor.js';
import type { Packet, PacketType, PacketStatus, SemanticAnchor } from '../types/index.js';
import fg from 'fast-glob';

export const packetCommand = new Command('packet')
  .description('Manage work packets');

function generateNextId(type: PacketType, existingIds: string[]): string {
  const prefix = type.toUpperCase();
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  
  let maxNum = 0;
  for (const id of existingIds) {
    const match = id.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  
  return `${prefix}-${(maxNum + 1).toString().padStart(3, '0')}`;
}

async function getAllPacketIds(cwd: string): Promise<string[]> {
  const activeFiles = await fg('*.md', {
    cwd: path.join(cwd, PATHS.packetsActive),
  });
  const completedFiles = await fg('*.md', {
    cwd: path.join(cwd, PATHS.packetsCompleted),
  });
  
  return [...activeFiles, ...completedFiles].map((f) => f.replace('.md', ''));
}

packetCommand
  .command('create <type> <title>')
  .description('Create a new work packet')
  .option('--no-anchors', 'Skip anchor creation')
  .action(async (type: string, title: string, options: { anchors: boolean }) => {
    const cwd = process.cwd();
    requireInitialized(cwd);
    
    const validTypes: PacketType[] = ['feat', 'bug', 'chore', 'refactor', 'docs', 'test'];
    if (!validTypes.includes(type as PacketType)) {
      console.error(chalk.red(`Invalid packet type: ${type}`));
      console.log(chalk.gray(`Valid types: ${validTypes.join(', ')}`));
      process.exit(1);
    }
    
    const existingIds = await getAllPacketIds(cwd);
    const id = generateNextId(type as PacketType, existingIds);
    
    console.log(chalk.blue(`Creating packet: ${id}`));
    console.log('');
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'goal',
        message: 'What is the goal of this packet?',
        validate: (input: string) => input.trim().length > 0 || 'Goal is required',
      },
      {
        type: 'editor',
        name: 'dod',
        message: 'Definition of Done (one item per line):',
        default: '- Item 1\n- Item 2',
      },
      {
        type: 'input',
        name: 'constraints',
        message: 'Constraints (comma-separated, optional):',
      },
    ]);
    
    const dod = (answers.dod as string)
      .split('\n')
      .map((line: string) => line.replace(/^[-*]\s*/, '').trim())
      .filter((line: string) => line.length > 0);
    
    if (dod.length === 0) {
      console.error(chalk.red('At least one Definition of Done item is required'));
      process.exit(1);
    }
    
    const constraints = (answers.constraints as string)
      .split(',')
      .map((c: string) => c.trim())
      .filter((c: string) => c.length > 0);
    
    const anchors: SemanticAnchor[] = [];
    
    if (options.anchors) {
      const addAnchors = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'add',
          message: 'Add semantic anchors now?',
          default: true,
        },
      ]);
      
      if (addAnchors.add) {
        let addMore = true;
        
        while (addMore) {
          const fileAnswer = await inquirer.prompt([
            {
              type: 'input',
              name: 'filePath',
              message: 'File path (relative to project root):',
            },
          ]);
          
          const filePath = fileAnswer.filePath as string;
          const fullPath = path.join(cwd, filePath);
          
          if (!fs.existsSync(fullPath)) {
            console.log(chalk.yellow(`File not found: ${filePath}`));
            continue;
          }
          
          const language = getLanguageFromExtension(filePath);
          if (!language) {
            console.log(chalk.yellow(`Unsupported file type: ${filePath}`));
            continue;
          }
          
          const spinner = ora('Parsing file...').start();
          
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const symbols = await findAllSymbols(content, language);
            
            spinner.stop();
            
            if (symbols.length === 0) {
              console.log(chalk.yellow('No symbols found in file'));
            } else {
              const symbolChoices = symbols.map((s) => ({
                name: `${s.type}: ${s.name} (lines ${s.startLine}-${s.endLine})`,
                value: s,
              }));
              
              const symbolAnswers = await inquirer.prompt([
                {
                  type: 'checkbox',
                  name: 'selected',
                  message: 'Select symbols to anchor:',
                  choices: symbolChoices,
                },
              ]);
              
              for (const symbol of symbolAnswers.selected as typeof symbols) {
                const anchor = await createAnchor(fullPath, symbol, cwd);
                anchors.push(anchor);
                console.log(chalk.green(`  ✓ Added anchor: ${symbol.name}`));
              }
            }
          } catch (error) {
            spinner.fail('Failed to parse file');
            if (error instanceof Error) {
              console.log(chalk.red(error.message));
            }
          }
          
          const continueAnswer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'continue',
              message: 'Add more anchors?',
              default: false,
            },
          ]);
          
          addMore = continueAnswer.continue as boolean;
        }
      }
    }
    
    const now = new Date().toISOString();
    const packet: Packet = {
      id,
      type: type as PacketType,
      title,
      status: 'draft',
      goal: answers.goal as string,
      dod,
      ...(constraints.length > 0 ? { constraints } : {}),
      repo_truth: anchors,
      metadata: {
        created_at: now,
        updated_at: now,
      },
    };
    
    const validation = validatePacket(packet);
    if (!validation.valid) {
      console.error(chalk.red('Invalid packet:'));
      validation.errors.forEach((e) => console.error(chalk.red(`  - ${e}`)));
      process.exit(1);
    }
    
    const packetPath = getPacketPath(id, 'active', cwd);
    const bodyContent = `
## Notes

Add implementation notes here.

## Progress

- [ ] Started
- [ ] In progress
- [ ] Ready for review
- [ ] Completed
`;
    
    await writeMarkdownFile(packetPath, packet, bodyContent);
    
    console.log('');
    console.log(chalk.green(`✓ Created packet: ${id}`));
    console.log(chalk.gray(`  Path: ${path.relative(cwd, packetPath)}`));
    console.log('');
    console.log(chalk.blue('Next steps:'));
    console.log(`  ${chalk.yellow(`ce packet start ${id}`)} - Set packet to active`);
    console.log(`  ${chalk.yellow(`ce switch ${id}`)} - Switch to this packet`);
  });

packetCommand
  .command('start <id>')
  .description('Set a packet status to active')
  .action(async (id: string) => {
    const cwd = process.cwd();
    requireInitialized(cwd);
    
    await updatePacketStatus(id, 'active', cwd);
  });

packetCommand
  .command('status <id>')
  .description('Show packet status')
  .action(async (id: string) => {
    const cwd = process.cwd();
    requireInitialized(cwd);
    
    const packet = await loadPacketById(id, cwd);
    if (!packet) {
      console.error(chalk.red(`Packet not found: ${id}`));
      process.exit(1);
    }
    
    console.log('');
    console.log(chalk.blue(`Packet: ${packet.id}`));
    console.log(`  ${chalk.gray('Title:')} ${packet.title}`);
    console.log(`  ${chalk.gray('Status:')} ${formatStatus(packet.status)}`);
    console.log(`  ${chalk.gray('Goal:')} ${packet.goal}`);
    console.log(`  ${chalk.gray('DoD:')} ${packet.dod.length} items`);
    console.log(`  ${chalk.gray('Anchors:')} ${packet.repo_truth.length}`);
    console.log(`  ${chalk.gray('Created:')} ${packet.metadata.created_at}`);
    console.log(`  ${chalk.gray('Updated:')} ${packet.metadata.updated_at}`);
    console.log('');
  });

packetCommand
  .command('complete <id>')
  .description('Mark a packet as completed')
  .action(async (id: string) => {
    const cwd = process.cwd();
    requireInitialized(cwd);
    
    await updatePacketStatus(id, 'completed', cwd);
  });

async function loadPacketById(id: string, cwd: string): Promise<Packet | null> {
  const activePath = getPacketPath(id, 'active', cwd);
  const completedPath = getPacketPath(id, 'completed', cwd);
  
  if (fs.existsSync(activePath)) {
    const { data } = await readMarkdownFile<Packet>(activePath);
    return data;
  }
  
  if (fs.existsSync(completedPath)) {
    const { data } = await readMarkdownFile<Packet>(completedPath);
    return data;
  }
  
  return null;
}

const VALID_TRANSITIONS: Record<PacketStatus, PacketStatus[]> = {
  draft: ['active'],
  active: ['blocked', 'completed', 'cancelled'],
  blocked: ['active', 'cancelled'],
  completed: [],
  cancelled: [],
};

async function updatePacketStatus(id: string, newStatus: PacketStatus, cwd: string): Promise<void> {
  const activePath = getPacketPath(id, 'active', cwd);
  const completedPath = getPacketPath(id, 'completed', cwd);
  
  let currentPath: string;
  if (fs.existsSync(activePath)) {
    currentPath = activePath;
  } else if (fs.existsSync(completedPath)) {
    currentPath = completedPath;
  } else {
    console.error(chalk.red(`Packet not found: ${id}`));
    process.exit(1);
  }
  
  const { data: packet, content } = await readMarkdownFile<Packet>(currentPath);
  
  const allowedTransitions = VALID_TRANSITIONS[packet.status];
  if (!allowedTransitions?.includes(newStatus)) {
    console.error(chalk.red(`Invalid status transition: ${packet.status} → ${newStatus}`));
    console.log(chalk.gray(`Allowed transitions from ${packet.status}: ${allowedTransitions?.join(', ') || 'none'}`));
    process.exit(1);
  }
  
  packet.status = newStatus;
  packet.metadata.updated_at = new Date().toISOString();
  
  if (newStatus === 'completed') {
    await fs.remove(currentPath);
    await writeMarkdownFile(completedPath, packet, content);
    console.log(chalk.green(`✓ Packet ${id} marked as completed`));
    console.log(chalk.gray(`  Moved to: ${path.relative(cwd, completedPath)}`));
  } else {
    await writeMarkdownFile(currentPath, packet, content);
    console.log(chalk.green(`✓ Packet ${id} status changed to ${newStatus}`));
  }
}

function formatStatus(status: PacketStatus): string {
  const colors: Record<PacketStatus, (s: string) => string> = {
    draft: chalk.gray,
    active: chalk.green,
    blocked: chalk.yellow,
    completed: chalk.blue,
    cancelled: chalk.red,
  };
  return colors[status](status);
}
