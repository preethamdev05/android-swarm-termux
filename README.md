# Android Swarm - Termux Edition

**Production-grade Android app generation system for Termux/Ubuntu using Kimi K2.5 API and multi-agent orchestration.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

## Overview

Android Swarm generates complete, buildable Android projects from high-level specifications using a multi-agent AI system. Designed specifically for Termux/Ubuntu constraints with production-quality safety controls.

### Key Features

✅ **Complete Project Generation**: Full Android app structure with Kotlin, XML, and Gradle files  
✅ **Multiple Architectures**: MVVM, MVP, and MVI patterns  
✅ **UI System Support**: Jetpack Compose and traditional Views  
✅ **Multi-Agent Quality**: Planner, Coder, Critic, and Verifier agents  
✅ **Production Safety**: Hard limits on API calls, tokens, and execution time  
✅ **Termux Optimized**: No systemd, Docker, or privileged operations  
✅ **Full Audit Trail**: SQLite database with complete execution history  

### What It Does

1. **Takes**: JSON specification with app name, features, architecture, UI system
2. **Generates**: Complete Android project with proper structure
3. **Outputs**: Ready-to-build Gradle project at `~/.openclaw/workspace/android-swarm/<task_id>/`

### What It Doesn't Do

❌ Build APK (you run `./gradlew assembleDebug` manually)  
❌ Generate tests  
❌ Provide IDE integration  
❌ Support incremental updates  
❌ Execute generated code  

See [Architecture Documentation](ARCHITECTURE.md) for complete non-goals list.

## Quick Start

### Prerequisites

- **Platform**: Android device with Termux
- **Node.js**: Version 22 or higher
- **SQLite**: Version 3.x
- **RAM**: 2-4GB available
- **Storage**: 100MB+ free space
- **API Key**: Kimi K2.5 API key

### Installation

```bash
# Clone repository
git clone https://github.com/preethamdev05/android-swarm-termux.git
cd android-swarm-termux

# Run installation script
chmod +x install.sh
./install.sh

# Set API key
export KIMI_API_KEY="sk-your-api-key-here"
```

### First Task

```bash
node dist/cli.js agent --message 'build app: {"app_name":"TodoApp","features":["add_task","list_tasks","delete_task"],"architecture":"MVVM","ui_system":"Compose","min_sdk":24,"target_sdk":34,"gradle_version":"8.2.0","kotlin_version":"1.9.20"}'
```

**Expected Duration**: 10-20 minutes  
**Output**: Complete Android project at `~/.openclaw/workspace/android-swarm/<task_id>/`

### Build Generated Project

```bash
cd ~/.openclaw/workspace/android-swarm/<task_id>/
chmod +x gradlew
./gradlew assembleDebug
```

## Task Specification

### Required Fields

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `app_name` | string | `"TodoApp"` | Alphanumeric + underscore only |
| `features` | string[] | `["login", "list"]` | 1-10 feature names |
| `architecture` | enum | `"MVVM"` | MVVM, MVP, or MVI |
| `ui_system` | enum | `"Compose"` | Compose or Views |
| `min_sdk` | number | `24` | 21-34 |
| `target_sdk` | number | `34` | >= min_sdk, <= 34 |
| `gradle_version` | string | `"8.2.0"` | Semantic version |
| `kotlin_version` | string | `"1.9.20"` | Semantic version |

### Example Specifications

See [examples/](examples/) directory:
- [todo-app.json](examples/todo-app.json) - Simple MVVM + Compose app
- [weather-app.json](examples/weather-app.json) - MVP + Views app
- [shopping-app.json](examples/shopping-app.json) - MVI + Compose app
- [note-app.json](examples/note-app.json) - MVVM + Compose with search

## Architecture

### Agent System

```
Planner Agent
    ↓ (Generates 1-25 steps)
Coder Agent → Critic Agent (per step)
    ↓ (ACCEPT: write file, REJECT: retry up to 3x)
Verifier Agent
    ↓ (Advisory quality check)
Complete Project
```

**Planner**: Decomposes task into phased steps  
**Coder**: Generates complete Kotlin/XML/Gradle files  
**Critic**: Reviews and accepts/rejects code (can block)  
**Verifier**: Final completeness check (advisory only)  

### Execution Flow

1. **Planning Phase**: Generate project plan (1-25 steps)
2. **Execution Phase**: For each step:
   - Coder generates file
   - Critic reviews file
   - If ACCEPT: Write to workspace
   - If REJECT: Retry (max 3 attempts)
3. **Verification Phase**: Quality check and completeness report
4. **Completion**: Task state updated, workspace ready

