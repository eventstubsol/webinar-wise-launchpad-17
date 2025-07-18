# Fix for Zoom OAuth Error 4700

## Understanding the Error
Error 4700 means "Invalid redirect URI" - the redirect URL configured in your Zoom app doesn't match the one being sent in the OAuth request.

## Quick Fix Steps

### 1. Create/Update Your Zoom OAuth App

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/develop/create)
2. Click "Create" and choose "OAuth" app type
3. Fill in the app details:
   - **App Name**: Webinar Wise
   - **App Type**: User-managed app
   - **Would you like to publish this app**: No (for now)

4. In the "App Credentials" section:
   - Copy your **Client ID** and **Client Secret**
   - Add these redirect URIs (add ALL of them):
     ```
     http://localhost:3001/api/auth/zoom/callback
     https://webinar-wise-launchpad-17.onrender.com/api/auth/zoom/callback
     https://your-custom-domain.com/api/auth/zoom/callback
     ```

5. In the "Scopes" section, add these permissions:
   - `user:read` - View user's profile info
   - `webinar:read` - View webinars
   - `webinar:read:admin` - View all webinars
   - `report:read:admin` - View webinar reports
   - `recording:read` - View recordings

6. Save your app

### 2. Update Environment Variables

#### For Local Development
Update `render-backend/.env`:
```env
# Zoom OAuth Configuration
ZOOM_OAUTH_CLIENT_ID=your_actual_client_id_here
ZOOM_OAUTH_CLIENT_SECRET=your_actual_client_secret_here
ZOOM_OAUTH_REDIRECT_URI=http://localhost:3001/api/auth/zoom/callback

# Application URL
VITE_APP_URL=http://localhost:8080
```

Update root `.env`:
```env
# Render Backend URL
VITE_RENDER_BACKEND_URL=http://localhost:3001
```

#### For Production (Render)
In your Render dashboard, add these environment variables:
```env
ZOOM_OAUTH_CLIENT_ID=your_actual_client_id_here
ZOOM_OAUTH_CLIENT_SECRET=your_actual_client_secret_here
ZOOM_OAUTH_REDIRECT_URI=https://webinar-wise-launchpad-17.onrender.com/api/auth/zoom/callback
VITE_APP_URL=https://webinar-wise-launchpad-17.lovable.app
```

### 3. Test the Fix

1. Start your backend server:
   ```bash
   cd render-backend
   npm start
   ```

2. Start your frontend:
   ```bash
   npm run dev
   ```

3. Go to http://localhost:8080/register
4. Click "Sign up with Zoom"
5. You should see the consent dialog
6. Click "Connect with Zoom"
7. You'll be redirected to Zoom's login page (not an error page)

## Common Issues and Solutions

### Issue: Still getting error 4700
**Solution**: The redirect URI must match EXACTLY. Check for:
- Missing or extra trailing slashes
- http vs https
- Port numbers
- Typos in the domain

### Issue: "Invalid client" error
**Solution**: Your client ID or secret is wrong. Double-check them in the Zoom app dashboard.

### Issue: Backend not running
**Solution**: Make sure the Render backend is running on port 3001. Check the console for any startup errors.

## How Zoom OAuth Works (Not Username/Password)

Important: Zoom OAuth doesn't use username/password input in your app. Instead:

1. User clicks "Sign up with Zoom"
2. Your app redirects them to Zoom's login page
3. User logs in on Zoom's website (not your app)
4. Zoom redirects back to your app with an authorization code
5. Your backend exchanges this code for access tokens
6. User is now authenticated

This is more secure because:
- Users never enter Zoom credentials in your app
- Your app never sees or stores Zoom passwords
- Users can revoke access anytime from Zoom's settings

## Simplified Consent Dialog

The consent dialog already shows a 1-2 line summary. The detailed scopes open in a new window when clicking "View details". This provides the best user experience while maintaining transparency.
