# Zoom Sync 400 Error - Root Cause Analysis

## Issue Summary
The sync is failing with a 400 error when trying to call the Zoom API `/users` endpoint using Server-to-Server OAuth.

## Most Likely Root Causes

### 1. Missing Required Scopes
Based on the search results, Server-to-Server OAuth apps require specific scopes to access different endpoints:

**Required Scopes for the Sync:**
- `user:read:admin` - To list all users in the account
- `webinar:write:admin` or `webinar:read:admin` - To access webinar data
- `meeting:write:admin` or `meeting:read:admin` - If also syncing meetings

**Common Issue:** Many users report that these scopes are not visible in their app configuration, which can happen if:
- The Zoom account doesn't have the necessary permissions
- The developer account doesn't have admin privileges
- The account plan doesn't support these features

### 2. User Type Restrictions
Some users can only access their own data, not data for other users in the account. This might explain why `/users/me/webinars` returns 0 but the `/users` endpoint fails.

### 3. Account Type Issues
- Business or higher plan might be required for certain API features
- The account might need specific admin permissions enabled

## How to Fix

### Step 1: Check Zoom App Scopes
1. Go to [Zoom App Marketplace](https://marketplace.zoom.us)
2. Navigate to your Server-to-Server OAuth app
3. Go to the "Scopes" tab
4. Check if you can see and add these scopes:
   - `user:read:admin`
   - `webinar:write:admin`
   - `webinar:read:admin`

### Step 2: If Scopes Are Missing
If you don't see these scopes:

1. **Check Account Permissions:**
   - Ensure your Zoom account has admin privileges
   - Verify you have a Business or higher plan

2. **Contact Account Admin:**
   - The main account administrator may need to grant permissions
   - They might need to enable API access for webinars

3. **Alternative Approach:**
   If you can't get admin scopes, you might need to:
   - Use user-authorized OAuth instead of Server-to-Server
   - Have each user authorize individually
   - Use a different API approach

### Step 3: Deploy Enhanced Logging
The enhanced logging code I've added will help identify the exact error from Zoom:

1. Run the deployment script:
   ```bash
   deploy-enhanced-logging.bat
   ```

2. After deployment, trigger the sync again

3. Check Render logs for detailed error messages like:
   ```
   [ZoomService] Zoom API Error Details: {
     code: [error_code],
     message: [specific_error_message]
   }
   ```

### Step 4: Temporary Workaround
If the user enumeration approach doesn't work due to scope limitations, we might need to revert to a simpler approach:

1. Only sync webinars for the authenticated user
2. Use `/users/me` instead of enumerating all users
3. Require each user to connect their own account

## Next Steps

1. **Check your Zoom app scopes immediately** - This is likely the issue
2. **Deploy the enhanced logging** to get specific error details
3. **Share the error details** from the logs after deployment
4. Based on the specific error code, we can implement a targeted fix

## Expected Error Messages

Based on the search results, you might see one of these:
- "This API does not support client credentials for authorization"
- "Invalid api key or secret"
- "Missing required scopes: user:read:admin"
- "User does not have permission to access this resource"

Once we know the exact error, we can implement the appropriate fix.
