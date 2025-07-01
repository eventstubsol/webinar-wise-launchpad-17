@echo off
echo ===================================
echo Zoom Sync Fix - Deployment Script
echo ===================================
echo.

cd /d "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17"

echo Checking current Git status...
git status

echo.
echo ===================================
echo Adding fixed files to Git...
echo ===================================
git add render-backend/services/zoomService.js
git add render-backend/services/zoomSyncService.js

echo.
echo ===================================
echo Creating commit...
echo ===================================
git commit -m "Fix Zoom sync: Add user enumeration for Server-to-Server OAuth apps" -m "- Add getUsers() and getUserWebinars() methods to zoomService" -m "- Update syncWebinars to enumerate all users first" -m "- Fetch webinars for each user instead of using /users/me/webinars" -m "- Get full webinar details from detail endpoint for missing fields" -m "- Fixes issue where Server-to-Server OAuth apps get 0 webinars"

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
echo Check the Render dashboard for deployment status.
echo.
pause
