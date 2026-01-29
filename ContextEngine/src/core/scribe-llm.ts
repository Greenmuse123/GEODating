import type { GitDiff } from './git.js';

export interface ScribeSummary {
  summary: string;
  risks: string[];
  next_steps: string[];
}

export interface LLMProvider {
  name: string;
  summarizeDiff(diff: GitDiff, context: string): Promise<ScribeSummary>;
}

export function createLocalProvider(): LLMProvider {
  return {
    name: 'local',
    async summarizeDiff(_diff: GitDiff, _context: string): Promise<ScribeSummary> {
      return {
        summary: '',
        risks: [],
        next_steps: [],
      };
    },
  };
}

export async function createAnthropicProvider(apiKey: string): Promise<LLMProvider> {
  return {
    name: 'anthropic',
    async summarizeDiff(diff: GitDiff, context: string): Promise<ScribeSummary> {
      const prompt = buildPrompt(diff, context);
      
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1024,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Anthropic API error: ${response.status}`);
        }
        
        const data = await response.json() as { content: Array<{ text: string }> };
        const text = data.content[0]?.text ?? '';
        
        return parseResponse(text);
      } catch (error) {
        throw new Error(`Failed to call Anthropic API: ${error}`);
      }
    },
  };
}

export async function createOpenAIProvider(apiKey: string): Promise<LLMProvider> {
  return {
    name: 'openai',
    async summarizeDiff(diff: GitDiff, context: string): Promise<ScribeSummary> {
      const prompt = buildPrompt(diff, context);
      
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            max_tokens: 1024,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
        
        const data = await response.json() as { choices: Array<{ message: { content: string } }> };
        const text = data.choices[0]?.message?.content ?? '';
        
        return parseResponse(text);
      } catch (error) {
        throw new Error(`Failed to call OpenAI API: ${error}`);
      }
    },
  };
}

function buildPrompt(diff: GitDiff, context: string): string {
  return `You are a development assistant helping to document code changes.

Given the following git diff and context, provide:
1. A concise 1-2 sentence summary of what changed
2. Any potential risks (list 0-3 items)
3. Suggested next steps (list 0-3 items)

Context:
${context}

Git Diff (commit ${diff.sha}):
\`\`\`
${diff.patch.slice(0, 8000)}
\`\`\`

Files changed: ${diff.files.join(', ')}

Respond in this exact format:
SUMMARY: <your summary>
RISKS:
- <risk 1>
- <risk 2>
NEXT_STEPS:
- <step 1>
- <step 2>

If there are no risks or next steps, you can leave those sections empty.`;
}

function parseResponse(text: string): ScribeSummary {
  const lines = text.split('\n');
  let summary = '';
  const risks: string[] = [];
  const next_steps: string[] = [];
  let currentSection = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('SUMMARY:')) {
      summary = trimmed.replace('SUMMARY:', '').trim();
      currentSection = 'summary';
    } else if (trimmed === 'RISKS:') {
      currentSection = 'risks';
    } else if (trimmed === 'NEXT_STEPS:') {
      currentSection = 'next_steps';
    } else if (trimmed.startsWith('- ')) {
      const item = trimmed.slice(2).trim();
      if (item) {
        if (currentSection === 'risks') {
          risks.push(item);
        } else if (currentSection === 'next_steps') {
          next_steps.push(item);
        }
      }
    } else if (currentSection === 'summary' && trimmed && !summary) {
      summary = trimmed;
    }
  }
  
  return { summary, risks, next_steps };
}

export async function getLLMProvider(
  providerName: string | undefined,
  apiKey?: string
): Promise<LLMProvider> {
  if (!providerName || providerName === 'local') {
    return createLocalProvider();
  }
  
  if (!apiKey) {
    throw new Error(`API key required for ${providerName} provider`);
  }
  
  switch (providerName) {
    case 'anthropic':
      return createAnthropicProvider(apiKey);
    case 'openai':
      return createOpenAIProvider(apiKey);
    default:
      throw new Error(`Unknown LLM provider: ${providerName}`);
  }
}
