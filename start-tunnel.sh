#!/bin/bash
cd /home/z/my-project

# Start cloudflare tunnel in background  
/tmp/cf tunnel --url http://localhost:3000 2>/tmp/cf.log &
CF_PID=$!

# Wait for tunnel URL
sleep 8
TURL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cf.log | head -1)
echo "============================================"
echo "  YOUR APP URL: $TURL"
echo "============================================"

# Start Next.js in foreground (this keeps the terminal alive)
exec npx next dev -p 3000 -H 0.0.0.0
