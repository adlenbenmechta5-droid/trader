#!/bin/bash
cd /home/z/my-project

while true; do
  # Start server
  npx next start -p 3000 -H 0.0.0.0 > /tmp/server.log 2>&1 &
  SPID=$!
  echo "[$(date)] Server started PID=$SPID"
  
  # Wait for server to be ready
  for i in $(seq 1 15); do
    sleep 1
    if curl -s --connect-timeout 2 -o /dev/null http://localhost:3000 2>/dev/null; then
      echo "[$(date)] Server ready"
      break
    fi
  done

  # Start tunnel while server is alive
  /tmp/cf tunnel --url http://localhost:3000 2>/tmp/cf.log &
  CPID=$!
  sleep 5
  TURL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cf.log | head -1)
  echo "[$(date)] Tunnel: $TURL"
  echo "$TURL" > /tmp/current-url.txt

  # Monitor both - restart if either dies
  while true; do
    sleep 5
    if ! kill -0 $SPID 2>/dev/null; then
      echo "[$(date)] Server died, restarting everything..."
      kill $CPID 2>/dev/null
      break
    fi
    if ! kill -0 $CPID 2>/dev/null; then
      echo "[$(date)] Tunnel died, restarting tunnel..."
      /tmp/cf tunnel --url http://localhost:3000 2>/tmp/cf.log &
      CPID=$!
      sleep 5
      TURL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cf.log | head -1)
      echo "[$(date)] New tunnel: $TURL"
      echo "$TURL" > /tmp/current-url.txt
    fi
  done
  
  sleep 3
done
