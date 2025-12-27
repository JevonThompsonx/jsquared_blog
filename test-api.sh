#!/bin/bash
cd server
~/.bun/bin/bun run dev &
SERVER_PID=$!
sleep 5
echo "Testing pagination API..."
curl -s "http://127.0.0.1:8787/api/posts?limit=5&offset=0"
echo ""
echo "Killing server..."
kill $SERVER_PID 2>/dev/null
