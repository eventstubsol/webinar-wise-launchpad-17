#!/bin/bash

# Deploy zoom-sync-webinars-v2 Edge Function
echo "Deploying zoom-sync-webinars-v2 Edge Function..."

# Navigate to project directory
cd "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-12-09062025\webinar-wise-launchpad"

# Deploy the function
npx supabase functions deploy zoom-sync-webinars-v2 --no-verify-jwt

echo "Deployment complete!"