### Safety Controls

| Control | Limit | Enforcement |
|---------|-------|-------------|
| API calls | 80 per task | Abort if exceeded |
| Tokens | 200,000 per task | Abort if exceeded |
| Wall-clock | 90 minutes | Abort if exceeded |
| Plan steps | 25 maximum | Planner validation |
| Retries | 3 per step | Step-level limit |
| File size | 50KB | Truncate with warning |

**Circuit Breakers**:  
- 3 consecutive step failures → abort  
- 5 API errors in 60s → abort  

## Hard Limits and Constraints

### Resource Limits

- **Memory**: 500MB sustained allocation per process
- **CPU**: ARM64/ARMv7, no GPU, no SIMD
- **Network**: 30s timeout per API call
- **Storage**: Atomic writes, no file locking

### Termux Constraints

- **No systemd**: PID file-based process management
- **No Docker**: Native process execution only
- **No parallel execution**: Sequential tasks only
- **Single-user**: No multi-user isolation

### Operational Limits

- **One task at a time**: Enforced by PID file
- **No code execution**: Generated code is output only
- **No build verification**: System doesn't run Gradle
- **No test generation**: Explicitly excluded

See [REQUIREMENTS.md](REQUIREMENTS.md) for complete system requirements.

## Environment Variables

### Required

```bash
export KIMI_API_KEY="sk-..."  # Kimi K2.5 API key
```

### Optional

```bash
export SWARM_DEBUG=1                              # Enable debug logging
export SWARM_API_TIMEOUT=30                       # API timeout (seconds)
export SWARM_MAX_RETRIES=3                        # Max retries per step
export SWARM_WORKSPACE_ROOT=~/.openclaw/workspace # Custom workspace
```

## File Structure

### Repository Structure

```
android-swarm-termux/
├── src/
│   ├── agents/           # Planner, Coder, Critic, Verifier
│   ├── orchestrator.ts   # Task lifecycle coordination
│   ├── state-manager.ts  # SQLite + filesystem I/O
│   ├── kimi-client.ts    # API client with retry logic
│   ├── cli.ts            # Command-line interface
│   ├── types.ts          # TypeScript type definitions
│   ├── schemas.ts        # Validation functions
│   ├── coding-profile.ts # Kotlin/Android standards
│   └── logger.ts         # Multi-level logging
├── examples/          # Example task specifications
├── install.sh         # Installation script
├── setup-env.sh       # Environment setup script
├── package.json
├── tsconfig.json
└── README.md
```

### Output Structure

```
~/.openclaw/
├── workspace/android-swarm/<task_id>/
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/example/<app_name>/
│   │   │   ├── res/
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle.kts
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── gradle/
├── swarm.db            # SQLite database
└── logs/               # Daily log files
```

## Usage Examples

### Simple Todo App

```bash
node dist/cli.js agent --message 'build app: {"app_name":"TodoApp","features":["add_task","list_tasks","delete_task"],"architecture":"MVVM","ui_system":"Compose","min_sdk":24,"target_sdk":34,"gradle_version":"8.2.0","kotlin_version":"1.9.20"}'
```

### Weather App with MVP

```bash
node dist/cli.js agent --message 'build app: {"app_name":"WeatherApp","features":["search_location","current_weather","forecast","favorites"],"architecture":"MVP","ui_system":"Views","min_sdk":21,"target_sdk":34,"gradle_version":"8.2.0","kotlin_version":"1.9.20"}'
```

### E-commerce App with MVI

```bash
node dist/cli.js agent --message 'build app: {"app_name":"ShopApp","features":["product_list","product_detail","cart","checkout","user_profile"],"architecture":"MVI","ui_system":"Compose","min_sdk":24,"target_sdk":34,"gradle_version":"8.2.0","kotlin_version":"1.9.20"}'
```

### With Debug Logging

```bash
SWARM_DEBUG=1 node dist/cli.js agent --message '...'
```

## Monitoring and Debugging

### View Real-Time Logs

```bash
tail -f ~/.openclaw/logs/swarm-$(date +%Y-%m-%d).log
```

### Query Task Status

```bash
sqlite3 ~/.openclaw/swarm.db "SELECT task_id, state, api_call_count, total_tokens FROM tasks ORDER BY start_time DESC LIMIT 5;"
```

### Check Step History

```bash
sqlite3 ~/.openclaw/swarm.db "SELECT step_number, file_path, attempt, critic_decision FROM steps WHERE task_id = '<task_id>' ORDER BY step_number;"
```

### View API Usage

