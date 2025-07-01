@echo off
echo ===================================
echo Zoom Sync Fix with Enhanced Logging
echo ===================================
echo.

cd /d "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17"

echo Checking current Git status...
git status

echo.
echo ===================================
echo Adding enhanced logging files...
echo ===================================
git add render-backend/services/zoomService.js
git add render-backend/services/zoomSyncService.js

echo.
echo ===================================
echo Creating commit...
echo ===================================
git commit -m "Add enhanced logging to debug 400 error in Zoom sync" -m "- Add detailed console logging to zoomSyncService.js" -m "- Add API request/response logging to zoomService.js" -m "- Log user enumeration details and webinar fetch attempts" -m "- Log specific Zoom API error details for 400 errors" -m "- Add emoji indicators for success/failure states"

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
echo Check the Render logs after deployment to see the detailed error messages.
echo.
pause
