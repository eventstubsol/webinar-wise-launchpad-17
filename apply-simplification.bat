@echo off
echo Applying simplified zoom_webinars table migration...

REM Load environment variables
for /f "delims=" %%x in (.env) do (set "%%x")

REM Apply the migration
echo Running migration...
npx supabase db push --db-url "%SUPABASE_DB_URL%"

echo Migration applied successfully!

echo Testing the simplified sync...
node test-simplified-sync.js

echo Done!
pause
