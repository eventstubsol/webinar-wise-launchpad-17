# Render Backend Sync Fix - Deployment Guide

## Issue Summary
The Zoom sync is failing because the Render backend service is using the wrong column name (`webinar_id` instead of `zoom_webinar_id`) when saving webinar data to the database.

## Root Cause
1. The database has both `webinar_id` and `zoom_webinar_id` columns
2. The Render backend uses `webinar_id` while the frontend expects `zoom_webinar_id`
3. This causes the unique constraint to fail and prevents webinar updates

## Fix Applied

### 1. Updated `zoomSyncService.js`
- Changed to use `zoom_webinar_id` column consistently
- Added proper data transformation function
- Improved error handling and logging
- Added preservation of calculated metrics during updates

### 2. Key Changes
```javascript
// OLD - Incorrect column
.eq('webinar_id', webinar.id)

// NEW - Correct column
.eq('zoom_webinar_id', webinar.id.toString())
```

## Deployment Steps

### Step 1: Apply Database Migration
Run the migration to ensure data consistency:
```bash
# Connect to your Supabase SQL Editor and run:
# fix-webinar-column-consistency.sql
```

### Step 2: Deploy to Render

1. **Commit and Push Changes**
   ```bash
   cd render-backend
   git add services/zoomSyncService.js
   git commit -m "Fix: Use correct zoom_webinar_id column in sync service"
   git push origin main
   ```

2. **Render Auto-Deploy**
   - If auto-deploy is enabled, Render will automatically deploy the changes
   - Monitor the deployment in your Render dashboard

3. **Manual Deploy (if needed)**
   - Go to your Render dashboard
   - Navigate to your webinar-wise-backend service
   - Click "Manual Deploy" > "Deploy latest commit"

### Step 3: Verify Deployment

1. **Check Service Health**
   ```bash
   curl https://your-render-service.onrender.com/health
   ```

2. **Test Sync Endpoint**
   ```bash
   # Use the test script provided or manually test from the UI
   ```

### Step 4: Monitor Logs

1. **Render Dashboard**
   - Go to your service in Render
   - Click on "Logs" tab
   - Look for successful sync messages

2. **Check for Errors**
   - Look for any "Failed to save webinar" errors
   - Verify webinars are being created/updated

## Testing the Fix

### From the UI:
1. Go to your Webinar Wise dashboard
2. Navigate to Settings > Zoom Integration
3. Click "Sync Now"
4. Monitor the sync progress

### Expected Results:
- Sync should complete without errors
- Webinars should appear in the database
- Participant counts should be updated
- No "Failed to save webinar" errors in logs

## Rollback Plan

If issues occur after deployment:

1. **Revert the Code**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Redeploy Previous Version**
   - In Render dashboard, go to "Deploys"
   - Find the previous successful deployment
   - Click "Redeploy"

## Monitoring

After deployment, monitor:
1. Sync success rate in `zoom_sync_logs` table
2. Webinar count in `zoom_webinars` table
3. Error logs in Render dashboard
4. User reports of sync issues

## Prevention

To prevent similar issues:
1. Always check database schema before writing queries
2. Use consistent column naming conventions
3. Test sync operations in development first
4. Add integration tests for sync operations
