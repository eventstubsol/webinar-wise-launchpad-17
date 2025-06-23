@echo off
echo ============================================
echo Deploying FIXED Zoom Sync Webinars Function
echo ============================================
echo.

cd /d "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-12-09062025\webinar-wise-launchpad"

echo 📦 Deploying fixed edge function to Supabase...
echo.

REM Deploy the edge function with the fix
supabase functions deploy zoom-sync-webinars --project-ref guwvvinnifypcxwbcnzz

echo.
echo ✅ Deployment complete!
echo.
echo 🔍 To verify the fix:
echo 1. The CORS error should be resolved (test_mode header is now allowed)
echo 2. The processed count should show correctly (e.g., 40/40 instead of 0/40)
echo.
echo 📝 Test the function by:
echo 1. Running sync from the frontend
echo 2. Checking the sync logs in the database
echo 3. Verifying the processed_items count matches total_items
echo.
pause
