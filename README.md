# Android Swarm - Termux Edition

Production-grade Android app generation system for Termux/Ubuntu using Kimi K2.5 API and multi-agent orchestration.

## System Requirements

- Android device running Termux
- Ubuntu proot environment
- Node.js ≥22
- SQLite3
- 2-4GB RAM available
- 100MB+ free disk space

## Installation

```bash
npm install
npm run build
```

## Configuration

Set required environment variable:

```bash
export KIMI_API_KEY="sk-..."
```

Optional environment variables:

```bash
export SWARM_DEBUG=1
export SWARM_API_TIMEOUT=30
export SWARM_MAX_RETRIES=3
export SWARM_WORKSPACE_ROOT=~/.openclaw/workspace/android-swarm
```

## Usage

```bash
node dist/cli.js agent --message 'build app: {"app_name":"MyApp","features":["login","list"],"architecture":"MVVM","ui_system":"Compose","min_sdk":24,"target_sdk":34,"gradle_version":"8.2.0","kotlin_version":"1.9.20"}'
```

## Architecture

- **Planner Agent**: Decomposes task into 1-25 steps
- **Coder Agent**: Generates Kotlin/XML/Gradle files
- **Critic Agent**: Reviews and accepts/rejects code
- **Verifier Agent**: Performs final quality check

## Hard Limits

- 80 API calls per task
- 200,000 tokens per task
- 90 minutes wall-clock timeout
- 25 steps maximum per plan
- 3 retries per step

## Output

Complete Android project at: `~/.openclaw/workspace/android-swarm/<task_id>/`

## License

MIT
