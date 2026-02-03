# Frequently Asked Questions

## General

### What is Android Swarm?

A production-grade Android app generation system designed for Termux/Ubuntu environments. It uses AI-powered multi-agent orchestration to generate complete, buildable Android projects from high-level specifications.

### Does it require an internet connection?

Yes. The system makes API calls to Kimi K2.5 service for code generation. Typical task uses 20-50 API calls.

### Can I use it without Termux?

No. The system is specifically designed for Termux/Ubuntu constraints (no systemd, no Docker, ARM architecture).

## Installation

### What Node.js version do I need?

Node.js 22 or higher. Check with `node -v`.

### How do I get a Kimi API key?

Visit Kimi API documentation for registration and key generation. Set with `export KIMI_API_KEY="sk-..."`.

### Installation fails with "sqlite3 not found"

Install SQLite: `pkg install sqlite` (Termux) or `apt install sqlite3` (Ubuntu proot).

## Usage

### How long does a task take?

Simple apps (1-5 features): 10-30 minutes. Complex apps (6-10 features): 30-90 minutes. Maximum: 90 minutes (hard timeout).

### Can I generate multiple apps at once?

No. System supports one task at a time. Sequential execution only.

### What's the difference between MVVM, MVP, and MVI?

- **MVVM**: Model-View-ViewModel pattern with LiveData/StateFlow
- **MVP**: Model-View-Presenter pattern with explicit contracts
- **MVI**: Model-View-Intent pattern with unidirectional data flow

Choose based on familiarity and app complexity. MVVM recommended for most cases.

### Should I use Compose or Views?

- **Compose**: Modern declarative UI (min SDK 24, recommended)
- **Views**: Traditional XML layouts (min SDK 21, more compatible)

Use Compose for new projects unless you need SDK 21-23 support.

### How many features can I specify?

1-10 features. Optimal: 3-5 features. More features = longer execution time and higher API usage.

## Errors and Troubleshooting

### "API call limit exceeded"

Task made 80+ API calls. Reduce feature count or simplify architecture.

### "Token limit exceeded"

Task used 200,000+ tokens. Reduce features or use lower SDK targets.

### "Wall-clock timeout"

Task exceeded 90 minutes. Simplify task or check for API slowness.

### "Step exceeded retry limit"

Critic rejected code 3 times. Check logs for rejection reasons. Often due to:
- Complex feature requirements
- Architecture mismatches
- API response quality

Try simplifying features or changing architecture.

### Task fails at planning phase

Check:
1. API key validity: `echo $KIMI_API_KEY`
2. Network: `ping api.moonshot.cn`
3. Debug logs: `SWARM_DEBUG=1 node dist/cli.js ...`

### Generated app doesn't build

**Expected.** System does not guarantee buildability. Common fixes:
- Update Gradle version in build files
- Fix missing imports
- Correct dependency versions
- Add missing permissions in AndroidManifest.xml

### Out of memory error

Close other Termux sessions and run with:
```bash
node --max-old-space-size=768 dist/cli.js agent --message '...'
```

### "Path traversal not allowed"

Planner generated invalid file path (contains `..` or leading `/`). This is a Planner failure. Retry task.

## Features and Limitations

### Can it generate tests?

No. Test generation is explicitly excluded.

### Can it build the APK for me?

No. System generates source code only. You must run `./gradlew assembleDebug` manually.

### Can I iterate on an existing project?

No. Each task generates a new project. No incremental updates supported.

### Can it integrate with GitHub?

No. No version control integration. Manual git operations only.

### Can I customize the generated code style?

No. Code style follows embedded Coding Profile. No customization supported.

### Does it support Kotlin Multiplatform?

No. Android-only generation.

### Can it generate backend code?

No. Android app generation only.

## Performance

### How much does a task cost?

Depends on Kimi API pricing. Typical task:
- API calls: 20-50
- Tokens: 50K-150K (prompt + completion)

Check Kimi pricing for exact costs.

### How can I reduce API usage?

- Use fewer features (1-3 instead of 8-10)
- Simpler architectures (MVVM is straightforward)
- Lower SDK targets (less boilerplate)

### Why is my task slow?

Possible causes:
- Complex features (many API calls)
- Slow network connection
- API rate limiting
- Thermal throttling on device

