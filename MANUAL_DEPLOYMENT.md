# Manual Deployment Instructions for Zoom Sync Edge Function

Since you're encountering CLI configuration issues, here's how to deploy manually:

## Option 1: Deploy via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/guwvvinnifypcxwbcnzz/functions

2. **Deploy the Edge Function**
   - Click on "New Function" or find "zoom-sync-webinars" in the list
   - Click "Deploy Function"
   - If prompted for code, copy the entire contents of:
     `supabase/functions/zoom-sync-webinars/index.ts`

3. **Apply Database Migration**
   - Go to: https://supabase.com/dashboard/project/guwvvinnifypcxwbcnzz/sql/new
   - Copy and paste the contents of:
     `supabase/migrations/20250619-fix-participant-constraints.sql`
   - Click "Run"

## Option 2: Using Supabase CLI (Alternative Commands)

Try these commands in order:

```bash
# 1. First, make sure you're logged in
supabase login

# 2. Link to your project
supabase link --project-ref guwvvinnifypcxwbcnzz

# 3. Deploy the function with minimal config
supabase functions deploy zoom-sync-webinars --project-ref guwvvinnifypcxwbcnzz --legacy-bundle

# 4. If that fails, try:
cd supabase/functions
supabase functions deploy zoom-sync-webinars --project-ref guwvvinnifypcxwbcnzz

# 5. Apply the migration
supabase db push --project-ref guwvvinnifypcxwbcnzz
```

## Option 3: Direct API Deployment

If CLI continues to fail, you can deploy using the Supabase Management API:

```bash
# Get your access token from: https://supabase.com/dashboard/account/tokens

curl -X POST https://api.supabase.com/v1/projects/guwvvinnifypcxwbcnzz/functions/zoom-sync-webinars \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "verify_jwt": true,
    "import_map": false
  }'
```

## Testing After Deployment

Once deployed, test the function:

```javascript
// Run this in browser console
fetch('https://guwvvinnifypcxwbcnzz.supabase.co/functions/v1/zoom-sync-webinars', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:8080'
  }
}).then(r => {
  console.log('Status:', r.status);
  console.log('CORS:', r.headers.get('Access-Control-Allow-Origin'));
});
```

## Verify Deployment

Check if the function is running:
- Function logs: https://supabase.com/dashboard/project/guwvvinnifypcxwbcnzz/functions/zoom-sync-webinars/logs
- Function details: https://supabase.com/dashboard/project/guwvvinnifypcxwbcnzz/functions/zoom-sync-webinars
