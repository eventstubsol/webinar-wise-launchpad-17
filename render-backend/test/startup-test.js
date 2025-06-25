
const http = require('http');

// Test script to verify backend starts successfully
const testStartup = () => {
  console.log('🧪 Testing backend startup...');
  
  const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3001,
    path: '/health',
    method: 'GET',
    timeout: 10000
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('✅ Backend startup test passed');
        console.log('Status Code:', res.statusCode);
        console.log('Response:', response);
        process.exit(0);
      } catch (error) {
        console.error('❌ Invalid JSON response:', data);
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Backend startup test failed:', error.message);
    process.exit(1);
  });

  req.on('timeout', () => {
    console.error('❌ Backend startup test timed out');
    req.destroy();
    process.exit(1);
  });

  req.end();
};

// Wait a moment for server to start, then test
setTimeout(testStartup, 2000);
