# Zoom Admin Role-Based Access Control (RBAC) Implementation

## Overview

This implementation provides role-based access control for Webinar Wise, allowing Zoom administrators to manage multiple users and view webinars across their entire organization.

## Key Features

### 1. Automatic Role Detection
- When a user connects their Zoom account, the system automatically detects their role in Zoom
- Roles are synchronized and stored in the database
- Three role levels: `owner`, `admin`, and `member`

### 2. Admin-Only Navigation
- Admin users see an additional "Admin" section in the sidebar
- This section includes:
  - **User Management**: View and manage all users in the Zoom account
  - **Account Analytics**: Organization-wide webinar analytics
  - **All Webinars**: View webinars from all users in the account

### 3. Data Access Control
- Regular users only see their own webinars
- Admin users can see webinars from all managed users
- Row Level Security (RLS) policies enforce these rules at the database level

## Database Schema

### New/Modified Tables

1. **profiles** table additions:
   - `role`: User's role (owner/admin/member)
   - `is_zoom_admin`: Boolean flag for admin status
   - `zoom_account_level`: Zoom account type

2. **zoom_connections** table additions:
   - `zoom_role`: Role name from Zoom
   - `zoom_role_id`: Numeric role ID from Zoom
   - `is_account_admin`: Boolean flag
   - `can_view_all_users`: Permission flag

3. **user_organizations** table (new):
   - Tracks relationships between admin users and managed users
   - Stores permissions for what admins can do with managed users

## Implementation Details

### Role Synchronization

1. **Edge Function**: `sync-zoom-user-role`
   - Fetches user information from Zoom API
   - Determines admin status based on role
   - Updates database with role information
   - For admins, fetches and links all users in their account

2. **Automatic Sync**:
   - Happens after successful Zoom connection
   - Can be manually triggered from the UI
   - Updates both profile and connection records

### Access Control

1. **Frontend**:
   - `useUserRole` hook provides role information
   - Admin sections conditionally rendered based on role
   - Navigation items hidden for non-admin users

2. **Backend**:
   - RLS policies enforce data access rules
   - Admin users can query data for managed users
   - Function `is_user_admin()` checks admin status

### Admin Features

1. **User Management** (`/admin/users`):
   - Lists all users in the Zoom account
   - Shows user roles and webinar counts
   - Allows viewing individual user webinars
   - Can refresh user list from Zoom

2. **Account Analytics** (`/admin/account-analytics`):
   - Aggregated statistics across all users
   - Webinar trends over time
   - User activity comparisons
   - Top performing webinars

3. **All Webinars** (`/admin/webinars`):
   - Combined view of all webinars
   - Filter by user, status, date
   - Export functionality
   - Direct access to webinar details

## Security Considerations

1. **Row Level Security**:
   - Database-level enforcement of access rules
   - Users cannot bypass frontend restrictions
   - Admin relationships verified at query time

2. **Token Security**:
   - Zoom tokens encrypted in database
   - Admin tokens have same security as user tokens
   - No shared access to actual Zoom credentials

3. **Audit Trail**:
   - All admin actions can be logged
   - User organization relationships tracked
   - Changes timestamped and attributed

## Setup Instructions

### For New Installations

1. Run the database migration to add role fields
2. Deploy the `sync-zoom-user-role` edge function
3. Existing users need to reconnect to Zoom to sync roles

### For Existing Users

1. Admin users should disconnect and reconnect to Zoom
2. This will trigger role synchronization
3. Admin features will appear automatically after sync

## API Endpoints

### Edge Functions

- `sync-zoom-user-role`: Syncs user role from Zoom
  - Input: `{ userId: string }`
  - Output: `{ success: boolean, isAdmin: boolean, role: string }`

### Database Functions

- `is_user_admin(user_id)`: Checks if user is admin
  - Returns: boolean

## Best Practices

1. **Regular Sync**: 
   - Admins should periodically refresh user list
   - Ensures new users are discovered
   - Updates role changes

2. **Performance**:
   - User lists are cached
   - Analytics aggregated efficiently
   - Pagination for large datasets

3. **Privacy**:
   - Admins only see business data
   - Personal settings remain private
   - Audit logging for compliance

## Troubleshooting

### Common Issues

1. **Admin features not showing**:
   - Disconnect and reconnect to Zoom
   - Check browser console for errors
   - Verify Zoom account has admin privileges

2. **Missing users**:
   - Click refresh in User Management
   - Check Zoom API permissions
   - Verify users are in same Zoom account

3. **Performance issues**:
   - Check number of users/webinars
   - Review database indexes
   - Consider pagination limits

## Future Enhancements

1. **Granular Permissions**:
   - Department-based access
   - Custom role definitions
   - Feature-specific permissions

2. **Delegation**:
   - Admins can delegate specific permissions
   - Temporary access grants
   - Role inheritance

3. **Compliance**:
   - Detailed audit logs
   - Data retention policies
   - Export for compliance reporting
