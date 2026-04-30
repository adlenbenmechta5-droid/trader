#!/bin/bash
cd /home/z/my-project

# Start cloudflare tunnel first
echo "Starting Cloudflare Tunnel..."
/tmp/cf tunnel --url http://localhost:3000 2>/tmp/cf-tunnel.log &
CF_PID=$!
sleep 5
TUNNEL_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cf-tunnel.log | head -1)
echo "Tunnel URL: $TUNNEL_URL"
echo "$TUNNEL_URL" > /tmp/tunnel-url.txt

# Keep server running
while true; do
  echo "Starting Next.js server..."
  npx next dev -p 3000 -H 0.0.0.0 2>&1 &
  SERVER_PID=$!
  
  # Monitor server - restart if dead
  while kill -0 $SERVER_PID 2>/dev/null; do
    sleep 10
    # Keep tunnel alive by checking it
    if ! kill -0 $CF_PID 2>/dev/null; then
      echo "Tunnel died, restarting tunnel..."
      /tmp/cf tunnel --url http://localhost:3000 2>/tmp/cf-tunnel.log &
      CF_PID=$!
      TUNNEL_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cf-tunnel.log | head -1)
      echo "New Tunnel URL: $TUNNEL_URL"
      echo "$TUNNEL_URL" > /tmp/tunnel-url.txt
    fi
  done
  
  echo "Server crashed, restarting in 3s..."
  kill $SERVER_PID 2>/dev/null
  sleep 3
done
