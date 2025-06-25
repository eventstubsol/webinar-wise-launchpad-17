
# Webinar Wise Render Backend

Node.js/Express backend for handling Zoom API operations, deployed on Render.com.

## Features

- **Zoom API Integration**: Server-to-Server OAuth authentication
- **Database Integration**: Supabase for data persistence
- **Rate Limiting**: Built-in request throttling
- **Error Handling**: Comprehensive error responses
- **Health Monitoring**: Service health checks
- **CORS Support**: Cross-origin request handling

## API Endpoints

### Health & Testing
- `GET /health` - Service health check
- `GET /test-connection?connection_id=<id>` - Test Zoom API connectivity

### Authentication
- `POST /validate-credentials` - Validate and store Zoom credentials
- `POST /refresh-token` - Refresh Zoom access tokens
- `POST /disconnect` - Disconnect Zoom account

### Sync Operations
- `POST /start-sync` - Start sync operations
- `GET /sync-progress/:id` - Get sync progress
- `POST /cancel-sync/:id` - Cancel sync operations
- `POST /sync-webinars` - Sync webinars specifically
- `POST /performance-test` - Run API performance tests

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Database Configuration
DATABASE_URL=your-supabase-database-url
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Zoom API Configuration
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
ZOOM_ACCOUNT_ID=your-zoom-account-id

# Security
JWT_SECRET=your-jwt-secret-key
API_KEY=your-api-key

# Server Configuration
PORT=3001
NODE_ENV=production
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your actual values
```

3. Start the development server:
```bash
npm run dev
```

4. Test the health endpoint:
```bash
curl http://localhost:3001/health
```

## Deployment to Render.com

1. **Create a new Web Service** on Render.com
2. **Connect your GitHub repository**
3. **Configure the service**:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node.js
   - **Region**: Choose your preferred region

4. **Set Environment Variables** in Render dashboard:
   - Add all variables from `.env.example`
   - Set `NODE_ENV=production`

5. **Deploy** and test the health endpoint

## Usage Examples

### Validate Zoom Credentials
```javascript
const response = await fetch('https://your-service.onrender.com/validate-credentials', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    account_id: 'your-account-id',
    client_id: 'your-client-id',
    client_secret: 'your-client-secret',
    user_id: 'optional-user-id'
  })
});
```

### Start Webinar Sync
```javascript
const response = await fetch('https://your-service.onrender.com/sync-webinars', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    connection_id: 'connection-uuid',
    type: 'manual'
  })
});
```

## Architecture

- **Express.js**: Web framework
- **Supabase**: Database and authentication
- **Axios**: HTTP client for Zoom API
- **Helmet**: Security middleware
- **CORS**: Cross-origin support
- **Rate Limiting**: Request throttling

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2023-12-01T12:00:00.000Z"
}
```

## Security

- **Helmet**: Security headers
- **Rate Limiting**: 1000 requests per 15 minutes per IP
- **CORS**: Configurable origins
- **JWT**: Token-based authentication (optional)
- **API Key**: Header-based authentication (optional)

## Monitoring

- **Health Checks**: `/health` endpoint
- **Request Logging**: All requests logged with timestamps
- **Error Logging**: Comprehensive error logging
- **Performance Metrics**: Built into performance test endpoint