```bash
sqlite3 ~/.openclaw/swarm.db "SELECT agent, SUM(prompt_tokens + completion_tokens) as tokens FROM api_calls WHERE task_id = '<task_id>' GROUP BY agent;"
```

## Common Issues

### API call limit exceeded

**Cause**: Task too complex (>80 API calls)  
**Solution**: Reduce features or simplify architecture

### Token limit exceeded

**Cause**: Large files or complex generation (>200K tokens)  
**Solution**: Reduce features or lower SDK targets

### Wall-clock timeout

**Cause**: Execution exceeded 90 minutes  
**Solution**: Simplify task or check network speed

### Step exceeded retry limit

**Cause**: Critic rejected code 3 times  
**Solution**: Check logs for rejection reasons, simplify features

### Out of memory

**Cause**: Insufficient RAM  
**Solution**: Close other apps, increase Node.js heap size

```bash
node --max-old-space-size=768 dist/cli.js agent --message '...'
```

See [FAQ.md](FAQ.md) for complete troubleshooting guide.

## Documentation

- **[USAGE.md](USAGE.md)**: Detailed usage guide with examples
- **[ARCHITECTURE.md](ARCHITECTURE.md)**: System design and component details
- **[REQUIREMENTS.md](REQUIREMENTS.md)**: System requirements and constraints
- **[TESTING.md](TESTING.md)**: Testing procedures and test cases
- **[FAQ.md](FAQ.md)**: Frequently asked questions
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Contribution guidelines

## Performance Expectations

### Typical Task

- **Duration**: 10-30 minutes (simple), 30-90 minutes (complex)
- **API Calls**: 20-50 calls
- **Tokens**: 50K-150K tokens
- **Steps**: 8-20 steps
- **Output Size**: 50KB-500KB

### Resource Usage

- **Memory**: 200-400MB during execution
- **Disk**: ~1-2MB per task
- **Network**: Depends on API response times

## Cost Estimation

Based on Kimi API pricing (check current rates):

- **Simple app** (3 features): ~$0.10-0.30
- **Medium app** (5 features): ~$0.30-0.80
- **Complex app** (10 features): ~$0.80-2.00

Actual costs vary based on:
- Feature complexity
- Architecture choice
- API response quality (affects retries)
- Token usage per call

## Best Practices

### Task Specification

1. **Start simple**: Begin with 1-3 features
2. **Clear names**: Use descriptive feature names (e.g., "user_login" not "login")
3. **Match architecture**: MVVM for data-driven, MVP for UI-heavy, MVI for complex state
4. **SDK selection**: Use min_sdk=24 for Compose, 21 for Views

### Resource Management

1. **Monitor limits**: Check logs for API and token usage
2. **Sequential tasks**: Wait for task completion before starting next
3. **Clean workspace**: Remove old failed task directories
4. **Stable network**: Use WiFi, avoid mobile data

### Error Recovery

1. **Read logs first**: Always check logs before retrying
2. **Incremental approach**: If task fails, retry with fewer features
3. **Network stability**: Ensure reliable connection before long tasks

## Troubleshooting

### Task fails immediately

Check:
1. API key set: `echo $KIMI_API_KEY | wc -c`
2. Node.js version: `node -v` (should be >= 22)
3. Network: `curl -I https://api.moonshot.cn`

### Task hangs during execution

Check:
1. Debug logs: `SWARM_DEBUG=1 ...`
2. Network speed: API calls may be slow
3. System resources: `top` or `htop`

### Generated code doesn't build

**Expected behavior.** System doesn't guarantee buildability. Common fixes:
- Update Gradle/Kotlin versions in build files
- Add missing imports
- Fix dependency versions
- Correct AndroidManifest permissions

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
git clone <your-fork>
cd android-swarm-termux
npm install
npm run build
```

### Running Tests

See [TESTING.md](TESTING.md) for manual test procedures.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for Termux/Ubuntu environments
- Powered by Kimi K2.5 API
- Inspired by multi-agent orchestration patterns

## Support

- **Documentation**: See docs/ directory
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

## Changelog

### v1.0.0 (2026-02-03)

- Initial release
- Multi-agent orchestration (Planner, Coder, Critic, Verifier)
- Support for MVVM, MVP, MVI architectures
- Jetpack Compose and Views UI systems
- Production safety controls (limits, circuit breakers)
- SQLite audit trail
- Comprehensive documentation

---

**Repository**: [https://github.com/preethamdev05/android-swarm-termux](https://github.com/preethamdev05/android-swarm-termux)  
**License**: MIT  
**Node.js**: >= 22.0.0  
**Platform**: Termux/Ubuntu on Android  
