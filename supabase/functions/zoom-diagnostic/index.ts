
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ZoomCredentials {
  account_id: string;
  client_id: string;
  client_secret: string;
}

interface ZoomAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Missing authorization header', { status: 401, headers: corsHeaders });
    }

    // Verify user authentication
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    console.log(`🔍 Starting diagnostic for user: ${user.id}`);

    // Phase 1: Check Zoom Connection and Credentials
    console.log('📋 Phase 1: Checking Zoom Connection');
    
    const { data: connection, error: connError } = await supabase
      .from('zoom_connections')
      .select('*, zoom_credentials(*)')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    if (connError || !connection) {
      console.error('❌ No primary Zoom connection found:', connError);
      return new Response(JSON.stringify({
        success: false,
        phase: 'connection_check',
        error: 'No primary Zoom connection found'
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`✅ Found connection: ${connection.id}`);
    console.log(`🔗 Connection status: ${connection.status}`);

    // Phase 2: Test Zoom API Authentication
    console.log('📋 Phase 2: Testing Zoom API Authentication');
    
    const credentials = connection.zoom_credentials;
    if (!credentials) {
      console.error('❌ No credentials found for connection');
      return new Response(JSON.stringify({
        success: false,
        phase: 'credentials_check',
        error: 'No credentials found'
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get access token
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${credentials.client_id}:${credentials.client_secret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=account_credentials&account_id=${credentials.account_id}`
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Failed to get access token:', errorText);
      return new Response(JSON.stringify({
        success: false,
        phase: 'token_generation',
        error: `Failed to get access token: ${errorText}`
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const tokenData: ZoomAccessTokenResponse = await tokenResponse.json();
    console.log(`✅ Access token obtained`);
    console.log(`🔐 Token scopes: ${tokenData.scope}`);

    // Phase 3: Test User Info API
    console.log('📋 Phase 3: Testing User Info API');
    
    const userInfoResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('❌ Failed to get user info:', errorText);
      return new Response(JSON.stringify({
        success: false,
        phase: 'user_info',
        error: `Failed to get user info: ${errorText}`
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userInfo = await userInfoResponse.json();
    console.log(`✅ User info retrieved: ${userInfo.email} (${userInfo.account_id})`);

    // Phase 4: Test Webinars API
    console.log('📋 Phase 4: Testing Webinars API');
    
    const webinarsResponse = await fetch('https://api.zoom.us/v2/users/me/webinars?page_size=5', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!webinarsResponse.ok) {
      const errorText = await webinarsResponse.text();
      console.error('❌ Failed to get webinars:', errorText);
      return new Response(JSON.stringify({
        success: false,
        phase: 'webinars_list',
        error: `Failed to get webinars: ${errorText}`
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const webinarsData = await webinarsResponse.json();
    console.log(`✅ Webinars retrieved: ${webinarsData.total_records} total`);

    // Phase 5: Test Registrants API with a specific webinar
    console.log('📋 Phase 5: Testing Registrants API');
    
    let registrantsTest = null;
    let participantsTest = null;
    
    if (webinarsData.webinars && webinarsData.webinars.length > 0) {
      const testWebinar = webinarsData.webinars[0];
      console.log(`🎯 Testing with webinar: ${testWebinar.id} - ${testWebinar.topic}`);

      // Test registrants endpoint
      const registrantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${testWebinar.id}/registrants?page_size=5`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (registrantsResponse.ok) {
        const registrantsData = await registrantsResponse.json();
        registrantsTest = {
          success: true,
          count: registrantsData.total_records || 0,
          sample: registrantsData.registrants?.slice(0, 2) || []
        };
        console.log(`✅ Registrants API: ${registrantsTest.count} registrants found`);
      } else {
        const errorText = await registrantsResponse.text();
        registrantsTest = {
          success: false,
          error: errorText,
          status: registrantsResponse.status
        };
        console.error(`❌ Registrants API failed: ${errorText}`);
      }

      // Test participants endpoint
      const participantsResponse = await fetch(`https://api.zoom.us/v2/report/webinars/${testWebinar.id}/participants?page_size=5`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (participantsResponse.ok) {
        const participantsData = await participantsResponse.json();
        participantsTest = {
          success: true,
          count: participantsData.total_records || participantsData.participants?.length || 0,
          sample: participantsData.participants?.slice(0, 2) || []
        };
        console.log(`✅ Participants API: ${participantsTest.count} participants found`);
      } else {
        const errorText = await participantsResponse.text();
        participantsTest = {
          success: false,
          error: errorText,
          status: participantsResponse.status
        };
        console.error(`❌ Participants API failed: ${errorText}`);
      }
    }

    // Phase 6: Check Database Schema
    console.log('📋 Phase 6: Checking Database Schema');
    
    const { data: sampleRegistrant, error: regError } = await supabase
      .from('zoom_registrants')
      .select('*')
      .limit(1);

    const { data: sampleParticipant, error: partError } = await supabase
      .from('zoom_participants')
      .select('*')
      .limit(1);

    console.log(`📊 Database check - Registrants table accessible: ${!regError}`);
    console.log(`📊 Database check - Participants table accessible: ${!partError}`);

    // Compile diagnostic report
    const diagnosticReport = {
      success: true,
      timestamp: new Date().toISOString(),
      phases: {
        connection: {
          status: 'success',
          connection_id: connection.id,
          connection_status: connection.status
        },
        authentication: {
          status: 'success',
          scopes: tokenData.scope,
          user_email: userInfo.email,
          account_id: userInfo.account_id
        },
        webinars_api: {
          status: 'success',
          total_webinars: webinarsData.total_records
        },
        registrants_api: registrantsTest,
        participants_api: participantsTest,
        database: {
          registrants_table: !regError,
          participants_table: !partError,
          registrants_error: regError?.message || null,
          participants_error: partError?.message || null
        }
      },
      recommendations: []
    };

    // Generate recommendations based on findings
    if (!registrantsTest?.success) {
      diagnosticReport.recommendations.push({
        priority: 'high',
        issue: 'Registrants API access failed',
        solution: 'Check if your Zoom app has the "webinar:read:registrant:admin" scope'
      });
    }

    if (!participantsTest?.success) {
      diagnosticReport.recommendations.push({
        priority: 'high',
        issue: 'Participants API access failed',
        solution: 'Check if your Zoom app has the "report:read:list_webinar_participants:admin" scope'
      });
    }

    if (registrantsTest?.success && registrantsTest.count === 0) {
      diagnosticReport.recommendations.push({
        priority: 'medium',
        issue: 'No registrants found in test webinar',
        solution: 'This may be normal if webinars do not require registration'
      });
    }

    if (participantsTest?.success && participantsTest.count === 0) {
      diagnosticReport.recommendations.push({
        priority: 'medium',
        issue: 'No participants found in test webinar',
        solution: 'This may be normal if the webinar has not occurred yet or had no attendees'
      });
    }

    console.log('🎉 Diagnostic complete');
    console.log(`📋 Generated ${diagnosticReport.recommendations.length} recommendations`);

    return new Response(JSON.stringify(diagnosticReport), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Diagnostic error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
