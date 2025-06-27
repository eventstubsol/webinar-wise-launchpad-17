# Render Backend Environment Variables Setup

## Required Environment Variables

Add these to your Render service dashboard:

### Supabase Configuration
```
SUPABASE_URL=https://lgajnzldkfpvcuofjxom.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[Get from Supabase Settings > API > Service Role Key]
SUPABASE_ANON_KEY=[Get from Supabase Settings > API > Anon/Public Key]
```

### Application Configuration
```
NODE_ENV=production
PORT=10000
CORS_ORIGIN=https://your-frontend-domain.com
```

### Email Configuration (if using email features)
```
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=[Your SendGrid API key]
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=Webinar Wise
```

### AI Configuration (if using AI features)
```
OPENAI_API_KEY=[Your OpenAI API key]
```

### Zoom OAuth (already configured)
```
ZOOM_CLIENT_ID=[Your Zoom OAuth App Client ID]
ZOOM_CLIENT_SECRET=[Your Zoom OAuth App Client Secret]
ZOOM_REDIRECT_URI=https://webinar-wise-launchpad-17.onrender.com/zoom/oauth/callback
```

## How to Add to Render

1. Go to https://dashboard.render.com
2. Select your service: webinar-wise-launchpad-17
3. Click on "Environment" tab
4. Add each variable one by one
5. Click "Save Changes"
6. Render will automatically redeploy

## Getting Supabase Keys

1. Go to https://app.supabase.com/project/lgajnzldkfpvcuofjxom/settings/api
2. Copy the "anon public" key for SUPABASE_ANON_KEY
3. Copy the "service_role secret" key for SUPABASE_SERVICE_ROLE_KEY
4. The URL is already provided above

## Verification

After deployment, test the health endpoint:
```bash
curl https://webinar-wise-launchpad-17.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "service": "webinar-wise-backend",
  "timestamp": "2024-01-xx..."
}
```
