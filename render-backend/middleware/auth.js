
const jwt = require('jsonwebtoken');
const supabaseService = require('../services/supabaseService');

const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;

  // For development, allow requests without authentication
  if (process.env.NODE_ENV !== 'production') {
    console.log('Development mode: skipping authentication');
    return next();
  }

  // Check API key or JWT token
  if (!apiKey && !authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (apiKey && apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  }

  next();
};

// Middleware to extract user from Supabase JWT
const extractUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader && process.env.NODE_ENV === 'production') {
      return res.status(401).json({
        success: false,
        error: 'Authorization header required'
      });
    }

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      
      // For Supabase JWT tokens, decode to get user info
      // In production, you'd verify this with Supabase
      const payload = jwt.decode(token);
      
      if (payload && payload.sub) {
        req.userId = payload.sub;
      } else {
        return res.status(401).json({
          success: false,
          error: 'Invalid token format'
        });
      }
    } else {
      // Development mode fallback
      req.userId = 'development-user-id';
    }
    
    next();
  } catch (error) {
    console.error('Extract user error:', error);
    return res.status(401).json({
      success: false,
      error: 'Token processing failed'
    });
  }
};

module.exports = { authMiddleware, extractUser };
