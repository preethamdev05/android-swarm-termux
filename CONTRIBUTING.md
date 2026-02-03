# Contributing Guidelines

## Code of Conduct

This project adheres to a professional code of conduct. Be respectful, constructive, and collaborative.

## How to Contribute

### Reporting Bugs

1. Search existing issues to avoid duplicates
2. Use the bug report template
3. Include:
   - System information (device, OS, versions)
   - Task specification (if applicable)
   - Error logs and stack traces
   - Steps to reproduce

### Suggesting Features

1. Check if feature aligns with project goals (see NON-GOALS in README)
2. Open an issue with:
   - Use case description
   - Proposed implementation approach
   - Impact on existing features

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/description`
3. Make changes following code style guidelines
4. Test thoroughly (see TESTING.md)
5. Commit with clear messages (see below)
6. Push and open a pull request

## Development Setup

```bash
git clone <your-fork>
cd android-swarm-termux
npm install
npm run build
```

## Code Style

### TypeScript

- Use TypeScript strict mode
- Explicit types for function parameters and returns
- No `any` types (use `unknown` if needed)
- Prefer `const` over `let`, avoid `var`
- Use async/await over promises

### Naming Conventions

- Classes: `PascalCase`
- Functions/methods: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` (no `I` prefix)
- Files: `kebab-case.ts`

### File Organization

```
src/
├── agents/          # Agent implementations
├── types.ts          # Type definitions
├── schemas.ts        # Validation functions
├── orchestrator.ts  # Main orchestration logic
├── state-manager.ts # Persistence layer
├── kimi-client.ts   # API client
└── cli.ts           # CLI interface
```

### Comments

- Use JSDoc for public APIs
- Inline comments for complex logic only
- No commented-out code in commits

### Error Handling

- Use specific error classes when appropriate
- Always include error context
- Log errors before throwing/returning

## Commit Messages

### Format

```
<type>: <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring (no behavior change)
- `perf`: Performance improvements
- `test`: Test additions or fixes
- `chore`: Build process, tooling, dependencies

### Examples

```
feat: Add retry logic to Coder agent

Implements exponential backoff for transient API errors.
Max 3 retries per step with feedback loop.

Resolves #42
```

```
fix: Correct path sanitization in StateManager

Previously allowed `.` in paths which could escape workspace.
Now validates against exact pattern.

Fixes #58
```

## Testing Requirements

All contributions must:

1. Pass existing manual tests (see TESTING.md)
2. Add new tests for new features
3. Maintain or improve code coverage (future requirement)

## Architecture Constraints

Maintain blueprint compliance:

1. **Hard limits:** Do not relax API call, token, or time limits
2. **Sequential execution:** No parallel agent invocation
3. **Single-threaded:** No multi-threading or concurrency
4. **Termux compatibility:** No systemd, Docker, or privileged operations
5. **Safety first:** All new features must enforce safety controls

## Documentation Requirements

Update documentation for:

- New features: README.md, USAGE.md
- Architecture changes: ARCHITECTURE.md
- API changes: Inline JSDoc + ARCHITECTURE.md
- Configuration: README.md, REQUIREMENTS.md

## Review Process

1. Automated checks (linting, build)
2. Manual code review
3. Testing verification
4. Documentation review
5. Blueprint compliance check

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
