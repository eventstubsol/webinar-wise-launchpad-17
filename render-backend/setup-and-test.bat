@echo off
echo =====================================
echo WEBINAR WISE BACKEND SETUP & TEST
echo =====================================
echo.

cd /d C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17\render-backend

echo [1/4] Checking for .env file...
if exist .env (
    echo Found .env file
) else (
    echo Creating .env file from example...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please update the .env file with your Supabase credentials:
    echo 1. SUPABASE_URL is already set
    echo 2. SUPABASE_ANON_KEY is already set
    echo 3. You need to add SUPABASE_SERVICE_ROLE_KEY from:
    echo    https://app.supabase.com/project/lgajnzldkfpvcuofjxom/settings/api
    echo.
)

echo.
echo [2/4] Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to install dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
)

echo.
echo [3/4] Running authentication test...
echo.
node fix-auth-comprehensive.js

echo.
echo [4/4] Setup Instructions:
echo.
echo To complete the setup:
echo.
echo 1. Get your Service Role Key:
echo    - Go to: https://app.supabase.com/project/lgajnzldkfpvcuofjxom/settings/api
echo    - Copy the "service_role" key (NOT the anon key)
echo    - Add it to the .env file as SUPABASE_SERVICE_ROLE_KEY
echo.
echo 2. Deploy to Render:
echo    - Commit your changes: git add . && git commit -m "Fix auth"
echo    - Push to GitHub: git push origin main
echo    - Render will auto-deploy
echo.
echo 3. Set Environment Variables on Render:
echo    - Go to: https://dashboard.render.com
echo    - Find your service: webinar-wise-launchpad-17
echo    - Go to Environment tab
echo    - Add all three Supabase variables from your .env file
echo.
echo 4. After Render deployment completes:
echo    - Test the sync in your app
echo    - Monitor logs at: https://dashboard.render.com
echo.
pause
