@echo off
echo Deploying Edge Function directly to Supabase...
echo ===============================================

set PROJECT_REF=guwvvinnifypcxwbcnzz

echo.
echo Step 1: Deploy Edge Function
echo ----------------------------

REM Deploy without using local config
cd supabase\functions\zoom-sync-webinars
supabase functions deploy zoom-sync-webinars --project-ref %PROJECT_REF% --no-verify-jwt

if %errorlevel% neq 0 (
    echo.
    echo Trying alternative deployment method...
    cd ..\..\..
    supabase functions deploy zoom-sync-webinars --project-ref %PROJECT_REF%
    
    if %errorlevel% neq 0 (
        echo Edge Function deployment failed!
        echo.
        echo Please try running this command manually:
        echo supabase functions deploy zoom-sync-webinars --project-ref %PROJECT_REF%
        pause
        exit /b 1
    )
) else (
    cd ..\..\..
)

echo Edge Function deployed successfully!

echo.
echo Step 2: Apply Database Migration
echo --------------------------------

REM Apply the specific migration file
supabase db push --project-ref %PROJECT_REF% --include "20250619-fix-participant-constraints.sql"

if %errorlevel% neq 0 (
    echo.
    echo Trying to apply migration directly...
    psql "postgresql://postgres.%PROJECT_REF%:[YOUR-DB-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -f supabase\migrations\20250619-fix-participant-constraints.sql
    
    echo.
    echo If the above failed, you can apply the migration manually in the Supabase SQL Editor.
)

echo.
echo Step 3: Test the deployment
echo ---------------------------

echo Testing CORS headers...
curl -I -X OPTIONS "https://%PROJECT_REF%.supabase.co/functions/v1/zoom-sync-webinars" -H "Origin: http://localhost:8080"

echo.
echo ===============================================
echo Deployment steps completed!
echo.
echo Next steps:
echo 1. Test the sync from your application
echo 2. Check Edge Function logs:
echo    supabase functions logs zoom-sync-webinars --project-ref %PROJECT_REF% --tail
echo.
echo If you still see errors:
echo 1. Make sure you're logged in: supabase login
echo 2. Try deploying from Supabase Dashboard: https://supabase.com/dashboard/project/%PROJECT_REF%/functions
echo.
pause
