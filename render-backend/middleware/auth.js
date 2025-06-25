
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;

  // For now, allow requests without authentication for testing
  // In production, you should enable proper authentication
  if (process.env.NODE_ENV === 'production') {
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
  }

  next();
};

module.exports = authMiddleware;
