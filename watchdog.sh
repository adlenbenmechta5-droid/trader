#!/bin/bash
cd /home/z/my-project
TUNNEL_STARTED=0

while true; do
  # Check if server is running
  if ! curl -s --connect-timeout 2 -o /dev/null http://localhost:3000 2>/dev/null; then
    echo "[$(date)] Server down, restarting..."
    
    # Kill old processes
    pkill -f "next" 2>/dev/null
    pkill -f "cloudflared" 2>/dev/null
    sleep 2
    
    # Start tunnel first
    /tmp/cf tunnel --url http://localhost:3000 2>/tmp/cf.log &
    sleep 5
    TUNNEL_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cf.log | head -1)
    
    # Start server
    tail -f /dev/zero | npx next dev -p 3000 -H 0.0.0.0 > /tmp/app.log 2>&1 &
    
    # Wait for ready
    for i in $(seq 1 10); do
      sleep 2
      if curl -s --connect-timeout 2 -o /dev/null http://localhost:3000 2>/dev/null; then
        echo "[$(date)] Server ready! URL: $TUNNEL_URL"
        echo "$TUNNEL_URL" > /tmp/current-url.txt
        TUNNEL_STARTED=1
        break
      fi
    done
  fi
  
  sleep 5
done
