import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_DIR = path.join(homedir(), '.openclaw', 'logs');
const DEBUG_ENABLED = process.env.SWARM_DEBUG === '1';

class Logger {
  private logFile: string;

  constructor() {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    this.logFile = path.join(LOG_DIR, `swarm-${date}.log`);
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [${level}] ${message}`;
    if (data !== undefined) {
      formatted += ` ${JSON.stringify(data)}`;
    }
    return formatted;
  }

  private write(level: LogLevel, message: string, data?: any): void {
    const formatted = this.formatMessage(level, message, data);
    
    // Console output
    if (level === 'ERROR') {
      console.error(formatted);
    } else if (level === 'WARN') {
      console.warn(formatted);
    } else if (level === 'INFO') {
      console.log(formatted);
    } else if (level === 'DEBUG' && DEBUG_ENABLED) {
      console.log(formatted);
    }

    // File output
    try {
      fs.appendFileSync(this.logFile, formatted + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  debug(message: string, data?: any): void {
    if (DEBUG_ENABLED) {
      this.write('DEBUG', message, data);
    }
  }

  info(message: string, data?: any): void {
    this.write('INFO', message, data);
  }

  warn(message: string, data?: any): void {
    this.write('WARN', message, data);
  }

  error(message: string, data?: any): void {
    this.write('ERROR', message, data);
  }
}

export const logger = new Logger();
