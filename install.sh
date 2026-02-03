#!/bin/bash

set -e

echo "Android Swarm - Installation Script"
echo "===================================="
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "Error: Node.js not found"
    echo "Please install Node.js >= 22"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "Error: Node.js version must be >= 22"
    echo "Current version: $(node -v)"
    exit 1
fi

echo "✓ Node.js $(node -v) detected"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "Error: npm not found"
    exit 1
fi

echo "✓ npm $(npm -v) detected"

# Check SQLite3
if ! command -v sqlite3 &> /dev/null; then
    echo "Warning: sqlite3 command not found"
    echo "SQLite3 library should still work via Node.js"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "Error: npm install failed"
    exit 1
fi

echo "✓ Dependencies installed"

# Build TypeScript
echo ""
echo "Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "Error: TypeScript build failed"
    exit 1
fi

echo "✓ Build successful"

# Create OpenClaw directory structure
echo ""
echo "Creating directory structure..."
mkdir -p ~/.openclaw/workspace/android-swarm
mkdir -p ~/.openclaw/logs

echo "✓ Directories created"

# Check environment variable
echo ""
if [ -z "$KIMI_API_KEY" ]; then
    echo "Warning: KIMI_API_KEY environment variable not set"
    echo "Please set it before running tasks:"
    echo "  export KIMI_API_KEY=\"sk-...\""
else
    echo "✓ KIMI_API_KEY is set"
fi

echo ""
echo "===================================="
echo "Installation complete!"
echo ""
echo "Usage:"
echo "  node dist/cli.js agent --message 'build app: {...}'"
echo ""
echo "See README.md for full documentation"
echo ""
