// Test script to diagnose server startup issues
console.log('Starting test script...');

try {
  // Load environment variables
  require('dotenv').config();
  console.log('✅ Environment variables loaded');
  console.log('PORT:', process.env.PORT);
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Present' : 'Missing');
  
  // Test express
  const express = require('express');
  console.log('✅ Express loaded');
  
  // Test creating app
  const app = express();
  console.log('✅ Express app created');
  
  // Simple test route
  app.get('/test', (req, res) => {
    res.json({ message: 'Test successful!' });
  });
  
  // Start server
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`✅ Test server running on port ${PORT}`);
    console.log(`Try: http://localhost:${PORT}/test`);
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
