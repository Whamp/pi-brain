#!/bin/bash
# E2E Browser Test for pi-brain Web UI
#
# Task 7.6: End-to-end integration testing
#
# This script uses agent-browser to verify the web UI is functional.
# Run with: ./scripts/e2e-browser-test.sh
#
# Prerequisites:
# 1. API server running: npm run serve (or pi-brain api-server start)
# 2. Web UI dev server: npm run web:dev
# 3. agent-browser installed: ~/skills/web-tools-router/headless/agent-browser

set -e

BROWSER="$HOME/skills/web-tools-router/headless/agent-browser"
BASE_URL="${BASE_URL:-http://localhost:5173}"
SESSION="pi-brain-e2e"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "================================================"
echo "pi-brain E2E Browser Test"
echo "================================================"
echo ""

# Check prerequisites
if [ ! -f "$BROWSER" ]; then
    echo -e "${RED}ERROR: agent-browser not found at $BROWSER${NC}"
    echo "Run: cd ~/skills/web-tools-router/headless && npm install"
    exit 1
fi

# Clean up any existing session
$BROWSER --session "$SESSION" close 2>/dev/null || true

echo "Testing: $BASE_URL"
echo ""

# Test 1: Dashboard loads
echo -n "1. Dashboard loads... "
$BROWSER --session "$SESSION" open "$BASE_URL" > /dev/null 2>&1
sleep 2
TITLE=$($BROWSER --session "$SESSION" get title 2>/dev/null)
if [[ "$TITLE" == *"pi-brain"* ]] || [[ "$TITLE" == *"Dashboard"* ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC} (title: $TITLE)"
fi

# Test 2: Dashboard has key sections
echo -n "2. Dashboard sections visible... "
SNAPSHOT=$($BROWSER --session "$SESSION" snapshot -i 2>/dev/null)
if echo "$SNAPSHOT" | grep -qi "stats\|activity\|quirks\|errors"; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
fi

# Test 3: Navigate to Graph view
echo -n "3. Graph view accessible... "
$BROWSER --session "$SESSION" open "$BASE_URL/graph" > /dev/null 2>&1
sleep 1
URL=$($BROWSER --session "$SESSION" get url 2>/dev/null)
if [[ "$URL" == *"/graph"* ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
fi

# Test 4: Navigate to Search view
echo -n "4. Search view accessible... "
$BROWSER --session "$SESSION" open "$BASE_URL/search" > /dev/null 2>&1
sleep 1
SNAPSHOT=$($BROWSER --session "$SESSION" snapshot -i 2>/dev/null)
if echo "$SNAPSHOT" | grep -qi "search\|filter"; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
fi

# Test 5: Navigate to Browse view
echo -n "5. Browse view accessible... "
$BROWSER --session "$SESSION" open "$BASE_URL/browse" > /dev/null 2>&1
sleep 1
URL=$($BROWSER --session "$SESSION" get url 2>/dev/null)
if [[ "$URL" == *"/browse"* ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
fi

# Take a screenshot of the final state
echo ""
echo -n "Taking screenshot... "
SCREENSHOT_PATH="./e2e-screenshot-$(date +%Y%m%d-%H%M%S).png"
$BROWSER --session "$SESSION" screenshot "$SCREENSHOT_PATH" 2>/dev/null
echo "Saved to $SCREENSHOT_PATH"

# Cleanup
$BROWSER --session "$SESSION" close 2>/dev/null || true

echo ""
echo "================================================"
echo "E2E Browser Test Complete"
echo "================================================"
