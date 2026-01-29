import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import fg from 'fast-glob';
import { PATHS, requireInitialized } from '../core/config.js';
import { readMarkdownFile } from '../core/frontmatter.js';
import { checkAnchor } from '../core/semantic-anchor.js';
import { parseJournalEntries } from '../core/indexer.js';
import type { Packet, HealthReport } from '../types/index.js';

export const healthCommand = new Command('health')
  .description('Check context health')
  .option('--fail', 'Exit with error code if issues found')
  .action(async (options: { fail?: boolean }) => {
    const cwd = process.cwd();
    requireInitialized(cwd);
    
    const spinner = ora('Checking context health...').start();
    
    const report: HealthReport = {
      drift_count: 0,
      orphan_count: 0,
      stale_count: 0,
      missing_repo_map: false,
      issues: [],
    };
    
    try {
      if (!fs.existsSync(path.join(cwd, PATHS.repoMap))) {
        report.missing_repo_map = true;
        report.issues.push({
          type: 'missing',
          message: 'REPO_MAP.md is missing',
          severity: 'warning',
        });
      }
      
      const activePackets = await fg('*.md', {
        cwd: path.join(cwd, PATHS.packetsActive),
        absolute: true,
      });
      
      const journalFiles = await fg('**/*.md', {
        cwd: path.join(cwd, PATHS.journal),
        absolute: true,
      });
      
      const recentPacketActivity = new Map<string, Date>();
      const now = new Date();
      
      for (const journalPath of journalFiles) {
        try {
          const content = await fs.readFile(journalPath, 'utf-8');
          const entries = parseJournalEntries(content);
          
          for (const entry of entries) {
            const entryDate = new Date(entry.timestamp);
            const existing = recentPacketActivity.get(entry.packet_id);
            if (!existing || entryDate > existing) {
              recentPacketActivity.set(entry.packet_id, entryDate);
            }
          }
        } catch {
          // Skip invalid journal files
        }
      }
      
      for (const packetPath of activePackets) {
        try {
          const { data: packet } = await readMarkdownFile<Packet>(packetPath);
          
          if (packet.status !== 'active') {
            continue;
          }
          
          if (packet.repo_truth.length === 0) {
            report.orphan_count++;
            report.issues.push({
              type: 'orphan',
              packet_id: packet.id,
              message: `Packet ${packet.id} has no semantic anchors`,
              severity: 'warning',
            });
          } else {
            for (const anchor of packet.repo_truth) {
              try {
                const result = await checkAnchor(anchor, cwd);
                if (result.status !== 'valid') {
                  report.drift_count++;
                  report.issues.push({
                    type: 'drift',
                    packet_id: packet.id,
                    message: `${packet.id}: ${anchor.symbol} has ${result.status}`,
                    severity: result.status === 'deleted' ? 'error' : 'warning',
                  });
                }
              } catch {
                // Skip check failures
              }
            }
          }
          
          const lastActivity = recentPacketActivity.get(packet.id);
          const staleDays = 14;
          
          if (!lastActivity) {
            const createdAt = new Date(packet.metadata.created_at);
            const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSinceCreation > staleDays) {
              report.stale_count++;
              report.issues.push({
                type: 'stale',
                packet_id: packet.id,
                message: `Packet ${packet.id} has no journal entries (created ${Math.floor(daysSinceCreation)} days ago)`,
                severity: 'warning',
              });
            }
          } else {
            const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSinceActivity > staleDays) {
              report.stale_count++;
              report.issues.push({
                type: 'stale',
                packet_id: packet.id,
                message: `Packet ${packet.id} has no journal activity in ${Math.floor(daysSinceActivity)} days`,
                severity: 'warning',
              });
            }
          }
        } catch {
          // Skip invalid packets
        }
      }
      
      spinner.stop();
      
      console.log('');
      console.log(chalk.blue('Context Health Report'));
      console.log('');
      
      if (report.issues.length === 0) {
        console.log(chalk.green('✓ All checks passed!'));
      } else {
        const errors = report.issues.filter((i) => i.severity === 'error');
        const warnings = report.issues.filter((i) => i.severity === 'warning');
        
        if (errors.length > 0) {
          console.log(chalk.red('Errors:'));
          for (const issue of errors) {
            console.log(chalk.red(`  ✗ ${issue.message}`));
          }
          console.log('');
        }
        
        if (warnings.length > 0) {
          console.log(chalk.yellow('Warnings:'));
          for (const issue of warnings) {
            console.log(chalk.yellow(`  ⚠ ${issue.message}`));
          }
          console.log('');
        }
      }
      
      console.log(chalk.blue('Summary:'));
      console.log(`  ${report.drift_count === 0 ? chalk.green('✓') : chalk.yellow('⚠')} Semantic drift: ${report.drift_count}`);
      console.log(`  ${report.orphan_count === 0 ? chalk.green('✓') : chalk.yellow('⚠')} Orphan packets: ${report.orphan_count}`);
      console.log(`  ${report.stale_count === 0 ? chalk.green('✓') : chalk.yellow('⚠')} Stale packets: ${report.stale_count}`);
      console.log(`  ${!report.missing_repo_map ? chalk.green('✓') : chalk.yellow('⚠')} Repo map: ${report.missing_repo_map ? 'missing' : 'present'}`);
      
      if (options.fail && report.issues.length > 0) {
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('Failed to check health');
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });
