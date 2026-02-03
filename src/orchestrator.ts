import { v4 as uuidv4 } from 'uuid';
import { TaskSpec, OrchestratorState, Step, StepState } from './types.js';
import { StateManager } from './state-manager.js';
import { KimiClient } from './kimi-client.js';
import { PlannerAgent } from './agents/planner.js';
import { CoderAgent } from './agents/coder.js';
import { CriticAgent } from './agents/critic.js';
import { VerifierAgent } from './agents/verifier.js';
import { logger } from './logger.js';

const API_CALL_LIMIT = 80;
const TOKEN_LIMIT = 200000;
const WALL_CLOCK_TIMEOUT = 90 * 60 * 1000;
const MAX_STEP_RETRIES = 3;

export class Orchestrator {
  private stateManager: StateManager;
  private kimiClient: KimiClient;
  private plannerAgent: PlannerAgent;
  private coderAgent: CoderAgent;
  private criticAgent: CriticAgent;
  private verifierAgent: VerifierAgent;
  private state: OrchestratorState | null = null;
  private aborted = false;

  constructor() {
    this.stateManager = new StateManager();
    this.kimiClient = new KimiClient();
    this.plannerAgent = new PlannerAgent(this.kimiClient);
    this.coderAgent = new CoderAgent(this.kimiClient);
    this.criticAgent = new CriticAgent(this.kimiClient);
    this.verifierAgent = new VerifierAgent(this.kimiClient);
  }

  async executeTask(taskSpec: TaskSpec): Promise<string> {
    const taskId = uuidv4();
    logger.info('Task started', { task_id: taskId, app_name: taskSpec.app_name });

    this.state = {
      task_id: taskId,
      state: 'PLANNING',
      task_spec: taskSpec,
      plan: null,
      current_step_index: 0,
      completed_files: [],
      api_call_count: 0,
      total_tokens: 0,
      start_time: Date.now(),
      last_activity_time: Date.now()
    };

    try {
      this.stateManager.createTask(taskId, taskSpec);
      this.stateManager.ensureWorkspace(taskId);

      await this.planningPhase();
      await this.executionPhase();
      await this.verificationPhase();

      this.stateManager.updateTaskState(taskId, 'COMPLETED');
      this.state.state = 'COMPLETED';

      const workspacePath = this.stateManager.getWorkspacePath(taskId);
      logger.info('Task completed', {
        task_id: taskId,
        api_calls: this.state.api_call_count,
        tokens: this.state.total_tokens,
        duration_ms: Date.now() - this.state.start_time,
        workspace: workspacePath
      });

      return workspacePath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Task failed', { task_id: taskId, error: errorMessage });
      this.stateManager.updateTaskState(taskId, 'FAILED', errorMessage);
      this.state.state = 'FAILED';
      throw error;
    }
  }

  private async planningPhase(): Promise<void> {
    if (!this.state) throw new Error('State not initialized');

    logger.info('Planning phase started', { task_id: this.state.task_id });
    this.checkLimits();

    const { plan, promptTokens, completionTokens } = await this.plannerAgent.generatePlan(
      this.state.task_id,
      this.state.task_spec
    );

    this.state.plan = plan;
    this.state.api_call_count++;
    this.state.total_tokens += promptTokens + completionTokens;

    this.stateManager.updateTaskPlan(this.state.task_id, plan);
    this.stateManager.updateTaskCounters(this.state.task_id, this.state.api_call_count, this.state.total_tokens);
    this.stateManager.updateTaskState(this.state.task_id, 'EXECUTING');
    this.state.state = 'EXECUTING';

    logger.info('Plan generated', { task_id: this.state.task_id, steps: plan.length });
  }

