@echo off
echo 🚀 Deploying comprehensive Zoom sync fix to Supabase...

REM Navigate to project directory
cd /d "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17"

REM Deploy the edge function with the fix
echo 📦 Deploying zoom-sync-webinars edge function with comprehensive fix...
call npx supabase functions deploy zoom-sync-webinars --project-ref lgajnzldkfpvcuofjxom --no-verify-jwt

if %ERRORLEVEL% EQU 0 (
    echo ✅ Edge function deployed successfully!
) else (
    echo ❌ Edge function deployment failed!
    pause
    exit /b 1
)

echo.
echo 🎉 Deployment complete! The sync should now properly:
echo    - Store webinars with correct status (ended for past webinars)
echo    - Sync and store participants in zoom_participants table
echo    - Sync and store registrants in zoom_registrants table
echo    - Update webinar counts (attendees, registrants, absentees)
echo    - Show real-time progress in the UI
echo.
echo 📝 To test the fix:
echo 1. Go to your app and click the Sync button
echo 2. Watch the progress - it should show updating status
echo 3. Check the webinars table - past webinars should show 'ended' status
echo 4. Check zoom_participants and zoom_registrants tables for new data
echo.

pause
