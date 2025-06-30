# Fix for Zoom Webinars Total Attendees Count

## Issue Summary
The `total_attendees` column in the `zoom_webinars` table was showing the total number of participant sessions instead of unique attendees. This meant that if a person joined, left, and rejoined a webinar, they were counted multiple times.

## What Was Fixed

### 1. Database Migration
- Applied a migration that recalculates `total_attendees` to show unique attendees
- Updated `unique_participant_count` to match the unique attendee count
- Updated `actual_participant_count` to store the total session count
- Recalculated `total_absentees` based on the corrected unique attendee count

### 2. Edge Function Update (`zoom-sync-webinars-v2`)
- Modified the `fetchParticipantData` function to:
  - Fetch all participants with proper pagination
  - Calculate unique attendees by deduplicating based on email (primary) or participant_id
  - Return both total session count and unique attendee count
- Updated the sync process to use the unique count for `total_attendees`

### 3. Key Changes

#### Before:
- `total_attendees`: 600 (total sessions including rejoins)
- `total_absentees`: Calculated incorrectly

#### After:
- `total_attendees`: 3 (unique individuals who attended)
- `unique_participant_count`: 3 (same as total_attendees)
- `actual_participant_count`: 600 (total sessions for reference)
- `total_absentees`: Correctly calculated as registrants - unique attendees

## Verification
The fix has been applied and verified. Sample data shows:
- Webinars that previously showed 600-900 attendees now correctly show 3-5 unique attendees
- The counts now match the actual unique participants in the `zoom_participants` table
- Absentee counts have been recalculated correctly

## Future Syncs
All future webinar syncs will automatically calculate unique attendees correctly using the updated edge function logic.

## Testing the Fix
To verify the fix works for your webinars:

1. Check the current data in your dashboard - `total_attendees` should now show reasonable numbers
2. Run a new sync - new webinars will automatically use the correct counting logic
3. If needed, you can run the `fix-unique-attendees` edge function to recalculate counts for all webinars

## Technical Details

### Unique Attendee Identification
The system now identifies unique attendees using this priority:
1. Email address (primary identifier)
2. Participant ID (if email is not available)
3. User ID (fallback)

This ensures that even if someone joins multiple times, they are counted as one unique attendee.
