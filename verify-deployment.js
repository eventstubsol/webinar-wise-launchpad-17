const axios = require('axios'); 
 
async function verifyDeployment() { 
  console.log('Verifying Render deployment...'); 
  try { 
    const response = await axios.get('https://webinar-wise-launchpad-17.onrender.com/health'); 
    console.log('Health check response:', response.data); 
    console.log('✅ Deployment successful!'); 
  } catch (error) { 
    console.error('❌ Deployment verification failed:', error.message); 
  } 
} 
 
setTimeout(() => { 
  verifyDeployment(); 
}, 5000); 
