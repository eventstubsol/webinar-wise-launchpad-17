
# Render.com Multi-Tenant Deployment Guide

This guide will walk you through deploying the multi-tenant Node.js backend to Render.com.

## Multi-Tenant Architecture

This backend now supports **true multi-tenancy** where:
- Zoom credentials are stored per-user in the database
- No hardcoded API credentials in environment variables
- Each API request is authenticated and scoped to the requesting user
- All operations are isolated by user ownership

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **Supabase Configuration**: Have your Supabase details ready (no Zoom credentials needed)

## Step 1: Prepare Your Repository

1. Make sure your `render-backend/` directory is in your GitHub repository
2. Commit and push all backend files to GitHub

## Step 2: Create Web Service on Render

1. **Go to Render Dashboard**: Visit [dashboard.render.com](https://dashboard.render.com)
2. **Create New Web Service**: Click "New" → "Web Service"
3. **Connect Repository**: 
   - Connect your GitHub account if not already connected
   - Select your repository
   - Click "Connect"

## Step 3: Configure Service Settings

### Basic Settings
- **Name**: `webinar-wise-backend` (or your preferred name)
- **Region**: Choose closest to your users (e.g., `Ohio (US East)`)
- **Branch**: `main` (or your deployment branch)
- **Root Directory**: `render-backend`
- **Runtime**: `Node`

### Build & Deploy Settings
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Advanced Settings
- **Auto-Deploy**: `Yes` (recommended)
- **Health Check Path**: `/health`

## Step 4: Set Environment Variables

⚠️ **Important**: No Zoom credentials needed in environment variables!

In the Render dashboard, go to your service → Environment tab and add:

### Required Variables
```
NODE_ENV=production
PORT=3001

# Database Configuration
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security (generate strong random strings)
JWT_SECRET=your_jwt_secret_key
API_KEY=your_api_key
```

### How to Get Environment Values

#### Supabase Values
1. Go to your Supabase project dashboard
2. **SUPABASE_URL**: Project Settings → API → Project URL
3. **SUPABASE_SERVICE_ROLE_KEY**: Project Settings → API → service_role key
4. **DATABASE_URL**: Project Settings → Database → Connection string (URI format)

#### Security Values
Generate random strings for:
- **JWT_SECRET**: Use a password generator (32+ characters)
- **API_KEY**: Use a password generator (32+ characters)

## Step 5: Deploy

1. **Deploy Service**: Click "Create Web Service"
2. **Monitor Build**: Watch the build logs in the Render dashboard
3. **Check Health**: Once deployed, visit `https://your-service-name.onrender.com/health`

## Step 6: Update Frontend Configuration

After successful deployment, update your frontend:

1. **Get Service URL**: Copy your Render service URL (e.g., `https://webinar-wise-backend.onrender.com`)
2. **Update RenderZoomService**: Replace the placeholder URL in `src/services/zoom/RenderZoomService.ts`

```typescript
const RENDER_API_BASE_URL = 'https://your-actual-service-name.onrender.com';
```

## Multi-Tenant API Flow

### 1. User Authentication
- Frontend sends Supabase JWT token in Authorization header
- Backend extracts user ID from token
- All operations are scoped to that user

### 2. Credential Management
- Users input their Zoom credentials in the frontend
- Credentials are validated and stored in `zoom_credentials` table
- Each user's credentials are isolated and secure

### 3. API Operations
- All Zoom API calls use user-specific credentials
- Connection and sync operations are tied to the authenticated user
- No shared credentials or cross-user data access

## Step 7: Test the Integration

1. **Health Check**: Visit `https://your-service-name.onrender.com/health`
2. **Frontend Test**: Try connecting your Zoom account in the app
3. **Monitor Logs**: Check Render service logs for any issues

## Security Features

✅ **User Isolation**: All operations scoped to authenticated user
✅ **Credential Security**: User credentials stored securely in database
✅ **Access Control**: Connection ownership verified on every request
✅ **Authentication**: JWT token validation on all endpoints
✅ **No Shared State**: Each user's data completely isolated

## Troubleshooting

### Common Issues

1. **Service Won't Start**
   - Check build logs for missing dependencies
   - Verify Node.js version compatibility
   - Ensure all environment variables are set

2. **Database Connection Fails**
   - Verify SUPABASE_SERVICE_ROLE_KEY is correct
   - Check DATABASE_URL format
   - Ensure Supabase project is active

3. **Authentication Errors**
   - Verify JWT_SECRET is set
   - Check frontend is sending proper Authorization header
   - Ensure user is logged in on frontend

4. **CORS Issues**
   - The backend is configured to allow all origins
   - If issues persist, check browser developer tools

### Multi-Tenant Specific Issues

1. **User Credentials Not Found**
   - User must set up Zoom credentials in frontend first
   - Check `zoom_credentials` table in Supabase

2. **Access Denied Errors**
   - Verify user is trying to access their own resources
   - Check user authentication status

## Production Recommendations

1. **Use Paid Plan**: For better performance and uptime
2. **Add Monitoring**: Set up health check monitoring
3. **Enable Alerts**: Configure deployment and error alerts
4. **Review Logs**: Regularly check service logs
5. **Security Audit**: Regular review of access patterns
6. **Rate Limiting**: Monitor per-user API usage

## Need Help?

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Zoom API Documentation**: [developers.zoom.us](https://developers.zoom.us)
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)

Once deployed, your service URL will be available at:
`https://your-service-name.onrender.com`

**No Zoom credentials needed in environment variables - they're managed per-user!**
