@echo off
echo ===================================
echo Reverting Last Commit
echo ===================================
echo.

cd /d "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17"

echo Current Git status:
git status
echo.

echo ===================================
echo Showing last commit:
echo ===================================
git log -1 --oneline
echo.

echo ===================================
echo Reverting the last commit...
echo ===================================
git revert HEAD --no-edit

echo.
echo ===================================
echo Pushing the revert to GitHub...
echo ===================================
git push origin main

echo.
echo ===================================
echo Revert Complete!
echo ===================================
echo.
echo The last commit has been reverted.
echo Render should automatically deploy the reverted changes.
echo.
pause
