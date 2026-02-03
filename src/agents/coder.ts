import { KimiClient } from '../kimi-client.js';
import { TaskSpec, Step, Issue, KimiRequestMessage } from '../types.js';
import { CODING_PROFILE } from '../coding-profile.js';

const MAX_OUTPUT_TOKENS = 8000;
const MAX_FILE_SIZE = 50 * 1024;

export class CoderAgent {
  private kimiClient: KimiClient;

  constructor(kimiClient: KimiClient) {
    this.kimiClient = kimiClient;
  }

  async generateFile(
    taskId: string,
    step: Step,
    taskSpec: TaskSpec,
    completedFiles: string[],
    priorRejection?: Issue[]
  ): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
    const messages = this.buildPrompt(step, taskSpec, completedFiles, priorRejection);
    
    const { content, record } = await this.kimiClient.chat(messages, taskId, 'coder');
    
    if (content.length > MAX_FILE_SIZE) {
      console.warn(`Coder output for ${step.file_path} exceeds ${MAX_FILE_SIZE} bytes, truncating`);
      const truncated = content.substring(0, MAX_FILE_SIZE);
      return {
        content: truncated,
        promptTokens: record.prompt_tokens,
        completionTokens: record.completion_tokens
      };
    }

    return {
      content,
      promptTokens: record.prompt_tokens,
      completionTokens: record.completion_tokens
    };
  }

  private buildPrompt(
    step: Step,
    taskSpec: TaskSpec,
    completedFiles: string[],
    priorRejection?: Issue[]
  ): KimiRequestMessage[] {
    const systemMessage = 'You are a code generation agent. Output only the complete file content. No markdown fences. No explanation. No comments outside code.';
    
    let userMessage = `Generate file: ${step.file_path}
Type: ${step.file_type}
Description: ${step.description}

Task Spec:
${JSON.stringify(taskSpec, null, 2)}

Architecture: ${taskSpec.architecture}
UI System: ${taskSpec.ui_system}
Min SDK: ${taskSpec.min_sdk}
Target SDK: ${taskSpec.target_sdk}
Kotlin Version: ${taskSpec.kotlin_version}
Gradle Version: ${taskSpec.gradle_version}

Dependencies (already completed):
${completedFiles.length > 0 ? completedFiles.join('\n') : 'None'}
`;

    if (priorRejection && priorRejection.length > 0) {
      userMessage += `\nPrior Rejection:\n${JSON.stringify(priorRejection, null, 2)}\n\nYou must address all BLOCKER issues. Fix the problems identified in the prior rejection.\n`;
    }

    userMessage += `\nConstraints:
- Complete, buildable file only
- Follow coding profile (see below)
- No placeholders or TODOs
- Max ${MAX_OUTPUT_TOKENS} tokens
- Output raw file content, no markdown fences

Coding Profile:
${CODING_PROFILE}`;

    return [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ];
  }
}
