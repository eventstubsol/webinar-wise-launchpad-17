# Deploying Zoom Sync V2 Edge Functions

## Prerequisites
1. Make sure you have Supabase CLI installed: `npm install -g supabase`
2. Make sure you're logged in: `supabase login`
3. Link your project: `supabase link --project-ref guwvvinnifypcxwbcnzz`

## Set Environment Variables
First, set the required environment variables for the edge functions:

```bash
# Set Zoom OAuth credentials
supabase secrets set ZOOM_CLIENT_ID=your_zoom_client_id
supabase secrets set ZOOM_CLIENT_SECRET=your_zoom_client_secret
```

## Deploy Edge Functions

Deploy the new sync functions one by one:

```bash
# Deploy the main V2 sync function
supabase functions deploy zoom-sync-webinars-v2

# Deploy the progress tracking function
supabase functions deploy zoom-sync-progress

# Deploy the delta sync function
supabase functions deploy zoom-delta-sync

# Deploy test functions (optional, for development)
supabase functions deploy test-zoom-rate-limits
supabase functions deploy test-sync-error-handling
```

## Verify Deployment
You can check if the functions are deployed by running:
```bash
supabase functions list
```

## Alternative: Deploy All at Once
You can also run the provided script:
```bash
# On Windows (Git Bash)
bash deploy-sync-functions.sh

# On Mac/Linux
chmod +x deploy-sync-functions.sh
./deploy-sync-functions.sh
```

## Troubleshooting

### CORS Errors
If you're getting CORS errors, make sure the `_shared/cors.ts` file is properly configured and the functions include the OPTIONS handler.

### Function Not Found
If the function returns 404, ensure:
1. The function is deployed (`supabase functions list`)
2. The function name matches exactly
3. You're using the correct project URL

### Authentication Errors
Make sure your Zoom OAuth app has the correct scopes:
- `webinar:read`
- `user:read`
- `recording:read` (optional)

## Testing
After deployment, test the sync by:
1. Going to the Sync Center page
2. Clicking "Sync Webinars"
3. Selecting "Smart Sync" mode
4. Monitoring the progress in real-time
