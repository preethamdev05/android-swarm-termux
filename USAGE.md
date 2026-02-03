# Usage Guide

## Quick Start

### 1. Installation

```bash
git clone <repository-url>
cd android-swarm-termux
chmod +x install.sh
./install.sh
```

### 2. Set API Key

```bash
export KIMI_API_KEY="sk-your-api-key-here"
```

Or use the setup script:

```bash
source setup-env.sh
```

### 3. Run Your First Task

```bash
node dist/cli.js agent --message 'build app: {"app_name":"TodoApp","features":["add_task","list_tasks","delete_task"],"architecture":"MVVM","ui_system":"Compose","min_sdk":24,"target_sdk":34,"gradle_version":"8.2.0","kotlin_version":"1.9.20"}'
```

## Task Specification Schema

### Required Fields

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `app_name` | string | Application name | Alphanumeric + underscore only |
| `features` | string[] | Feature list | 1-10 items, non-empty strings |
| `architecture` | enum | App architecture | "MVVM", "MVP", or "MVI" |
| `ui_system` | enum | UI framework | "Views" or "Compose" |
| `min_sdk` | number | Minimum SDK | 21-34 |
| `target_sdk` | number | Target SDK | >= min_sdk, <= 34 |
| `gradle_version` | string | Gradle version | Semantic version (e.g., "8.2.0") |
| `kotlin_version` | string | Kotlin version | Semantic version (e.g., "1.9.20") |

### Example Task Specs

#### Simple Todo App (Compose)

```json
{
  "app_name": "TodoApp",
  "features": ["add_task", "list_tasks", "delete_task"],
  "architecture": "MVVM",
  "ui_system": "Compose",
  "min_sdk": 24,
  "target_sdk": 34,
  "gradle_version": "8.2.0",
  "kotlin_version": "1.9.20"
}
```

#### Weather App (Views + MVP)

```json
{
  "app_name": "WeatherApp",
  "features": ["search_location", "current_weather", "forecast", "favorites"],
  "architecture": "MVP",
  "ui_system": "Views",
  "min_sdk": 21,
  "target_sdk": 34,
  "gradle_version": "8.2.0",
  "kotlin_version": "1.9.20"
}
```

#### E-commerce App (MVI + Compose)

```json
{
  "app_name": "ShopApp",
  "features": ["product_list", "product_detail", "cart", "checkout", "user_profile"],
  "architecture": "MVI",
  "ui_system": "Compose",
  "min_sdk": 24,
  "target_sdk": 34,
  "gradle_version": "8.2.0",
  "kotlin_version": "1.9.20"
}
```

## Command Line Options

### Basic Command

```bash
node dist/cli.js agent --message 'build app: <task_spec_json>'
```

### With Environment Variables

```bash
SWARM_DEBUG=1 SWARM_API_TIMEOUT=60 node dist/cli.js agent --message '...'
```

### With Memory Limit

```bash
node --max-old-space-size=512 dist/cli.js agent --message '...'
```

## Environment Variables

### Required

- **KIMI_API_KEY**: API key for Kimi K2.5 service

### Optional

- **SWARM_DEBUG**: Enable debug logging (set to "1")
- **SWARM_API_TIMEOUT**: API timeout in seconds (default: 30)
- **SWARM_MAX_RETRIES**: Max retries per step (default: 3)
- **SWARM_WORKSPACE_ROOT**: Custom workspace directory

### Example .bashrc Configuration

```bash
export KIMI_API_KEY="sk-..."
export SWARM_DEBUG=1
export SWARM_API_TIMEOUT=30
export SWARM_MAX_RETRIES=3
```

## Output Structure

### Workspace Directory

```
~/.openclaw/workspace/android-swarm/<task_id>/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/<app_name>/
│   │   │   │   ├── MainActivity.kt
│   │   │   │   ├── ui/
│   │   │   │   ├── viewmodel/
│   │   │   │   └── data/
│   │   │   ├── res/
│   │   │   │   ├── layout/
│   │   │   │   ├── values/
│   │   │   │   └── drawable/
│   │   │   └── AndroidManifest.xml
│   └── build.gradle.kts
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
└── gradle/
    └── wrapper/
        └── gradle-wrapper.properties
```

### Database

- **Location**: `~/.openclaw/swarm.db`
- **Tables**: tasks, steps, api_calls
- **Purpose**: Audit trail and state persistence

### Logs

- **Location**: `~/.openclaw/logs/swarm-<date>.log`
- **Retention**: 30 days for normal logs, 7 days for debug logs
- **Format**: `[timestamp] [level] message {data}`

## Building Generated Project

### 1. Navigate to Workspace

```bash
cd ~/.openclaw/workspace/android-swarm/<task_id>/
```

### 2. Make Gradle Wrapper Executable

```bash
chmod +x gradlew
```

### 3. Build Debug APK

```bash
./gradlew assembleDebug
```

### 4. Install on Device

```bash
./gradlew installDebug
```

Or manually:

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Hard Limits

### Per Task

| Limit | Value | Consequence |
|-------|-------|-------------|
| API calls | 80 | Task abort |
| Total tokens | 200,000 | Task abort |
| Wall-clock time | 90 minutes | Task abort |
| Plan steps | 25 | Planner validation failure |
| Retries per step | 3 | Step failure, task abort |
| File size | 50KB | Truncation with warning |

