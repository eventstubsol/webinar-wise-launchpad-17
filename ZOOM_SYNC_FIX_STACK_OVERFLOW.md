# Zoom Sync Fix - Updated Instructions

## ACTUAL Root Cause

The sync is failing with "Maximum call stack size exceeded" due to:
1. **Circular module reference** in the zoomService exports that created infinite recursion
2. **Missing Supabase environment variables** on Render (preventing authentication)
3. **Inconsistent method signatures** between services

## Fixed Issues

### 1. Fixed Circular Reference (MAIN ISSUE)
- The zoomService was exporting itself in a circular way causing infinite recursion
- Fixed by simplifying the module export to just export the instance

### 2. Fixed Import Statements
- Updated all imports from `const { zoomService } = require(...)` to `const zoomService = require(...)`
- This prevents destructuring issues with the module

### 3. Fixed Method Signatures
- Updated `createSyncLog` to accept a single object parameter instead of two parameters
- This makes it consistent with the route handler's usage

## Deployment Steps

### 1. Commit and Push the Fixed Code

```bash
git add .
git commit -m "Fix circular reference causing stack overflow in Zoom sync"
git push
```

### 2. Add Environment Variables to Render

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

### 3. Wait for Deployment

- Render will automatically redeploy when you push the code
- The deployment takes 2-3 minutes
- Monitor the deployment logs for any errors

## Testing the Fix

### 1. Check Backend Health
Visit: https://webinar-wise-launchpad-17.onrender.com/health

Should return:
```json
{
  "status": "ok",
  "message": "Render backend is running"
}
```

### 2. Test Sync Functionality
1. Open your app
2. Click "Sync with Zoom"
3. The sync should now work without the stack overflow error

### 3. Monitor Logs
- Check browser console for any errors
- Check Render logs for backend errors
- Check Supabase logs for database errors

## What Was Actually Happening

The error "Maximum call stack size exceeded" was caused by this code pattern:

```javascript
// BAD - Causes circular reference
module.exports = zoomService;
module.exports.zoomService = zoomService; // <-- This creates a circular reference
```

When the module tried to load, it would infinitely recurse trying to resolve the circular reference.

The fix was simple:
```javascript
// GOOD - No circular reference
module.exports = zoomService;
```

## Verification

After deployment, the sync should:
1. No longer show "Maximum call stack size exceeded"
2. Successfully create sync logs in the database
3. Process webinars from Zoom
4. Show progress updates in the UI

## Troubleshooting

If you still see errors after deployment:

1. **Check Render Logs**
   - Look for "MODULE INITIALIZATION" messages
   - Verify no circular reference errors
   - Check for missing environment variables

2. **Check Browser Console**
   - Should not show stack overflow errors
   - May show auth errors if env vars are missing

3. **Direct Sync Mode**
   - If Render auth fails, the app will use direct sync
   - This is slower but works as a fallback

## Summary

The main issue was NOT the Edge Functions migration - that was already completed. The issue was a circular reference introduced when trying to fix the import/export pattern. This has now been properly resolved.
