@echo off
echo =====================================
echo WEBINAR WISE AUTH FIX DEPLOYMENT
echo =====================================
echo.

REM Navigate to project directory
cd /d "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17"

echo [1/5] Running comprehensive auth test...
cd render-backend
node fix-auth-comprehensive.js
cd ..
echo.

echo [2/5] Committing changes to Git...
git add render-backend/services/supabaseService.js
git add render-backend/fix-auth-comprehensive.js
git commit -m "Fix: Update auth verification to handle JWT tokens properly

- Implement multiple token verification strategies
- Add setSession method for JWT token verification
- Add fallback methods for compatibility
- Improve error logging and diagnostics
- Fix 401 authentication errors with Render backend"

echo.

echo [3/5] Pushing to GitHub...
git push origin main

echo.

echo [4/5] Deployment will automatically trigger on Render...
echo Please wait for Render to complete the deployment.
echo You can monitor the deployment at: https://dashboard.render.com
echo.

echo [5/5] Creating post-deployment verification script...
echo.

REM Create verification script
echo const axios = require('axios'); > verify-deployment.js
echo. >> verify-deployment.js
echo async function verifyDeployment() { >> verify-deployment.js
echo   console.log('Verifying Render deployment...'); >> verify-deployment.js
echo   try { >> verify-deployment.js
echo     const response = await axios.get('https://webinar-wise-launchpad-17.onrender.com/health'); >> verify-deployment.js
echo     console.log('Health check response:', response.data); >> verify-deployment.js
echo     console.log('✅ Deployment successful!'); >> verify-deployment.js
echo   } catch (error) { >> verify-deployment.js
echo     console.error('❌ Deployment verification failed:', error.message); >> verify-deployment.js
echo   } >> verify-deployment.js
echo } >> verify-deployment.js
echo. >> verify-deployment.js
echo setTimeout(() =^> { >> verify-deployment.js
echo   verifyDeployment(); >> verify-deployment.js
echo }, 5000); >> verify-deployment.js

echo.
echo =====================================
echo DEPLOYMENT INITIATED
echo =====================================
echo.
echo Next steps:
echo 1. Monitor Render deployment: https://dashboard.render.com
echo 2. Run 'node verify-deployment.js' after deployment completes
echo 3. Test the sync functionality in the app
echo.
pause
