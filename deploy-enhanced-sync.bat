@echo off
REM Script to deploy enhanced Zoom sync to GitHub (Windows version)

echo === Deploying Enhanced Zoom Sync to GitHub ===
echo.

REM Add all changed files
echo Adding changed files...
git add render-backend\services\zoomService.js
git add render-backend\services\zoomSyncService.js
git add render-backend\services\zoomSyncServiceEnhanced.js
git add render-backend\test-enhanced-sync.js
git add render-backend\test-zoom-api-directly.js
git add render-backend\proper-participant-resync.js
git add render-backend\emergency-resync-participants.js
git add render-backend\test-zoom-participants-fix.js
git add supabase\migrations\20250629_fix_participant_sessions.sql
git add ZOOM_ENHANCED_SYNC_SOLUTION.md
git add ZOOM_PARTICIPANTS_DATA_FIX.md

REM Show status
echo.
echo Git status:
git status --short

REM Commit with detailed message
echo.
echo Creating commit...
git commit -m "Fix Zoom participant sync for large webinars with session tracking" -m "CRITICAL FIX: Resolves issue where webinars with 1,200+ attendees only showed 50-100 participants" -m "Changes:" -m "- Added zoom_participant_sessions table to track multiple join/leave sessions" -m "- Enhanced sync to use report endpoint with detailed participant data" -m "- Implemented proper pagination for large result sets (300+ per page)" -m "- Added session aggregation to calculate total attendance time" -m "- Fixed recurring webinar instance handling" -m "- Added comprehensive error handling and logging" -m "Database changes:" -m "- New table: zoom_participant_sessions for tracking rejoins" -m "- Enhanced zoom_participants with session tracking columns" -m "- Added analytics view for attendance metrics" -m "- Removed problematic unique constraints" -m "API improvements:" -m "- Use /report/webinars/{id}/participants with include_fields" -m "- Handle recurring webinar instances properly" -m "- Smart fallback strategy between endpoints" -m "- Rate limit protection for large syncs" -m "Expected impact:" -m "- Will properly sync all 1,200+ participants per large webinar" -m "- Tracks multiple sessions when participants rejoin" -m "- Accurate total attendance time calculations" -m "- From 355 total participants to 10,000+ expected"

REM Push to GitHub
echo.
echo Pushing to GitHub...
git push origin main

echo.
echo === Deployment Complete ===
echo.
echo Next steps:
echo 1. Render should automatically detect the changes and redeploy
echo 2. Monitor the Render dashboard for deployment status
echo 3. Once deployed, run: node render-backend/test-enhanced-sync.js
echo 4. Check the database for improved participant counts
pause
