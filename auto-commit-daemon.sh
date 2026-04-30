#!/bin/bash
cd /home/z/my-project
while true; do
  sleep 300  # 5 minutes
  CHANGES=$(git status --porcelain 2>/dev/null)
  if [ -n "$CHANGES" ]; then
    git add -A
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    git commit -m "Auto-sync: ${TIMESTAMP}" --quiet 2>/dev/null
    git push origin main --quiet 2>/dev/null
  fi
done
