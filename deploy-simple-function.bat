@echo off
cls
echo ============================================
echo   DEPLOYING SIMPLIFIED EDGE FUNCTION
echo ============================================
echo.
echo I've created a simplified version that will:
echo 1. Test basic functionality
echo 2. Create a sync log
echo 3. Return success
echo.
echo This will help us identify the exact issue.
echo.
echo DEPLOYMENT STEPS:
echo -----------------
echo.
echo 1. Go to Supabase Dashboard:
echo    https://supabase.com/dashboard/project/guwvvinnifypcxwbcnzz/functions/zoom-sync-webinars
echo.
echo 2. Click "Deploy Function" or "New Deployment"
echo.
echo 3. Wait for deployment to complete (about 30 seconds)
echo.
echo 4. Come back here and press any key to test
echo.
pause

echo.
echo Testing the deployed function...
echo.

REM Create test HTML file
echo ^<!DOCTYPE html^> > test-sync.html
echo ^<html^>^<head^>^<title^>Test Sync^</title^>^</head^> >> test-sync.html
echo ^<body^> >> test-sync.html
echo ^<h1^>Edge Function Test^</h1^> >> test-sync.html
echo ^<button onclick="testSync()"^>Test Sync^</button^> >> test-sync.html
echo ^<pre id="result"^>^</pre^> >> test-sync.html
echo ^<script^> >> test-sync.html
echo async function testSync() { >> test-sync.html
echo   const result = document.getElementById('result'); >> test-sync.html
echo   result.textContent = 'Testing...'; >> test-sync.html
echo   >> test-sync.html
echo   // Test CORS first >> test-sync.html
echo   const corsResp = await fetch('https://guwvvinnifypcxwbcnzz.supabase.co/functions/v1/zoom-sync-webinars', { >> test-sync.html
echo     method: 'OPTIONS', >> test-sync.html
echo     headers: { 'Origin': 'http://localhost:8080' } >> test-sync.html
echo   }); >> test-sync.html
echo   >> test-sync.html
echo   if (corsResp.status === 200) { >> test-sync.html
echo     result.textContent = 'CORS: PASS\n\n'; >> test-sync.html
echo     >> test-sync.html
echo     // Now test without auth >> test-sync.html
echo     const testResp = await fetch('https://guwvvinnifypcxwbcnzz.supabase.co/functions/v1/zoom-sync-webinars', { >> test-sync.html
echo       method: 'POST', >> test-sync.html
echo       headers: { 'Content-Type': 'application/json' } >> test-sync.html
echo     }); >> test-sync.html
echo     >> test-sync.html
echo     const data = await testResp.json(); >> test-sync.html
echo     result.textContent += 'Auth Test: ' + (testResp.status === 401 ? 'PASS' : 'FAIL') + '\n'; >> test-sync.html
echo     result.textContent += 'Response: ' + JSON.stringify(data, null, 2); >> test-sync.html
echo   } else { >> test-sync.html
echo     result.textContent = 'CORS: FAIL - Function not deployed properly'; >> test-sync.html
echo   } >> test-sync.html
echo } >> test-sync.html
echo ^</script^> >> test-sync.html
echo ^</body^>^</html^> >> test-sync.html

echo.
echo Test file created: test-sync.html
echo.
echo Open test-sync.html in your browser to test the deployment.
echo.
echo If tests pass, go back to your app and try syncing again.
echo The simplified version should work without errors.
echo.
pause
