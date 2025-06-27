# Zoom Sync Testing Checklist

## Pre-deployment Verification

- [ ] Confirm all code changes are committed and pushed
- [ ] Verify Render has received the push notification
- [ ] Check Render deployment logs for any build errors

## Environment Variable Setup

- [ ] Go to [Render Dashboard](https://dashboard.render.com)
- [ ] Navigate to service: **webinar-wise-launchpad-17**
- [ ] Add the following environment variables:
  - [ ] `SUPABASE_URL` = `https://lgajnzldkfpvcuofjxom.supabase.co`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` = (copy from Supabase dashboard)
  - [ ] `SUPABASE_ANON_KEY` = (copy from Supabase dashboard)
  - [ ] `NODE_ENV` = `production`
- [ ] Save environment variables
- [ ] Wait for automatic redeployment (2-3 minutes)

## Post-deployment Testing

### 1. Backend Health Check
- [ ] Visit: https://webinar-wise-launchpad-17.onrender.com/health
- [ ] Should return: `{"status":"ok","message":"Render backend is running"}`

### 2. Authentication Test
- [ ] Open your app
- [ ] Open browser developer console (F12)
- [ ] Try to sync
- [ ] Check for any 401 errors in Network tab
- [ ] If 401 errors appear, verify environment variables are set correctly

### 3. Sync Functionality Test
- [ ] Click "Sync with Zoom" button
- [ ] Monitor sync progress in the UI
- [ ] Check for the following stages:
  - [ ] "Preparing to sync..."
  - [ ] "Fetching webinars from Zoom API..."
  - [ ] "Processing X of Y webinars"
  - [ ] "Sync completed!"

### 4. Database Verification
- [ ] Check Supabase dashboard
- [ ] Navigate to `zoom_sync_logs` table
- [ ] Verify new sync log entry with:
  - [ ] `sync_status` = "completed"
  - [ ] `processed_items` > 0
  - [ ] No error messages

### 5. Webinar Data Verification
- [ ] Check `zoom_webinars` table
- [ ] Verify webinars are being stored/updated
- [ ] Check `zoom_participants` table for attendee data

## Troubleshooting

### If sync still fails:

1. **Check Render Logs**
   - Go to Render Dashboard > Logs
   - Look for:
     - "SUPABASE SERVICE INITIALIZATION" messages
     - Any error messages about missing environment variables
     - Authentication failures

2. **Verify Direct Sync Mode**
   - If backend auth fails, the app should show:
     - "Backend authorization failed. Using direct sync mode."
   - This is a temporary workaround while fixing backend issues

3. **Common Issues**
   - **"zoomService.getWebinars is not a function"** - Code not deployed yet
   - **401 Unauthorized** - Missing Supabase environment variables
   - **503 Service Unavailable** - Render service is sleeping (free tier)
   - **Network timeout** - Service waking up, try again in 30 seconds

## Success Indicators

- [ ] No error toasts in the UI
- [ ] Sync progress reaches 100%
- [ ] Webinars appear in the dashboard
- [ ] No errors in browser console
- [ ] Sync logs show "completed" status

## Notes

- First sync after deployment may be slow (service warming up)
- Free tier Render services sleep after 15 minutes of inactivity
- Direct sync mode is slower but works as a fallback
- Monitor the Render dashboard for deployment status
