@echo off
echo ===========================================
echo WEBINAR WISE - SYNC AND FIX UTILITY
echo ===========================================
echo.

cd /d "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17\render-backend"

echo Choose an option:
echo 1. Fix attendee counts for all webinars
echo 2. Resync a specific webinar
echo 3. Deploy changes to Render
echo 4. Exit
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Running attendee count fix...
    node test-fix-attendees.js
) else if "%choice%"=="2" (
    echo.
    set /p webinarId="Enter the webinar ID to resync: "
    set /p connectionId="Enter the connection ID: "
    echo.
    echo Resyncing webinar %webinarId%...
    node -e "require('./services/fixAttendeeCount').resyncWebinarAttendees('%webinarId%', '%connectionId%').then(r => console.log(JSON.stringify(r, null, 2))).catch(console.error)"
) else if "%choice%"=="3" (
    echo.
    echo Deploying to Render...
    git add .
    git commit -m "Fix unique attendee counting and sync button"
    git push origin main
    echo.
    echo Deployment initiated. Check Render dashboard for status.
) else if "%choice%"=="4" (
    echo.
    echo Exiting...
    exit /b
) else (
    echo.
    echo Invalid choice. Please run again.
)

echo.
pause
