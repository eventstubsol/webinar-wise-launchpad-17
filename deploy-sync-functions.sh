#!/bin/bash
# Deploy Supabase Edge Functions

echo "Deploying zoom-sync-webinars-v2..."
npx supabase functions deploy zoom-sync-webinars-v2

echo "Deploying zoom-sync-progress..."
npx supabase functions deploy zoom-sync-progress

echo "Deploying zoom-delta-sync..."
npx supabase functions deploy zoom-delta-sync

echo "Deploying test functions..."
npx supabase functions deploy test-zoom-rate-limits
npx supabase functions deploy test-sync-error-handling

echo "All functions deployed!"
