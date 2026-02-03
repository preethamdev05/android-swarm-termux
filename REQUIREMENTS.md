# System Requirements

## Mandatory Requirements

### Hardware
- **Platform**: Android device running Termux
- **RAM**: 2-4GB available
- **Storage**: 100MB+ free space in Termux home directory
- **CPU**: ARM64 or ARMv7
- **Network**: Internet connection required (API calls)

### Software
- **Termux**: Latest version from F-Droid or GitHub
- **Ubuntu proot**: Userspace Ubuntu environment in Termux
- **Node.js**: Version 22 or higher
- **npm**: Package manager for Node.js
- **SQLite3**: Version 3.x
- **Git**: For repository cloning

## Environment Setup

### Termux Installation

```bash
# Update packages
pkg update && pkg upgrade

# Install required packages
pkg install nodejs sqlite git

# Verify Node.js version
node -v  # Should be >= 22
```

### Ubuntu proot (Optional)

If running in proot Ubuntu:

```bash
# Install proot-distro
pkg install proot-distro

# Install Ubuntu
proot-distro install ubuntu

# Login to Ubuntu
proot-distro login ubuntu

# Install Node.js in Ubuntu
apt update
apt install curl
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs sqlite3 git
```

## Process Management Constraints

### No systemd
- Process management via PID files and shell scripts only
- No daemon mode for orchestrator
- Foreground process execution only

### No Docker
- Native process execution in proot container
- All agents run in same UID and process tree
- No process isolation beyond OS boundaries

## Storage Constraints

### Termux Home Directory
- Path: `/data/data/com.termux/files/home/`
- Aliased as: `~/`
- OpenClaw root: `~/.openclaw/`
- Workspace: `~/.openclaw/workspace/android-swarm/`

### Proot Mount (if using Ubuntu proot)
- Termux home accessible at: `/root/`
- Storage shared between Termux and proot

## Network Constraints

### Intermittent Connectivity
- All network calls timeout within 30 seconds
- Retry logic handles transient failures
- Rate limiting: exponential backoff for 429 errors

### API Endpoint
- Kimi K2.5 API: `https://api.moonshot.cn/v1/chat/completions`
- Requires HTTPS connection
- API key authentication via Bearer token

## Memory Constraints

### Sustained Allocation
- Maximum: 500MB per process
- Node.js flag: `--max-old-space-size=512`
- Orchestrator state: <10KB per task
- Coder output buffer: Max 50KB

### Memory Management
- No caching of API responses
- State cleared on task completion
- Transient step state only

## CPU Constraints

### Architecture
- ARM64 or ARMv7 instruction set
- No GPU acceleration
- No SIMD assumptions

### Thermal Throttling
- Expected on Android devices
- System logs warnings for slow operations
- No automatic abort on throttling

## Filesystem Constraints

### Path Requirements
- All file paths must be relative
- No leading `/` in generated paths
- No `..` path traversal allowed
- UTF-8 encoding for all text files

### Write Strategy
- Atomic writes: `.tmp` suffix then rename
- No file locking (single-threaded)
- Lazy directory creation

## Security Constraints

### Single-User Boundary
- All components trust each other
- No authentication between modules
- Secrets via environment variables only

### Network Boundary
- KIMI_API_KEY must not be logged or exposed
- HTTPS required for all API calls
- No credential storage in SQLite

## Unsupported Features

### Process Management
- No systemd services
- No Docker containers
- No multi-user isolation

### Build Tools
- System does not execute Gradle
- System does not run Android emulator
- System does not install APKs

### Development Tools
- No IDE integration
- No debugger support
- No hot reload

## Troubleshooting

### Common Issues

**Node.js version too old**
```bash
# Install newer Node.js
pkg install nodejs-lts
```

**SQLite not found**
```bash
pkg install sqlite
```

**Permission denied**
```bash
# Check Termux storage permissions
termux-setup-storage
```

**Out of memory**
```bash
# Run with increased memory limit
node --max-old-space-size=512 dist/cli.js agent --message '...'
```

**API timeout**
```bash
# Increase timeout
export SWARM_API_TIMEOUT=60
```

## Performance Expectations

### Task Duration
- Simple app (1-5 features): 10-30 minutes
- Complex app (6-10 features): 30-90 minutes
- Wall-clock timeout: 90 minutes maximum

### API Usage
- Average: 20-50 API calls per task
- Maximum: 80 API calls per task
- Token usage: 50,000-150,000 tokens typical

### Disk Usage
- Per task workspace: 50KB-500KB
- SQLite database: <10MB for 100 tasks
- Log files: ~1MB per day
