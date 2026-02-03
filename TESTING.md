# Testing Guide

## Manual Testing

### Prerequisites

1. System meets all requirements (see REQUIREMENTS.md)
2. Environment variables configured
3. System built successfully (`npm run build`)

### Test Cases

#### Test 1: Simple Todo App (Baseline)

**Objective:** Verify basic functionality with minimal features

**Task Spec:**
```json
{
  "app_name": "TodoTest",
  "features": ["add_task", "list_tasks"],
  "architecture": "MVVM",
  "ui_system": "Compose",
  "min_sdk": 24,
  "target_sdk": 34,
  "gradle_version": "8.2.0",
  "kotlin_version": "1.9.20"
}
```

**Expected:**
- Task completes in <20 minutes
- API calls: 10-30
- Tokens: 30K-80K
- All files generated
- Workspace contains valid Android project

**Verification:**
```bash
cd ~/.openclaw/workspace/android-swarm/<task_id>/
ls -R  # Check structure
grep -r "TODO" .  # No TODOs
grep -r "FIXME" .  # No FIXMEs
```

#### Test 2: Views UI System

**Objective:** Verify Views-based UI generation

**Task Spec:**
```json
{
  "app_name": "ViewsTest",
  "features": ["login", "home"],
  "architecture": "MVP",
  "ui_system": "Views",
  "min_sdk": 21,
  "target_sdk": 34,
  "gradle_version": "8.2.0",
  "kotlin_version": "1.9.20"
}
```

**Expected:**
- XML layout files generated
- No @Composable annotations
- MVP pattern correctly applied

**Verification:**
```bash
find . -name "*.xml" -path "*/layout/*" | wc -l  # Should be > 0
grep -r "@Composable" .  # Should be empty
```

#### Test 3: Maximum Features

**Objective:** Stress test with 10 features

**Task Spec:**
```json
{
  "app_name": "MaxFeaturesTest",
  "features": [
    "login", "signup", "profile", "home", "search",
    "favorites", "settings", "notifications", "help", "about"
  ],
  "architecture": "MVI",
  "ui_system": "Compose",
  "min_sdk": 24,
  "target_sdk": 34,
  "gradle_version": "8.2.0",
  "kotlin_version": "1.9.20"
}
```

**Expected:**
- Task completes (may approach 90min timeout)
- API calls: 50-80
- Tokens: 120K-200K
- 20-25 steps in plan

**Verification:**
```bash
sqlite3 ~/.openclaw/swarm.db "SELECT api_call_count, total_tokens FROM tasks WHERE task_id = '<task_id>';"
```

#### Test 4: Error Recovery (Retry)

**Objective:** Verify retry mechanism

**Method:**
1. Start task
2. Temporarily disable network during Coder phase
3. Re-enable network
4. Observe retry behavior in logs

**Expected:**
- Transient error logged
- Automatic retry
- Task eventually succeeds

**Verification:**
```bash
grep "retry\|timeout" ~/.openclaw/logs/swarm-*.log
```

#### Test 5: Manual Abort

**Objective:** Verify graceful shutdown

**Method:**
1. Start task
2. Press Ctrl+C after 1 minute

**Expected:**
- "Manual abort" logged
- Task state = FAILED
- Partial workspace preserved
- No zombie processes

**Verification:**
```bash
ps aux | grep "node.*cli.js"  # Should be empty
sqlite3 ~/.openclaw/swarm.db "SELECT state, error_message FROM tasks WHERE task_id = '<task_id>';"
```

#### Test 6: Limit Enforcement

**Objective:** Verify hard limits

**Method:**
1. Set artificially low limits:
   ```bash
   # Edit orchestrator.ts temporarily
   const API_CALL_LIMIT = 5;
   const TOKEN_LIMIT = 10000;
   ```
2. Run task

**Expected:**
- Task aborts when limit reached
- Error message: "API call limit exceeded" or "Token limit exceeded"
- State = FAILED

**Verification:**
```bash
sqlite3 ~/.openclaw/swarm.db "SELECT error_message FROM tasks WHERE task_id = '<task_id>';"
```

#### Test 7: Invalid Input

**Objective:** Verify input validation

**Task Specs (should all fail):**
```bash
# Missing required field
'{"app_name":"Test","features":[],"architecture":"MVVM"}'

# Invalid architecture
'{"app_name":"Test","features":["f1"],"architecture":"INVALID","ui_system":"Compose","min_sdk":24,"target_sdk":34,"gradle_version":"8.2.0","kotlin_version":"1.9.20"}'

# SDK out of range
'{"app_name":"Test","features":["f1"],"architecture":"MVVM","ui_system":"Compose","min_sdk":35,"target_sdk":40,"gradle_version":"8.2.0","kotlin_version":"1.9.20"}'

# Too many features
'{"app_name":"Test","features":["f1","f2","f3","f4","f5","f6","f7","f8","f9","f10","f11"],"architecture":"MVVM","ui_system":"Compose","min_sdk":24,"target_sdk":34,"gradle_version":"8.2.0","kotlin_version":"1.9.20"}'
```

