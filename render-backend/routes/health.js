
const express = require('express');
const router = express.Router();

const startTime = Date.now();

router.get('/', (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  
  res.json({
    success: true,
    message: 'Webinar Wise Render Backend is healthy',
    status: 'healthy',
    uptime,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
