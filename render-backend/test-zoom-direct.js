require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testZoomAPI() {
  try {
    console.log('=== TESTING ZOOM API DIRECTLY ===\n');
    
    // 1. Get connection
    const { data: connection } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('connection_status', 'active')
      .single();
    
    console.log('Connection ID:', connection.id);
    console.log('Account ID:', connection.zoom_account_id);
    
    // 2. Get credentials
    const { data: credentials } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', connection.user_id)
      .eq('is_active', true)
      .single();
    
    // 3. Get fresh token
    console.log('\nGetting fresh access token...');
    const tokenResponse = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: credentials.account_id
      }),
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${credentials.client_id}:${credentials.client_secret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const accessToken = tokenResponse.data.access_token;
    console.log('Got access token');
    
    // 4. Test different user endpoints
    console.log('\n=== TESTING USER ENDPOINTS ===');
    
    // Get current user
    try {
      const meResponse = await axios.get('https://api.zoom.us/v2/users/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      console.log('\n/users/me response:', {
        id: meResponse.data.id,
        email: meResponse.data.email,
        type: meResponse.data.type,
        status: meResponse.data.status
      });
    } catch (e) {
      console.error('/users/me error:', e.response?.data || e.message);
    }
    
    // 5. Test webinar endpoints with different parameters
    console.log('\n=== TESTING WEBINAR ENDPOINTS ===');
    
    // Test /users/me/webinars
    const webinarTypes = ['scheduled', 'upcoming', 'past'];
    
    for (const type of webinarTypes) {
      try {
        console.log(`\nTesting /users/me/webinars?type=${type}`);
        const response = await axios.get(
          `https://api.zoom.us/v2/users/me/webinars?type=${type}&page_size=10`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );
        
        console.log(`${type} webinars:`, {
          total_records: response.data.total_records,
          page_count: response.data.page_count,
          webinars_count: response.data.webinars?.length || 0
        });
        
        if (response.data.webinars && response.data.webinars.length > 0) {
          console.log('First webinar:', {
            id: response.data.webinars[0].id,
            topic: response.data.webinars[0].topic,
            start_time: response.data.webinars[0].start_time
          });
        }
      } catch (e) {
        console.error(`${type} webinars error:`, e.response?.data || e.message);
      }
    }
    
    // 6. Try listing all users to see if we need to use a different user ID
    console.log('\n=== TESTING USER LIST ===');
    try {
      const usersResponse = await axios.get(
        'https://api.zoom.us/v2/users?page_size=10',
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      console.log('Users in account:', {
        total_records: usersResponse.data.total_records,
        users_count: usersResponse.data.users?.length || 0
      });
      
      if (usersResponse.data.users) {
        usersResponse.data.users.forEach(user => {
          console.log(`- User: ${user.email} (${user.id}) - Type: ${user.type}, Status: ${user.status}`);
        });
        
        // Try getting webinars for each user
        for (const user of usersResponse.data.users) {
          try {
            const userWebinarsResponse = await axios.get(
              `https://api.zoom.us/v2/users/${user.id}/webinars?type=scheduled&page_size=5`,
              {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              }
            );
            
            if (userWebinarsResponse.data.total_records > 0) {
              console.log(`\nUser ${user.email} has ${userWebinarsResponse.data.total_records} scheduled webinars`);
            }
          } catch (e) {
            // Ignore errors for users without webinar permissions
          }
        }
      }
    } catch (e) {
      console.error('Users list error:', e.response?.data || e.message);
    }
    
    // 7. Check account info
    console.log('\n=== CHECKING ACCOUNT INFO ===');
    try {
      const accountResponse = await axios.get(
        'https://api.zoom.us/v2/accounts/me',
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      console.log('Account info:', {
        id: accountResponse.data.id,
        account_name: accountResponse.data.account_name,
        account_type: accountResponse.data.account_type
      });
    } catch (e) {
      console.error('Account info error:', e.response?.data || e.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testZoomAPI();
