
# Render.com Deployment Guide

This guide will walk you through deploying the Node.js backend to Render.com.

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **Environment Variables**: Have your Zoom API credentials and Supabase details ready

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

In the Render dashboard, go to your service → Environment tab and add:

### Required Variables
```
NODE_ENV=production
PORT=3001

# Database Configuration
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Zoom API Configuration
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_ACCOUNT_ID=your_zoom_account_id

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

#### Zoom API Values
1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Sign in and go to "Develop" → "Build App"
3. Create or select your Server-to-Server OAuth app
4. **ZOOM_CLIENT_ID**: App Credentials → Client ID
5. **ZOOM_CLIENT_SECRET**: App Credentials → Client Secret
6. **ZOOM_ACCOUNT_ID**: App Credentials → Account ID

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

## Step 7: Test the Integration

1. **Health Check**: Visit `https://your-service-name.onrender.com/health`
2. **Frontend Test**: Try connecting your Zoom account in the app
3. **Monitor Logs**: Check Render service logs for any issues

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

3. **Zoom API Errors**
   - Verify Zoom credentials are correct
   - Check Zoom app permissions and scopes
   - Ensure Zoom app is activated

4. **CORS Issues**
   - The backend is configured to allow all origins
   - If issues persist, check browser developer tools

### Render-Specific Notes

- **Cold Starts**: Free tier services may sleep after inactivity
- **Build Time**: Initial deploys may take 5-10 minutes
- **Logs**: Access logs via Render dashboard → your service → Logs
- **Scaling**: Upgrade plan for production workloads

## Production Recommendations

1. **Use Paid Plan**: For better performance and uptime
2. **Add Monitoring**: Set up health check monitoring
3. **Enable Alerts**: Configure deployment and error alerts
4. **Review Logs**: Regularly check service logs
5. **Backup Strategy**: Ensure database backups are configured

## Need Help?

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Zoom API Documentation**: [developers.zoom.us](https://developers.zoom.us)
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)

Once deployed, your service URL will be available at:
`https://your-service-name.onrender.com`