### Circuit Breakers

- **Consecutive failures**: 3 steps → task abort
- **API error rate**: 5 errors in 60s → task abort

## Error Handling

### Common Errors

**API call limit exceeded**
- Cause: Task complexity too high
- Solution: Reduce features or split into multiple tasks

**Token limit exceeded**
- Cause: Large files or complex task
- Solution: Simplify features or use smaller SDK targets

**Wall-clock timeout**
- Cause: Slow API responses or complex generation
- Solution: Retry task or increase timeout (not recommended)

**Step exceeded retry limit**
- Cause: Critic repeatedly rejecting code
- Solution: Check logs for rejection reasons, adjust task spec

**Planner validation failure**
- Cause: Invalid or incomplete plan
- Solution: Retry task, check feature names

### Transient vs Permanent Errors

**Transient (will retry)**
- API timeout
- HTTP 429 (rate limit)
- HTTP 500-599 (server errors)

**Permanent (will not retry)**
- HTTP 400-499 (except 429)
- JSON parse errors
- Schema validation failures
- Path traversal attempts

## Monitoring and Debugging

### Enable Debug Logging

```bash
export SWARM_DEBUG=1
node dist/cli.js agent --message '...'
```

### View Real-Time Logs

```bash
tail -f ~/.openclaw/logs/swarm-$(date +%Y-%m-%d).log
```

### Query Database

```bash
sqlite3 ~/.openclaw/swarm.db

# List all tasks
SELECT task_id, state, app_name FROM tasks;

# View task details
SELECT * FROM tasks WHERE task_id = '<task_id>';

# View step history
SELECT step_number, file_path, attempt, critic_decision 
FROM steps 
WHERE task_id = '<task_id>' 
ORDER BY step_number, attempt;

# API usage by agent
SELECT agent, SUM(prompt_tokens + completion_tokens) as total_tokens 
FROM api_calls 
WHERE task_id = '<task_id>' 
GROUP BY agent;
```

### Check Task Status

```bash
grep "task_id" ~/.openclaw/logs/swarm-*.log | grep "<task_id>"
```

## Manual Abort

### Via Signal (Ctrl+C)

```bash
# Press Ctrl+C during task execution
# Orchestrator will gracefully shutdown
```

### Via Emergency Stop File

```bash
touch ~/.openclaw/workspace/android-swarm/EMERGENCY_STOP
# Task will abort on next iteration
# Remove file after abort
rm ~/.openclaw/workspace/android-swarm/EMERGENCY_STOP
```

## Cleanup

### Failed Task Workspaces

```bash
# Manual cleanup
rm -rf ~/.openclaw/workspace/android-swarm/<task_id>
```

### Old Log Files

```bash
# Delete logs older than 30 days
find ~/.openclaw/logs/ -name "swarm-*.log" -mtime +30 -delete
```

### Database (Caution)

```bash
# WARNING: This deletes all audit history
rm ~/.openclaw/swarm.db
```

## Best Practices

### Task Specification

1. **Start simple**: Begin with 1-3 features, add more later
2. **Clear feature names**: Use descriptive, action-oriented names
3. **Match architecture**: Choose architecture that fits features
4. **SDK targets**: Use min_sdk=24 for Compose, 21 for Views
5. **Version consistency**: Use latest stable Gradle and Kotlin versions

### Resource Management

1. **Monitor limits**: Check logs for API call and token usage
2. **Sequential execution**: Run one task at a time
3. **Clean workspace**: Remove old failed tasks regularly
4. **Log retention**: Archive or delete old logs

### Error Recovery

1. **Read logs**: Always check logs before retrying
2. **Incremental retry**: If task fails, try with fewer features
3. **API key rotation**: If rate limited, wait or use different key
4. **Network issues**: Increase timeout for slow connections

### Performance

1. **Feature count**: 3-5 features optimal, 10 maximum
2. **Off-peak hours**: Run during low API traffic times
3. **Stable connection**: Ensure reliable internet before starting
4. **Device resources**: Close other apps to free RAM

## Troubleshooting

### Task hangs at planning

- Check API key validity
- Verify network connectivity
- Review debug logs for API errors

### Critic rejects all code

- Check coding profile compatibility
- Review rejection reasons in logs
- Simplify features or architecture

### Out of memory

- Close other Termux sessions
- Increase Node.js heap size
- Reduce feature count

### Build fails after generation

- System does not guarantee buildability
- Review generated files manually
- Fix Gradle or Kotlin syntax errors
- Ensure dependency versions are compatible

## Advanced Usage

### Custom Workspace Location

```bash
export SWARM_WORKSPACE_ROOT=/path/to/custom/workspace
```

### Batch Processing (Sequential)

```bash
for spec in spec1.json spec2.json spec3.json; do
  node dist/cli.js agent --message "build app: $(cat $spec)"
done
```

### API Usage Tracking

```bash
sqlite3 ~/.openclaw/swarm.db "SELECT SUM(prompt_tokens + completion_tokens) FROM api_calls WHERE date(timestamp/1000, 'unixepoch') = date('now');"
```

### Task Duration Analysis

```bash
sqlite3 ~/.openclaw/swarm.db "SELECT task_id, (end_time - start_time)/1000/60 as duration_minutes FROM tasks WHERE state = 'COMPLETED' ORDER BY duration_minutes DESC;"
```
