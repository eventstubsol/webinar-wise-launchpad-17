@echo off
echo ===================================
echo Reverting to Working Zoom Sync Code
echo ===================================
echo.

cd /d "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17"

echo Checking current Git status...
git status

echo.
echo ===================================
echo Adding fixed files...
echo ===================================
git add render-backend/services/zoomSyncService.js

echo.
echo ===================================
echo Creating commit...
echo ===================================
git commit -m "Revert to working sync code that uses /users/me/webinars" -m "- Remove user enumeration that requires admin scopes" -m "- Use /users/me/webinars which works correctly for Server-to-Server OAuth" -m "- Keep enhanced logging for debugging" -m "- Fix pagination to get all webinar types (scheduled and past)" -m "- This was working before and returning 39 webinars correctly"

echo.
echo ===================================
echo Pushing to GitHub...
echo ===================================
git push origin main

echo.
echo ===================================
echo Deployment Complete!
echo ===================================
echo.
echo Render should automatically deploy the changes.
echo The sync should start working again, fetching all 39 webinars like before.
echo.
pause
