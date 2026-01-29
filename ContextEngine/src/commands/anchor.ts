import { Command } from 'commander';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { requireInitialized, getPacketPath } from '../core/config.js';
import { readMarkdownFile, writeMarkdownFile } from '../core/frontmatter.js';
import { checkAnchor, refreshAnchor } from '../core/semantic-anchor.js';
import type { Packet, AnchorCheckResult } from '../types/index.js';

export const anchorCommand = new Command('anchor')
  .description('Manage semantic anchors');

anchorCommand
  .command('check <id>')
  .description('Check anchors for drift')
  .action(async (id: string) => {
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
    
    if (packet.repo_truth.length === 0) {
      console.log(chalk.yellow('No anchors defined for this packet'));
      return;
    }
    
    console.log('');
    console.log(chalk.blue(`Checking anchors for ${id}...`));
    console.log('');
    
    const results: AnchorCheckResult[] = [];
    let hasIssues = false;
    
    for (const anchor of packet.repo_truth) {
      const spinner = ora(`Checking ${anchor.symbol}...`).start();
      
      try {
        const result = await checkAnchor(anchor, cwd);
        results.push(result);
        
        if (result.status === 'valid') {
          spinner.succeed(chalk.green(`${anchor.symbol}: valid`));
        } else if (result.status === 'semantic_drift') {
          spinner.warn(chalk.yellow(`${anchor.symbol}: drift detected`));
          hasIssues = true;
        } else {
          spinner.fail(chalk.red(`${anchor.symbol}: ${result.message}`));
          hasIssues = true;
        }
      } catch (error) {
        spinner.fail(chalk.red(`${anchor.symbol}: check failed`));
        hasIssues = true;
      }
    }
    
    console.log('');
    
    const valid = results.filter((r) => r.status === 'valid').length;
    const drift = results.filter((r) => r.status === 'semantic_drift').length;
    const deleted = results.filter((r) => r.status === 'deleted').length;
    
    console.log(chalk.blue('Summary:'));
    console.log(`  ${chalk.green(`✓ Valid: ${valid}`)}`);
    if (drift > 0) console.log(`  ${chalk.yellow(`⚠ Drift: ${drift}`)}`);
    if (deleted > 0) console.log(`  ${chalk.red(`✗ Deleted: ${deleted}`)}`);
    
    if (hasIssues) {
      console.log('');
      console.log(chalk.blue('To refresh anchors:'));
      console.log(`  ${chalk.yellow(`ce anchor refresh ${id}`)}`);
      process.exit(1);
    }
  });

anchorCommand
  .command('refresh <id>')
  .description('Update anchors to current code')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (id: string, options: { yes?: boolean }) => {
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
    
    const { data: packet, content } = await readMarkdownFile<Packet>(packetPath);
    
    if (packet.repo_truth.length === 0) {
      console.log(chalk.yellow('No anchors defined for this packet'));
      return;
    }
    
    const results: AnchorCheckResult[] = [];
    for (const anchor of packet.repo_truth) {
      const result = await checkAnchor(anchor, cwd);
      results.push(result);
    }
    
    const needsRefresh = results.filter((r) => r.status !== 'valid');
    
    if (needsRefresh.length === 0) {
      console.log(chalk.green('All anchors are already valid'));
      return;
    }
    
    console.log('');
    console.log(chalk.blue('Anchors needing refresh:'));
    for (const result of needsRefresh) {
      const icon = result.status === 'semantic_drift' ? '⚠' : '✗';
      const color = result.status === 'semantic_drift' ? chalk.yellow : chalk.red;
      console.log(color(`  ${icon} ${result.anchor.symbol}: ${result.message}`));
    }
    console.log('');
    
    if (!options.yes) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Refresh these anchors?',
          default: true,
        },
      ]);
      
      if (!answer.confirm) {
        console.log(chalk.gray('Cancelled'));
        return;
      }
    }
    
    const spinner = ora('Refreshing anchors...').start();
    
    let refreshed = 0;
    let failed = 0;
    
    for (let i = 0; i < packet.repo_truth.length; i++) {
      const anchor = packet.repo_truth[i];
      const result = results[i];
      
      if (result && result.status === 'valid') {
        continue;
      }
      
      if (anchor) {
        try {
          const updated = await refreshAnchor(anchor, cwd);
          packet.repo_truth[i] = updated;
          refreshed++;
        } catch (error) {
          failed++;
        }
      }
    }
    
    packet.metadata.updated_at = new Date().toISOString();
    await writeMarkdownFile(packetPath, packet, content);
    
    spinner.stop();
    
    console.log('');
    if (refreshed > 0) {
      console.log(chalk.green(`✓ Refreshed ${refreshed} anchor(s)`));
    }
    if (failed > 0) {
      console.log(chalk.red(`✗ Failed to refresh ${failed} anchor(s)`));
    }
  });
