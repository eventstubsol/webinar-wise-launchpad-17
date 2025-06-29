# Zoom Participant Sync Issue Fix - Implementation Guide

## Critical Issues Fixed

### 1. onConflict Method Error
The code was using `.onConflict()` which is not a valid Supabase method. This has been replaced with proper duplicate checking.

**Before (Incorrect):**
```javascript
await supabase
  .from('zoom_participant_sessions')
  .insert({...})
  .onConflict('participant_id,session_id');
```

**After (Correct):**
```javascript
// Check if session already exists
const { data: existingSession } = await supabase
  .from('zoom_participant_sessions')
  .select('id')
  .eq('participant_id', savedParticipant.id)
  .eq('session_id', sessionId)
  .single();

if (!existingSession) {
  const { error: sessionError } = await supabase
    .from('zoom_participant_sessions')
    .insert({...});
}
```

### 2. API Scope Error Handling
Added proper status code checking for the 400 error when the report endpoint fails due to missing scopes.

**Updated:**
```javascript
if (pageCount === 1 && error.response?.status === 400) {
  console.log('Report endpoint failed with 400 error, trying basic endpoint...');
  return await fetchWithBasicEndpoint(webinarDbId, webinarIdentifier, accessToken);
}
```

### 3. Database Indexes Added
The following indexes have been added to improve performance:
- `idx_zoom_participants_webinar_id`
- `idx_zoom_participants_participant_uuid`
- `idx_zoom_participant_sessions_participant_id`
- `idx_zoom_participant_sessions_webinar_id`

## Files to Update

### 1. render-backend/services/zoomSyncServiceEnhanced.js

Replace all instances of `.onConflict()` with proper duplicate checking as shown above.

Key changes:
1. Remove `.onConflict('participant_id,session_id')` from line ~442
2. Remove `.onConflict('participant_id,session_id')` from line ~517
3. Add proper duplicate checking before inserts
4. Add status code checking for API errors

### 2. Database Migration Applied

The following migration has been applied to Supabase:
```sql
-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_id ON zoom_participants(webinar_id);
CREATE INDEX IF NOT EXISTS idx_zoom_participants_participant_uuid ON zoom_participants(participant_uuid);
CREATE INDEX IF NOT EXISTS idx_zoom_participant_sessions_participant_id ON zoom_participant_sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_zoom_participant_sessions_webinar_id ON zoom_participant_sessions(webinar_id);

-- Ensure the unique constraint is properly set
ALTER TABLE zoom_participant_sessions 
DROP CONSTRAINT IF EXISTS zoom_participant_sessions_participant_id_session_id_key;

ALTER TABLE zoom_participant_sessions 
ADD CONSTRAINT zoom_participant_sessions_participant_id_session_id_key 
UNIQUE (participant_id, session_id);
```

## Manual Steps Required

1. **Update the zoomSyncServiceEnhanced.js file** in your GitHub repository with the fixed code
2. **Commit and push** the changes to trigger a Render deployment
3. **Test the sync** with a webinar that has many participants

## Testing

After deployment:
1. Run a manual sync for the webinar with ID `88988872033` (2106 registrants)
2. Monitor the logs for:
   - "Report endpoint failed with 400 error, trying basic endpoint..."
   - Participant count increases
   - Session tracking messages
3. Verify in the database:
   - Check `zoom_participants` table for increased participant count
   - Check `zoom_participant_sessions` table for multiple sessions per participant
   - Verify `total_duration` and `session_count` fields are properly calculated

## Expected Results

- All 1200+ participants should be synced (not just 59)
- Participants who joined multiple times should have multiple session records
- No more `onConflict is not a function` errors
- Graceful fallback to basic endpoint when report endpoint fails
