import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { PATHS, requireInitialized, getPacketPath, loadConfig, getJournalPath } from '../core/config.js';
import { readMarkdownFile, writeMarkdownFile } from '../core/frontmatter.js';
import { getHeadDiff, getWorkingTreeDiff } from '../core/git.js';
import { hasConsent, grantConsent, sanitizeDiff, PRIVACY_NOTICE, formatSecretsWarning } from '../core/privacy.js';
import { getLLMProvider, type ScribeSummary } from '../core/scribe-llm.js';
import { checkAnchor } from '../core/semantic-anchor.js';
import type { Packet, JournalEntry } from '../types/index.js';

export const scribeCommand = new Command('scribe')
  .description('Document changes with a journal entry')
  .argument('<id>', 'Packet ID')
  .option('--local', 'Use local mode (no LLM)')
  .option('--no-llm', 'Disable LLM summarization')
  .option('--include-working-tree', 'Include uncommitted changes')
  .action(async (id: string, options: { local?: boolean; llm: boolean; includeWorkingTree?: boolean }) => {
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
    
    const { data: packet, content: packetContent } = await readMarkdownFile<Packet>(packetPath);
    
    const spinner = ora('Getting diff...').start();
    
    let diff;
    try {
      if (options.includeWorkingTree) {
        diff = await getWorkingTreeDiff(cwd);
      } else {
        diff = await getHeadDiff(cwd);
      }
      spinner.succeed(`Got diff: ${diff.files.length} files changed`);
    } catch (error) {
      spinner.fail('Failed to get diff');
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
    
    if (diff.files.length === 0) {
      console.log(chalk.yellow('No changes detected'));
      return;
    }
    
    console.log('');
    console.log(chalk.blue('Changed files:'));
    for (const file of diff.files.slice(0, 10)) {
      console.log(`  ${chalk.gray('•')} ${file}`);
    }
    if (diff.files.length > 10) {
      console.log(chalk.gray(`  ... and ${diff.files.length - 10} more`));
    }
    console.log('');
    
    let summary: ScribeSummary;
    
    const useLocal = options.local || !options.llm;
    
    if (!useLocal) {
      const config = await loadConfig(cwd);
      const consentGranted = await hasConsent(cwd);
      
      if (!consentGranted) {
        console.log(PRIVACY_NOTICE);
        
        const answer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'consent',
            message: 'Do you consent to sending diffs to an LLM provider?',
            default: false,
          },
        ]);
        
        if (!answer.consent) {
          console.log(chalk.yellow('Falling back to local mode'));
          summary = await getLocalSummary();
        } else {
          await grantConsent(config.llm.provider ?? 'anthropic', cwd);
          summary = await getLLMSummary(diff, packet, cwd);
        }
      } else {
        summary = await getLLMSummary(diff, packet, cwd);
      }
    } else {
      summary = await getLocalSummary();
    }
    
    const entry: JournalEntry = {
      packet_id: id,
      commit_sha: diff.sha,
      changed_files: diff.files,
      summary: summary.summary,
      risks: summary.risks.length > 0 ? summary.risks : undefined,
      next_steps: summary.next_steps.length > 0 ? summary.next_steps : undefined,
      timestamp: new Date().toISOString(),
    };
    
    const journalPath = getJournalPath(new Date(), cwd);
    await appendJournalEntry(journalPath, entry);
    
    console.log(chalk.green('✓ Journal entry added'));
    console.log(chalk.gray(`  Path: ${path.relative(cwd, journalPath)}`));
    console.log('');
    
    console.log(chalk.blue('Checking anchors for drift...'));
    let hasDrift = false;
    
    for (const anchor of packet.repo_truth) {
      const result = await checkAnchor(anchor, cwd);
      if (result.status !== 'valid') {
        hasDrift = true;
        const icon = result.status === 'semantic_drift' ? '⚠' : '✗';
        const color = result.status === 'semantic_drift' ? chalk.yellow : chalk.red;
        console.log(color(`  ${icon} ${anchor.symbol}: ${result.message}`));
      }
    }
    
    if (hasDrift) {
      const refreshAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'refresh',
          message: 'Drift detected. Refresh anchors?',
          default: true,
        },
      ]);
      
      if (refreshAnswer.refresh) {
        console.log(chalk.yellow(`Run: ce anchor refresh ${id}`));
      }
    } else if (packet.repo_truth.length > 0) {
      console.log(chalk.green('  ✓ All anchors valid'));
    }
    
    console.log('');
    
    const completeAnswer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'complete',
        message: 'Mark packet as completed?',
        default: false,
      },
    ]);
    
    if (completeAnswer.complete) {
      packet.status = 'completed';
      packet.metadata.updated_at = new Date().toISOString();
      
      const newPath = getPacketPath(id, 'completed', cwd);
      await fs.remove(packetPath);
      await writeMarkdownFile(newPath, packet, packetContent);
      
      console.log(chalk.green(`✓ Packet ${id} marked as completed`));
    }
  });

