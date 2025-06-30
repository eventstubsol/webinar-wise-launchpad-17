@echo off
echo ===========================================
echo FIX ZOOM ATTENDEE COUNTS
echo ===========================================
echo.

cd /d "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17\render-backend"

echo Running attendee count fix...
echo.

node test-fix-attendees.js

echo.
echo ===========================================
echo FIX COMPLETED
echo ===========================================
echo.

pause
