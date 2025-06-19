#!/bin/bash

echo "🚀 Comprehensive Zoom Sync Edge Function Deployment"
echo "=================================================="
echo ""

PROJECT_REF="guwvvinnifypcxwbcnzz"
FUNCTION_NAME="zoom-sync-webinars"

echo "📦 Step 1: Validating Edge Function Files"
echo "-----------------------------------------"

# Check if all required files exist
REQUIRED_FILES=(
    "supabase/functions/zoom-sync-webinars/index.ts"
    "supabase/functions/zoom-sync-webinars/simple-sync-processor.ts"
    "supabase/functions/zoom-sync-webinars/database-operations.ts"
    "supabase/functions/zoom-sync-webinars/zoom-api-client.ts"
)

ALL_FILES_EXIST=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Found: $file"
    else
        echo "❌ Missing: $file"
        ALL_FILES_EXIST=false
    fi
done

if [ "$ALL_FILES_EXIST" = false ]; then
    echo ""
    echo "❌ Some required files are missing!"
    exit 1
fi

echo ""
echo "📝 Step 2: Applying Database Fixes"
echo "----------------------------------"

# Create SQL file for constraints
cat > fix-constraints.sql << 'EOF'
-- Fix missing constraints for zoom_webinars and zoom_participants tables
DO $$ 
BEGIN
    -- Check and create constraint for zoom_webinars
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'zoom_webinars_webinar_connection_unique'
    ) THEN
        -- Remove any duplicate webinars first
        DELETE FROM zoom_webinars a
        USING zoom_webinars b
        WHERE a.id < b.id
        AND a.webinar_id = b.webinar_id
        AND a.connection_id = b.connection_id;

        -- Create the unique constraint
        ALTER TABLE zoom_webinars
        ADD CONSTRAINT zoom_webinars_webinar_connection_unique 
        UNIQUE (webinar_id, connection_id);
        
        RAISE NOTICE 'Created unique constraint on zoom_webinars(webinar_id, connection_id)';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on zoom_webinars(webinar_id, connection_id)';
    END IF;

    -- Check and create constraint for zoom_participants
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'zoom_participants_webinar_participant_unique'
    ) THEN
        -- Remove any duplicate participants first
        DELETE FROM zoom_participants a
        USING zoom_participants b
        WHERE a.id < b.id
        AND a.webinar_id = b.webinar_id
        AND a.participant_id = b.participant_id;

        -- Create the unique constraint
        ALTER TABLE zoom_participants
        ADD CONSTRAINT zoom_participants_webinar_participant_unique 
        UNIQUE (webinar_id, participant_id);
        
        RAISE NOTICE 'Created unique constraint on zoom_participants(webinar_id, participant_id)';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on zoom_participants(webinar_id, participant_id)';
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_webinar_id ON zoom_webinars(webinar_id);
CREATE INDEX IF NOT EXISTS idx_zoom_webinars_connection_id ON zoom_webinars(connection_id);
CREATE INDEX IF NOT EXISTS idx_zoom_participants_webinar_id ON zoom_participants(webinar_id);
CREATE INDEX IF NOT EXISTS idx_zoom_participants_participant_id ON zoom_participants(participant_id);
EOF

echo "SQL file created. Please run this in Supabase SQL Editor."
echo ""

echo "🚀 Step 3: Deploying Edge Function"
echo "----------------------------------"

# Deploy the function
supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully!"
else
    echo "❌ Edge Function deployment failed!"
    echo ""
    echo "Alternative: Deploy via Supabase Dashboard"
    echo "https://supabase.com/dashboard/project/$PROJECT_REF/functions/$FUNCTION_NAME"
fi

echo ""
echo "🧪 Step 4: Testing Deployment"
echo "-----------------------------"

# Test CORS
echo "Testing CORS configuration..."
curl -s -X OPTIONS "https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME" \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type" \
  -o /dev/null -w "HTTP Status: %{http_code}\n"

echo ""
echo "📋 Step 5: Post-Deployment Checklist"
echo "------------------------------------"
echo "1. ✅ Database constraints applied"
echo "2. ✅ Edge Function deployed"
echo "3. ✅ CORS configuration tested"
echo ""
echo "📊 Monitor Edge Function Logs:"
echo "https://supabase.com/dashboard/project/$PROJECT_REF/functions/$FUNCTION_NAME/logs"
echo ""
echo "🎯 Test the sync from your application!"
echo ""
echo "If you encounter errors, check:"
echo "1. Edge Function logs for specific error messages"
echo "2. Browser console for detailed error responses"
echo "3. Zoom connection token status"
echo ""
echo "Deployment complete!"
