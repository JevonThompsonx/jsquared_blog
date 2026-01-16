#!/bin/bash
# Bash script to test cron job locally
# Run this while the dev server is running (bun run dev)

echo "Testing Cron Job Locally"
echo "========================"
echo ""

# Option 1: Use the test endpoint (recommended)
echo "Option 1: Using test endpoint..."
echo "GET http://127.0.0.1:8787/api/test/cron"
echo ""

curl -s http://127.0.0.1:8787/api/test/cron | jq .

echo ""
echo "========================"
echo ""

# Show scheduled posts
echo "Currently Scheduled Posts:"
echo "GET http://127.0.0.1:8787/api/test/scheduled-posts"
echo ""

curl -s http://127.0.0.1:8787/api/test/scheduled-posts | jq .

echo ""
echo "========================"
echo ""

# Option 2: Using wrangler's --test-scheduled flag
echo "Option 2: To test using wrangler's scheduled handler:"
echo "1. Start server with: wrangler dev --test-scheduled --config wrangler.toml"
echo "2. Trigger cron with: curl 'http://127.0.0.1:8787/__scheduled?cron=*+*+*+*+*'"
