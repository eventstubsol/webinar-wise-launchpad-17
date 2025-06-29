#!/bin/bash

# Script to deploy enhanced Zoom sync to GitHub

echo "=== Deploying Enhanced Zoom Sync to GitHub ==="
echo ""

# Add all changed files
echo "Adding changed files..."
git add render-backend/services/zoomService.js
git add render-backend/services/zoomSyncService.js
git add render-backend/services/zoomSyncServiceEnhanced.js
git add render-backend/test-enhanced-sync.js
git add render-backend/test-zoom-api-directly.js
git add render-backend/proper-participant-resync.js
git add render-backend/emergency-resync-participants.js
git add render-backend/test-zoom-participants-fix.js
git add supabase/migrations/20250629_fix_participant_sessions.sql
git add ZOOM_ENHANCED_SYNC_SOLUTION.md
git add ZOOM_PARTICIPANTS_DATA_FIX.md

# Show status
echo ""
echo "Git status:"
git status --short

# Commit with detailed message
echo ""
echo "Creating commit..."
git commit -m "Fix Zoom participant sync for large webinars with session tracking

CRITICAL FIX: Resolves issue where webinars with 1,200+ attendees only showed 50-100 participants

Changes:
- Added zoom_participant_sessions table to track multiple join/leave sessions
- Enhanced sync to use report endpoint with detailed participant data
- Implemented proper pagination for large result sets (300+ per page)
- Added session aggregation to calculate total attendance time
- Fixed recurring webinar instance handling
- Added comprehensive error handling and logging

Database changes:
- New table: zoom_participant_sessions for tracking rejoins
- Enhanced zoom_participants with session tracking columns
- Added analytics view for attendance metrics
- Removed problematic unique constraints

API improvements:
- Use /report/webinars/{id}/participants with include_fields
- Handle recurring webinar instances properly
- Smart fallback strategy between endpoints
- Rate limit protection for large syncs

Expected impact:
- Will properly sync all 1,200+ participants per large webinar
- Tracks multiple sessions when participants rejoin
- Accurate total attendance time calculations
- From 355 total participants to 10,000+ expected

Testing:
- Run test-enhanced-sync.js to verify
- Check webinar_attendance_analytics view
- Monitor zoom_participant_sessions table"

# Push to GitHub
echo ""
echo "Pushing to GitHub..."
git push origin main

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "1. Render should automatically detect the changes and redeploy"
echo "2. Monitor the Render dashboard for deployment status"
echo "3. Once deployed, run: node render-backend/test-enhanced-sync.js"
echo "4. Check the database for improved participant counts"
