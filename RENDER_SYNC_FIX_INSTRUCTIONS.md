# Zoom Sync Fix Instructions

## Root Cause Summary

The Zoom sync is failing due to:
1. Missing Supabase environment variables on Render
2. Code import error in the backend sync route
3. Incomplete migration from Edge Functions to Render

## Immediate Fix Steps

### 1. Add Environment Variables to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Find service: **webinar-wise-launchpad-17**
3. Click on the **Environment** tab
4. Add these environment variables:

```bash
SUPABASE_URL=https://lgajnzldkfpvcuofjxom.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[Get from Supabase Dashboard]
SUPABASE_ANON_KEY=[Get from Supabase Dashboard]
NODE_ENV=production
```

To get the keys:
1. Go to [Supabase Dashboard](https://app.supabase.com/project/lgajnzldkfpvcuofjxom/settings/api)
2. Copy the **anon/public** key for `SUPABASE_ANON_KEY`
3. Copy the **service_role** key for `SUPABASE_SERVICE_ROLE_KEY`

### 2. Deploy Code Fix

The code fix has been implemented in the files below. Deploy these changes:

1. Commit and push the changes to your repository
2. Render will automatically redeploy
3. Wait 2-3 minutes for deployment to complete

### 3. Test the Fix

After deployment:
1. Go to your app
2. Click "Sync with Zoom"
3. Monitor the sync progress

## Code Changes Made

### File: `render-backend/routes/sync-webinars.js`

Fixed the import and implemented proper sync logic:
- Changed from `zoomService` to `zoomSyncService`
- Added proper error handling and progress tracking
- Implemented the actual sync logic using `syncWebinars` function

### File: `render-backend/services/zoomService.js`

Added the missing `getWebinars` export that was causing the error.

## Verification Steps

1. Check Render logs for successful authentication
2. Monitor the sync progress in the UI
3. Check the database for synced webinars

## Troubleshooting

If sync still fails after these fixes:

1. **Check Render Logs**
   - Go to Render Dashboard > Logs
   - Look for authentication errors or API failures

2. **Verify Environment Variables**
   - Ensure all variables are correctly set
   - No quotes around the values
   - No trailing spaces

3. **Check Zoom Token**
   - The access token might be expired
   - Try disconnecting and reconnecting Zoom

4. **Database Permissions**
   - Verify RLS policies aren't blocking access
   - Check if service role key has proper permissions

## Temporary Workaround

While waiting for fixes, the app will automatically use "Direct Sync Mode" which:
- Bypasses the Render backend
- Syncs directly from browser to Supabase
- May be slower for large datasets but works reliably

## Support

If issues persist, check:
- Render service status
- Supabase service status
- Zoom API status
