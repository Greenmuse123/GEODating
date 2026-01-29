import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { requireInitialized } from '../core/config.js';
import { buildIndex, saveIndex } from '../core/indexer.js';

export const indexCommand = new Command('index')
  .description('Manage the context index');

indexCommand
  .command('build')
  .description('Build or rebuild the context index')
  .action(async () => {
    const cwd = process.cwd();
    requireInitialized(cwd);
    
    const spinner = ora('Building index...').start();
    
    try {
      const index = await buildIndex(cwd);
      await saveIndex(index, cwd);
      
      spinner.succeed('Index built successfully');
      
      console.log('');
      console.log(chalk.blue('Index statistics:'));
      console.log(`  Entries: ${index.entries.length}`);
      console.log(`  Symbols: ${Object.keys(index.symbol_map).length}`);
      console.log(`  Paths: ${Object.keys(index.path_map).length}`);
      console.log(`  Built at: ${index.built_at}`);
    } catch (error) {
      spinner.fail('Failed to build index');
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
