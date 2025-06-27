const axios = require('axios');

const RENDER_API_BASE_URL = 'https://webinar-wise-launchpad-17.onrender.com';

async function checkRenderHealth() {
  console.log('🏥 Checking Render service health...\n');
  
  try {
    // Check health endpoint
    console.log('1. Testing /health endpoint...');
    const healthResponse = await axios.get(`${RENDER_API_BASE_URL}/health`, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    console.log('✅ Health check passed!');
    console.log('Response:', healthResponse.data);
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Health check failed!');
    if (error.code === 'ECONNREFUSED') {
      console.error('   Service is not responding - it may be offline or starting up');
    } else if (error.code === 'ECONNABORTED' || error.code === 'TIMEOUT') {
      console.error('   Request timed out - service is slow to respond');
    } else if (error.response) {
      console.error(`   HTTP ${error.response.status}: ${error.response.statusText}`);
      console.error('   Response:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    console.log('\n');
    
    // Try to wake up the service
    console.log('2. Attempting to wake up the service...');
    console.log('   Note: Render services on free tier go to sleep after 15 minutes of inactivity');
    console.log('   The first request after sleep can take 30-60 seconds to respond');
    console.log('\n');
    
    // Make multiple attempts with longer timeout
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`   Attempt ${attempt}/3...`);
      try {
        const wakeResponse = await axios.get(`${RENDER_API_BASE_URL}/health`, {
          timeout: 60000, // 60 second timeout
          headers: {
            'Accept': 'application/json',
          }
        });
        
        console.log('   ✅ Service is now responding!');
        console.log('   Response:', wakeResponse.data);
        break;
      } catch (wakeError) {
        if (attempt === 3) {
          console.error('   ❌ Service is not responding after 3 attempts');
          console.error('   Please check the Render dashboard for deployment status');
        } else {
          console.log('   Still waiting...');
        }
      }
    }
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Go to https://dashboard.render.com and check your service logs');
  console.log('2. Verify all environment variables are set correctly on Render');
  console.log('3. Check if the service has recent successful deploys');
  console.log('4. If on free tier, upgrade to keep service always active');
}

checkRenderHealth();
