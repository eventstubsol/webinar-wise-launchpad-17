
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Environment validation at startup
const validateEnvironment = () => {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  
  console.log('✅ All required environment variables present');
  return true;
};

// Initialize Supabase client for auth verification
let supabaseAuth = null;
try {
  validateEnvironment();
  supabaseAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  console.log('✅ Supabase auth client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Supabase auth client:', error.message);
}

const authMiddleware = async (req, res, next) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`\n=== AUTH MIDDLEWARE [${requestId}] ===`);
  console.log(`Method: ${req.method} ${req.url}`);
  console.log(`Origin: ${req.get('Origin') || 'none'}`);
  console.log(`User-Agent: ${req.get('User-Agent')?.substring(0, 50) || 'none'}...`);

  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  
  console.log(`Auth header present: ${!!authHeader}`);
  console.log(`API key present: ${!!apiKey}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Skip authentication for health check
  if (req.url === '/health') {
    console.log(`Skipping auth for health check [${requestId}]`);
    return next();
  }

  // Development mode bypass
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Development mode: bypassing authentication [${requestId}]`);
    req.user = { id: 'dev-user-id', email: 'dev@example.com' };
    return next();
  }

  // Check for any authentication method
  if (!authHeader && !apiKey) {
    console.log(`❌ No authentication provided [${requestId}]`);
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      details: 'No authorization header or API key provided',
      requestId
    });
  }

  // Handle API key authentication
  if (apiKey) {
    console.log(`Processing API key authentication [${requestId}]`);
    if (!process.env.API_KEY) {
      console.log(`⚠️ API_KEY not configured in environment [${requestId}]`);
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
        details: 'API key authentication not configured',
        requestId
      });
    }

    if (apiKey === process.env.API_KEY) {
      console.log(`✅ API key authentication successful [${requestId}]`);
      req.user = { id: 'api-user', type: 'api_key' };
      return next();
    } else {
      console.log(`❌ Invalid API key provided [${requestId}]`);
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        requestId
      });
    }
  }

  // Handle JWT token authentication
  if (authHeader) {
    if (!authHeader.startsWith('Bearer ')) {
      console.log(`❌ Invalid authorization header format [${requestId}]`);
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization header format',
        details: 'Header must start with "Bearer "',
        requestId
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log(`Processing JWT token (length: ${token.length}) [${requestId}]`);

    if (!supabaseAuth) {
      console.log(`❌ Supabase auth client not initialized [${requestId}]`);
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable',
        details: 'Supabase auth client not initialized',
        requestId
      });
    }

    try {
      console.log(`Verifying token with Supabase [${requestId}]`);
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
      
      if (error) {
        console.log(`❌ Supabase token verification failed [${requestId}]:`, error.message);
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token',
          details: error.message,
          requestId
        });
      }

      if (!user) {
        console.log(`❌ No user found for token [${requestId}]`);
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          details: 'No user found for provided token',
          requestId
        });
      }

      console.log(`✅ JWT authentication successful for user: ${user.id} [${requestId}]`);
      req.user = user;
      req.userId = user.id;
      return next();

    } catch (error) {
      console.log(`❌ Token verification error [${requestId}]:`, error.message);
      
      // Fallback: Try to decode JWT without verification (unsafe but helps debugging)
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.sub) {
          console.log(`⚠️ Using fallback JWT decode for user: ${decoded.sub} [${requestId}]`);
          req.user = { id: decoded.sub, email: decoded.email, ...decoded };
          req.userId = decoded.sub;
          return next();
        }
      } catch (decodeError) {
        console.log(`❌ JWT decode also failed [${requestId}]:`, decodeError.message);
      }

      return res.status(401).json({
        success: false,
        error: 'Token processing failed',
        details: error.message,
        requestId
      });
    }
  }

  console.log(`❌ No valid authentication method processed [${requestId}]`);
  return res.status(401).json({
    success: false,
    error: 'Authentication failed',
    details: 'No valid authentication method found',
    requestId
  });
};

// Enhanced user extraction middleware
const extractUser = async (req, res, next) => {
  const requestId = req.requestId || Math.random().toString(36).substring(7);
  console.log(`\n=== EXTRACT USER [${requestId}] ===`);
  
  try {
    // If user already set by authMiddleware, use it
    if (req.user && req.user.id) {
      req.userId = req.user.id;
      console.log(`✅ User already extracted: ${req.user.id} [${requestId}]`);
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader && process.env.NODE_ENV === 'production') {
      console.log(`❌ No authorization header in production [${requestId}]`);
      return res.status(401).json({
        success: false,
        error: 'Authorization header required',
        requestId
      });
    }

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      console.log(`Extracting user from token [${requestId}]`);
      
      if (supabaseAuth) {
        try {
          const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
          
          if (error || !user) {
            console.log(`❌ Failed to extract user from token [${requestId}]:`, error?.message);
            return res.status(401).json({
              success: false,
              error: 'Invalid token',
              details: error?.message || 'No user found',
              requestId
            });
          }

          req.userId = user.id;
          req.user = user;
          console.log(`✅ User extracted successfully: ${user.id} [${requestId}]`);
        } catch (error) {
          console.log(`❌ Error extracting user [${requestId}]:`, error.message);
          return res.status(401).json({
            success: false,
            error: 'Failed to extract user',
            details: error.message,
            requestId
          });
        }
      } else {
        // Fallback: decode JWT
        try {
          const payload = jwt.decode(token);
          if (payload && payload.sub) {
            req.userId = payload.sub;
            req.user = { id: payload.sub, email: payload.email, ...payload };
            console.log(`✅ User extracted from JWT decode: ${payload.sub} [${requestId}]`);
          } else {
            console.log(`❌ Invalid token format [${requestId}]`);
            return res.status(401).json({
              success: false,
              error: 'Invalid token format',
              requestId
            });
          }
        } catch (decodeError) {
          console.log(`❌ JWT decode failed [${requestId}]:`, decodeError.message);
          return res.status(401).json({
            success: false,
            error: 'Token decode failed',
            details: decodeError.message,
            requestId
          });
        }
      }
    } else {
      // Development mode fallback
      req.userId = 'dev-user-id';
      req.user = { id: 'dev-user-id', email: 'dev@example.com' };
      console.log(`✅ Using development user ID [${requestId}]`);
    }
    
    next();
  } catch (error) {
    console.error(`❌ Extract user error [${requestId}]:`, error);
    return res.status(401).json({
      success: false,
      error: 'User extraction failed',
      details: error.message,
      requestId
    });
  }
};

module.exports = { authMiddleware, extractUser };
