# IMMEDIATE FIX for Zoom OAuth Error 4700

## The Problem
You're using placeholder Zoom OAuth credentials. The error 4700 means Zoom doesn't recognize your client ID.

## Quick Fix (5 minutes)

### Step 1: Create Your Zoom OAuth App NOW

1. **Go to:** https://marketplace.zoom.us/develop/create
2. **Sign in** with your Zoom account
3. **Click** "Create" → Choose "OAuth" 
4. **Fill in:**
   - **App Name:** Webinar Wise
   - **App Type:** User-managed app
   - **Would you like to publish this app:** No

### Step 2: Add Redirect URIs in Zoom App

In the "Redirect URL for OAuth" field, add ALL of these (one per line):
```
http://localhost:3001/api/auth/zoom/callback
https://webinar-wise-launchpad-17.onrender.com/api/auth/zoom/callback
```

### Step 3: Add Required Scopes

In the "Scopes" section, add these permissions:
- `user:read`
- `webinar:read`
- `webinar:read:admin`
- `report:read:admin`
- `recording:read`

### Step 4: Copy Your REAL Credentials

After creating the app, you'll see:
- **Client ID:** (looks like: `ABC123def456GHI789`)
- **Client Secret:** (looks like: `abcdefghijklmnopqrstuvwxyz123456`)

### Step 5: Update Your .env File

Edit `render-backend/.env` and replace the placeholders:

```env
# REPLACE THESE WITH YOUR ACTUAL VALUES
ZOOM_OAUTH_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID_HERE
ZOOM_OAUTH_CLIENT_SECRET=YOUR_ACTUAL_CLIENT_SECRET_HERE
```

### Step 6: Restart Your Backend

```bash
cd render-backend
npm start
```

### Step 7: Test Again

1. Go to http://localhost:8080/register
2. Click "Sign up with Zoom"
3. It should now work!

## If You're Testing in Production

Update these environment variables in your Render dashboard:
- `ZOOM_OAUTH_CLIENT_ID` = your actual client ID
- `ZOOM_OAUTH_CLIENT_SECRET` = your actual client secret
- `ZOOM_OAUTH_REDIRECT_URI` = https://webinar-wise-launchpad-17.onrender.com/api/auth/zoom/callback

## Still Not Working?

Run this command to debug:
```bash
cd render-backend
node debug-zoom-oauth.js
```

This will show you exactly what's wrong.

## Common Mistakes to Avoid

1. ❌ Don't use the placeholder credentials (xKW9nsk8STWIXmMDxMySdA)
2. ❌ Don't forget to add ALL redirect URIs to your Zoom app
3. ❌ Don't mix up Client ID and Client Secret
4. ❌ Don't forget to save the Zoom app after adding redirect URIs

The error will be fixed as soon as you use real Zoom OAuth credentials!