Monitor with `SWARM_DEBUG=1` to see API timing.

### Can I speed up execution?

- Use stable WiFi (not mobile data)
- Close other apps (free RAM)
- Run during off-peak hours (less API congestion)
- Reduce feature count

## Architecture

### What AI model does it use?

Kimi K2.5 via Moonshot API. No other models supported.

### Can I use OpenAI or Claude instead?

No. System is designed specifically for Kimi K2.5 API.

### How does the agent system work?

Four agents:
1. **Planner**: Decomposes task into steps
2. **Coder**: Generates code per step
3. **Critic**: Reviews and accepts/rejects code
4. **Verifier**: Final quality check (advisory)

Sequential execution, no parallel processing.

### Why sequential execution?

Termux constraints:
- Limited resources (2-4GB RAM)
- Single-user environment
- No process isolation
- Simplifies state management

### What happens if Critic rejects code?

Coder retries with rejection feedback. Max 3 attempts. After 3 rejections, task aborts.

## Data and Privacy

### What data is stored?

Locally:
- Task specifications (SQLite)
- Generated code (workspace files)
- Execution logs
- API usage statistics

Not stored:
- API key (environment variable only)
- Network credentials
- User personal data

### Is my API key logged?

No. API key is redacted in logs.

### Where is data stored?

- Database: `~/.openclaw/swarm.db`
- Workspace: `~/.openclaw/workspace/android-swarm/`
- Logs: `~/.openclaw/logs/`

All local to Termux home directory.

### Can I delete my data?

```bash
# Remove all data
rm -rf ~/.openclaw/

# Remove specific task workspace
rm -rf ~/.openclaw/workspace/android-swarm/<task_id>/

# Remove database only
rm ~/.openclaw/swarm.db
```

## Advanced

### Can I modify agent prompts?

Yes, but requires code changes:
1. Edit `src/agents/<agent>.ts`
2. Rebuild: `npm run build`
3. Test thoroughly

Warning: May violate blueprint constraints.

### Can I add custom agents?

Yes. See ARCHITECTURE.md > Extension Points. Requires:
- New agent class
- Orchestrator integration
- State schema updates
- Maintain sequential execution

### Can I use a different database?

Yes. Replace StateManager implementation. Maintain:
- Public method signatures
- Atomic write guarantees
- Audit trail structure

### How do I increase limits?

Edit `src/orchestrator.ts`:
```typescript
const API_CALL_LIMIT = 100;  // Default: 80
const TOKEN_LIMIT = 300000;  // Default: 200000
const WALL_CLOCK_TIMEOUT = 120 * 60 * 1000;  // Default: 90min
```

Rebuild and test. Higher limits = higher costs and longer execution.

### Can I run multiple instances?

No. PID file prevents concurrent execution. To override (not recommended):
```bash
rm ~/.openclaw/swarm.pid
```

## Comparison

### vs Android Studio templates?

Android Swarm:
- Generates complete app from features
- AI-powered, not template-based
- Fully customized architecture
- No IDE required

Android Studio:
- Basic templates only
- Manual feature implementation
- Requires IDE and desktop

### vs GitHub Copilot?

Android Swarm:
- Generates entire project structure
- Multi-file, multi-agent orchestration
- Enforces architecture patterns
- Standalone system

Copilot:
- Code completion and suggestions
- Single-file context
- IDE integration
- Requires IDE

### vs Low-code platforms?

Android Swarm:
- Generates production Kotlin code
- Full control over source
- No vendor lock-in
- Requires manual build

Low-code:
- Visual development
- Managed builds and deployment
- Vendor-specific
- Limited customization

## Support

### Where can I get help?

Check documentation:
- README.md: Overview and quick start
- USAGE.md: Detailed usage guide
- ARCHITECTURE.md: System design
- TROUBLESHOOTING.md: Common issues

### How do I report a bug?

See CONTRIBUTING.md > Reporting Bugs. Include:
- System information
- Task specification
- Error logs
- Steps to reproduce

### Can I request features?

Yes, via GitHub issues. Check NON-GOALS first to ensure feature aligns with project scope.

### Is commercial use allowed?

Yes. MIT License permits commercial use. See LICENSE file.
