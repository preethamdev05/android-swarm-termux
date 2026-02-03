# System Architecture

## Overview

Android Swarm is a production-grade Android app generation system designed for Termux/Ubuntu environments. It uses a multi-agent orchestration model powered by Kimi K2.5 API to generate complete, buildable Android projects from high-level specifications.

## Core Components

### 1. CLI Interface (`cli.ts`)

**Responsibilities:**
- Command-line argument parsing
- Task specification validation
- User output formatting
- Signal handling (SIGINT, SIGTERM)
- Orchestrator lifecycle management

**Input:** `build app: <JSON spec>`
**Output:** Workspace path or error message

### 2. Orchestrator (`orchestrator.ts`)

**Responsibilities:**
- Task lifecycle coordination
- Agent invocation sequencing
- State management and persistence
- Limit enforcement (API calls, tokens, time)
- Circuit breaker implementation
- Error classification and retry logic

**Key Methods:**
- `executeTask()`: Main entry point
- `planningPhase()`: Invoke Planner
- `executionPhase()`: Sequential step execution
- `verificationPhase()`: Final quality check
- `checkLimits()`: Enforce hard caps

### 3. Agent System

#### Planner Agent (`agents/planner.ts`)

**Authority:** Single source of truth for task scope

**Input:**
- Task specification (validated JSON)
- Coding profile document

**Output:**
- Phased plan (1-25 steps)
- Each step: step_number, phase, file_path, file_type, dependencies, description

**Validation:**
- All features covered
- AndroidManifest.xml present
- Gradle files present
- Valid dependency references
- No duplicate step numbers

**Failure Mode:** Immediate task abort, no retry

#### Coder Agent (`agents/coder.ts`)

**Authority:** Code generation only, no planning or critique

**Input:**
- Single step from plan
- Task specification
- Completed file paths (dependencies)
- Prior rejection feedback (on retry)

**Output:**
- Complete file content (Kotlin/XML/Gradle)
- Max 8000 tokens, max 50KB

**Constraints:**
- Syntactically valid
- Respects dependencies
- Follows coding profile
- No placeholders or TODOs

**Failure Mode:** Retry up to 3 times with feedback

#### Critic Agent (`agents/critic.ts`)

**Authority:** Final authority on code quality, can halt execution

**Input:**
- Generated file content
- Step description
- Task specification
- Coding profile

**Output:**
- Decision (ACCEPT/REJECT)
- Issues array (if REJECT)
- Severity levels (BLOCKER/MAJOR/MINOR)

**Rejection Criteria:**
- BLOCKER: Syntax errors, missing functionality, API misuse
- MAJOR: Architecture violations, missing null checks
- MINOR: Verbose code, missing edge cases

**Failure Mode:** Fail-open (ACCEPT with warning) on Critic crash

#### Verifier Agent (`agents/verifier.ts`)

**Authority:** Advisory only, cannot block completion

**Input:**
- Complete file tree
- Task specification

**Output:**
- Warnings array
- Missing items array
- Quality score (0.0-1.0)

**Checks:**
- All features implemented
- Required files present
- Dependency consistency
- Architecture adherence

**Failure Mode:** Log warning, task completes anyway

### 4. Kimi K2.5 Client (`kimi-client.ts`)

**Responsibilities:**
- HTTP communication with Kimi API
- Authentication (Bearer token)
- Retry logic (exponential backoff)
- Timeout enforcement (30s)
- Error classification
- Token usage tracking

**Error Types:**
- Transient: Timeout, 429, 500-599 → Retry
- Permanent: 400-499 (except 429) → Abort
- Rate limit: 429 → Exponential backoff

**Token Tracking:**
- Extracts `usage.prompt_tokens` and `usage.completion_tokens`
- Returns as ApiCallRecord
- Accumulated by Orchestrator

### 5. State Manager (`state-manager.ts`)

**Responsibilities:**
- SQLite database operations
- Filesystem I/O (workspace)
- Directory structure management
- PID file handling
- Atomic file writes

