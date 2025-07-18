# Local Development Zoom OAuth Setup

Since you're running locally, you need to ensure your Zoom app has the correct redirect URI for your backend server.

## Quick Test

Try this URL in your browser:
```
https://zoom.us/oauth/authorize?response_type=code&client_id=xKW9nsk8STWIXmMDxMySdA&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fauth%2Fzoom%2Fcallback&state=test-state-123&scope=user%3Aread+webinar%3Aread+webinar%3Aread%3Aadmin
```

If this gives error 4700, then your Zoom app doesn't have `http://localhost:3001/api/auth/zoom/callback` as a redirect URI.

## Solution

### Option 1: Add the Correct Redirect URI to Your Zoom App

1. Go to https://marketplace.zoom.us/user/build
2. Click on your app
3. Go to "App Credentials" tab
4. In "Redirect URL for OAuth", add:
   ```
   http://localhost:3001/api/auth/zoom/callback
   ```
5. Save your changes

### Option 2: Find What's Currently Configured

Test these URLs one by one to see which doesn't give error 4700:

1. Frontend callback (wrong but might be configured):
   ```
   https://zoom.us/oauth/authorize?response_type=code&client_id=xKW9nsk8STWIXmMDxMySdA&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fauth%2Fzoom%2Fcallback&state=test-state-123&scope=user%3Aread+webinar%3Aread+webinar%3Aread%3Aadmin
   ```

2. Backend callback (correct):
   ```
   https://zoom.us/oauth/authorize?response_type=code&client_id=xKW9nsk8STWIXmMDxMySdA&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fauth%2Fzoom%2Fcallback&state=test-state-123&scope=user%3Aread+webinar%3Aread+webinar%3Aread%3Aadmin
   ```

## Your Setup Should Be:

- **Frontend**: http://localhost:8080 (your React app)
- **Backend**: http://localhost:3001 (your Express server)
- **Zoom Callback**: http://localhost:3001/api/auth/zoom/callback

The OAuth flow is:
1. User clicks "Sign in with Zoom" on frontend (localhost:8080)
2. Frontend requests auth URL from backend (localhost:3001)
3. User is redirected to Zoom
4. Zoom redirects back to backend (localhost:3001/api/auth/zoom/callback)
5. Backend processes the callback and redirects to frontend

Make sure:
1. Your backend is running on port 3001
2. Your frontend .env has `VITE_RENDER_BACKEND_URL=http://localhost:3001`
3. Your Zoom app has `http://localhost:3001/api/auth/zoom/callback` as redirect URI
