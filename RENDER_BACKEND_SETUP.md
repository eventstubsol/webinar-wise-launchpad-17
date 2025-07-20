
# Render.com Backend Setup Guide

This guide explains how to set up the Node.js/Express backend on Render.com to replace Supabase Edge Functions.

## Backend Requirements

### 1. Node.js/Express Server Structure

```
render-backend/
├── package.json
├── server.js
├── routes/
│   ├── zoom.js
│   └── health.js
├── middleware/
│   ├── auth.js
│   └── validation.js
├── services/
│   ├── zoomService.js
│   └── databaseService.js
└── utils/
    ├── logger.js
    └── errorHandler.js
```

### 2. Required API Endpoints

#### Health Check
- `GET /health` - Service health status

#### Zoom Authentication
- `POST /api/zoom/validate` - Validate Zoom credentials
- `GET /api/zoom/test` - Test API connection
- `POST /api/zoom/disconnect` - Disconnect account

#### Sync Operations
- `POST /api/zoom/sync` - Start sync operation
- `GET /api/zoom/sync/:id/progress` - Get sync progress
- `POST /api/zoom/sync/:id/cancel` - Cancel sync
- `POST /api/zoom/sync/webinars` - Sync webinars specifically
- `POST /api/zoom/test/performance` - Run performance tests

### 3. Environment Variables

```bash
# Database
DATABASE_URL=your_supabase_database_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Zoom API
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_ACCOUNT_ID=your_zoom_account_id

# API Security
JWT_SECRET=your_jwt_secret
API_KEY=your_api_key

# Service Configuration
PORT=3001
NODE_ENV=production
```

### 4. Package.json Dependencies

```json
{
  "name": "webinar-wise-render-backend",
  "version": "1.0.0",
  "description": "Render.com backend for Webinar Wise",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "jsonwebtoken": "^9.0.2",
    "@supabase/supabase-js": "^2.38.0",
    "axios": "^1.5.0",
    "uuid": "^9.0.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### 5. Sample Server Implementation

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/health', require('./routes/health'));
app.use('/api/zoom', require('./routes/zoom'));

// Error handling
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    success: false, 
    error: error.message || 'Internal server error' 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Migration Status

✅ **Completed:**
- Updated RenderZoomService with all required methods
- Migrated useZoomSync hook to use Render API
- Created ZoomSyncMigrationService for transition
- Updated ZoomSyncCard to use Render API
- Added useRenderMigration hook for gradual migration

🔄 **In Progress:**
- Need to implement actual Render.com backend
- Need to update RENDER_API_URL with real service URL
- Need to implement proper authentication tokens

⏳ **Remaining:**
- Update all 18 components that use supabase.functions.invoke()
- Remove Edge Functions from supabase/functions/
- Update TypeScript types after backend is deployed
- Performance testing and optimization

## Deployment Steps

1. **Create Render.com Web Service**
   - Connect your GitHub repository
   - Set Node.js as runtime
   - Configure environment variables
   - Deploy the backend

2. **Update Frontend Configuration**
   - Replace RENDER_API_URL placeholder with actual URL
   - Update authentication token generation
   - Test all API endpoints

3. **Migrate Components Gradually**
   - Use useRenderMigration hook for testing
   - Update components one by one
   - Remove Edge Function dependencies

4. **Final Cleanup**
   - Delete unused Edge Functions
   - Update documentation
   - Performance optimization

## Testing

After deployment, test these endpoints:
- Health check: `curl https://your-service.onrender.com/health`
- Zoom test: `curl -X POST https://your-service.onrender.com/api/zoom/test`
- Sync operation: `curl -X POST https://your-service.onrender.com/api/zoom/sync`
