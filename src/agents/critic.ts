import { KimiClient } from '../kimi-client.js';
import { TaskSpec, Step, CriticOutput, KimiRequestMessage } from '../types.js';
import { validateCriticOutput } from '../schemas.js';
import { CODING_PROFILE } from '../coding-profile.js';

export class CriticAgent {
  private kimiClient: KimiClient;

  constructor(kimiClient: KimiClient) {
    this.kimiClient = kimiClient;
  }

  async reviewFile(
    taskId: string,
    step: Step,
    fileContent: string,
    taskSpec: TaskSpec
  ): Promise<{ decision: CriticOutput; promptTokens: number; completionTokens: number }> {
    const messages = this.buildPrompt(step, fileContent, taskSpec);
    
    try {
      const { content, record } = await this.kimiClient.chat(messages, taskId, 'critic');
      
      let decision: CriticOutput;
      try {
        decision = JSON.parse(content);
      } catch (error) {
        console.warn('Critic output is not valid JSON, failing open with ACCEPT');
        return {
          decision: { decision: 'ACCEPT', issues: [] },
          promptTokens: record.prompt_tokens,
          completionTokens: record.completion_tokens
        };
      }

      if (!validateCriticOutput(decision)) {
        console.warn('Critic output failed schema validation, failing open with ACCEPT');
        return {
          decision: { decision: 'ACCEPT', issues: [] },
          promptTokens: record.prompt_tokens,
          completionTokens: record.completion_tokens
        };
      }

      return {
        decision,
        promptTokens: record.prompt_tokens,
        completionTokens: record.completion_tokens
      };
    } catch (error) {
      console.warn('Critic agent failed, failing open with ACCEPT:', error);
      return {
        decision: { decision: 'ACCEPT', issues: [] },
        promptTokens: 0,
        completionTokens: 0
      };
    }
  }

  private buildPrompt(
    step: Step,
    fileContent: string,
    taskSpec: TaskSpec
  ): KimiRequestMessage[] {
    const systemMessage = 'You are a code review agent. Output valid JSON only. No markdown fences. No explanation.';
    
    const userMessage = `Review this file:
Path: ${step.file_path}
Content:
${fileContent}

Expected:
${step.description}

Task Spec:
${JSON.stringify(taskSpec, null, 2)}

Coding Profile:
${CODING_PROFILE}

Output JSON:
{
  "decision": "ACCEPT" | "REJECT",
  "issues": [
    {
      "severity": "BLOCKER" | "MAJOR" | "MINOR",
      "line": <number or null>,
      "message": "Description"
    }
  ]
}

Reject only for:
- Syntax errors
- Violates coding profile
- Missing required functionality
- Incorrect architecture pattern
- Android API misuse

Accept if functionally correct even if style is imperfect.`;

    return [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ];
  }
}
