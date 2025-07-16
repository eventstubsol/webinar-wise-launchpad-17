@echo off
echo ===================================
echo Fix Frontend - Remove zoom_registrants Reference
echo ===================================
echo.

cd /d "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17"

echo Checking current Git status...
git status

echo.
echo ===================================
echo Adding frontend fix...
echo ===================================
git add src/hooks/useWebinarMetrics/dataService.ts

echo.
echo ===================================
echo Creating commit...
echo ===================================
git commit -m "Fix frontend error: Remove reference to non-existent zoom_registrants table" -m "- Use registrants_count from zoom_webinars table instead" -m "- Map the data to maintain compatibility with existing code" -m "- Fixes 400 error in dashboard"

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
echo The frontend error should be fixed after deployment.
echo Registrant counts will now come from the zoom_webinars table.
echo.
pause
