#!/bin/bash

echo "========================================="
echo "Zoom Sync Fix Deployment Script"
echo "========================================="
echo ""

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Error: Git is not installed or not in PATH"
    echo "Please install Git from https://git-scm.com/downloads"
    exit 1
fi

echo "📋 Summary of changes made:"
echo "1. Fixed import error in render-backend/routes/sync-webinars.js"
echo "2. Updated render-backend/services/zoomService.js to export methods properly"
echo "3. Added getZoomCredentials method to render-backend/services/supabaseService.js"
echo "4. Implemented proper sync logic with progress tracking"
echo ""

echo "🔍 Checking git status..."
git status --short

echo ""
echo "📦 Adding changes to git..."
git add render-backend/routes/sync-webinars.js
git add render-backend/services/zoomService.js
git add render-backend/services/supabaseService.js
git add RENDER_SYNC_FIX_INSTRUCTIONS.md

echo ""
echo "💾 Committing changes..."
git commit -m "Fix Zoom sync issues: correct imports, add missing methods, implement proper sync logic"

echo ""
echo "🚀 Pushing to remote repository..."
git push

echo ""
echo "✅ Code changes have been pushed!"
echo ""
echo "========================================="
echo "NEXT STEPS:"
echo "========================================="
echo ""
echo "1. Go to Render Dashboard: https://dashboard.render.com"
echo "2. Find service: webinar-wise-launchpad-17"
echo "3. Add these environment variables:"
echo "   - SUPABASE_URL = https://lgajnzldkfpvcuofjxom.supabase.co"
echo "   - SUPABASE_SERVICE_ROLE_KEY = [Get from Supabase]"
echo "   - SUPABASE_ANON_KEY = [Get from Supabase]"
echo "   - NODE_ENV = production"
echo ""
echo "4. Get the keys from:"
echo "   https://app.supabase.com/project/lgajnzldkfpvcuofjxom/settings/api"
echo ""
echo "5. Render will auto-deploy after adding environment variables"
echo "6. Wait 2-3 minutes for deployment to complete"
echo "7. Test the sync functionality"
echo ""
echo "📄 For detailed instructions, see: RENDER_SYNC_FIX_INSTRUCTIONS.md"
echo ""
