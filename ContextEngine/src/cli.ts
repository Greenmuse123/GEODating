import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { packetCommand } from './commands/packet.js';
import { switchCommand } from './commands/switch.js';
import { assembleCommand } from './commands/assemble.js';
import { scribeCommand } from './commands/scribe.js';
import { anchorCommand } from './commands/anchor.js';
import { validateCommand } from './commands/validate.js';
import { indexCommand } from './commands/index.js';
import { healthCommand } from './commands/health.js';
import { queryCommand } from './commands/query.js';

const VERSION = '2.0.0';

const program = new Command();

program
  .name('ce')
  .description('Context Engine CLI - Development companion for AI-assisted coding')
  .version(VERSION);

program.addCommand(initCommand);
program.addCommand(packetCommand);
program.addCommand(switchCommand);
program.addCommand(assembleCommand);
program.addCommand(scribeCommand);
program.addCommand(anchorCommand);
program.addCommand(validateCommand);
program.addCommand(indexCommand);
program.addCommand(healthCommand);
program.addCommand(queryCommand);

program.on('command:*', () => {
  console.error(chalk.red(`Unknown command: ${program.args.join(' ')}`));
  console.log(`Run ${chalk.cyan('ce --help')} for available commands.`);
  process.exit(1);
});

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

main();
