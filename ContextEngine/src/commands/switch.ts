import { Command } from 'commander';
import fs from 'fs-extra';
import chalk from 'chalk';
import inquirer from 'inquirer';
import clipboard from 'clipboardy';
import { requireInitialized, getPacketPath, saveCurrentContext } from '../core/config.js';
import { readMarkdownFile } from '../core/frontmatter.js';
import { assembleContextPack } from '../core/assembler.js';
import type { Packet, CurrentContext } from '../types/index.js';

export const switchCommand = new Command('switch')
  .description('Switch to a work packet')
  .argument('<id>', 'Packet ID to switch to')
  .option('--no-clipboard', 'Skip clipboard prompt')
  .action(async (id: string, options: { clipboard: boolean }) => {
    const cwd = process.cwd();
    requireInitialized(cwd);
    
    const activePath = getPacketPath(id, 'active', cwd);
    const completedPath = getPacketPath(id, 'completed', cwd);
    
    let packetPath: string;
    if (fs.existsSync(activePath)) {
      packetPath = activePath;
    } else if (fs.existsSync(completedPath)) {
      packetPath = completedPath;
    } else {
      console.error(chalk.red(`Packet not found: ${id}`));
      process.exit(1);
    }
    
    const { data: packet } = await readMarkdownFile<Packet>(packetPath);
    
    const context: CurrentContext = {
      packet_id: id,
      switched_at: new Date().toISOString(),
    };
    await saveCurrentContext(context, cwd);
    
    console.log('');
    console.log(chalk.green(`✓ Switched to: ${id}`));
    console.log('');
    console.log(chalk.blue('Packet Summary:'));
    console.log(`  ${chalk.gray('Title:')} ${packet.title}`);
    console.log(`  ${chalk.gray('Status:')} ${packet.status}`);
    console.log(`  ${chalk.gray('Goal:')} ${packet.goal}`);
    console.log(`  ${chalk.gray('Anchors:')} ${packet.repo_truth.length} defined`);
    console.log('');
    
    if (options.clipboard) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'assemble',
          message: 'Assemble context pack to clipboard?',
          default: true,
        },
      ]);
      
      if (answer.assemble) {
        try {
          const pack = await assembleContextPack(id, {
            maxTokens: 8000,
            clipboard: true,
          }, cwd);
          
          await clipboard.write(pack);
          console.log(chalk.green('✓ Context pack copied to clipboard!'));
        } catch (error) {
          if (error instanceof Error) {
            console.error(chalk.red(`Failed to assemble: ${error.message}`));
          }
        }
      }
    }
    
    console.log('');
    console.log(chalk.blue('Quick actions:'));
    console.log(`  ${chalk.yellow(`ce assemble ${id}`)} - Assemble context pack`);
    console.log(`  ${chalk.yellow(`ce scribe ${id}`)} - Document your changes`);
    console.log(`  ${chalk.yellow(`ce anchor check ${id}`)} - Check for drift`);
  });
