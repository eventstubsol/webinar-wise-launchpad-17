#!/bin/bash

echo "🚀 Deploying Zoom Sync Webinars Edge Function Fix"
echo "================================================"

# Set project reference
PROJECT_REF="guwvvinnifypcxwbcnzz"

echo ""
echo "📦 Step 1: Deploying Edge Function..."
echo "------------------------------------"
supabase functions deploy zoom-sync-webinars --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully!"
else
    echo "❌ Edge Function deployment failed!"
    echo "Please check the error above and try again."
    exit 1
fi

echo ""
echo "🗄️ Step 2: Running Database Migration..."
echo "---------------------------------------"
supabase db push --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully!"
else
    echo "❌ Database migration failed!"
    echo "Please check the error above and try again."
    exit 1
fi

echo ""
echo "🔍 Step 3: Testing Edge Function..."
echo "----------------------------------"
echo "Testing CORS preflight request..."

# Test OPTIONS request
curl -X OPTIONS "https://$PROJECT_REF.supabase.co/functions/v1/zoom-sync-webinars" \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type,zoom_connection_id" \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control)"

echo ""
echo "✅ Deployment Complete!"
echo "====================="
echo ""
echo "📝 Next Steps:"
echo "1. Check the function logs: supabase functions logs zoom-sync-webinars --project-ref $PROJECT_REF --tail"
echo "2. Test the sync from your UI"
echo "3. Monitor for any errors"
echo ""
echo "🔧 Troubleshooting:"
echo "- If CORS errors persist, check the function logs for startup errors"
echo "- Ensure your Supabase CLI is authenticated: supabase login"
echo "- Make sure you're using the latest Supabase CLI: npm update -g supabase"
