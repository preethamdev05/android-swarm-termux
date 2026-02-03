import { KimiClient } from '../kimi-client.js';
import { TaskSpec, Step, KimiRequestMessage } from '../types.js';
import { validatePlan } from '../schemas.js';
import { CODING_PROFILE } from '../coding-profile.js';

export class PlannerAgent {
  private kimiClient: KimiClient;

  constructor(kimiClient: KimiClient) {
    this.kimiClient = kimiClient;
  }

  async generatePlan(taskId: string, taskSpec: TaskSpec): Promise<{ plan: Step[]; promptTokens: number; completionTokens: number }> {
    const messages = this.buildPrompt(taskSpec);
    
    const { content, record } = await this.kimiClient.chat(messages, taskId, 'planner');
    
    let plan: Step[];
    try {
      plan = JSON.parse(content);
    } catch (error) {
      throw new Error(`Planner output is not valid JSON: ${error}`);
    }

    if (!validatePlan(plan)) {
      throw new Error('Planner output failed schema validation');
    }

    this.validatePlanConstraints(plan, taskSpec);

    return {
      plan,
      promptTokens: record.prompt_tokens,
      completionTokens: record.completion_tokens
    };
  }

  private buildPrompt(taskSpec: TaskSpec): KimiRequestMessage[] {
    const systemMessage = 'You are a planning agent. Output valid JSON only. No markdown fences. No explanation.';
    
    const userMessage = `Task: ${JSON.stringify(taskSpec, null, 2)}

Output a plan as JSON array with this schema:
[
  {
    "step_number": 1,
    "phase": "foundation|feature|integration|finalization",
    "file_path": "relative/path/File.kt",
    "file_type": "kotlin|xml|gradle|manifest",
    "dependencies": [2, 5],
    "description": "Brief description"
  }
]

Constraints:
- 1–25 steps total
- Cover all features: ${taskSpec.features.join(', ')}
- Use architecture: ${taskSpec.architecture}
- UI system: ${taskSpec.ui_system}
- No invented features
- Dependencies refer to step_number values
- File paths must be relative, no leading slash, no ..
- Must include AndroidManifest.xml, build.gradle files, and all necessary project structure

Coding Profile:
${CODING_PROFILE}`;

    return [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ];
  }

  private validatePlanConstraints(plan: Step[], taskSpec: TaskSpec): void {
    const descriptions = plan.map(s => s.description.toLowerCase()).join(' ');
    
    for (const feature of taskSpec.features) {
      if (!descriptions.includes(feature.toLowerCase())) {
        throw new Error(`Plan does not cover feature: ${feature}`);
      }
    }

    const hasManifest = plan.some(s => s.file_path.endsWith('AndroidManifest.xml'));
    if (!hasManifest) {
      throw new Error('Plan missing AndroidManifest.xml');
    }

    const hasGradle = plan.some(s => s.file_type === 'gradle');
    if (!hasGradle) {
      throw new Error('Plan missing Gradle build files');
    }
  }
}
