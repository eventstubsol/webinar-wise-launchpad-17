@echo off
echo === FIXING ZOOM SYNC ISSUE ===
echo.

echo 1. Running diagnostic script...
node fix-sync-issue.js

echo.
echo 2. Checking backend dependencies...
cd render-backend
call npm list axios @supabase/supabase-js 2>nul || call npm install axios @supabase/supabase-js

echo.
echo 3. Running sync fix from backend...
node fix-zoom-api-issue.js

cd ..

echo.
echo === FIX COMPLETE ===
echo.
echo Next steps:
echo 1. Check the output above for any errors
echo 2. Try running sync again from the dashboard
echo 3. If issues persist, check the sync logs in Supabase
pause
