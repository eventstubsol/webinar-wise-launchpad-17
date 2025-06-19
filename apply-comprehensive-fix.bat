@echo off
echo ================================================
echo Comprehensive Fix for Zoom Sync Edge Function
echo ================================================
echo.

set PROJECT_REF=guwvvinnifypcxwbcnzz

echo Step 1: Apply Database Constraints via Supabase Dashboard
echo ---------------------------------------------------------
echo.
echo Please go to: https://supabase.com/dashboard/project/%PROJECT_REF%/sql/new
echo.
echo Copy and paste this SQL, then click "Run":
echo.
echo -- Fix missing constraints
echo DO $$ BEGIN
echo     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'zoom_webinars_webinar_connection_unique') THEN
echo         DELETE FROM zoom_webinars a USING zoom_webinars b WHERE a.id ^< b.id AND a.webinar_id = b.webinar_id AND a.connection_id = b.connection_id;
echo         ALTER TABLE zoom_webinars ADD CONSTRAINT zoom_webinars_webinar_connection_unique UNIQUE (webinar_id, connection_id);
echo     END IF;
echo END $$;
echo.
echo DO $$ BEGIN
echo     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'zoom_participants_webinar_participant_unique') THEN
echo         DELETE FROM zoom_participants a USING zoom_participants b WHERE a.id ^< b.id AND a.webinar_id = b.webinar_id AND a.participant_id = b.participant_id;
echo         ALTER TABLE zoom_participants ADD CONSTRAINT zoom_participants_webinar_participant_unique UNIQUE (webinar_id, participant_id);
echo     END IF;
echo END $$;
echo.
echo Press any key after running the SQL...
pause > nul

echo.
echo Step 2: Deploy Updated Edge Function
echo ------------------------------------
supabase functions deploy zoom-sync-webinars --project-ref %PROJECT_REF%

if %errorlevel% neq 0 (
    echo.
    echo If deployment failed, please deploy via dashboard:
    echo https://supabase.com/dashboard/project/%PROJECT_REF%/functions/zoom-sync-webinars
    echo.
)

echo.
echo Step 3: Check Edge Function Logs
echo --------------------------------
echo.
echo To view logs, go to:
echo https://supabase.com/dashboard/project/%PROJECT_REF%/functions/zoom-sync-webinars/logs
echo.
echo Or run: supabase functions logs zoom-sync-webinars --project-ref %PROJECT_REF% --tail
echo.

echo.
echo Step 4: Test the Fix
echo --------------------
echo.
echo 1. Open your browser console (F12)
echo 2. Copy and run the contents of debug-edge-function.js
echo 3. Try the sync again from your UI
echo 4. If it fails, check the console for detailed error info
echo.

echo ================================================
echo Fix deployment complete!
echo ================================================
echo.
pause
