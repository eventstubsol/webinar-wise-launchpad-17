#!/bin/bash

echo "=== FIXING ZOOM SYNC ISSUE ==="
echo ""

# Run the diagnostic script first
echo "1. Running diagnostic script..."
node fix-sync-issue.js

echo ""
echo "2. Testing database connection..."
cd render-backend
npm run test-db 2>/dev/null || echo "No test-db script, continuing..."

echo ""
echo "3. Checking for missing dependencies..."
npm list axios @supabase/supabase-js 2>/dev/null || npm install axios @supabase/supabase-js

echo ""
echo "4. Running sync fix from backend..."
node fix-zoom-api-issue.js

echo ""
echo "=== FIX COMPLETE ==="
echo ""
echo "Next steps:"
echo "1. Check the output above for any errors"
echo "2. Try running sync again from the dashboard"
echo "3. If issues persist, check the sync logs in Supabase"
