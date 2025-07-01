@echo off
echo =====================================
echo DEPLOYING SYNC FIX TO RENDER
echo =====================================
echo.

echo 1. Staging changes...
cd render-backend
git add routes/start-sync-async.js services/zoomSyncService.js
echo.

echo 2. Committing changes...
git commit -m "Fix sync logging and fetch both scheduled and past webinars

- Added webinars_synced field update in sync log
- Added metadata with detailed sync results
- Fetch both scheduled and past webinars from Zoom API
- Better error handling for participant sync failures
- Improved logging for debugging"
echo.

echo 3. Pushing to GitHub...
git push origin main
echo.

echo =====================================
echo DEPLOYMENT COMPLETE!
echo =====================================
echo.
echo Changes pushed to GitHub. Render will automatically deploy.
echo Monitor deployment at: https://dashboard.render.com
echo.
pause
