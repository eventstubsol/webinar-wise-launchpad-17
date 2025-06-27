@echo off
echo ============================================
echo Fixing Webinar Wise Sync Error
echo ============================================
echo.
echo This will wake up the Render backend service...
echo.

echo Step 1: Checking Render service health...
echo.

curl -X GET "https://webinar-wise-launchpad-17.onrender.com/health" -H "Accept: application/json" -m 60

echo.
echo.
echo Step 2: Waiting for service to fully wake up...
timeout /t 5 /nobreak > nul

echo.
echo Step 3: Making second health check...
curl -X GET "https://webinar-wise-launchpad-17.onrender.com/health" -H "Accept: application/json" -m 30

echo.
echo.
echo ============================================
echo Service wake-up complete!
echo ============================================
echo.
echo Next steps:
echo 1. Go back to your Webinar Wise dashboard
echo 2. Try the sync operation again
echo 3. If it still fails, check:
echo    - https://dashboard.render.com for service logs
echo    - Ensure all environment variables are set
echo.
echo Note: Free tier services sleep after 15 minutes
echo Consider upgrading to keep service always active
echo.
pause
