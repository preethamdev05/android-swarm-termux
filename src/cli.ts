#!/usr/bin/env node

import { Orchestrator } from './orchestrator.js';
import { validateTaskSpec } from './schemas.js';
import { logger } from './logger.js';

function parseArguments(): { message: string } | null {
  const args = process.argv.slice(2);
  
  if (args.length < 2 || args[0] !== 'agent' || args[1] !== '--message') {
    return null;
  }

  const messageIndex = args.indexOf('--message');
  if (messageIndex === -1 || messageIndex + 1 >= args.length) {
    return null;
  }

  return { message: args[messageIndex + 1] };
}

function extractTaskSpec(message: string): any {
  const match = message.match(/build app:\s*(\{.*\})/s);
  if (!match) {
    throw new Error('Invalid message format. Expected: build app: {"app_name":"...", ...}');
  }

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    throw new Error('Invalid JSON in task specification');
  }
}

function printUsage(): void {
  console.log(`
Usage: node cli.js agent --message 'build app: <task_spec_json>'

Example:
  node cli.js agent --message 'build app: {"app_name":"MyApp","features":["login","list"],"architecture":"MVVM","ui_system":"Compose","min_sdk":24,"target_sdk":34,"gradle_version":"8.2.0","kotlin_version":"1.9.20"}'

Task Spec Schema:
  app_name: string (alphanumeric + underscore)
  features: string[] (1-10 items)
  architecture: "MVVM" | "MVP" | "MVI"
  ui_system: "Views" | "Compose"
  min_sdk: number (21-34)
  target_sdk: number (>= min_sdk, <= 34)
  gradle_version: string (semantic version)
  kotlin_version: string (semantic version)

Environment Variables:
  KIMI_API_KEY: Required - API key for Kimi K2.5
  SWARM_DEBUG: Optional - Enable debug logging (1)
  SWARM_API_TIMEOUT: Optional - API timeout in seconds (default: 30)
  SWARM_MAX_RETRIES: Optional - Max retries per step (default: 3)
  SWARM_WORKSPACE_ROOT: Optional - Workspace directory
`);
}

async function main(): Promise<void> {
  const parsedArgs = parseArguments();
  
  if (!parsedArgs) {
    printUsage();
    process.exit(1);
  }

  if (!process.env.KIMI_API_KEY) {
    console.error('Error: KIMI_API_KEY environment variable not set');
    process.exit(1);
  }

  let taskSpec: any;
  try {
    taskSpec = extractTaskSpec(parsedArgs.message);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    printUsage();
    process.exit(1);
  }

  if (!validateTaskSpec(taskSpec)) {
    console.error('Error: Invalid task specification');
    console.error('Validation failed. Check task spec schema.');
    printUsage();
    process.exit(1);
  }

  const orchestrator = new Orchestrator();

  const handleSignal = (signal: string) => {
    logger.warn(`Received ${signal}, aborting task...`);
    orchestrator.abort();
    process.exit(1);
  };

  process.on('SIGINT', () => handleSignal('SIGINT'));
  process.on('SIGTERM', () => handleSignal('SIGTERM'));

  try {
    console.log('\n🚀 Android Swarm Task Started');
    console.log(`App Name: ${taskSpec.app_name}`);
    console.log(`Features: ${taskSpec.features.join(', ')}`);
    console.log(`Architecture: ${taskSpec.architecture}`);
    console.log(`UI System: ${taskSpec.ui_system}`);
    console.log('');

    const workspacePath = await orchestrator.executeTask(taskSpec);

    console.log('\n✅ Task Completed Successfully');
    console.log(`Output: ${workspacePath}`);
    console.log('\nYou can now build the project:');
    console.log(`  cd ${workspacePath}`);
    console.log(`  ./gradlew assembleDebug`);
    console.log('');

    orchestrator.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Task Failed');
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    orchestrator.close();
    process.exit(1);
  }
}

main();
