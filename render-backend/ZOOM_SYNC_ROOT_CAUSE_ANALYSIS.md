# Zoom Sync Issues - Root Cause Analysis

## Issues Identified

### 1. **Sync Not Finding Any Webinars (Primary Issue)**
- All recent syncs complete in ~9-10 seconds with 0 webinars synced
- Last successful sync was on June 26, 2025
- Database has 41 webinars but no new ones are being found

### 2. **Missing Fields in Existing Webinars**
Out of 41 webinars in the database:
- Only 2 have `host_email`
- Only 1 has `registration_url`
- 0 have password fields (`h323_password`, `pstn_password`, `encrypted_password`)
- 0 have `recurrence` or `occurrences`

### 3. **Historical Errors**
- "zoomService.getWebinars is not a function" - Fixed
- "Maximum call stack size exceeded" - Fixed
- Recent syncs show no errors but sync 0 webinars

## Root Causes

### 1. **Wrong User Context for API Calls**
The sync is using `/users/me/webinars` which returns webinars for the authenticated user. In a Server-to-Server OAuth app:
- The "user" is the app itself, not the actual host
- Need to enumerate users and fetch webinars for each user
- Or use the specific user ID who owns the webinars

### 2. **Missing Webinar Details**
The list endpoint (`/users/{userId}/webinars`) returns limited fields. To get all fields including:
- `host_email`
- `registration_url`
- Password fields
- `recurrence` and `occurrences`

Must call `/webinars/{webinarId}` for each webinar.

## Complete Fix Implementation

### 1. Update `zoomSyncService.js` to:
```javascript
// Get all users in the account first
const usersResponse = await zoomService.getUsers(accessToken);
const users = usersResponse.users || [];

// For each user, get their webinars
for (const user of users) {
  const webinarsResponse = await zoomService.getUserWebinars(user.id, accessToken, { type });
  // Process webinars...
}

// For each webinar, get full details
const fullWebinarData = await zoomService.getWebinar(webinar.id, accessToken);
```

### 2. Add to `zoomService.js`:
```javascript
async getUsers(accessToken, options = {}) {
  const params = new URLSearchParams({
    page_size: options.page_size || 300,
    status: 'active'
  });

  const response = await axios.get(`${this.baseURL}/users?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
}

async getUserWebinars(userId, accessToken, options = {}) {
  const params = new URLSearchParams({
    page_size: options.page_size || 100,
    page_number: options.page_number || 1,
    type: options.type || 'scheduled'
  });

  const response = await axios.get(`${this.baseURL}/users/${userId}/webinars?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
}
```

### 3. Testing Steps
1. Run `node test-zoom-direct.js` to verify which users have webinars
2. Update the sync service with the fixes
3. Run `node debug-sync.js` to test the updated sync
4. Deploy and run a manual sync from the dashboard

## Expected Results
After implementing these fixes:
1. Sync should find all webinars across all users in the account
2. All fields should be populated including host_email, registration_url, passwords, etc.
3. Sync time will increase due to additional API calls but all data will be complete

## Performance Considerations
- With rate limiting (150ms per webinar detail call), 100 webinars = ~15 seconds
- Consider implementing parallel processing with rate limit management
- Cache webinar details to avoid re-fetching unchanged data
