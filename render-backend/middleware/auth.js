
const jwt = require('jsonwebtoken');

/**
 * Enhanced authentication middleware that properly handles JWT verification
 * Uses SUPABASE_ANON_KEY for JWT verification (frontend tokens)
 * Uses SUPABASE_SERVICE_ROLE_KEY for database operations
 */

const authMiddleware = (req, res, next) => {
  const requestId = req.requestId || Math.random().toString(36).substring(7);
  
  console.log(`🔐 [${requestId}] Auth middleware - validating request`);
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.error(`❌ [${requestId}] No authorization header provided`);
      return res.status(401).json({
        success: false,
        error: 'Authorization header required',
        requestId
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.error(`❌ [${requestId}] Invalid authorization header format`);
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization header format',
        requestId
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      console.error(`❌ [${requestId}] No token found in authorization header`);
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        requestId
      });
    }

    // Get the correct key for JWT verification
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseAnonKey) {
      console.error(`❌ [${requestId}] SUPABASE_ANON_KEY not configured`);
      return res.status(500).json({
        success: false,
        error: 'Authentication service not configured',
        requestId
      });
    }

    // Verify the JWT token using the anon key (this is what the frontend uses)
    let decoded;
    try {
      decoded = jwt.verify(token, supabaseAnonKey);
      console.log(`✅ [${requestId}] JWT token verified successfully`);
    } catch (jwtError) {
      console.error(`❌ [${requestId}] JWT verification failed:`, {
        error: jwtError.message,
        name: jwtError.name
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        details: jwtError.message,
        requestId
      });
    }

    // Extract user information from the verified token
    if (!decoded.sub) {
      console.error(`❌ [${requestId}] No user ID found in token`);
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload',
        requestId
      });
    }

    // Add the decoded token info to the request
    req.user = decoded;
    req.userId = decoded.sub;
    req.requestId = requestId;

    console.log(`✅ [${requestId}] Authentication successful for user: ${decoded.sub}`);
    next();

  } catch (error) {
    console.error(`💥 [${requestId}] Auth middleware error:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Authentication service error',
      details: error.message,
      requestId
    });
  }
};

/**
 * Simplified user extraction middleware
 * Ensures user information is properly set on the request
 */
const extractUser = (req, res, next) => {
  const requestId = req.requestId || Math.random().toString(36).substring(7);
  
  if (!req.userId) {
    console.error(`❌ [${requestId}] No user ID found in request after auth`);
    return res.status(401).json({
      success: false,
      error: 'User information missing',
      requestId
    });
  }

  console.log(`✅ [${requestId}] User extracted: ${req.userId}`);
  next();
};

module.exports = {
  authMiddleware,
  extractUser
};