async function getLocalSummary(): Promise<ScribeSummary> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'summary',
      message: 'Brief summary (1-2 sentences):',
      validate: (input: string) => input.trim().length > 0 || 'Summary is required',
    },
    {
      type: 'input',
      name: 'risks',
      message: 'Risks (comma-separated, optional):',
    },
    {
      type: 'input',
      name: 'nextSteps',
      message: 'Next steps (comma-separated, optional):',
    },
  ]);
  
  return {
    summary: answers.summary as string,
    risks: (answers.risks as string).split(',').map((r: string) => r.trim()).filter((r: string) => r.length > 0),
    next_steps: (answers.nextSteps as string).split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0),
  };
}

async function getLLMSummary(diff: { sha: string; files: string[]; patch: string }, packet: Packet, cwd: string): Promise<ScribeSummary> {
  const spinner = ora('Generating summary with LLM...').start();
  
  try {
    const { sanitized, secretsFound, warnings } = sanitizeDiff(diff.patch);
    
    if (secretsFound > 0) {
      spinner.stop();
      console.log(formatSecretsWarning(warnings));
      
      const proceed = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: 'Continue with redacted diff?',
          default: true,
        },
      ]);
      
      if (!proceed.continue) {
        return getLocalSummary();
      }
      
      spinner.start('Generating summary with LLM...');
    }
    
    const config = await loadConfig(cwd);
    const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY;
    const provider = await getLLMProvider(config.llm.provider, apiKey);
    
    const context = `Packet: ${packet.id} - ${packet.title}\nGoal: ${packet.goal}`;
    const summary = await provider.summarizeDiff({ ...diff, patch: sanitized }, context);
    
    spinner.succeed('Generated summary');
    
    return summary;
  } catch (error) {
    spinner.fail('LLM failed, falling back to local');
    if (error instanceof Error) {
      console.log(chalk.yellow(error.message));
    }
    return getLocalSummary();
  }
}

async function appendJournalEntry(journalPath: string, entry: JournalEntry): Promise<void> {
  await fs.ensureDir(path.dirname(journalPath));
  
  let existing = '';
  if (fs.existsSync(journalPath)) {
    existing = await fs.readFile(journalPath, 'utf-8');
  } else {
    const date = new Date();
    existing = `# Journal - ${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}\n\n---\n\n`;
  }
  
  const entryContent = `## [${entry.timestamp}]

**Packet:** ${entry.packet_id}
**Commit:** ${entry.commit_sha}

### Changed Files
${entry.changed_files.map((f) => `- ${f}`).join('\n')}

### Summary
${entry.summary}
${entry.risks && entry.risks.length > 0 ? `
### Risks
${entry.risks.map((r) => `- ${r}`).join('\n')}
` : ''}${entry.next_steps && entry.next_steps.length > 0 ? `
### Next Steps
${entry.next_steps.map((s) => `- ${s}`).join('\n')}
` : ''}
---

`;
  
  await fs.writeFile(journalPath, existing + entryContent);
}