**Expected:** CLI rejects before task creation

**Verification:**
```bash
echo $?  # Exit code should be 1
```

### Build Testing

**Objective:** Verify generated projects are buildable

**Prerequisites:**
- Android SDK installed in Termux
- Gradle wrapper executable

**Method:**
```bash
cd ~/.openclaw/workspace/android-swarm/<task_id>/
chmod +x gradlew
./gradlew assembleDebug --no-daemon
```

**Expected:**
- Build completes without errors
- APK generated at `app/build/outputs/apk/debug/app-debug.apk`

**Note:** System does not guarantee buildability. Manual fixes may be required.

### Performance Testing

#### Baseline Metrics

Run Test 1 (Simple Todo App) 3 times and record:

| Metric | Run 1 | Run 2 | Run 3 | Average |
|--------|-------|-------|-------|----------|
| Duration (min) | | | | |
| API calls | | | | |
| Tokens | | | | |
| Steps | | | | |

**Expected Ranges:**
- Duration: 10-20 minutes
- API calls: 10-30
- Tokens: 30K-80K
- Steps: 8-15

#### Load Testing

Run 5 tasks sequentially (not concurrently):

```bash
for i in {1..5}; do
  echo "Task $i"
  node dist/cli.js agent --message '<task_spec>'
done
```

**Monitor:**
- Memory usage: `top -p $(pgrep -f "node.*cli.js")`
- Disk usage: `du -sh ~/.openclaw/`
- Log size: `ls -lh ~/.openclaw/logs/`

**Expected:**
- No memory leaks (memory returns to baseline between tasks)
- Disk usage: ~1-2MB per task
- Log size: ~100KB per task

## Automated Testing

### Unit Tests (Not Implemented)

Future work: Unit tests for individual modules

**Candidates:**
- `schemas.ts`: Validation functions
- `state-manager.ts`: Database operations
- `kimi-client.ts`: Error classification

### Integration Tests (Not Implemented)

Future work: End-to-end integration tests

**Candidates:**
- Task execution (mocked API)
- Retry logic
- Limit enforcement

## Troubleshooting Test Failures

### Task Fails at Planning

**Check:**
1. API key validity: `echo $KIMI_API_KEY`
2. Network connectivity: `curl -I https://api.moonshot.cn`
3. Debug logs: `SWARM_DEBUG=1 node dist/cli.js ...`

### Critic Rejects All Code

**Check:**
1. Rejection reasons in logs
2. Coding profile compatibility
3. API response quality

**Workaround:** Reduce features or change architecture

### Build Fails After Generation

**Expected:** System does not guarantee buildability

**Check:**
1. Gradle version compatibility
2. Android SDK version
3. Dependency versions

**Manual Fix:**
1. Review generated files
2. Fix syntax errors
3. Update dependencies if needed

### Out of Memory

**Check:**
1. Available RAM: `free -h`
2. Other processes: `top`
3. Node.js heap size

**Workaround:**
```bash
node --max-old-space-size=768 dist/cli.js ...
```

## Test Environment

### Recommended Setup

**Device:**
- Android 11+ recommended
- 4GB+ RAM
- 1GB+ free storage

**Termux:**
- Latest version from F-Droid
- Ubuntu proot (optional but recommended)

**Network:**
- Stable WiFi connection
- Avoid mobile data (API usage)

### Cleanup Between Tests

```bash
# Remove failed task workspaces
rm -rf ~/.openclaw/workspace/android-swarm/*

# Clear database (optional)
rm ~/.openclaw/swarm.db

# Archive logs
mv ~/.openclaw/logs ~/.openclaw/logs.old
```

## Reporting Issues

When reporting test failures, include:

1. **System info:**
   - Device model
   - Android version
   - Termux version
   - Node.js version: `node -v`

2. **Task spec:** Full JSON

3. **Error logs:**
   ```bash
   tail -100 ~/.openclaw/logs/swarm-*.log
   ```

4. **Database state:**
   ```bash
   sqlite3 ~/.openclaw/swarm.db "SELECT * FROM tasks WHERE task_id = '<task_id>';"
   ```

5. **Environment:**
   ```bash
   env | grep SWARM
   echo $KIMI_API_KEY | wc -c  # Length only, not actual key
   ```
