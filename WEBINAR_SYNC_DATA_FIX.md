# Webinar Sync Data Fix Summary

## Issue Identified

When running the sync, the status shows 100% completion, but many columns in the `zoom_webinars` table are not getting updated properly, specifically:
- `total_attendees` shows 0 even for past webinars with registrants
- `total_absentees` is not calculated correctly
- `avg_attendance_duration` is 0
- Status mapping issue: Edge function returns 'finished' but database expects 'ended'

## Root Cause Analysis

1. **Status Mismatch**: The edge function `determineWebinarStatus` was returning 'finished' for past webinars, but the database uses 'ended' as the status value.

2. **Column Mapping Issues**: 
   - The edge function was missing the `zoom_webinar_id` field in the upsert data
   - The `onConflict` clause was using the wrong column names

3. **Data Fetching**: The participant data is being fetched correctly via `fetchParticipantData()`, but due to the above issues, the updates weren't being applied properly.

## Fix Applied

### 1. Fixed Status Mapping
Changed the `determineWebinarStatus` function to:
- Return 'ended' instead of 'finished' for past webinars
- Map API status 'finished' to 'ended'
- Use 'upcoming' as default status instead of 'scheduled'

### 2. Fixed Column Mapping
- Added `zoom_webinar_id` to the webinar data object
- Fixed the `onConflict` clause to use `'connection_id,zoom_webinar_id'`
- Added proper calculation for `total_absentees`

### 3. Enhanced Logging
Added logging to track webinar metrics during sync:
```
[SYNC] Webinar metrics - Registrants: X, Attendees: Y, Absentees: Z
```

## Files Modified

1. `supabase/functions/zoom-sync-webinars-v2/index.ts`
   - Fixed `determineWebinarStatus` function
   - Fixed webinar data mapping
   - Fixed upsert conflict resolution

## Deployment Instructions

1. Deploy the fixed edge function:
   ```bash
   # On Windows
   ./deploy-fixed-sync.bat
   
   # On Unix/Mac
   ./deploy-fixed-sync.sh
   ```

2. Trigger a sync to update existing data:
   ```bash
   node fix-webinar-sync-data.js
   ```

## Verification

After running the fix, verify that:
1. Past webinars show status as 'ended' (not 'finished')
2. `total_attendees` is populated for past webinars
3. `total_absentees` equals `total_registrants - total_attendees`
4. `avg_attendance_duration` is calculated correctly

You can verify with this SQL query:
```sql
SELECT 
  topic,
  status,
  total_registrants,
  total_attendees,
  total_absentees,
  avg_attendance_duration
FROM zoom_webinars
WHERE connection_id = '511b5833-b466-4cf1-b0a3-ef922df1d681'
  AND status = 'ended'
ORDER BY start_time DESC
LIMIT 10;
```

## Additional Notes

The sync was working correctly in terms of fetching data from Zoom's API, but the data wasn't being persisted properly due to the mapping issues. This fix ensures that all fetched data is correctly stored in the database.
