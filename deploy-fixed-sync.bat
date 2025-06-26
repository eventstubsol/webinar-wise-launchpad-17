@echo off
echo Deploying fixed zoom-sync-webinars-v2 edge function...

REM Load environment variables
if exist .env (
    for /f "usebackq tokens=*" %%a in (".env") do (
        echo %%a | findstr /v "^#" >nul && set "%%a"
    )
)

REM Deploy the function
supabase functions deploy zoom-sync-webinars-v2 ^
  --project-ref lgajnzldkfpvcuofjxom ^
  --no-verify-jwt

if %errorlevel% equ 0 (
    echo Successfully deployed zoom-sync-webinars-v2
) else (
    echo Failed to deploy zoom-sync-webinars-v2
    exit /b 1
)

echo.
echo Deployment complete!
echo.
echo To trigger a sync and fix the data, run:
echo node fix-webinar-sync-data.js
