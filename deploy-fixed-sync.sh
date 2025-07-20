#!/bin/bash

# Deploy the fixed zoom-sync-webinars-v2 edge function

echo "Deploying fixed zoom-sync-webinars-v2 edge function..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Deploy the function
supabase functions deploy zoom-sync-webinars-v2 \
  --project-ref lgajnzldkfpvcuofjxom \
  --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ Successfully deployed zoom-sync-webinars-v2"
else
    echo "❌ Failed to deploy zoom-sync-webinars-v2"
    exit 1
fi

echo ""
echo "Deployment complete!"
echo ""
echo "To trigger a sync and fix the data, run:"
echo "node fix-webinar-sync-data.js"
