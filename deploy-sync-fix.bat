@echo off
echo =====================================
echo WEBINAR WISE SYNC FIX DEPLOYMENT
echo =====================================
echo.

REM Navigate to project directory
cd /d "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17"

echo [1/5] Summary of the fix:
echo - Removed dependency on non-existent edge function zoom-sync-webinars-v2
echo - Implemented local sync processing in the Render backend
echo - Created zoomSyncService.js to handle webinar syncing
echo - Updated zoomService.js with missing methods
echo.

echo [2/5] Files modified:
echo - render-backend/routes/start-sync-async.js
echo - render-backend/services/zoomService.js
echo - render-backend/services/zoomSyncService.js (new)
echo.

echo [3/5] Committing changes to Git...
git add render-backend/routes/start-sync-async.js
git add render-backend/services/zoomService.js
git add render-backend/services/zoomSyncService.js
git commit -m "Fix: Replace non-existent edge function with local sync implementation

- Removed call to zoom-sync-webinars-v2 edge function that doesn't exist
- Implemented local sync processing in runSyncAsync function
- Created zoomSyncService to handle webinar and participant syncing
- Added missing methods to zoomService (getWebinar, getWebinarParticipants)
- Sync now runs entirely on Render backend without edge function dependency"

echo.

echo [4/5] Pushing to GitHub...
git push origin main

echo.

echo [5/5] Deployment Instructions:
echo.
echo The changes will automatically deploy to Render after pushing to GitHub.
echo Please wait 2-5 minutes for Render to complete the deployment.
echo.
echo Monitor deployment at: https://dashboard.render.com
echo.
echo After deployment completes:
echo 1. Test the sync functionality in the app
echo 2. The sync should now complete successfully without the edge function error
echo 3. Check the sync logs in the database to verify completion
echo.

echo Creating test script...
cat > test-sync-fix.js << 'EOF'
const axios = require('axios');

async function testSyncFix() {
  console.log('\nTesting Webinar Sync Fix...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get('https://webinar-wise-launchpad-17.onrender.com/health');
    console.log('✅ Health check passed:', healthResponse.data);
    
    console.log('\n2. The sync fix removes dependency on the missing edge function.');
    console.log('   Sync now runs entirely on the Render backend.');
    console.log('\n3. To test the sync:');
    console.log('   - Open the Webinar Wise app');
    console.log('   - Go to Sync Center');
    console.log('   - Click "Quick Sync"');
    console.log('   - The sync should now complete successfully\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSyncFix();
EOF

echo.
echo Test script created: test-sync-fix.js
echo Run it after deployment: node test-sync-fix.js
echo.
echo =====================================
echo DEPLOYMENT INITIATED
echo =====================================
echo.
pause
