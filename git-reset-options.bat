@echo off
echo ===================================
echo Git Reset to Previous Working State
echo ===================================
echo.

cd /d "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17"

echo Current Git status:
git status
echo.

echo ===================================
echo Last 5 commits:
echo ===================================
git log -5 --oneline
echo.

echo ===================================
echo OPTION 1: Soft Reset (keeps changes in working directory)
echo ===================================
echo To reset to the previous commit but keep changes:
echo git reset --soft HEAD~1
echo.

echo ===================================
echo OPTION 2: Hard Reset (discards all changes)
echo ===================================
echo To completely discard the last commit and all changes:
echo git reset --hard HEAD~1
echo.

echo ===================================
echo OPTION 3: Reset to specific commit
echo ===================================
echo To reset to the last known working state (enhanced logging commit):
echo git reset --hard a2393e9763374a00f2d6651b6eb9d00959eb5eb6
echo.

echo Choose an option and run the appropriate command manually.
echo After resetting, you'll need to force push:
echo git push origin main --force
echo.
pause
