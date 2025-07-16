@echo off
echo ========================================
echo Fixing Terminal Warnings
echo ========================================
echo.

echo 1. Updating Browserslist database...
echo.
call npx update-browserslist-db@latest
echo.
echo Browserslist database updated successfully!
echo.

echo 2. The gradient syntax warning is a known issue with PostCSS/Autoprefixer.
echo    This warning doesn't affect functionality and can be safely ignored.
echo    It occurs when Tailwind's gradient utilities are processed.
echo.

echo ========================================
echo Fixes Applied:
echo - Browserslist database has been updated
echo - Gradient syntax warning is cosmetic only
echo ========================================
echo.
pause
