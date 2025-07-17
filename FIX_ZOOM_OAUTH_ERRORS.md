# Instructions to Fix Zoom OAuth Errors

## The errors you're seeing are due to:

1. **Backend server not running** - The Render backend needs to be running on port 3001
2. **DOM nesting warnings** - Fixed by updating the ZoomConsentDialog component

## To fix these issues:

### 1. Start the Render Backend Server

Open a new terminal/command prompt and run:

```bash
cd render-backend
npm install
npm start
```

Or use the batch file I created:
```bash
start-backend.bat
```

The server should start on http://localhost:3001

### 2. Restart your Vite development server

After the backend is running, restart your frontend:
```bash
npm run dev
```

### 3. Test the Zoom OAuth flow

1. Go to http://localhost:8080/register
2. Click "Sign up with Zoom"
3. The consent dialog should now load properly
4. Click "Connect with Zoom"

## Note about Zoom OAuth App

The current implementation uses placeholder credentials. To make it fully functional, you need to:

1. Create a Zoom OAuth app at https://marketplace.zoom.us/
2. Set the redirect URI to: `http://localhost:3001/api/auth/zoom/callback`
3. Update the credentials in `render-backend/.env`:
   - `ZOOM_OAUTH_CLIENT_ID`
   - `ZOOM_OAUTH_CLIENT_SECRET`

## What was fixed:

1. ✅ Fixed DOM nesting warnings by using `asChild` prop on DialogDescription
2. ✅ Added VITE_RENDER_BACKEND_URL to frontend .env
3. ✅ Updated render-backend .env with all required variables
4. ✅ Created start-backend.bat for easy server startup

The implementation is now ready to test locally once the backend server is running!
