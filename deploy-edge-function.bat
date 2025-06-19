#!/bin/bash

# Deploy the fixed Edge Function to Supabase

echo "🚀 Deploying zoom-sync-webinars Edge Function..."

# Navigate to project directory
cd "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-12-09062025\webinar-wise-launchpad"

# Deploy the function
supabase functions deploy zoom-sync-webinars --project-ref guwvvinnifypcxwbcnzz

echo "✅ Deployment complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Test the sync from your UI"
echo "2. Monitor the Edge Function logs: supabase functions logs zoom-sync-webinars --project-ref guwvvinnifypcxwbcnzz"
echo "3. Check for any remaining CORS issues"
