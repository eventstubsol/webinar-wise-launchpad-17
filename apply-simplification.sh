#!/bin/bash

echo "Applying simplified zoom_webinars table migration..."

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Apply the migration
echo "Running migration..."
npx supabase db push --db-url "$SUPABASE_DB_URL"

echo "Migration applied successfully!"

echo "Testing the simplified sync..."
node test-simplified-sync.js

echo "Done!"
