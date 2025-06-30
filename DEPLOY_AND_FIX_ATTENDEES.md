# Deploy and Fix Zoom Attendee Counts

## Step 1: Deploy the Edge Functions

```bash
cd C:\Users\rajar\Desktop\AA-Webinar-Wise-Master\Version-25-26-06-2025\webinar-wise-launchpad-17

# Deploy the updated functions
npx supabase functions deploy zoom-sync-webinars-v2
npx supabase functions deploy sync-webinar-attendees
npx supabase functions deploy resync-low-attendee-webinars
```

## Step 2: Test with One Webinar

After deployment, test with a single webinar to ensure it's working:

```sql
-- Run this in Supabase SQL Editor to test one webinar
SELECT 
  zoom_webinar_id,
  topic,
  total_registrants,
  total_attendees,
  connection_id
FROM zoom_webinars
WHERE zoom_webinar_id = '82293193909'; -- High registrant webinar

-- Note the connection_id from above, then run:
-- (Replace 'your-connection-id' with the actual connection_id)
SELECT * FROM invoke_edge_function(
  'sync-webinar-attendees',
  json_build_object(
    'webinarId', '82293193909',
    'connectionId', 'your-connection-id',
    'forceSync', true
  )
);
```

## Step 3: Check the Results

```sql
-- Check if the attendee count was updated
SELECT 
  zoom_webinar_id,
  topic,
  total_registrants,
  total_attendees,
  unique_participant_count,
  actual_participant_count,
  participant_sync_status,
  participant_sync_completed_at
FROM zoom_webinars
WHERE zoom_webinar_id = '82293193909';

-- Check the actual participants
SELECT COUNT(*) as total_participants,
       COUNT(DISTINCT email) as unique_emails
FROM zoom_participants
WHERE webinar_id = (
  SELECT id FROM zoom_webinars WHERE zoom_webinar_id = '82293193909'
);
```

## Step 4: If Successful, Run Batch Fix

```sql
-- Run the batch fix for all affected webinars
SELECT * FROM invoke_edge_function('resync-low-attendee-webinars', '{}');
```

## Common Issues and Solutions

### Issue: Functions not deploying
- Make sure you're logged in: `npx supabase login`
- Link to your project: `npx supabase link --project-ref lgajnzldkfpvcuofjxom`

### Issue: Permission errors
- Check that your connection has the proper Zoom API permissions
- The Report API requires additional scopes: `report:read:user`

### Issue: Still showing low counts
- Check the edge function logs in Supabase Dashboard
- The Zoom Report API might not be enabled for your account
- Some webinars might genuinely have low attendance despite high registration
