#!/bin/bash
cd /home/z/my-project
# Kill any existing processes
kill $(pgrep -f "next") 2>/dev/null
sleep 1
# Start dev server
exec npx next dev -p 3000 -H 0.0.0.0
