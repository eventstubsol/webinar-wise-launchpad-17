@echo off
echo Deploying fixed zoom-sync-webinars edge function...

REM Deploy the function
supabase functions deploy zoom-sync-webinars ^
  --project-ref lgajnzldkfpvcuofjxom ^
  --no-verify-jwt

if %errorlevel% equ 0 (
    echo Successfully deployed zoom-sync-webinars
) else (
    echo Failed to deploy zoom-sync-webinars
    exit /b 1
)

echo.
echo Deployment complete!
echo.
echo The sync will now fetch participant and registrant data for past webinars.
