
const { supabaseService } = require('../services/supabaseService');

/**
 * Enhanced authentication middleware using Supabase's built-in auth verification
 * This replaces manual JWT verification with proper Supabase client methods
 */

const authMiddleware = async (req, res, next) => {
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

    // Use Supabase's built-in authentication verification
    console.log(`🔍 [${requestId}] Verifying token with Supabase auth client...`);
    
    try {
      const authResult = await supabaseService.verifyAuthToken(token);
      
      if (!authResult.success) {
        console.error(`❌ [${requestId}] Auth verification failed:`, authResult.error);
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token',
          details: authResult.error,
          requestId
        });
      }

      // Extract user information from the verified result
      const { user } = authResult;
      
      if (!user || !user.id) {
        console.error(`❌ [${requestId}] No user ID found in verified token`);
        return res.status(401).json({
          success: false,
          error: 'Invalid token payload',
          requestId
        });
      }

      // Add the user info to the request
      req.user = user;
      req.userId = user.id;
      req.requestId = requestId;

      console.log(`✅ [${requestId}] Authentication successful for user: ${user.id}`);
      next();

    } catch (authError) {
      console.error(`❌ [${requestId}] Supabase auth error:`, authError);
      
      return res.status(401).json({
        success: false,
        error: 'Authentication verification failed',
        details: authError.message,
        requestId
      });
    }

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
