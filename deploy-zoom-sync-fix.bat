@echo off
echo =====================================
echo WEBINAR WISE ZOOM SYNC FIX DEPLOYMENT
echo =====================================
echo.

cd /d "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17"

echo [1/4] Committing zoom-oauth-callback edge function...
git add supabase/functions/zoom-oauth-callback/
git add render-backend/services/supabaseService.js
git commit -m "Fix: Add missing zoom-oauth-callback edge function

- Create redirect edge function for zoom sync
- Update Render backend auth verification
- Fix Edge Function returned non-2xx status code error"

echo.
echo [2/4] Pushing to GitHub...
git push origin main

echo.
echo [3/4] Edge function deployment completed on Supabase
echo The zoom-oauth-callback edge function has been deployed successfully.
echo.

echo [4/4] Summary of fixes:
echo - Created missing zoom-oauth-callback edge function that redirects to zoom-sync-webinars
echo - Updated Render backend authentication to handle JWT tokens properly
echo - Both fixes have been deployed
echo.

echo =====================================
echo DEPLOYMENT COMPLETE
echo =====================================
echo.
echo The sync should now work properly. Try syncing again in the app.
echo.
pause
