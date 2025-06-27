# Fix for "Edge Function Error" During Sync

## Issue Summary

The error message **"Edge function error: Edge Function returned a non-2xx status code"** is misleading. The actual issue is with the **Render backend service**, not a Supabase Edge Function.

## Root Cause

The Webinar Wise application uses a backend service hosted on Render.com for handling Zoom synchronization. The error occurs when:

1. The Render service is sleeping (common on free tier)
2. The Render service has missing environment variables
3. The Render service cannot connect to Supabase

## Immediate Fix

### Step 1: Wake Up the Render Service

Run this command to check and wake up the service:

```bash
cd "C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17"
node scripts/check-render-health.js
```

The service may take 30-60 seconds to wake up on the first request.

### Step 2: Check Render Dashboard

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Log in with your account
3. Find the service named **"webinar-wise-launchpad-17"**
4. Check the service status:
   - If "Suspended", click "Resume Service"
   - If "Failed", check the logs for deployment errors

### Step 3: Verify Environment Variables

In the Render dashboard, go to your service's Environment tab and ensure these variables are set:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `ZOOM_CLIENT_ID` - Your Zoom OAuth app Client ID  
- `ZOOM_CLIENT_SECRET` - Your Zoom OAuth app Client Secret
- `NODE_ENV` - Set to "production"

### Step 4: Check Service Logs

In the Render dashboard:
1. Click on the "Logs" tab
2. Look for any error messages
3. Common errors:
   - Database connection errors
   - Missing environment variables
   - Authentication failures

## Long-term Solutions

### Option 1: Upgrade Render Service (Recommended)

The free tier on Render has limitations:
- Services sleep after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds
- Limited to 750 hours per month

Consider upgrading to a paid plan ($7/month) for:
- Always-on service
- Better performance
- No sleep delays

### Option 2: Implement a Keep-Alive System

Add a scheduled job that pings your service every 10 minutes to prevent it from sleeping.

### Option 3: Move Sync Logic to Supabase Edge Functions

Migrate the sync logic from Render to Supabase Edge Functions for better integration and reliability.

## Testing the Fix

After applying the fixes:

1. Open your Webinar Wise dashboard
2. Go to the Zoom integration page
3. Click "Sync Now"
4. The sync should start without errors

If you still see errors:
1. Clear your browser cache (Ctrl+Shift+R)
2. Log out and log back in
3. Try again after 2-3 minutes

## Monitoring

To prevent future issues:

1. Set up uptime monitoring for your Render service
2. Configure alerts for service failures
3. Regularly check service logs
4. Keep environment variables up to date

## Support

If the issue persists:

1. Check Render service logs for specific error messages
2. Verify all environment variables are correctly set
3. Ensure your Zoom OAuth app is active
4. Check Supabase service status

## Technical Details

The sync flow:
1. Frontend (React) → calls RenderZoomService
2. RenderZoomService → makes HTTP request to Render backend
3. Render backend → authenticates and syncs with Zoom API
4. Render backend → stores data in Supabase
5. Response → sent back to frontend

The error occurs at step 2 when the Render service is not responding properly.
