import { KimiClient } from '../kimi-client.js';
import { TaskSpec, VerifierOutput, KimiRequestMessage } from '../types.js';
import { validateVerifierOutput } from '../schemas.js';

export class VerifierAgent {
  private kimiClient: KimiClient;

  constructor(kimiClient: KimiClient) {
    this.kimiClient = kimiClient;
  }

  async verifyProject(
    taskId: string,
    files: string[],
    taskSpec: TaskSpec
  ): Promise<{ report: VerifierOutput; promptTokens: number; completionTokens: number }> {
    const messages = this.buildPrompt(files, taskSpec);
    
    try {
      const { content, record } = await this.kimiClient.chat(messages, taskId, 'verifier');
      
      let report: VerifierOutput;
      try {
        report = JSON.parse(content);
      } catch (error) {
        console.warn('Verifier output is not valid JSON, using default report');
        return {
          report: { warnings: ['Verifier output parse error'], missing_items: [], quality_score: 0.5 },
          promptTokens: record.prompt_tokens,
          completionTokens: record.completion_tokens
        };
      }

      if (!validateVerifierOutput(report)) {
        console.warn('Verifier output failed schema validation, using default report');
        return {
          report: { warnings: ['Verifier output validation error'], missing_items: [], quality_score: 0.5 },
          promptTokens: record.prompt_tokens,
          completionTokens: record.completion_tokens
        };
      }

      return {
        report,
        promptTokens: record.prompt_tokens,
        completionTokens: record.completion_tokens
      };
    } catch (error) {
      console.warn('Verifier agent failed:', error);
      return {
        report: { warnings: ['Verifier execution error'], missing_items: [], quality_score: 0.5 },
        promptTokens: 0,
        completionTokens: 0
      };
    }
  }

  private buildPrompt(
    files: string[],
    taskSpec: TaskSpec
  ): KimiRequestMessage[] {
    const systemMessage = 'You are a verification agent. Output valid JSON only. No markdown fences. No explanation.';
    
    const userMessage = `Verify complete project:
Files:
${files.join('\n')}

Task Spec:
${JSON.stringify(taskSpec, null, 2)}

Output JSON:
{
  "warnings": ["warning1", "warning2"],
  "missing_items": ["item1", "item2"],
  "quality_score": 0.0-1.0
}

Check:
- All features implemented: ${taskSpec.features.join(', ')}
- AndroidManifest.xml present and valid
- build.gradle files present
- No missing dependencies
- Architecture consistency (${taskSpec.architecture})
- UI system consistency (${taskSpec.ui_system})

Provide quality_score between 0.0 and 1.0 based on completeness and consistency.`;

    return [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ];
  }
}
