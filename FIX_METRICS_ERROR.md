# Fix for Metrics Query Error

## Issue
The frontend is still trying to query using the old table relationships:
```
"Could not find a relationship between 'zoom_webinars' and 'zoom_registrants'"
```

## Root Cause
After simplifying the database structure, the frontend code was updated but the changes may not have been applied due to:
1. Browser caching old JavaScript files
2. Local development server not reloading properly
3. Build artifacts not being regenerated

## Solution Steps

### 1. Clear Browser Cache and Restart Dev Server

#### For Windows:
```bash
# Stop the dev server (Ctrl+C)
# Clear npm/vite cache
npm cache clean --force
rm -rf node_modules/.vite

# Restart the dev server
npm run dev
```

#### Hard Refresh Browser:
- Chrome/Edge: Ctrl + Shift + R (or F12 → Right-click refresh → Empty Cache and Hard Reload)
- Firefox: Ctrl + Shift + R
- Safari: Cmd + Option + R

### 2. Verify the Updated Code is Applied

The following files have been updated to use the new structure:
- ✅ `src/hooks/useWebinarMetrics/dataService.ts` - Now queries webinar_metrics table
- ✅ `src/hooks/useWebinars.ts` - Joins with webinar_metrics
- ✅ `src/hooks/useWebinarDetail.ts` - Includes metrics in detail view

### 3. If Issues Persist

Run this command to rebuild everything:
```bash
# Windows
rmdir /s /q node_modules\.vite
npm run dev

# Mac/Linux
rm -rf node_modules/.vite
npm run dev
```

### 4. Test the Fix

1. Open Developer Tools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for requests to Supabase - they should now show:
   ```
   zoom_webinars?select=*,metrics:webinar_metrics(...)
   ```
   NOT the old format with zoom_registrants(count)

## What Changed

### Before (Old Structure):
```javascript
.select(`
  *,
  zoom_registrants(count),
  zoom_participants(count)
`)
```

### After (New Structure):
```javascript
.select(`
  *,
  metrics:webinar_metrics(
    total_attendees,
    unique_attendees,
    participant_sync_status
  )
`)
```

## Verification

Run the debug script to verify the database is correctly set up:
```bash
node debug-metrics-issue.js
```

This will test all the queries and confirm the new structure is working.

## If Still Not Working

1. Check if you're running the latest code:
   ```bash
   git status
   git pull
   ```

2. Reinstall dependencies:
   ```bash
   npm install
   ```

3. Clear all caches:
   ```bash
   # Clear Vite cache
   rm -rf node_modules/.vite
   
   # Clear browser storage
   # In DevTools Console:
   localStorage.clear()
   sessionStorage.clear()
   ```

4. Restart everything:
   - Close all browser tabs
   - Stop dev server
   - Start dev server
   - Open fresh browser tab

The error should be resolved once the updated code is properly loaded!
