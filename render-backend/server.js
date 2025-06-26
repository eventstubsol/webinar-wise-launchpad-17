
const express = require('express');
const corsMiddleware = require('./middleware/corsMiddleware');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Check environment variables at startup
console.log('=== ENVIRONMENT VARIABLES CHECK ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', PORT);
console.log('SUPABASE_URL present:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('SUPABASE_ANON_KEY present:', !!process.env.SUPABASE_ANON_KEY);
console.log('API_KEY present:', !!process.env.API_KEY);

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`- ${varName}`));
  console.error('Please configure these in your Render dashboard under Environment Variables');
  process.exit(1);
}

// Log authentication configuration
if (process.env.NODE_ENV === 'production') {
  console.log('🔒 Production mode: Authentication required');
  if (!process.env.SUPABASE_ANON_KEY) {
    console.warn('⚠️ SUPABASE_ANON_KEY not set - JWT verification may fail');
  }
} else {
  console.log('🔓 Development mode: Authentication bypassed');
}

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Apply CORS middleware FIRST
app.use(corsMiddleware);

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
  console.log('Headers:', {
    authorization: req.headers.authorization ? `Bearer ${req.headers.authorization.substring(7, 27)}...` : 'none',
    'x-api-key': req.headers['x-api-key'] ? '[PRESENT]' : 'none'
  });
  next();
});

// Health check endpoint (no auth required)
app.use('/health', require('./routes/health'));

// Apply authentication middleware to all other routes
app.use(authMiddleware);

// API Routes
app.use('/', require('./routes/validate-credentials'));
app.use('/', require('./routes/refresh-token'));
app.use('/', require('./routes/test-connection'));
app.use('/', require('./routes/start-sync'));
app.use('/', require('./routes/sync-progress'));
app.use('/', require('./routes/cancel-sync'));
app.use('/', require('./routes/disconnect'));
app.use('/', require('./routes/sync-webinars'));
app.use('/', require('./routes/reset-participant-sync'));
app.use('/', require('./routes/performance-test'));

// 404 handler
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS policy violation',
      origin: req.get('Origin'),
      allowedOrigins: [
        'https://preview--webinar-wise-launchpad-17.lovable.app',
        'https://webinar-wise-launchpad-17.lovable.app'
      ]
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Render backend server running on port ${PORT}`);
  console.log(`🌐 CORS enabled for Lovable preview domain`);
  console.log(`📡 Health check available at /health`);
  console.log(`🔐 Authentication mode: ${process.env.NODE_ENV === 'production' ? 'Production (Required)' : 'Development (Bypassed)'}`);
  
  // Test Supabase connection at startup
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { supabaseService } = require('./services/supabaseService');
    supabaseService.testConnection()
      .then(success => {
        if (success) {
          console.log('✅ Supabase connection verified');
        } else {
          console.log('⚠️ Supabase connection test failed');
        }
      })
      .catch(error => {
        console.log('⚠️ Supabase connection error:', error.message);
      });
  }
});
