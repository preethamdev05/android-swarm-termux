#!/bin/bash

# Environment setup script for Android Swarm
# Source this file to set up environment variables

echo "Android Swarm - Environment Setup"
echo "=================================="
echo ""

# API Key
if [ -z "$KIMI_API_KEY" ]; then
    read -p "Enter your Kimi API key: " KIMI_API_KEY
    export KIMI_API_KEY
    echo "KIMI_API_KEY set (not persisted)"
else
    echo "KIMI_API_KEY already set"
fi

# Optional settings
echo ""
echo "Optional settings (press Enter to skip):"

read -p "Enable debug logging? (1 for yes): " DEBUG
if [ "$DEBUG" = "1" ]; then
    export SWARM_DEBUG=1
    echo "Debug logging enabled"
fi

read -p "API timeout in seconds (default 30): " TIMEOUT
if [ -n "$TIMEOUT" ]; then
    export SWARM_API_TIMEOUT=$TIMEOUT
    echo "API timeout set to ${TIMEOUT}s"
fi

read -p "Max retries per step (default 3): " RETRIES
if [ -n "$RETRIES" ]; then
    export SWARM_MAX_RETRIES=$RETRIES
    echo "Max retries set to $RETRIES"
fi

echo ""
echo "=================================="
echo "Environment configured!"
echo ""
echo "To persist these settings, add them to your ~/.bashrc or ~/.zshrc:"
echo "  export KIMI_API_KEY=\"$KIMI_API_KEY\""
if [ "$SWARM_DEBUG" = "1" ]; then
    echo "  export SWARM_DEBUG=1"
fi
if [ -n "$SWARM_API_TIMEOUT" ]; then
    echo "  export SWARM_API_TIMEOUT=$SWARM_API_TIMEOUT"
fi
if [ -n "$SWARM_MAX_RETRIES" ]; then
    echo "  export SWARM_MAX_RETRIES=$SWARM_MAX_RETRIES"
fi
echo ""
