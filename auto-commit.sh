#!/bin/bash
# Auto-commit script for TradeX AI
# Runs every 5 minutes via cron to commit and push changes

cd /home/z/my-project

# Check if there are any changes
CHANGES=$(git status --porcelain 2>/dev/null)

if [ -z "$CHANGES" ]; then
  exit 0
fi

# Add all changes
git add -A

# Create timestamp-based commit message
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
COMMIT_MSG="Auto-sync: ${TIMESTAMP}"

# Commit
git commit -m "$COMMIT_MSG" --quiet 2>/dev/null

# Push
git push origin main --quiet 2>/dev/null
