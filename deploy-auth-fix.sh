#!/bin/bash
# Render Backend Auth Fix Deployment Script

echo "====================================="
echo "WEBINAR WISE AUTH FIX DEPLOYMENT"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project directory
PROJECT_DIR="C:/Users/rajar/Desktop/AA-Webinar-Wise-Master/Version-25-26-06-2025/webinar-wise-launchpad-17"
cd "$PROJECT_DIR" || exit 1

echo -e "${YELLOW}[1/6] Testing current authentication...${NC}"
cd render-backend
if [ -f "fix-auth-comprehensive.js" ]; then
    node fix-auth-comprehensive.js
else
    echo -e "${RED}Test script not found${NC}"
fi
cd ..

echo ""
echo -e "${YELLOW}[2/6] Checking Git status...${NC}"
git status --short

echo ""
echo -e "${YELLOW}[3/6] Staging changes...${NC}"
git add render-backend/services/supabaseService.js
git add render-backend/fix-auth-comprehensive.js
git add deploy-auth-fix.bat
git add RENDER_AUTH_FIX_SUMMARY.md

echo ""
echo -e "${YELLOW}[4/6] Committing changes...${NC}"
git commit -m "Fix: Render backend JWT authentication issue

- Implement multiple token verification strategies
- Add setSession method for JWT token verification  
- Add fallback verification methods
- Improve error logging and diagnostics
- Fix 401 authentication errors

The backend now properly handles JWT tokens sent from the frontend
by using auth.setSession() instead of auth.getUser() for verification."

echo ""
echo -e "${YELLOW}[5/6] Pushing to GitHub...${NC}"
git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully pushed to GitHub${NC}"
else
    echo -e "${RED}✗ Failed to push to GitHub${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[6/6] Deployment will trigger automatically on Render${NC}"
echo ""
echo -e "${GREEN}====================================="
echo "DEPLOYMENT INITIATED SUCCESSFULLY"
echo "=====================================${NC}"
echo ""
echo "Next steps:"
echo "1. Monitor deployment at: https://dashboard.render.com"
echo "2. Verify environment variables are set:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_ANON_KEY" 
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "3. Wait 2-5 minutes for deployment to complete"
echo "4. Test sync functionality in the app"
echo ""
echo "To verify the fix after deployment:"
echo "cd render-backend && node fix-auth-comprehensive.js"
echo ""

# Create a verification script
cat > verify-render-deployment.js << 'EOF'
const axios = require('axios');

async function verifyDeployment() {
  console.log('\n🔍 Verifying Render deployment...\n');
  
  const tests = [
    {
      name: 'Health Check',
      url: 'https://webinar-wise-launchpad-17.onrender.com/health',
      expectedStatus: 200
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await axios.get(test.url, { timeout: 30000 });
      
      if (response.status === test.expectedStatus) {
        console.log(`✅ ${test.name}: PASSED (Status: ${response.status})`);
        console.log(`   Response:`, response.data);
      } else {
        console.log(`❌ ${test.name}: FAILED (Expected: ${test.expectedStatus}, Got: ${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR`);
      console.log(`   ${error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('   Service may still be deploying or sleeping.');
      }
    }
    console.log('');
  }
  
  console.log('\n📋 Deployment Checklist:');
  console.log('[ ] Check Render dashboard for deployment status');
  console.log('[ ] Verify all environment variables are set');
  console.log('[ ] Test authentication in the app');
  console.log('[ ] Try syncing webinars');
  console.log('\n');
}

// Run verification
verifyDeployment().catch(console.error);
EOF

echo -e "${GREEN}Verification script created: verify-render-deployment.js${NC}"
echo "Run it after deployment: node verify-render-deployment.js"
