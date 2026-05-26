#!/bin/bash
# Quick smoke test for pagination API
cd "$(dirname "$0")/web"
pnpm run dev &
SERVER_PID=$!
sleep 8
echo "Testing pagination API..."
curl -s "http://127.0.0.1:3000/api/posts?limit=5&offset=0"
echo ""
echo "Killing server..."
kill $SERVER_PID 2>/dev/null
