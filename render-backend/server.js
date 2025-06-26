
const express = require('express');
const corsMiddleware = require('./middleware/corsMiddleware');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced startup validation
console.log('=== WEBINAR WISE BACKEND STARTUP ===');
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log(`Node Version: ${process.version}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${PORT}`);

// Environment validation
const validateEnvironment = () => {
  const envChecks = {
    'NODE_ENV': process.env.NODE_ENV || 'development',
    'PORT': PORT,
    'SUPABASE_URL': !!process.env.SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    'SUPABASE_ANON_KEY': !!process.env.SUPABASE_ANON_KEY,
    'API_KEY': !!process.env.API_KEY
  };

  console.log('=== ENVIRONMENT VALIDATION ===');
  Object.entries(envChecks).forEach(([key, value]) => {
    const status = typeof value === 'boolean' ? (value ? '✅' : '❌') : '📝';
    console.log(`${status} ${key}: ${typeof value === 'boolean' ? (value ? 'present' : 'missing') : value}`);
  });

  // Critical environment variables for production
  if (process.env.NODE_ENV === 'production') {
    const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = required.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      console.error('❌ CRITICAL: Missing required environment variables in production:');
      missing.forEach(varName => console.error(`  - ${varName}`));
      console.error('🔧 Please configure these in your Render dashboard under Environment Variables');
      process.exit(1);
    }
    console.log('✅ All required production environment variables present');
  }
};

validateEnvironment();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Apply CORS middleware FIRST
app.use(corsMiddleware);

// Parse JSON bodies with enhanced limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (err) {
      console.error('Invalid JSON in request body:', err.message);
      res.status(400).json({ 
        success: false, 
        error: 'Invalid JSON in request body',
        details: err.message
      });
      return;
    }
  }
}));

// Enhanced request logging middleware
app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substring(7);
  req.requestId = requestId;
  req.startTime = Date.now();
  
  console.log(`\n🔄 [${requestId}] ${req.method} ${req.path}`);
  console.log(`📍 Origin: ${req.get('Origin') || 'none'}`);
  console.log(`🕐 Time: ${new Date().toISOString()}`);
  
  // Log authentication headers (safely)
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  console.log(`🔐 Auth: ${authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : 'none'}`);
  console.log(`🔑 API Key: ${apiKey ? '[PRESENT]' : 'none'}`);

  // Response logging
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - req.startTime;
    console.log(`✅ [${requestId}] Response: ${res.statusCode} (${duration}ms)`);
    if (res.statusCode >= 400) {
      console.log(`❌ [${requestId}] Error Response Body:`, body?.substring(0, 200));
    }
    return originalSend.call(this, body);
  };

  next();
});

// Health check endpoint (no auth required)
app.use('/health', require('./routes/health'));

// Apply authentication middleware to all other routes
app.use(authMiddleware);

// Enhanced route registration with error handling
const registerRoute = (path, routeModule, description) => {
  try {
    app.use('/', routeModule);
    console.log(`📍 Route registered: ${description}`);
  } catch (error) {
    console.error(`❌ Failed to register route ${description}:`, error.message);
  }
};

console.log('=== REGISTERING API ROUTES ===');
registerRoute('/', require('./routes/validate-credentials'), 'POST /validate-credentials');
registerRoute('/', require('./routes/refresh-token'), 'POST /refresh-token');
registerRoute('/', require('./routes/test-connection'), 'GET /test-connection');
registerRoute('/', require('./routes/start-sync'), 'POST /start-sync');
registerRoute('/', require('./routes/sync-progress'), 'GET /sync-progress/:id');
registerRoute('/', require('./routes/cancel-sync'), 'POST /cancel-sync/:id');
registerRoute('/', require('./routes/disconnect'), 'POST /disconnect');
registerRoute('/', require('./routes/sync-webinars'), 'POST /sync-webinars');
registerRoute('/', require('./routes/reset-participant-sync'), 'POST /reset-participant-sync');
registerRoute('/', require('./routes/performance-test'), 'POST /performance-test');

// Enhanced 404 handler
app.use('*', (req, res) => {
  const requestId = req.requestId || 'unknown';
  console.log(`🔍 [${requestId}] 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    requestId,
    availableRoutes: [
      'GET /health',
      'POST /validate-credentials',
      'POST /refresh-token',
      'GET /test-connection',
      'POST /start-sync',
      'GET /sync-progress/:id',
      'POST /cancel-sync/:id',
      'POST /disconnect',
      'POST /sync-webinars',
      'POST /reset-participant-sync',
      'POST /performance-test'
    ]
  });
});

// Enhanced global error handler
app.use((err, req, res, next) => {
  const requestId = req.requestId || 'unknown';
  const duration = req.startTime ? Date.now() - req.startTime : 0;
  
  console.error(`💥 [${requestId}] Global error handler (${duration}ms):`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : 'Hidden in production',
    url: req.url,
    method: req.method,
    headers: {
      origin: req.get('Origin'),
      userAgent: req.get('User-Agent')?.substring(0, 50)
    }
  });
  
  // CORS specific error handling
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation',
      origin: req.get('Origin'),
      allowedOrigins: [
        'https://preview--webinar-wise-launchpad-17.lovable.app',
        'https://webinar-wise-launchpad-17.lovable.app'
      ],
      requestId
    });
  }
  
  // Database connection error
  if (err.message.includes('database') || err.message.includes('connection')) {
    return res.status(503).json({
      success: false,
      error: 'Database service unavailable',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Please try again later',
      requestId
    });
  }
  
  // Authentication error
  if (err.message.includes('auth') || err.message.includes('token')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication error',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Please check your credentials',
      requestId
    });
  }
  
  // Generic server error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    requestId,
    timestamp: new Date().toISOString()
  });
});

// Enhanced startup sequence
const startServer = async () => {
  try {
    // Test Supabase connection at startup
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('=== TESTING SUPABASE CONNECTION ===');
      try {
        const { supabaseService } = require('./services/supabaseService');
        const connectionTest = await supabaseService.testConnection();
        
        if (connectionTest) {
          console.log('✅ Supabase connection verified successfully');
        } else {
          console.log('⚠️ Supabase connection test failed - service may be degraded');
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase connection error:', supabaseError.message);
        console.log('📍 Server will continue but Supabase features may not work');
      }
    } else {
      console.log('⚠️ Supabase credentials not configured - some features will be unavailable');
    }

    // Start the server
    const server = app.listen(PORT, () => {
      console.log('\n=== SERVER STARTED SUCCESSFULLY ===');
      console.log(`🚀 Render backend server running on port ${PORT}`);
      console.log(`🌐 CORS enabled for Lovable domains`);
      console.log(`📡 Health check available at /health`);
      console.log(`🔐 Authentication mode: ${process.env.NODE_ENV === 'production' ? 'Production (JWT Required)' : 'Development (Bypassed)'}`);
      console.log(`⏰ Server started at: ${new Date().toISOString()}`);
      console.log('=====================================\n');
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    });

  } catch (startupError) {
    console.error('💥 Failed to start server:', startupError);
    process.exit(1);
  }
};

startServer();
