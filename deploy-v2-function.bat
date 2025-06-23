@echo off
echo Deploying zoom-sync-webinars-v2 edge function...

cd /d "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-12-09062025\webinar-wise-launchpad"

echo Deploying to Supabase...
supabase functions deploy zoom-sync-webinars-v2 --project-ref guwvvinnifypcxwbcnzz

echo.
echo Deployment complete!
pause
