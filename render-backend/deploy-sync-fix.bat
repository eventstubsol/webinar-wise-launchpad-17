@echo off
echo === Deploying Fixed Zoom Sync Service ===
echo.

REM Check if we're in the render-backend directory
if not exist "package.json" (
    echo Error: Must run from render-backend directory
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

REM Test the fix locally
echo Testing sync fix locally...
node test-sync-fix.js

echo.
echo Committing and pushing changes...

REM Add changes
git add services/zoomSyncServiceFixed.js
git add routes/sync-webinars.js
git add routes/start-sync-async.js
git add test-sync-fix.js

REM Commit
git commit -m "Fix Zoom sync service - proper pagination and upsert handling" -m "- Fixed pagination for fetching all webinars" -m "- Fixed pagination for fetching participants with next_page_token" -m "- Replaced invalid .onConflict() with proper Supabase upsert syntax" -m "- Added fallback logic for upsert operations" -m "- Improved error handling and progress tracking" -m "- Fixed session tracking for participants"

REM Push to trigger Render deployment
git push origin main

echo.
echo Changes pushed! Render will automatically deploy the updated service.
echo.
echo Next steps:
echo 1. Monitor the Render dashboard for deployment status
echo 2. Once deployed, test sync from the UI
echo 3. Check logs at: https://dashboard.render.com/web/srv-ct3j04rtq21c73a0va20/logs
echo.
echo Fixed issues:
echo - Pagination now fetches ALL webinars and participants
echo - Proper Supabase upsert syntax (no .onConflict() error)
echo - Progress updates work correctly
echo - Session tracking for participants
echo - NO DATA DELETION - only upserts
echo.
pause
