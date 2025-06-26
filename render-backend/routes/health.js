
const express = require('express');
const router = express.Router();

const startTime = Date.now();

router.get('/', async (req, res) => {
  const healthCheckId = Math.random().toString(36).substring(7);
  console.log(`🏥 [${healthCheckId}] Health check requested`);
  
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const currentTime = new Date().toISOString();
  
  // Environment status
  const envStatus = {
    node_env: process.env.NODE_ENV || 'development',
    supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    api_key_configured: !!process.env.API_KEY
  };

  // Basic health response
  const healthResponse = {
    success: true,
    message: 'Webinar Wise Render Backend is healthy',
    status: 'healthy',
    uptime,
    timestamp: currentTime,
    version: '1.0.0',
    environment: envStatus,
    requestId: healthCheckId
  };

  // Test Supabase connection if configured
  if (envStatus.supabase_configured) {
    try {
      console.log(`🔍 [${healthCheckId}] Testing Supabase connection for health check...`);
      const { supabaseService } = require('../services/supabaseService');
      const connectionTest = await Promise.race([
        supabaseService.testConnection(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection test timeout')), 5000))
      ]);
      
      healthResponse.services = {
        supabase: {
          status: connectionTest ? 'healthy' : 'degraded',
          message: connectionTest ? 'Connection successful' : 'Connection failed'
        }
      };
      
      console.log(`✅ [${healthCheckId}] Supabase health check: ${connectionTest ? 'healthy' : 'degraded'}`);
    } catch (error) {
      console.log(`⚠️ [${healthCheckId}] Supabase health check failed:`, error.message);
      healthResponse.services = {
        supabase: {
          status: 'error',
          message: error.message
        }
      };
    }
  } else {
    healthResponse.services = {
      supabase: {
        status: 'not_configured',
        message: 'Supabase environment variables not configured'
      }
    };
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  healthResponse.system = {
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
    },
    uptime: uptime + ' seconds',
    nodeVersion: process.version
  };

  console.log(`🏥 [${healthCheckId}] Health check completed: ${healthResponse.status}`);
  res.json(healthResponse);
});

module.exports = router;
