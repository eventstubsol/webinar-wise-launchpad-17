
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client for token verification
let supabaseAuth = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

const authMiddleware = async (req, res, next) => {
  console.log('=== AUTH MIDDLEWARE DEBUG ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  
  console.log('Auth header present:', !!authHeader);
  console.log('API key present:', !!apiKey);
  console.log('Supabase client initialized:', !!supabaseAuth);

  // For development, allow requests without authentication
  if (process.env.NODE_ENV !== 'production') {
    console.log('Development mode: skipping authentication');
    req.user = { id: 'development-user-id' };
    return next();
  }

  // Check for authentication
  if (!apiKey && !authHeader) {
    console.log('❌ No authentication provided');
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      details: 'No authorization header or API key provided'
    });
  }

  // Handle API key authentication
  if (apiKey) {
    if (apiKey !== process.env.API_KEY) {
      console.log('❌ Invalid API key provided');
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
    console.log('✅ API key authentication successful');
    return next();
  }

  // Handle JWT token authentication
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 20) + '...');

      // If we have Supabase client, verify with Supabase
      if (supabaseAuth) {
        try {
          console.log('Verifying token with Supabase...');
          const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
          
          if (error) {
            console.log('❌ Supabase token verification failed:', error.message);
            return res.status(401).json({
              success: false,
              error: 'Invalid token',
              details: error.message
            });
          }

          if (!user) {
            console.log('❌ No user found for token');
            return res.status(401).json({
              success: false,
              error: 'Invalid token',
              details: 'No user found for provided token'
            });
          }

          console.log('✅ Supabase token verification successful for user:', user.id);
          req.user = user;
          return next();
        } catch (supabaseError) {
          console.log('❌ Supabase verification error:', supabaseError.message);
          // Fall back to JWT decode if Supabase fails
        }
      }

      // Fallback: decode JWT without verification (for development/testing)
      console.log('Falling back to JWT decode...');
      const decoded = jwt.decode(token);
      
      if (!decoded || !decoded.sub) {
        console.log('❌ Invalid token format');
        return res.status(401).json({
          success: false,
          error: 'Invalid token format',
          details: 'Token could not be decoded or missing subject'
        });
      }

      console.log('✅ JWT decode successful for user:', decoded.sub);
      req.user = { id: decoded.sub, ...decoded };
      return next();

    } catch (error) {
      console.log('❌ Token processing error:', error.message);
      return res.status(401).json({
        success: false,
        error: 'Token processing failed',
        details: error.message
      });
    }
  }

  console.log('❌ No valid authentication method found');
  return res.status(401).json({
    success: false,
    error: 'Authentication failed',
    details: 'No valid authentication method found'
  });
};

// Middleware to extract user from Supabase JWT
const extractUser = async (req, res, next) => {
  console.log('=== EXTRACT USER MIDDLEWARE DEBUG ===');
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader && process.env.NODE_ENV === 'production') {
      console.log('❌ No authorization header in production');
      return res.status(401).json({
        success: false,
        error: 'Authorization header required'
      });
    }

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      
      // Use Supabase to get user if available
      if (supabaseAuth) {
        try {
          const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
          
          if (error || !user) {
            console.log('❌ Failed to extract user from token:', error?.message);
            return res.status(401).json({
              success: false,
              error: 'Invalid token',
              details: error?.message || 'No user found'
            });
          }

          console.log('✅ User extracted successfully:', user.id);
          req.userId = user.id;
          req.user = user;
        } catch (error) {
          console.log('❌ Error extracting user:', error.message);
          return res.status(401).json({
            success: false,
            error: 'Failed to extract user',
            details: error.message
          });
        }
      } else {
        // Fallback: decode JWT
        const payload = jwt.decode(token);
        
        if (payload && payload.sub) {
          req.userId = payload.sub;
          req.user = { id: payload.sub, ...payload };
          console.log('✅ User extracted from JWT decode:', payload.sub);
        } else {
          console.log('❌ Invalid token format');
          return res.status(401).json({
            success: false,
            error: 'Invalid token format'
          });
        }
      }
    } else {
      // Development mode fallback
      req.userId = 'development-user-id';
      req.user = { id: 'development-user-id' };
      console.log('✅ Using development user ID');
    }
    
    next();
  } catch (error) {
    console.error('❌ Extract user error:', error);
    return res.status(401).json({
      success: false,
      error: 'Token processing failed',
      details: error.message
    });
  }
};

module.exports = { authMiddleware, extractUser };