**SQLite Schema:**
- `tasks`: Task metadata and state
- `steps`: Per-step execution history
- `api_calls`: Token usage audit trail

**Filesystem Operations:**
- Create workspace: `~/.openclaw/workspace/android-swarm/<task_id>/`
- Write files: Atomic (`.tmp` + rename)
- Read files: UTF-8 encoding
- List files: Recursive directory walk

### 6. Supporting Modules

#### Schemas (`schemas.ts`)
- Task spec validation
- Plan validation
- Critic output validation
- Verifier output validation
- Path sanitization

#### Coding Profile (`coding-profile.ts`)
- Kotlin/Android best practices
- Forbidden patterns
- Rejection criteria
- Embedded as constant string

#### Logger (`logger.ts`)
- Multi-level logging (DEBUG, INFO, WARN, ERROR)
- Console and file output
- Daily log rotation
- PII redaction

## Data Flow

### End-to-End Execution

```
1. User CLI Input
   ↓
2. CLI: Parse and validate
   ↓
3. Orchestrator: Initialize task
   ↓
4. StateManager: Create DB record, workspace
   ↓
5. Planner Agent → Kimi API
   ↓
6. Store plan in DB
   ↓
7. FOR EACH STEP:
   ↓
   8. Coder Agent → Kimi API
   ↓
   9. Critic Agent → Kimi API
   ↓
   10. IF ACCEPT:
       ↓
       11. Write file to workspace
       ↓
       12. Record step in DB
       ↓
   ELSE IF REJECT:
       ↓
       13. Retry (max 3)
       ↓
14. Verifier Agent → Kimi API
   ↓
15. Update task state: COMPLETED
   ↓
16. Return workspace path
```

### State Transitions

```
PLANNING → EXECUTING → VERIFYING → COMPLETED
    ↓           ↓           ↓
  FAILED      FAILED      FAILED
```

## Authority Model

### Planning Authority
- **Planner**: Authoritative on scope and decomposition
- **Orchestrator**: Enforces plan step count (1-25)
- **Validator**: Ensures all features covered

### Execution Authority
- **Coder**: Executes instructions only
- **Critic**: Authoritative on per-file acceptance
- **Orchestrator**: Enforces retry limit (3 attempts)

### Completion Authority
- **Verifier**: Advisory only
- **Orchestrator**: Final decision on completion

## Safety Controls

### Hard Caps

| Limit | Value | Enforcement Point | Action |
|-------|-------|-------------------|--------|
| API calls | 80 | Before each call | Abort task |
| Tokens | 200,000 | After each call | Abort task |
| Wall-clock | 90 min | Before each agent | Abort task |
| Steps | 25 | Plan validation | Reject plan |
| Retries | 3 | Per-step loop | Abort task |
| File size | 50KB | After generation | Truncate + warn |

### Circuit Breakers

**Consecutive Failures:**
- Trigger: 3 consecutive step failures
- Action: Abort task
- Reset: On successful step

**API Error Rate:**
- Trigger: 5 API errors in 60s
- Action: Abort task
- Reset: Not applicable (task aborted)

### Path Safety

**Validation Rules:**
- No leading `/` (absolute paths)
- No `..` components (traversal)
- Relative paths only
- Enforced at plan validation and file write

**On Violation:** Task abort with error

### Memory Safety

**Limits:**
- Orchestrator state: <10KB
- Coder output buffer: Max 50KB
- No response caching
- State cleared on completion

**Node.js Flag:** `--max-old-space-size=512`

## Error Handling

### Error Classification

**Transient Errors (Retry Eligible):**
- Network timeout
- HTTP 429 (rate limit)
- HTTP 500-599 (server errors)

**Permanent Errors (No Retry):**
- HTTP 400-499 (except 429)
- JSON parse failures
- Schema validation failures
- Path traversal attempts

**Critical Errors (Abort Task):**
- API call limit exceeded
- Token limit exceeded
- Wall-clock timeout
- Consecutive failure breaker

### Retry Strategy

