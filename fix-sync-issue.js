require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Test webinar data transformation
async function testWebinarTransformation() {
  console.log('=== Testing Webinar Data Transformation ===\n');
  
  // Get a connection
  const { data: connection, error: connError } = await supabase
    .from('zoom_connections')
    .select('*')
    .eq('connection_status', 'active')
    .single();
    
  if (connError || !connection) {
    console.error('No active connection found:', connError);
    return;
  }
  
  console.log('Using connection:', connection.zoom_email);
  
  // Get token for API calls
  const accessToken = connection.access_token;
  
  // Test fetching a webinar from Zoom API
  try {
    console.log('\n1. Fetching webinars from Zoom API...');
    const response = await axios.get('https://api.zoom.us/v2/users/me/webinars', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        page_size: 5
      }
    });
    
    console.log(`Found ${response.data.webinars.length} webinars`);
    
    if (response.data.webinars.length > 0) {
      const testWebinar = response.data.webinars[0];
      console.log('\n2. Test webinar data:');
      console.log(JSON.stringify(testWebinar, null, 2));
      
      // Try to save this webinar
      console.log('\n3. Attempting to save webinar to database...');
      const dbWebinar = transformWebinarForDatabase(testWebinar, connection.id);
      
      console.log('\n4. Transformed data:');
      console.log(JSON.stringify(dbWebinar, null, 2));
      
      // Check for required fields
      const requiredFields = ['connection_id', 'zoom_webinar_id', 'topic', 'host_id', 'host_email', 'status', 'start_time', 'duration', 'timezone', 'join_url'];
      const missingFields = requiredFields.filter(field => !dbWebinar[field]);
      
      if (missingFields.length > 0) {
        console.error('\n❌ Missing required fields:', missingFields);
        return;
      }
      
      console.log('\n✅ All required fields present');
      
      // Try to upsert
      const { data, error } = await supabase
        .from('zoom_webinars')
        .upsert(dbWebinar, {
          onConflict: 'connection_id,zoom_webinar_id',
          ignoreDuplicates: false
        })
        .select('id')
        .single();
        
      if (error) {
        console.error('\n❌ Database error:', error);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Error message:', error.message);
      } else {
        console.log('\n✅ Successfully saved webinar with ID:', data.id);
      }
    }
    
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
  }
}

// Transform webinar data for database
function transformWebinarForDatabase(apiWebinar, connectionId) {
  return {
    connection_id: connectionId,
    zoom_webinar_id: apiWebinar.id?.toString(),
    uuid: apiWebinar.uuid || null,
    topic: apiWebinar.topic || 'Untitled Webinar',
    agenda: apiWebinar.agenda || null,
    type: apiWebinar.type || 5,
    status: mapWebinarStatus(apiWebinar.status),
    start_time: apiWebinar.start_time ? new Date(apiWebinar.start_time).toISOString() : new Date().toISOString(),
    duration: apiWebinar.duration || 60,
    timezone: apiWebinar.timezone || 'UTC',
    host_id: apiWebinar.host_id || '',
    host_email: apiWebinar.host_email || '',
    join_url: apiWebinar.join_url || '',
    registration_url: apiWebinar.registration_url || null,
    password: apiWebinar.password || null,
    h323_password: apiWebinar.h323_password || null,
    pstn_password: apiWebinar.pstn_password || null,
    encrypted_password: apiWebinar.encrypted_password || null,
    settings: apiWebinar.settings || {},
    recurrence: apiWebinar.recurrence || null,
    occurrences: apiWebinar.occurrences || null,
    webinar_created_at: apiWebinar.created_at ? new Date(apiWebinar.created_at).toISOString() : null,
    is_simulive: apiWebinar.is_simulive || false,
    updated_at: new Date().toISOString(),
    synced_at: new Date().toISOString()
  };
}

// Map Zoom status to our enum
function mapWebinarStatus(status) {
  const statusMap = {
    'waiting': 'waiting',
    'started': 'started',
    'ended': 'ended',
    'scheduled': 'scheduled',
    'upcoming': 'upcoming',
    'finished': 'finished'
  };
  
  return statusMap[status] || 'scheduled';
}

// Test database constraints
async function testDatabaseConstraints() {
  console.log('\n=== Testing Database Constraints ===\n');
  
  // Check unique constraints
  const { data: constraints, error } = await supabase.rpc('get_table_constraints', {
    table_name: 'zoom_webinars'
  }).single();
  
  if (error) {
    // Try raw SQL query
    const { data, error: sqlError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .limit(1);
      
    if (!sqlError && data) {
      console.log('Table structure seems OK, sample row:');
      console.log(Object.keys(data[0]));
    }
  } else {
    console.log('Table constraints:', constraints);
  }
}

// Main function
async function main() {
  console.log('=== ZOOM SYNC ISSUE DIAGNOSTIC ===\n');
  
  // Test webinar transformation
  await testWebinarTransformation();
  
  // Test database constraints
  await testDatabaseConstraints();
  
  // Check recent sync logs for specific errors
  console.log('\n=== Recent Sync Errors ===\n');
  const { data: syncLogs } = await supabase
    .from('zoom_sync_logs')
    .select('*')
    .not('metadata->errors', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1);
    
  if (syncLogs && syncLogs.length > 0) {
    const log = syncLogs[0];
    console.log('Last sync with errors:', new Date(log.started_at).toLocaleString());
    if (log.metadata?.errors) {
      console.log(`Found ${log.metadata.errors.length} errors:`);
      log.metadata.errors.slice(0, 5).forEach(err => {
        console.log(`- Webinar ${err.webinar_id}: ${err.error}`);
      });
    }
  }
}

// Run the diagnostic
main().catch(console.error);
