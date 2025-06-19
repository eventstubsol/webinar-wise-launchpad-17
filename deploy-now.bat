@echo off
echo ================================================
echo Direct Supabase Edge Function Deployment
echo ================================================
echo.

echo The Edge Function has been updated with fixes:
echo 1. Fixed connection_name reference issue
echo 2. Enhanced error logging
echo 3. Database constraints are already in place
echo.

echo To deploy the Edge Function:
echo.
echo Option 1: Via Dashboard (Recommended)
echo -------------------------------------
echo 1. Go to: https://supabase.com/dashboard/project/guwvvinnifypcxwbcnzz/functions/zoom-sync-webinars
echo 2. Click "Deploy Function" or "New Deployment"
echo 3. The dashboard will use the updated code
echo.

echo Option 2: Via CLI (if working)
echo ------------------------------
echo Run: supabase functions deploy zoom-sync-webinars --project-ref guwvvinnifypcxwbcnzz
echo.

echo After deployment, test with this JavaScript:
echo.
echo fetch('https://guwvvinnifypcxwbcnzz.supabase.co/functions/v1/zoom-sync-webinars', {
echo   method: 'OPTIONS',
echo   headers: { 'Origin': 'http://localhost:8080' }
echo }).then(r =^> console.log('CORS Status:', r.status));
echo.

echo The key fixes applied:
echo - Changed connection.connection_name to connection.zoom_email
echo - Database constraints are now properly set up
echo - Enhanced error logging for better debugging
echo.

pause
