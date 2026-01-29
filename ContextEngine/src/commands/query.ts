import { Command } from 'commander';
import chalk from 'chalk';
import { requireInitialized } from '../core/config.js';
import { search } from '../core/search.js';

export const queryCommand = new Command('query')
  .description('Search context files')
  .argument('<text>', 'Search query')
  .option('-p, --packet <id>', 'Use packet for relevance ranking')
  .option('-n, --max <number>', 'Maximum results', '10')
  .option('-t, --type <types>', 'Filter by type (packet,adr,journal,repo-map)')
  .action(async (text: string, options: { packet?: string; max: string; type?: string }) => {
    const cwd = process.cwd();
    requireInitialized(cwd);
    
    const maxResults = parseInt(options.max, 10);
    const types = options.type?.split(',').map((t) => t.trim()) as
      | ('packet' | 'adr' | 'journal' | 'repo-map')[]
      | undefined;
    
    console.log('');
    console.log(chalk.blue(`Searching for: "${text}"`));
    if (options.packet) {
      console.log(chalk.gray(`Ranking by relevance to: ${options.packet}`));
    }
    console.log('');
    
    const results = await search(text, cwd, {
      packetId: options.packet,
      maxResults,
      types,
    });
    
    if (results.length === 0) {
      console.log(chalk.yellow('No results found'));
      return;
    }
    
    console.log(chalk.blue(`Found ${results.length} result(s):`));
    console.log('');
    
    for (const result of results) {
      const typeColor = {
        packet: chalk.cyan,
        adr: chalk.magenta,
        journal: chalk.yellow,
        'repo-map': chalk.green,
      }[result.type];
      
      console.log(`${typeColor(`[${result.type.toUpperCase()}]`)} ${chalk.white(result.title)}`);
      console.log(`  ${chalk.gray('Path:')} ${result.path}`);
      console.log(`  ${chalk.gray('Score:')} ${result.score.toFixed(2)}`);
      if (result.matches.length > 0) {
        console.log(`  ${chalk.gray('Matches:')} ${result.matches.join(', ')}`);
      }
      if (result.snippet) {
        const snippet = result.snippet.replace(/\n/g, ' ').slice(0, 100);
        console.log(`  ${chalk.gray('Snippet:')} ${snippet}...`);
      }
      console.log('');
    }
  });
