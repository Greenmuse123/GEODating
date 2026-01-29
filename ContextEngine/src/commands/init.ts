import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { PATHS, DEFAULT_CONFIG, isInitialized, saveConfig } from '../core/config.js';
import type { ContextConfig } from '../types/index.js';

export const initCommand = new Command('init')
  .description('Initialize Context Engine in the current directory')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .option('--force', 'Reinitialize even if already initialized')
  .action(async (options: { yes?: boolean; force?: boolean }) => {
    const cwd = process.cwd();
    
    if (isInitialized(cwd) && !options.force) {
      console.log(chalk.yellow('Context Engine is already initialized in this directory.'));
      console.log(chalk.gray('Use --force to reinitialize.'));
      return;
    }
    
    const spinner = ora('Initializing Context Engine...').start();
    
    try {
      let projectName = path.basename(cwd);
      let projectDescription = '';
      
      if (!options.yes) {
        spinner.stop();
        
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'projectName',
            message: 'Project name:',
            default: projectName,
          },
          {
            type: 'input',
            name: 'projectDescription',
            message: 'Project description (optional):',
          },
        ]);
        
        projectName = answers.projectName as string;
        projectDescription = answers.projectDescription as string;
        
        spinner.start('Creating context structure...');
      }
      
      await fs.ensureDir(path.join(cwd, PATHS.packetsActive));
      await fs.ensureDir(path.join(cwd, PATHS.packetsCompleted));
      await fs.ensureDir(path.join(cwd, PATHS.adrs));
      await fs.ensureDir(path.join(cwd, PATHS.journal));
      await fs.ensureDir(path.join(cwd, 'context', 'repo-map'));
      await fs.ensureDir(path.join(cwd, 'context', 'config'));
      await fs.ensureDir(path.join(cwd, 'context', '.index'));
      
      await fs.ensureDir(path.join(cwd, PATHS.ceDir));
      await fs.ensureDir(path.join(cwd, PATHS.cache));
      
      const config: ContextConfig = {
        ...DEFAULT_CONFIG,
        project: {
          name: projectName,
          description: projectDescription,
        },
      };
      await saveConfig(config, cwd);
      
      const repoMapContent = `# Repository Map

## Overview
${projectDescription || 'Add a description of your project here.'}

## Key Directories
- \`src/\` - Source code
- \`docs/\` - Documentation
- \`tests/\` - Test files

## Key Files
- Add important files and their purposes here

## Architecture Notes
- Add architecture notes here

---
*Last updated: ${new Date().toISOString().split('T')[0]}*
`;
      await fs.writeFile(path.join(cwd, PATHS.repoMap), repoMapContent);
      
      await fs.writeFile(path.join(cwd, PATHS.ceVersion), '2.0.0');
      
      const indexContent = JSON.stringify({
        version: '2.0.0',
        built_at: new Date().toISOString(),
        entries: [],
        symbol_map: {},
        path_map: {},
      }, null, 2);
      await fs.writeFile(path.join(cwd, PATHS.index), indexContent);
      
      const currentContext = JSON.stringify({
        packet_id: null,
        switched_at: null,
      }, null, 2);
      await fs.writeFile(path.join(cwd, PATHS.currentContext), currentContext);
      
      const gitignorePath = path.join(cwd, '.gitignore');
      const gitignoreEntries = [
        '',
        '# Context Engine (generated)',
        '.context-engine/',
        'context/.index/',
        'context/.assembled/',
      ].join('\n');
      
      if (fs.existsSync(gitignorePath)) {
        const existing = await fs.readFile(gitignorePath, 'utf-8');
        if (!existing.includes('.context-engine/')) {
          await fs.appendFile(gitignorePath, gitignoreEntries);
        }
      } else {
        await fs.writeFile(gitignorePath, gitignoreEntries.trim() + '\n');
      }
      
      const now = new Date();
      const journalPath = path.join(
        cwd,
        PATHS.journal,
        now.getFullYear().toString(),
        `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.toLocaleString('en-US', { month: 'long' }).toLowerCase()}.md`
      );
      await fs.ensureDir(path.dirname(journalPath));
      if (!fs.existsSync(journalPath)) {
        const journalHeader = `# Journal - ${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}

---

`;
        await fs.writeFile(journalPath, journalHeader);
      }
      
      spinner.succeed('Context Engine initialized successfully!');
      
      console.log('');
      console.log(chalk.green('Created:'));
      console.log(`  ${chalk.cyan('context/')} - Context storage directory`);
      console.log(`    ${chalk.gray('├─')} config/context.config.json`);
      console.log(`    ${chalk.gray('├─')} repo-map/REPO_MAP.md`);
      console.log(`    ${chalk.gray('├─')} packets/active/`);
      console.log(`    ${chalk.gray('├─')} packets/completed/`);
      console.log(`    ${chalk.gray('├─')} adrs/`);
      console.log(`    ${chalk.gray('├─')} journal/`);
      console.log(`    ${chalk.gray('└─')} .index/`);
      console.log(`  ${chalk.cyan('.context-engine/')} - Local state (gitignored)`);
      console.log('');
      console.log(chalk.blue('Next steps:'));
      console.log(`  1. ${chalk.yellow('ce packet create feat "Your feature"')} - Create a work packet`);
      console.log(`  2. ${chalk.yellow('ce switch FEAT-001')} - Switch to the packet`);
      console.log(`  3. ${chalk.yellow('ce assemble FEAT-001 --clipboard')} - Assemble context for AI`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to initialize Context Engine');
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
