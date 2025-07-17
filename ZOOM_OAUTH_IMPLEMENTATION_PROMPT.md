# Webinar Wise - Zoom OAuth Integration & Multi-Tenant Architecture Implementation

## Project Context
I am building **Webinar Wise**, a SaaS platform for transforming Zoom webinar data into business intelligence. The platform is built with:
- **Tech Stack**: React + TypeScript + Supabase + Tailwind + Shadcn UI
- **Platform**: Lovable.dev
- **Supabase Project ID**: lgajnzldkfpvcuofjxom
- **Project Location**: C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17

## Current Implementation Status
We have implemented a basic role-based access control (RBAC) system with the following features:
1. **Database Schema**:
   - Extended `profiles` table with role fields (`role`, `is_zoom_admin`, `zoom_account_level`)
   - Enhanced `zoom_connections` table with Zoom role information
   - Created `user_organizations` table to track admin-user relationships
   - Implemented Row Level Security (RLS) policies

2. **Features Implemented**:
   - Automatic role detection via Edge Function `sync-zoom-user-role`
   - Admin-only navigation section in sidebar
   - Admin pages: User Management, Account Analytics, All Webinars
   - Role-based data access control

3. **Current Authentication Flow**:
   - Users sign up with email/password
   - Connect Zoom via Server-to-Server OAuth credentials (manual input)
   - System detects their Zoom role after connection

## The Challenge
My Zoom account has 55 users (1 owner, ~20 admins, ~34 members). The current implementation has limitations:

### Scenarios That Need Addressing:
1. **Single Admin Signs Up**: When only 1 admin from a 55-user account signs up, they can't manage users who haven't signed up yet
2. **Multiple Users from Same Account**: No automatic organization linking when multiple users from the same Zoom account sign up independently
3. **Mixed Roles**: Owner + admins, or owner + members signing up creates unclear hierarchies
4. **Data Silos**: Each user has their own Zoom connection, leading to duplicate API calls and inconsistent data
5. **No Organization Concept**: Users from the same Zoom account aren't automatically grouped

## Proposed Solution: Zoom OAuth-Based Multi-Tenant Architecture

### Key Changes Needed:
1. **Implement Zoom OAuth for Authentication**:
   - Replace email/password signup with "Sign in with Zoom"
   - Automatically detect user's Zoom account and role
   - No manual credential input needed

2. **Organization-Centric Data Model**:
   ```sql
   -- New tables needed:
   - organizations (zoom_account_id, owner, subscription_plan)
   - organization_members (org_id, user_id, role, permissions)
   - organization_invitations (pending users from Zoom account)
   - shared_zoom_connections (one per organization, not per user)
   ```

3. **Smart User Onboarding**:
   - First user creates the organization
   - System discovers all 55 users from Zoom API
   - Creates invitation records for users who haven't signed up
   - Subsequent users automatically join their organization

4. **Hierarchical Permissions**:
   - Owner: Full control, billing, delete organization
   - Admin: Manage users, view all webinars, no billing
   - Member: View own webinars only

5. **Shared Resources**:
   - One Zoom API connection per organization
   - Centralized webhook handling
   - Unified rate limit management

## Technical Requirements

### 1. Zoom OAuth App Setup:
- Need to create a Zoom OAuth app (not Server-to-Server)
- Required scopes: user:read, account:read, webinar:read, recording:read
- Redirect URI configuration for Lovable.dev environment

### 2. Database Migration:
- Preserve existing user data
- Create organization records for existing users
- Migrate individual connections to shared connections
- Update RLS policies for organization-based access

### 3. UI/UX Changes:
- New login page with "Sign in with Zoom" button
- Organization dashboard for admins/owners
- User invitation system
- Organization settings page

### 4. API Changes:
- Zoom OAuth callback handler
- Organization creation logic
- User-to-organization assignment
- Invitation system endpoints

## Current Code Structure
Key files that need modification:
- `/src/contexts/AuthContext.tsx` - Add Zoom OAuth support
- `/src/components/dashboard/AppSidebar.tsx` - Already has admin section
- `/src/pages/admin/*` - Existing admin pages
- `/src/services/zoom/*` - Zoom integration services
- `/supabase/migrations/*` - Database schema changes

## Questions to Address:
1. Should we support both email/password AND Zoom OAuth, or Zoom OAuth only?
2. How to handle existing users during migration?
3. Billing model: Per organization or per user?
4. Should members see that admins can view their webinars?
5. How to handle users who belong to multiple Zoom accounts?

## Implementation Priority:
1. **Phase 1**: Add Zoom OAuth alongside existing auth
2. **Phase 2**: Create organization model and migration scripts
3. **Phase 3**: Update UI for organization-centric features
4. **Phase 4**: Deprecate individual credential storage

## Desired Outcome:
A scalable, multi-tenant architecture where:
- Users sign in with Zoom (no manual credentials)
- Organizations are automatically created and managed
- Proper hierarchy and permissions are enforced
- Shared resources reduce API calls and improve performance
- Clear visibility of who has access to what data

Please help me implement this improved architecture, starting with the Zoom OAuth integration and organization-centric data model. I need specific code changes, database migrations, and UI updates to transform the current user-centric system into an organization-centric one that properly handles all the scenarios mentioned above.

## Additional Context Files:
- `ADMIN_RBAC_IMPLEMENTATION.md` - Current RBAC implementation details
- `ARCHITECTURE.md` - Overall system architecture
- Database schema is in Supabase project: lgajnzldkfpvcuofjxom
