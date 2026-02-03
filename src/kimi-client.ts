import { KimiResponse, KimiRequestMessage, ApiCallRecord } from './types.js';

const KIMI_API_ENDPOINT = 'https://api.moonshot.cn/v1/chat/completions';
const MODEL = 'kimi-k2.5';

export class KimiClient {
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;

  constructor() {
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) {
      throw new Error('KIMI_API_KEY environment variable not set');
    }
    this.apiKey = apiKey;
    this.timeout = parseInt(process.env.SWARM_API_TIMEOUT || '30') * 1000;
    this.maxRetries = parseInt(process.env.SWARM_MAX_RETRIES || '3');
  }

  async chat(messages: KimiRequestMessage[], taskId: string, agent: string): Promise<{ content: string; record: ApiCallRecord }> {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      attempt++;
      try {
        const result = await this.makeRequest(messages);
        const record: ApiCallRecord = {
          task_id: taskId,
          agent,
          prompt_tokens: result.usage.prompt_tokens,
          completion_tokens: result.usage.completion_tokens,
          timestamp: Date.now()
        };
        return { content: result.choices[0].message.content, record };
      } catch (error) {
        lastError = error as Error;
        const errorType = this.classifyError(error);

        if (errorType === 'permanent') {
          throw error;
        }

        if (errorType === 'rate_limit') {
          const backoff = Math.pow(2, attempt - 1) * 1000;
          await this.sleep(backoff);
          continue;
        }

        if (errorType === 'server_error' && attempt < this.maxRetries) {
          await this.sleep(5000);
          continue;
        }

        if (errorType === 'timeout' && attempt < this.maxRetries) {
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private async makeRequest(messages: KimiRequestMessage[]): Promise<KimiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(KIMI_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        throw new Error(`API error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      return data as KimiResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('API request timeout');
      }
      throw error;
    }
  }

  private classifyError(error: any): 'transient' | 'permanent' | 'rate_limit' | 'server_error' | 'timeout' {
    const message = error?.message || '';

    if (message.includes('timeout')) return 'timeout';
    if (message.includes('429')) return 'rate_limit';
    if (message.match(/API error 5\d\d/)) return 'server_error';
    if (message.match(/API error 4\d\d/)) return 'permanent';

    return 'transient';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
