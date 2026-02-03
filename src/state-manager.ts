import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { TaskSpec, Step, Issue, TaskState, ApiCallRecord } from './types.js';

const OPENCLAW_ROOT = path.join(homedir(), '.openclaw');
const DB_PATH = path.join(OPENCLAW_ROOT, 'swarm.db');
const WORKSPACE_ROOT = process.env.SWARM_WORKSPACE_ROOT || path.join(OPENCLAW_ROOT, 'workspace', 'android-swarm');
const LOG_DIR = path.join(OPENCLAW_ROOT, 'logs');
const PID_FILE = path.join(OPENCLAW_ROOT, 'swarm.pid');

export class StateManager {
  private db: Database.Database;

  constructor() {
    this.ensureDirectories();
    this.db = new Database(DB_PATH);
    this.initializeSchema();
  }

  private ensureDirectories(): void {
    [OPENCLAW_ROOT, WORKSPACE_ROOT, LOG_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        task_id TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        task_spec TEXT NOT NULL,
        plan TEXT,
        api_call_count INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        attempt INTEGER NOT NULL,
        coder_output TEXT,
        critic_decision TEXT,
        critic_issues TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(task_id)
      );

      CREATE TABLE IF NOT EXISTS api_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        agent TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL,
        completion_tokens INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(task_id)
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
      CREATE INDEX IF NOT EXISTS idx_steps_task ON steps(task_id);
      CREATE INDEX IF NOT EXISTS idx_api_calls_task ON api_calls(task_id);
    `);
  }

  createTask(taskId: string, taskSpec: TaskSpec): void {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (task_id, state, task_spec, start_time)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(taskId, 'PLANNING', JSON.stringify(taskSpec), Date.now());
  }

  updateTaskState(taskId: string, state: TaskState, errorMessage?: string): void {
    const stmt = this.db.prepare(`
      UPDATE tasks
      SET state = ?, end_time = ?, error_message = ?
      WHERE task_id = ?
    `);
    const endTime = (state === 'COMPLETED' || state === 'FAILED') ? Date.now() : null;
    stmt.run(state, endTime, errorMessage || null, taskId);
  }

  updateTaskPlan(taskId: string, plan: Step[]): void {
    const stmt = this.db.prepare(`
      UPDATE tasks
      SET plan = ?
      WHERE task_id = ?
    `);
    stmt.run(JSON.stringify(plan), taskId);
  }

  updateTaskCounters(taskId: string, apiCallCount: number, totalTokens: number): void {
    const stmt = this.db.prepare(`
      UPDATE tasks
      SET api_call_count = ?, total_tokens = ?
      WHERE task_id = ?
    `);
    stmt.run(apiCallCount, totalTokens, taskId);
  }

  recordStep(taskId: string, stepNumber: number, filePath: string, attempt: number, coderOutput: string | null, criticDecision: string | null, criticIssues: Issue[] | null): void {
    const stmt = this.db.prepare(`
      INSERT INTO steps (task_id, step_number, file_path, attempt, coder_output, critic_decision, critic_issues, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      taskId,
      stepNumber,
      filePath,
      attempt,
      coderOutput,
      criticDecision,
      criticIssues ? JSON.stringify(criticIssues) : null,
      Date.now()
    );
  }

  recordApiCall(record: ApiCallRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO api_calls (task_id, agent, prompt_tokens, completion_tokens, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(record.task_id, record.agent, record.prompt_tokens, record.completion_tokens, record.timestamp);
  }

  getWorkspacePath(taskId: string): string {
    return path.join(WORKSPACE_ROOT, taskId);
  }

  ensureWorkspace(taskId: string): void {
    const workspacePath = this.getWorkspacePath(taskId);
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }
  }

  writeFile(taskId: string, filePath: string, content: string): void {
    const fullPath = path.join(this.getWorkspacePath(taskId), filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tmpPath = fullPath + '.tmp';
    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, fullPath);
  }

  readFile(taskId: string, filePath: string): string {
    const fullPath = path.join(this.getWorkspacePath(taskId), filePath);
    return fs.readFileSync(fullPath, 'utf8');
  }

  listFiles(taskId: string): string[] {
    const workspacePath = this.getWorkspacePath(taskId);
    const files: string[] = [];

    const walk = (dir: string, prefix: string = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const relativePath = prefix ? path.join(prefix, entry.name) : entry.name;
        if (entry.isDirectory()) {
          walk(path.join(dir, entry.name), relativePath);
        } else {
          files.push(relativePath);
        }
      }
    };

    if (fs.existsSync(workspacePath)) {
      walk(workspacePath);
    }

    return files;
  }

  checkDiskSpace(): boolean {
    // Simplified disk space check for Termux
    // In production, use statfs or similar
    return true;
  }

  checkPidFile(): boolean {
    if (fs.existsSync(PID_FILE)) {
      const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
      try {
        process.kill(parseInt(pid), 0);
        return true;
      } catch {
        fs.unlinkSync(PID_FILE);
        return false;
      }
    }
    return false;
  }

  writePidFile(): void {
    fs.writeFileSync(PID_FILE, process.pid.toString(), 'utf8');
  }

  removePidFile(): void {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  }

  close(): void {
    this.db.close();
  }
}
