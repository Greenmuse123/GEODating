import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import fg from 'fast-glob';
import { PATHS, requireInitialized, loadConfig } from '../core/config.js';
import { readMarkdownFile } from '../core/frontmatter.js';
import { validatePacket, validateADR, validateConfig } from '../core/validator.js';
import type { Packet, ADR } from '../types/index.js';

export const validateCommand = new Command('validate')
  .description('Validate context files');

validateCommand
  .command('file <path>')
  .description('Validate a specific file')
  .action(async (filePath: string) => {
    const cwd = process.cwd();
    requireInitialized(cwd);
    
    const fullPath = path.resolve(cwd, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(chalk.red(`File not found: ${filePath}`));
      process.exit(1);
    }
    
    await validateFile(fullPath, cwd);
  });

validateCommand
  .command('all')
  .alias('validate-all')
  .description('Validate all context files')
  .option('--fail', 'Exit with error code if any validation fails')
  .action(async (options: { fail?: boolean }) => {
    const cwd = process.cwd();
    requireInitialized(cwd);
    
    console.log('');
    console.log(chalk.blue('Validating all context files...'));
    console.log('');
    
    let totalFiles = 0;
    let validFiles = 0;
    let invalidFiles = 0;
    
    const configPath = path.join(cwd, PATHS.config);
    if (fs.existsSync(configPath)) {
      totalFiles++;
      try {
        const config = await loadConfig(cwd);
        const result = validateConfig(config);
        if (result.valid) {
          console.log(chalk.green(`✓ ${PATHS.config}`));
          validFiles++;
        } else {
          console.log(chalk.red(`✗ ${PATHS.config}`));
          result.errors.forEach((e) => console.log(chalk.red(`    ${e}`)));
          invalidFiles++;
        }
      } catch (error) {
        console.log(chalk.red(`✗ ${PATHS.config}: Failed to parse`));
        invalidFiles++;
      }
    }
    
    const activePackets = await fg('*.md', {
      cwd: path.join(cwd, PATHS.packetsActive),
      absolute: true,
    });
    
    const completedPackets = await fg('*.md', {
      cwd: path.join(cwd, PATHS.packetsCompleted),
      absolute: true,
    });
    
    for (const packetPath of [...activePackets, ...completedPackets]) {
      totalFiles++;
      const relativePath = path.relative(cwd, packetPath);
      
      try {
        const { data } = await readMarkdownFile<Packet>(packetPath);
        const result = validatePacket(data);
        
        if (result.valid) {
          console.log(chalk.green(`✓ ${relativePath}`));
          validFiles++;
        } else {
          console.log(chalk.red(`✗ ${relativePath}`));
          result.errors.forEach((e) => console.log(chalk.red(`    ${e}`)));
          invalidFiles++;
        }
      } catch (error) {
        console.log(chalk.red(`✗ ${relativePath}: Failed to parse`));
        invalidFiles++;
      }
    }
    
    const adrFiles = await fg('*.md', {
      cwd: path.join(cwd, PATHS.adrs),
      absolute: true,
    });
    
    for (const adrPath of adrFiles) {
      totalFiles++;
      const relativePath = path.relative(cwd, adrPath);
      
      try {
        const { data } = await readMarkdownFile<ADR>(adrPath);
        const result = validateADR(data);
        
        if (result.valid) {
          console.log(chalk.green(`✓ ${relativePath}`));
          validFiles++;
        } else {
          console.log(chalk.red(`✗ ${relativePath}`));
          result.errors.forEach((e) => console.log(chalk.red(`    ${e}`)));
          invalidFiles++;
        }
      } catch (error) {
        console.log(chalk.red(`✗ ${relativePath}: Failed to parse`));
        invalidFiles++;
      }
    }
    
    console.log('');
    console.log(chalk.blue('Summary:'));
    console.log(`  Total: ${totalFiles}`);
    console.log(`  ${chalk.green(`Valid: ${validFiles}`)}`);
    if (invalidFiles > 0) {
      console.log(`  ${chalk.red(`Invalid: ${invalidFiles}`)}`);
    }
    
    if (invalidFiles > 0 && options.fail) {
      process.exit(1);
    }
  });

async function validateFile(filePath: string, cwd: string): Promise<void> {
  const relativePath = path.relative(cwd, filePath);
  
  if (filePath.includes('packets')) {
    try {
      const { data } = await readMarkdownFile<Packet>(filePath);
      const result = validatePacket(data);
      
      if (result.valid) {
        console.log(chalk.green(`✓ ${relativePath} is valid`));
      } else {
        console.log(chalk.red(`✗ ${relativePath} is invalid:`));
        result.errors.forEach((e) => console.log(chalk.red(`  - ${e}`)));
        process.exit(1);
      }
    } catch (error) {
      console.log(chalk.red(`✗ ${relativePath}: Failed to parse`));
      process.exit(1);
    }
  } else if (filePath.includes('adrs')) {
    try {
      const { data } = await readMarkdownFile<ADR>(filePath);
      const result = validateADR(data);
      
      if (result.valid) {
        console.log(chalk.green(`✓ ${relativePath} is valid`));
      } else {
        console.log(chalk.red(`✗ ${relativePath} is invalid:`));
        result.errors.forEach((e) => console.log(chalk.red(`  - ${e}`)));
        process.exit(1);
      }
    } catch (error) {
      console.log(chalk.red(`✗ ${relativePath}: Failed to parse`));
      process.exit(1);
    }
  } else if (filePath.includes('context.config.json')) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(content);
      const result = validateConfig(config);
      
      if (result.valid) {
        console.log(chalk.green(`✓ ${relativePath} is valid`));
      } else {
        console.log(chalk.red(`✗ ${relativePath} is invalid:`));
        result.errors.forEach((e) => console.log(chalk.red(`  - ${e}`)));
        process.exit(1);
      }
    } catch (error) {
      console.log(chalk.red(`✗ ${relativePath}: Failed to parse`));
      process.exit(1);
    }
  } else {
    console.log(chalk.yellow(`Cannot determine file type for: ${relativePath}`));
    console.log(chalk.gray('Validation skipped'));
  }
}
