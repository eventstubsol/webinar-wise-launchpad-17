#!/bin/bash

echo "============================================"
echo "Fixing Render Backend Authorization Issue"
echo "============================================"
echo ""

# Check current environment variables
echo "1. Checking environment variables on Render..."
echo ""
echo "Required environment variables:"
echo "- SUPABASE_URL"
echo "- SUPABASE_SERVICE_ROLE_KEY"
echo "- SUPABASE_ANON_KEY"
echo "- NODE_ENV (should be 'production')"
echo ""

# Make health check request
echo "2. Testing health endpoint (no auth required)..."
curl -X GET "https://webinar-wise-launchpad-17.onrender.com/health" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo ""

# Test with authorization header
echo "3. Testing with authorization header..."
echo "Note: This requires valid Supabase session token"
echo ""

# Instructions for fixing
echo "============================================"
echo "TO FIX THE AUTHORIZATION ERROR:"
echo "============================================"
echo ""
echo "1. Go to https://dashboard.render.com"
echo "2. Find your service: webinar-wise-launchpad-17"
echo "3. Click on 'Environment' tab"
echo "4. Add/Update these environment variables:"
echo ""
echo "   SUPABASE_URL=<your-supabase-project-url>"
echo "   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>"
echo "   SUPABASE_ANON_KEY=<your-anon-key>"
echo "   NODE_ENV=production"
echo ""
echo "5. Get these values from:"
echo "   - Go to https://app.supabase.com"
echo "   - Select your project"
echo "   - Go to Settings > API"
echo "   - Copy:"
echo "     - Project URL → SUPABASE_URL"
echo "     - service_role (secret) → SUPABASE_SERVICE_ROLE_KEY"
echo "     - anon (public) → SUPABASE_ANON_KEY"
echo ""
echo "6. After adding variables, Render will auto-redeploy"
echo "7. Wait 2-3 minutes for deployment to complete"
echo ""
echo "============================================"
echo "ALTERNATIVE: Test without Render backend"
echo "============================================"
echo ""
echo "If you need to test immediately, you can:"
echo "1. Use the Supabase Edge Function directly"
echo "2. Or run the backend locally with proper env vars"
echo ""
