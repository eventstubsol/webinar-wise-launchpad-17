@echo off
echo ==============================================
echo Deploying Sync Status Fix to Production
echo ==============================================

echo.
echo Step 1: Clearing local cache...
echo ----------------------------------------------
REM Clear Vite cache
rmdir /s /q .vite 2>nul
rmdir /s /q node_modules\.vite 2>nul

echo.
echo Step 2: Building for production...
echo ----------------------------------------------
call npm run build

if %errorlevel% neq 0 (
    echo Build failed! Please fix errors before deploying.
    pause
    exit /b 1
)

echo.
echo Step 3: Testing production build locally...
echo ----------------------------------------------
echo Starting preview server...
start cmd /k "npm run preview"

echo.
echo Build completed successfully!
echo.
echo The preview server is running. Please test the following:
echo 1. Navigate to the dashboard
echo 2. Check that the Zoom status displays correctly
echo 3. Verify no console errors about sync_status
echo 4. Test the sync functionality
echo.
echo Once verified, deploy to your hosting platform.
echo.
pause
