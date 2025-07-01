require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const zoomService = require('./services/zoomService');
const { syncWebinars } = require('./services/zoomSyncService');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugSync() {
  try {
    console.log('=== DEBUG ZOOM SYNC ===\n');
    
    // 1. Get active connection
    console.log('1. Getting active connection...');
    const { data: connection, error: connError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('connection_status', 'active')
      .single();
    
    if (connError) {
      console.error('Error getting connection:', connError);
      return;
    }
    
    console.log('Connection found:', {
      id: connection.id,
      type: connection.connection_type,
      account_id: connection.zoom_account_id,
      token_expires_at: connection.token_expires_at
    });
    
    // 2. Get credentials
    console.log('\n2. Getting credentials...');
    const { data: credentials, error: credError } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', connection.user_id)
      .eq('is_active', true)
      .single();
    
    if (credError) {
      console.error('Error getting credentials:', credError);
      return;
    }
    
    console.log('Credentials found:', {
      id: credentials.id,
      app_type: credentials.app_type,
      has_client_id: !!credentials.client_id,
      has_client_secret: !!credentials.client_secret,
      has_account_id: !!credentials.account_id
    });
    
    // 3. Test token validity
    console.log('\n3. Testing current access token...');
    const tokenValid = await zoomService.validateAccessToken(connection.access_token);
    console.log('Token valid:', tokenValid);
    
    // 4. If token expired, refresh it
    let accessToken = connection.access_token;
    if (!tokenValid) {
      console.log('\n4. Token invalid, refreshing...');
      const tokenData = await zoomService.getServerToServerToken(
        credentials.client_id,
        credentials.client_secret,
        credentials.account_id
      );
      
      accessToken = tokenData.access_token;
      console.log('New token obtained');
      
      // Update connection
      await supabase
        .from('zoom_connections')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
        })
        .eq('id', connection.id);
    }
    
    // 5. Try to fetch webinars directly
    console.log('\n5. Fetching webinars from Zoom API...');
    try {
      const response = await zoomService.getWebinars(accessToken, {
        page_size: 10,
        type: 'scheduled'
      });
      
      console.log('API Response:', {
        page_count: response.page_count,
        page_number: response.page_number,
        page_size: response.page_size,
        total_records: response.total_records,
        webinars_count: response.webinars ? response.webinars.length : 0
      });
      
      if (response.webinars && response.webinars.length > 0) {
        console.log('\nFirst webinar:', {
          id: response.webinars[0].id,
          topic: response.webinars[0].topic,
          start_time: response.webinars[0].start_time,
          type: response.webinars[0].type
        });
      } else {
        console.log('\nNo webinars found in response');
      }
      
    } catch (apiError) {
      console.error('API Error:', {
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        message: apiError.message
      });
    }
    
    // 6. Try fetching past webinars
    console.log('\n6. Fetching past webinars...');
    try {
      const pastResponse = await zoomService.getWebinars(accessToken, {
        page_size: 10,
        type: 'past'
      });
      
      console.log('Past webinars:', {
        total_records: pastResponse.total_records,
        webinars_count: pastResponse.webinars ? pastResponse.webinars.length : 0
      });
      
    } catch (pastError) {
      console.error('Past webinars error:', pastError.message);
    }
    
    // 7. Test the actual sync function
    console.log('\n7. Testing sync function...');
    const syncResults = await syncWebinars({
      connection: { ...connection, access_token: accessToken },
      credentials,
      syncLogId: 'test-sync-' + Date.now(),
      syncType: 'manual',
      onProgress: (progress, message) => {
        console.log(`Progress ${progress}%: ${message}`);
      }
    });
    
    console.log('\nSync Results:', syncResults);
    
  } catch (error) {
    console.error('Debug sync failed:', error);
  }
}

// Run the debug
debugSync();
