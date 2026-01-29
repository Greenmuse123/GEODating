import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import clipboard from 'clipboardy';
import { requireInitialized } from '../core/config.js';
import { assembleContextPack, countTokens } from '../core/assembler.js';

export const assembleCommand = new Command('assemble')
  .description('Assemble an agent context pack')
  .argument('<id>', 'Packet ID to assemble context for')
  .option('-t, --max-tokens <number>', 'Maximum tokens in output', '8000')
  .option('-c, --clipboard', 'Copy result to clipboard')
  .option('-o, --out <file>', 'Write result to file')
  .action(async (id: string, options: { maxTokens: string; clipboard?: boolean; out?: string }) => {
    const cwd = process.cwd();
    requireInitialized(cwd);
    
    const maxTokens = parseInt(options.maxTokens, 10);
    if (isNaN(maxTokens) || maxTokens < 1000) {
      console.error(chalk.red('Max tokens must be at least 1000'));
      process.exit(1);
    }
    
    const spinner = ora('Assembling context pack...').start();
    
    try {
      const pack = await assembleContextPack(id, {
        maxTokens,
        clipboard: options.clipboard ?? false,
        outFile: options.out,
      }, cwd);
      
      const tokenCount = countTokens(pack);
      
      spinner.succeed(`Context pack assembled (${tokenCount} tokens)`);
      
      if (options.out) {
        const outPath = path.resolve(cwd, options.out);
        await fs.writeFile(outPath, pack);
        console.log(chalk.green(`✓ Written to: ${options.out}`));
      }
      
      if (options.clipboard) {
        await clipboard.write(pack);
        console.log(chalk.green('✓ Copied to clipboard'));
      }
      
      if (!options.out && !options.clipboard) {
        console.log('');
        console.log(chalk.gray('─'.repeat(60)));
        console.log(pack);
        console.log(chalk.gray('─'.repeat(60)));
        console.log('');
        console.log(chalk.blue('Tip:') + ' Use --clipboard or --out to save the output');
      }
      
    } catch (error) {
      spinner.fail('Failed to assemble context pack');
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
