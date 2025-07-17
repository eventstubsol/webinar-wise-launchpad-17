# Zoom OAuth Fix Instructions

## The Problem
Your current Zoom OAuth app (client ID: `xKW9nsk8STWIXmMDxMySdA`) is invalid/deleted, causing error 4,700.

## Immediate Steps to Fix

### 1. Create New Zoom OAuth App

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Sign in with your Zoom account
3. Click **Develop** → **Build App**
4. Select **OAuth** (not Server-to-Server OAuth)
5. Click **Create**

### 2. Basic Configuration

**App Name**: Webinar Wise  
**App Type**: User-managed app  
**Publish to Marketplace**: OFF (toggle off)

### 3. App Credentials Section

Copy these values (you'll need them later):
- Client ID: `[COPY_THIS_VALUE]`
- Client Secret: `[COPY_THIS_VALUE]`

Add Redirect URLs:
```
http://localhost:3001/api/auth/zoom/callback
https://webinar-wise-launchpad-17.onrender.com/api/auth/zoom/callback
```

### 4. Surface Settings

**Home URL**: `https://webinar-wise-launchpad-17.lovable.app`

**Domain Allow List** (add all):
- `localhost:8080`
- `localhost:3001`
- `webinar-wise-launchpad-17.lovable.app`
- `webinar-wise-launchpad-17.onrender.com`

**Select where to use**: ✅ Webinars

### 5. Information Tab

Fill in all required fields:
- Short Description
- Long Description
- Developer Name
- Developer Email

### 6. Scopes Tab

Add these scopes:
- `user:read` - View user information
- `webinar:read` - View webinars
- `webinar:read:admin` - View all webinars in account
- `report:read:admin` - View webinar reports

### 7. Update Your Code

**Frontend (.env)**:
```env
VITE_ZOOM_CLIENT_ID=[YOUR_NEW_CLIENT_ID]
VITE_ZOOM_CLIENT_SECRET=[YOUR_NEW_CLIENT_SECRET]
```

**Backend (.env)**:
```env
ZOOM_OAUTH_CLIENT_ID=[YOUR_NEW_CLIENT_ID]
ZOOM_OAUTH_CLIENT_SECRET=[YOUR_NEW_CLIENT_SECRET]
```

### 8. Deploy to Render

Update environment variables on Render:
1. Go to your Render dashboard
2. Select your backend service
3. Go to Environment tab
4. Update:
   - `ZOOM_OAUTH_CLIENT_ID`
   - `ZOOM_OAUTH_CLIENT_SECRET`

### 9. Test Locally

1. Restart your backend:
   ```bash
   cd render-backend
   npm run dev
   ```

2. Test the OAuth flow:
   ```bash
   node test-zoom-oauth.js
   ```

3. Try signing in with Zoom from your frontend

## Verification Checklist

- [ ] New OAuth app created in Zoom Marketplace
- [ ] App is activated (check status)
- [ ] Client ID/Secret copied correctly
- [ ] Redirect URLs match exactly (no trailing slashes)
- [ ] All required scopes added
- [ ] Frontend .env updated
- [ ] Backend .env updated
- [ ] Render environment variables updated
- [ ] Services restarted

## Still Getting Error 4,700?

1. Double-check the client ID is copied correctly
2. Ensure the app is activated in Zoom Marketplace
3. Check browser console for the actual OAuth URL being used
4. Verify redirect URI matches exactly what's in Zoom app

## Need Help?

Run this command to see your current configuration:
```bash
cd render-backend
node zoom-oauth-setup-guide.js
```
