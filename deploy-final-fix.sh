#!/bin/bash

echo "🚀 Deploying Fixed Zoom Sync Edge Function"
echo "=========================================="
echo ""

PROJECT_REF="guwvvinnifypcxwbcnzz"
FUNCTION_NAME="zoom-sync-webinars"

echo "📝 Summary of fixes applied:"
echo "- Fixed connection_name reference (changed to zoom_email)"
echo "- Removed complex import causing module errors"
echo "- Enhanced error logging"
echo "- Database constraints already in place"
echo ""

echo "📦 Deploying to Supabase..."
echo ""

# Try to deploy with Supabase CLI
supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF --no-verify-jwt

if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️ CLI deployment failed. Please deploy manually:"
    echo ""
    echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/functions/$FUNCTION_NAME"
    echo "2. Click 'Deploy Function' or 'New Deployment'"
    echo "3. The dashboard will use the updated code"
    echo ""
else
    echo "✅ Edge Function deployed successfully!"
    echo ""
fi

echo "🧪 Testing deployment..."
echo ""

# Test the Edge Function
curl -s -X OPTIONS "https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME" \
    -H "Origin: http://localhost:8080" \
    -H "Access-Control-Request-Method: POST" \
    -o /dev/null -w "CORS Test Result: HTTP %{http_code}\n"

echo ""
echo "📊 Next Steps:"
echo "1. Check function logs: https://supabase.com/dashboard/project/$PROJECT_REF/functions/$FUNCTION_NAME/logs"
echo "2. Test the sync from your application"
echo "3. Monitor for errors in the browser console"
echo ""

# Create a test script for the browser
cat > test-in-browser.js << 'EOF'
// Test the deployed Edge Function
async function testEdgeFunction() {
  const url = 'https://guwvvinnifypcxwbcnzz.supabase.co/functions/v1/zoom-sync-webinars';
  
  // Test CORS
  const corsResponse = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:8080'
    }
  });
  
  console.log('CORS Test:', corsResponse.status === 200 ? '✅ PASSED' : '❌ FAILED');
  
  // Test without auth (should return 401)
  const testResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  const data = await testResponse.json();
  console.log('Auth Test:', testResponse.status === 401 ? '✅ PASSED' : '❌ FAILED');
  console.log('Response:', data);
}

testEdgeFunction();
EOF

echo "Created test-in-browser.js - run this in your browser console to test"
echo ""
echo "Deployment process complete!"
