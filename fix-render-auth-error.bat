@echo off
echo ============================================
echo Fixing Render Backend Authorization Issue
echo ============================================
echo.

echo The sync is failing with error 401 (Unauthorized)
echo This means the Render backend cannot verify your session token
echo.

echo CAUSE: Missing Supabase environment variables on Render
echo.

echo ============================================
echo IMMEDIATE FIX INSTRUCTIONS:
echo ============================================
echo.
echo 1. Open https://dashboard.render.com in your browser
echo 2. Login to your Render account
echo 3. Find service: webinar-wise-launchpad-17
echo 4. Click on "Environment" tab
echo 5. Add these environment variables:
echo.
echo    SUPABASE_URL = (your Supabase project URL)
echo    SUPABASE_SERVICE_ROLE_KEY = (your service role key)
echo    SUPABASE_ANON_KEY = (your anon/public key)
echo    NODE_ENV = production
echo.
echo 6. To get these values:
echo    - Go to https://app.supabase.com
echo    - Select your project: lgajnzldkfpvcuofjxom
echo    - Go to Settings -^> API
echo    - Copy the values:
echo      * Project URL -^> SUPABASE_URL
echo      * service_role key -^> SUPABASE_SERVICE_ROLE_KEY  
echo      * anon key -^> SUPABASE_ANON_KEY
echo.
echo 7. After adding, Render will auto-redeploy (2-3 minutes)
echo 8. Once deployed, sync should work!
echo.
echo ============================================
echo CHECKING SERVICE STATUS...
echo ============================================
echo.

echo Testing health endpoint (no auth required)...
curl -X GET "https://webinar-wise-launchpad-17.onrender.com/health" -H "Accept: application/json"

echo.
echo.
echo If health check passes but sync still fails,
echo the issue is definitely missing environment variables.
echo.
echo Press any key to see Supabase project info...
pause >nul

echo.
echo ============================================
echo YOUR SUPABASE PROJECT INFO:
echo ============================================
echo.
echo Project ID: lgajnzldkfpvcuofjxom
echo Dashboard: https://app.supabase.com/project/lgajnzldkfpvcuofjxom/settings/api
echo.
echo Go to the above URL to find your API keys!
echo.
pause
