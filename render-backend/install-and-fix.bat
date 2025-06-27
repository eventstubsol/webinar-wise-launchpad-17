@echo off
echo =====================================
echo INSTALLING DEPENDENCIES AND RUNNING FIX
echo =====================================
echo.

echo [1/3] Installing npm dependencies...
npm install
echo.

echo [2/3] Running auth fix test...
node fix-auth-comprehensive.js
echo.

echo [3/3] Complete!
echo.
pause
