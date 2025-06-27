#!/bin/bash

# Edge Functions Cleanup Script
# This script removes all unused Supabase Edge Functions

echo "============================================"
echo "Supabase Edge Functions Cleanup Script"
echo "============================================"
echo ""
echo "This script will remove all unused edge functions from your Supabase project."
echo "Make sure you have the Supabase CLI installed and are logged in."
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# List of edge functions to remove (all of them since none are being used)
FUNCTIONS_TO_REMOVE=(
  "ai-insights-generator"
  "campaign-scheduler"
  "clear-zoom-connections"
  "crm-oauth-callback"
  "crm-webhook-receiver"
  "delete-account"
  "email-tracking"
  "enhanced-email-sender"
  "export-user-data"
  "fix-webinar-sync-data"
  "generate-pdf-report"
  "launch-campaign"
  "manage-email-preferences"
  "process-behavioral-events"
  "process-email-queue"
  "process-participant-retries"
  "realtime-analytics-processor"
  "resend-webhook"
  "run-optimization-algorithms"
  "send-scheduled-report"
  "test-sync-error-handling"
  "test-zoom-rate-limits"
  "update-predictive-models"
  "validate-zoom-credentials"
  "zoom-delta-sync"
  "zoom-oauth-callback"
  "zoom-oauth-exchange"
  "zoom-progressive-sync"
  "zoom-sync-diagnostics"
  "zoom-sync-progress"
  "zoom-sync-simple"
  "zoom-sync-webinars"
  "zoom-sync-webinars-v2"
  "zoom-test-fetch"
  "zoom-token-refresh"
  "zoom-webhook"
)

echo ""
echo "The following edge functions will be removed:"
echo "============================================"
for func in "${FUNCTIONS_TO_REMOVE[@]}"; do
  echo "- $func"
done
echo ""
echo "Total: ${#FUNCTIONS_TO_REMOVE[@]} functions"
echo ""
read -p "Are you sure you want to remove all these functions? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cleanup cancelled."
  exit 0
fi

echo ""
echo "Starting cleanup..."
echo ""

# Counter for tracking progress
removed=0
failed=0

# Remove each function
for func in "${FUNCTIONS_TO_REMOVE[@]}"; do
  echo -n "Removing $func... "
  
  if supabase functions delete "$func" --project-ref lgajnzldkfpvcuofjxom 2>/dev/null; then
    echo "✓ Removed"
    ((removed++))
  else
    echo "✗ Failed (may not exist)"
    ((failed++))
  fi
done

echo ""
echo "============================================"
echo "Cleanup Summary:"
echo "- Successfully removed: $removed functions"
echo "- Failed/Not found: $failed functions"
echo "============================================"
echo ""
echo "Edge function cleanup completed!"
echo ""
echo "Next steps:"
echo "1. Verify in Supabase dashboard that functions are removed"
echo "2. Update any documentation that references edge functions"
echo "3. Ensure all API calls now point to Render backend"
