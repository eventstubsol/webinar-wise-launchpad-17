import axios from 'axios';

const RENDER_URL = 'https://webinar-wise-launchpad-17.onrender.com';

async function testRenderService() {
  console.log('========================================');
  console.log('TESTING RENDER SERVICE (STARTER PLAN)');
  console.log('========================================\n');

  // Test 1: Health Check
  console.log('1. Testing Health Endpoint...');
  try {
    const startTime = Date.now();
    const response = await axios.get(`${RENDER_URL}/health`, {
      timeout: 5000
    });
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ Health check passed! Response time: ${responseTime}ms`);
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Supabase: ${response.data.supabase ? 'Connected' : 'Not Connected'}\n`);
    
    // On Starter plan, response should be fast (no cold start)
    if (responseTime < 1000) {
      console.log('🚀 Excellent! Service responded quickly (no cold start detected)');
    } else if (responseTime < 5000) {
      console.log('⚡ Good response time for initial request');
    } else {
      console.log('⚠️  Slow response - this shouldn\'t happen on Starter plan');
    }
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    console.log('   Make sure the Render service is deployed and running\n');
  }

  // Test 2: Multiple Rapid Requests (should all be fast on Starter)
  console.log('\n2. Testing Multiple Rapid Requests...');
  const requestTimes = [];
  
  for (let i = 1; i <= 5; i++) {
    try {
      const startTime = Date.now();
      await axios.get(`${RENDER_URL}/health`, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      requestTimes.push(responseTime);
      console.log(`   Request ${i}: ${responseTime}ms`);
    } catch (error) {
      console.log(`   Request ${i}: Failed - ${error.message}`);
    }
  }
  
  if (requestTimes.length > 0) {
    const avgTime = Math.round(requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length);
    console.log(`\n   Average response time: ${avgTime}ms`);
    
    if (avgTime < 500) {
      console.log('   🌟 Excellent performance! Service is running hot.');
    } else if (avgTime < 1000) {
      console.log('   ✅ Good performance for Starter plan.');
    } else {
      console.log('   ⚠️  Response times seem high for Starter plan.');
    }
  }

  // Test 3: Check Environment Variables
  console.log('\n3. Checking Configuration...');
  console.log('   Please verify these are set in Render dashboard:');
  console.log('   - SUPABASE_URL');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY');
  console.log('   - SUPABASE_ANON_KEY');
  console.log('   - NODE_ENV=production');

  console.log('\n========================================');
  console.log('RECOMMENDATIONS:');
  console.log('========================================');
  console.log('1. Monitor service logs in Render dashboard');
  console.log('2. Set up health check monitoring');
  console.log('3. Configure auto-deploy from GitHub');
  console.log('4. Enable deploy notifications');
  console.log('\n✅ Your Starter plan should eliminate all cold start issues!');
}

// Run the test
testRenderService().catch(console.error);
