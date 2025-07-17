# Zoom OAuth Implementation Guide

## Overview
This guide documents the implementation of Zoom OAuth authentication for Webinar Wise, allowing users to sign up and sign in using their Zoom credentials.

## Features Implemented

### 1. Zoom OAuth Sign In/Sign Up
- Users can sign in or sign up using their Zoom account
- OAuth flow with custom consent dialog
- Automatic user profile creation from Zoom data
- Secure token storage in database

### 2. Custom Consent Screen
- Simplified consent dialog showing summary of permissions
- "View details" option opens full scope list in new window
- Clean, user-friendly interface

### 3. Backend Implementation
- OAuth authorization endpoint: `GET /api/auth/zoom/authorize`
- OAuth callback handler: `GET /api/auth/zoom/callback`
- Consent info endpoint: `GET /api/auth/zoom/consent-info`
- Token refresh endpoint: `POST /api/auth/zoom/refresh`

### 4. Frontend Components
- `ZoomSignInButton`: Reusable Zoom sign-in button
- `ZoomConsentDialog`: Custom consent dialog component
- Updated Login and Register pages with Zoom OAuth option

## Setup Instructions

### 1. Create Zoom OAuth App

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Click "Develop" → "Build App"
3. Choose "OAuth" app type
4. Configure the app:
   - **App Name**: Webinar Wise
   - **App Type**: Account-level app
   - **OAuth Redirect URL**: `https://your-app.onrender.com/api/auth/zoom/callback`
   - **Scopes Required**:
     - `user:read` - Read user profile
     - `account:read:admin` - Read account information
     - `webinar:read:admin` - Read webinar data
     - `recording:read:admin` - Access recordings
     - `report:read:admin` - Generate reports

### 2. Environment Variables

#### Render Backend (.env)
```env
# Zoom OAuth Configuration
ZOOM_OAUTH_CLIENT_ID=your_zoom_oauth_client_id
ZOOM_OAUTH_CLIENT_SECRET=your_zoom_oauth_client_secret
ZOOM_OAUTH_REDIRECT_URI=https://your-app.onrender.com/api/auth/zoom/callback

# Application URL
VITE_APP_URL=https://webinar-wise-launchpad-17.lovable.app

# Supabase
SUPABASE_URL=https://lgajnzldkfpvcuofjxom.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
```

#### Frontend (.env)
```env
# Render Backend URL
VITE_RENDER_BACKEND_URL=https://your-app.onrender.com
```

### 3. Database Schema Updates

The following fields were added to support Zoom OAuth:

#### profiles table
- `zoom_user_id` (TEXT) - Zoom user ID
- `zoom_account_id` (TEXT) - Zoom account ID

#### zoom_connections table
- `is_active` (BOOLEAN) - Connection active status

## User Flow

### Sign Up with Zoom
1. User clicks "Sign up with Zoom" button
2. Custom consent dialog appears with permission summary
3. User can view detailed permissions in new window
4. User clicks "Connect with Zoom"
5. Redirected to Zoom OAuth consent page
6. After authorization, redirected back to app
7. Backend creates user account and profile
8. User is automatically signed in

### Sign In with Zoom
1. User clicks "Sign in with Zoom" button
2. Same consent flow as sign up
3. If user exists, profile is updated with latest Zoom info
4. If new user, account is created
5. User is signed in via magic link

## Security Considerations

1. **Token Storage**: OAuth tokens are encrypted and stored in database
2. **State Parameter**: Random state parameter prevents CSRF attacks
3. **Token Refresh**: Automatic token refresh before expiration
4. **Scope Limitation**: Only necessary scopes are requested
5. **HTTPS Only**: All OAuth flows require HTTPS

## Error Handling

The implementation handles various error scenarios:
- OAuth denial by user
- Invalid state parameter
- Token exchange failure
- User creation failure
- Network errors

Error messages are user-friendly and displayed via toast notifications.

## Customization Options

### Consent Dialog
- Summary text can be modified in the backend endpoint
- Scope descriptions are configurable
- Privacy/Terms URLs can be updated

### Button Styling
- Zoom brand colors are used by default
- Button text is customizable
- Loading states are implemented

## Testing

1. **Local Development**:
   - Use ngrok or similar to expose local backend
   - Update Zoom OAuth redirect URL to ngrok URL
   - Test complete OAuth flow

2. **Production**:
   - Ensure all environment variables are set
   - Verify Zoom app is approved/published
   - Test with real Zoom accounts

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Ensure redirect URI in Zoom app matches exactly
   - Check for trailing slashes

2. **"Token exchange failed"**
   - Verify client ID and secret
   - Check backend logs for detailed error

3. **"User creation failed"**
   - Check Supabase service role key permissions
   - Verify database schema is up to date

## Future Enhancements

1. **Organization Support**: Automatically group users from same Zoom account
2. **Role Mapping**: Map Zoom roles to app roles more granularly
3. **SSO Support**: Add SAML/SSO for enterprise accounts
4. **Account Linking**: Allow linking existing accounts with Zoom
