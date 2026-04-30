#!/bin/bash
cd /home/z/my-project
while true; do
  npx next dev -p 3000 -H 0.0.0.0 2>&1 &
  PID=$!
  echo "Started server PID: $PID"
  # Keep alive by checking every 5 seconds
  for i in $(seq 1 600); do
    sleep 5
    if ! kill -0 $PID 2>/dev/null; then
      echo "Server died, restarting..."
      break
    fi
  done
  kill $PID 2>/dev/null
  echo "Restarting..."
done