**Coder Retry:**
- Max 3 attempts per step
- Include prior rejection in prompt
- Exponential backoff for rate limits

**Planner Failure:**
- No retry
- Immediate task abort

**Critic Failure:**
- Fail-open: ACCEPT with warning
- Only for Critic crashes, not rejections

**Verifier Failure:**
- Log warning
- Task completes anyway

## Execution Model

### Sequential Execution

- Single-threaded orchestration
- Steps executed in plan order
- No parallel agent invocation
- No step reordering

### Dependency Resolution

- `dependencies[]` in plan specifies prior steps
- Coder receives list of completed files
- No circular dependency validation (Planner responsibility)
- Files written only after Critic ACCEPT

### Termination Conditions

**Success:**
- All steps completed
- All Critic decisions = ACCEPT
- Verifier executed (advisory)
- State = COMPLETED

**Failure:**
- Any step exceeds 3 retries
- Planner fails
- Any hard limit exceeded
- Circuit breaker triggered
- Manual abort (SIGINT/SIGTERM)
- State = FAILED

## Persistence

### In-Memory State

**Orchestrator State:**
- Current task metadata
- Plan array
- Completed files list
- API call counter
- Token counter
- Timestamps

**Lifetime:** Task execution duration only
**Cleared:** On completion or failure

### Persistent State

**SQLite Database:**
- Task records (metadata, state, counters)
- Step records (execution history)
- API call records (audit trail)

**Lifetime:** Indefinite (manual cleanup)

**Workspace Files:**
- Generated Kotlin/XML/Gradle files
- Complete project structure

**Lifetime:** 
- Completed tasks: Indefinite
- Failed tasks: 7 days (recommended)

**Log Files:**
- Daily rotation
- Retention: 30 days normal, 7 days debug

## Scalability Constraints

### Single-User, Single-Task

- One orchestrator process at a time
- PID file prevents concurrent execution
- No multi-user support
- No shared workspace

### Resource Limits

- RAM: 2-4GB available
- CPU: ARM64/ARMv7, no GPU
- Storage: 100MB+ free space
- Network: Intermittent connectivity assumed

### Performance Expectations

**Task Duration:**
- Simple (1-5 features): 10-30 minutes
- Complex (6-10 features): 30-90 minutes

**API Usage:**
- Typical: 20-50 calls, 50K-150K tokens
- Maximum: 80 calls, 200K tokens

## Security Model

### Trust Boundaries

**Single-User Boundary:**
- All components trust each other
- No inter-module authentication
- Same UID and process tree

**Network Boundary:**
- HTTPS to Kimi API
- API key via environment variable
- No credential persistence

**Filesystem Boundary:**
- Workspace root is writable
- Path sanitization enforced
- No symlink traversal

### Execution Boundary

**Generated Code:**
- Never executed by system
- Output only, no interpretation
- User builds manually with Gradle

**Shell Commands:**
- Limited to file I/O only
- No execution of generated code
- No user-controlled commands

## Extension Points

### Agent Addition

- Implement agent class with prompt builder
- Add to orchestrator execution flow
- Update state schema if needed
- Maintain sequential execution model

### Model Provider Change

- Replace KimiClient implementation
- Maintain KimiResponse interface
- Preserve retry and timeout logic
- Update token tracking if needed

### Storage Backend Change

- Replace StateManager implementation
- Maintain public method signatures
- Preserve atomic write guarantees
- Keep audit trail structure

## Non-Goals (Explicitly Excluded)

- Build execution (no Gradle invocation)
- Testing generation or execution
- IDE integration
- Continuous iteration on existing projects
- Multi-agent collaboration or negotiation
- Dynamic replanning during execution
- Code execution or interpretation
- Multi-model support or fallback
- Streaming API responses
- Real-time progress UI
- Cloud services integration
- Dependency management
- Code formatting enforcement
- Documentation generation
- Rollback or undo
- Multi-user or collaborative features
- GUI or web interface
- Autonomous behavior beyond task scope