  private async executionPhase(): Promise<void> {
    if (!this.state || !this.state.plan) throw new Error('State or plan not initialized');

    logger.info('Execution phase started', { task_id: this.state.task_id });

    let consecutiveFailures = 0;

    for (let i = 0; i < this.state.plan.length; i++) {
      if (this.aborted) {
        throw new Error('Task aborted by user');
      }

      const step = this.state.plan[i];
      logger.info('Step started', { task_id: this.state.task_id, step: step.step_number, file: step.file_path });

      const stepState: StepState = {
        step,
        attempt: 0,
        coder_output: null,
        critic_decision: null,
        critic_issues: null
      };

      let stepAccepted = false;

      while (stepState.attempt < MAX_STEP_RETRIES && !stepAccepted) {
        stepState.attempt++;
        this.checkLimits();

        try {
          const coderResult = await this.coderAgent.generateFile(
            this.state.task_id,
            step,
            this.state.task_spec,
            this.state.completed_files,
            stepState.critic_issues || undefined
          );

          stepState.coder_output = coderResult.content;
          this.state.api_call_count++;
          this.state.total_tokens += coderResult.promptTokens + coderResult.completionTokens;
          this.stateManager.updateTaskCounters(this.state.task_id, this.state.api_call_count, this.state.total_tokens);

          const criticResult = await this.criticAgent.reviewFile(
            this.state.task_id,
            step,
            coderResult.content,
            this.state.task_spec
          );

          stepState.critic_decision = criticResult.decision.decision;
          stepState.critic_issues = criticResult.decision.issues;
          this.state.api_call_count++;
          this.state.total_tokens += criticResult.promptTokens + criticResult.completionTokens;
          this.stateManager.updateTaskCounters(this.state.task_id, this.state.api_call_count, this.state.total_tokens);

          this.stateManager.recordStep(
            this.state.task_id,
            step.step_number,
            step.file_path,
            stepState.attempt,
            stepState.coder_output,
            stepState.critic_decision,
            stepState.critic_issues
          );

          if (criticResult.decision.decision === 'ACCEPT') {
            this.stateManager.writeFile(this.state.task_id, step.file_path, coderResult.content);
            this.state.completed_files.push(step.file_path);
            stepAccepted = true;
            consecutiveFailures = 0;
            logger.info('Step accepted', { task_id: this.state.task_id, step: step.step_number, attempt: stepState.attempt });
          } else {
            logger.warn('Step rejected', {
              task_id: this.state.task_id,
              step: step.step_number,
              attempt: stepState.attempt,
              issues: criticResult.decision.issues
            });
          }
        } catch (error) {
          logger.error('Step execution error', {
            task_id: this.state.task_id,
            step: step.step_number,
            attempt: stepState.attempt,
            error: error instanceof Error ? error.message : 'Unknown'
          });

          if (error instanceof Error && this.isTransientError(error)) {
            continue;
          } else {
            throw error;
          }
        }
      }

      if (!stepAccepted) {
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          throw new Error('Circuit breaker: 3 consecutive step failures');
        }
        throw new Error(`Step ${step.step_number} exceeded retry limit`);
      }

      this.state.current_step_index = i + 1;
    }

    logger.info('Execution phase completed', { task_id: this.state.task_id });
  }

  private async verificationPhase(): Promise<void> {
    if (!this.state) throw new Error('State not initialized');

    logger.info('Verification phase started', { task_id: this.state.task_id });
    this.stateManager.updateTaskState(this.state.task_id, 'VERIFYING');
    this.state.state = 'VERIFYING';

    this.checkLimits();

    const files = this.stateManager.listFiles(this.state.task_id);
    const { report, promptTokens, completionTokens } = await this.verifierAgent.verifyProject(
      this.state.task_id,
      files,
      this.state.task_spec
    );

    this.state.api_call_count++;
    this.state.total_tokens += promptTokens + completionTokens;
    this.stateManager.updateTaskCounters(this.state.task_id, this.state.api_call_count, this.state.total_tokens);

    logger.info('Verification report', {
      task_id: this.state.task_id,
      quality_score: report.quality_score,
      warnings: report.warnings.length,
      missing_items: report.missing_items.length
    });

    if (report.quality_score < 0.5) {
      logger.warn('Low quality score', { task_id: this.state.task_id, score: report.quality_score });
    }

    if (report.warnings.length > 0) {
      logger.warn('Verifier warnings', { task_id: this.state.task_id, warnings: report.warnings });
    }
  }

  private checkLimits(): void {
    if (!this.state) throw new Error('State not initialized');

    if (this.state.api_call_count >= API_CALL_LIMIT) {
      throw new Error('API call limit exceeded');
    }

    if (this.state.total_tokens >= TOKEN_LIMIT) {
      throw new Error('Token limit exceeded');
    }

    const elapsed = Date.now() - this.state.start_time;
    if (elapsed >= WALL_CLOCK_TIMEOUT) {
      throw new Error('Wall-clock timeout');
    }
  }

  private isTransientError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('timeout') || message.includes('429') || message.includes('5');
  }

  abort(): void {
    this.aborted = true;
    logger.warn('Task abort requested');
  }

  close(): void {
    this.stateManager.close();
  }
}
