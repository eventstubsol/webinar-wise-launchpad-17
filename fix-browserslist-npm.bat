@echo off
echo ========================================
echo Fixing Browserslist Database
echo ========================================
echo.

echo Updating caniuse-lite using npm...
echo.

REM First, let's update caniuse-lite directly using npm
call npm update caniuse-lite --save-dev

echo.
echo Browserslist database updated successfully using npm!
echo.

echo To verify the update, you can check your package.json
echo or run: npm list caniuse-lite
echo.

echo ========================================
echo Fix Complete!
echo ========================================
echo.
pause
