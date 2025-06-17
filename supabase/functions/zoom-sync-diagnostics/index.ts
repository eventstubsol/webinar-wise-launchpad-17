
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticReport {
  summary: {
    totalWebinars: number;
    webinarsWithParticipants: number;
    webinarsWithoutParticipants: number;
    eligibleForParticipantSync: number;
    connectionStatus: string;
  };
  webinarAnalysis: Array<{
    id: string;
    webinar_id: string;
    topic: string;
    start_time: string | null;
    participant_sync_status: string;
    attendees_count: number | null;
    daysSinceWebinar: number | null;
    eligibleForSync: boolean;
  }>;
  apiTests: {
    connectionValid: boolean;
    scopeValidation: {
      hasWebinarRead: boolean;
      hasReportRead: boolean;
      hasUserRead: boolean;
      requiredScopes: string[];
      availableScopes: string[];
    };
    participantApiTest: {
      testedWebinarId: string | null;
      success: boolean;
      error: string | null;
      responseData: any;
      rateLimitInfo: {
        remaining: number | null;
        reset: string | null;
      };
    };
  };
  recommendations: string[];
  errors: string[];
}

async function createZoomAPIClient(connection: any) {
  const baseUrl = 'https://api.zoom.us/v2';
  
  return {
    async makeRequest(endpoint: string) {
      const url = `${baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        data,
        rateLimitInfo: {
          remaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : null,
          reset: rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toISOString() : null,
        }
      };
    }
  };
}

async function validateZoomScopes(client: any): Promise<{
  hasWebinarRead: boolean;
  hasReportRead: boolean;
  hasUserRead: boolean;
  requiredScopes: string[];
  availableScopes: string[];
}> {
  const requiredScopes = ['webinar:read:admin', 'report:read:admin', 'user:read:admin'];
  let availableScopes: string[] = [];
  
  // Test each scope by trying to access relevant endpoints
  let hasWebinarRead = false;
  let hasReportRead = false;
  let hasUserRead = false;
  
  try {
    // Test user:read scope
    await client.makeRequest('/users/me');
    hasUserRead = true;
    availableScopes.push('user:read:admin');
  } catch (error) {
    console.log('user:read test failed:', error.message);
  }
  
  try {
    // Test webinar:read scope
    await client.makeRequest('/users/me/webinars?page_size=1');
    hasWebinarRead = true;
    availableScopes.push('webinar:read:admin');
  } catch (error) {
    console.log('webinar:read test failed:', error.message);
  }
  
  // We'll test report:read when we try to fetch participants
  
  return {
    hasWebinarRead,
    hasReportRead, // Will be updated during participant test
    hasUserRead,
    requiredScopes,
    availableScopes,
  };
}

async function testParticipantAPI(client: any, webinarId: string) {
  try {
    const result = await client.makeRequest(`/report/webinars/${webinarId}/participants?page_size=5`);
    return {
      success: true,
      error: null,
      responseData: result.data,
      rateLimitInfo: result.rateLimitInfo,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseData: null,
      rateLimitInfo: {
        remaining: null,
        reset: null,
      },
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== ZOOM SYNC DIAGNOSTICS START ===');
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid authentication');
    }

    console.log(`Running diagnostics for user: ${user.id}`);

    const report: DiagnosticReport = {
      summary: {
        totalWebinars: 0,
        webinarsWithParticipants: 0,
        webinarsWithoutParticipants: 0,
        eligibleForParticipantSync: 0,
        connectionStatus: 'unknown',
      },
      webinarAnalysis: [],
      apiTests: {
        connectionValid: false,
        scopeValidation: {
          hasWebinarRead: false,
          hasReportRead: false,
          hasUserRead: false,
          requiredScopes: [],
          availableScopes: [],
        },
        participantApiTest: {
          testedWebinarId: null,
          success: false,
          error: null,
          responseData: null,
          rateLimitInfo: {
            remaining: null,
            reset: null,
          },
        },
      },
      recommendations: [],
      errors: [],
    };

    // Phase 1: Get Zoom connection
    console.log('Phase 1: Checking Zoom connection...');
    const { data: connections, error: connError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .limit(1);

    if (connError || !connections || connections.length === 0) {
      report.errors.push('No primary Zoom connection found');
      report.summary.connectionStatus = 'no_connection';
      report.recommendations.push('Connect your Zoom account in Settings');
      
      return new Response(JSON.stringify(report), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const connection = connections[0];
    report.summary.connectionStatus = connection.status || 'unknown';
    console.log(`Found connection: ${connection.id}, status: ${connection.status}`);

    // Phase 2: Analyze webinars
    console.log('Phase 2: Analyzing webinars...');
    const { data: webinars, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('id, webinar_id, topic, start_time, participant_sync_status, attendees_count')
      .eq('connection_id', connection.id)
      .order('start_time', { ascending: false });

    if (webinarError) {
      report.errors.push(`Error fetching webinars: ${webinarError.message}`);
    } else if (webinars) {
      report.summary.totalWebinars = webinars.length;
      
      const now = new Date();
      
      for (const webinar of webinars) {
        const startTime = webinar.start_time ? new Date(webinar.start_time) : null;
        const daysSinceWebinar = startTime ? Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24)) : null;
        const isPastWebinar = startTime ? startTime < now : false;
        const isOldEnough = daysSinceWebinar ? daysSinceWebinar >= 1 : false;
        const eligibleForSync = isPastWebinar && isOldEnough;
        
        const hasParticipants = webinar.participant_sync_status === 'synced' || (webinar.attendees_count && webinar.attendees_count > 0);
        
        if (hasParticipants) {
          report.summary.webinarsWithParticipants++;
        } else {
          report.summary.webinarsWithoutParticipants++;
        }
        
        if (eligibleForSync) {
          report.summary.eligibleForParticipantSync++;
        }
        
        report.webinarAnalysis.push({
          id: webinar.id,
          webinar_id: webinar.webinar_id,
          topic: webinar.topic,
          start_time: webinar.start_time,
          participant_sync_status: webinar.participant_sync_status || 'unknown',
          attendees_count: webinar.attendees_count,
          daysSinceWebinar,
          eligibleForSync,
        });
      }
    }

    // Phase 3: Test Zoom API connection
    console.log('Phase 3: Testing Zoom API connection...');
    try {
      const client = await createZoomAPIClient(connection);
      
      // Test basic connectivity and scopes
      const scopeValidation = await validateZoomScopes(client);
      report.apiTests.scopeValidation = scopeValidation;
      report.apiTests.connectionValid = scopeValidation.hasUserRead;
      
      console.log('Scope validation results:', scopeValidation);
      
      // Phase 4: Test participant API on a past webinar
      console.log('Phase 4: Testing participant API...');
      const eligibleWebinar = report.webinarAnalysis.find(w => 
        w.eligibleForSync && w.participant_sync_status !== 'synced'
      );
      
      if (eligibleWebinar) {
        console.log(`Testing participant API on webinar: ${eligibleWebinar.webinar_id}`);
        const participantTest = await testParticipantAPI(client, eligibleWebinar.webinar_id);
        
        report.apiTests.participantApiTest = {
          testedWebinarId: eligibleWebinar.webinar_id,
          success: participantTest.success,
          error: participantTest.error,
          responseData: participantTest.responseData,
          rateLimitInfo: participantTest.rateLimitInfo,
        };
        
        // Update report:read scope status based on test
        if (participantTest.success) {
          report.apiTests.scopeValidation.hasReportRead = true;
          if (!report.apiTests.scopeValidation.availableScopes.includes('report:read:admin')) {
            report.apiTests.scopeValidation.availableScopes.push('report:read:admin');
          }
        }
        
        console.log('Participant API test result:', participantTest.success ? 'SUCCESS' : `FAILED: ${participantTest.error}`);
      } else {
        console.log('No eligible webinars found for participant API testing');
        report.apiTests.participantApiTest.error = 'No eligible past webinars found for testing';
      }
      
    } catch (error) {
      console.error('API test failed:', error);
      report.errors.push(`API connection test failed: ${error.message}`);
    }

    // Phase 5: Generate recommendations
    console.log('Phase 5: Generating recommendations...');
    
    if (!report.apiTests.connectionValid) {
      report.recommendations.push('Zoom API connection is not working. Check your connection settings.');
    }
    
    if (!report.apiTests.scopeValidation.hasWebinarRead) {
      report.recommendations.push('Missing webinar:read:admin scope. Reconnect your Zoom account with proper permissions.');
    }
    
    if (!report.apiTests.scopeValidation.hasReportRead) {
      report.recommendations.push('Missing report:read:admin scope. This is required to fetch participant data.');
    }
    
    if (report.summary.eligibleForParticipantSync > 0 && !report.apiTests.participantApiTest.success) {
      report.recommendations.push(`Found ${report.summary.eligibleForParticipantSync} webinars eligible for participant sync, but API test failed.`);
    }
    
    if (report.summary.webinarsWithoutParticipants > 0 && report.apiTests.participantApiTest.success) {
      report.recommendations.push(`${report.summary.webinarsWithoutParticipants} webinars are missing participant data. Run a sync to fetch this data.`);
    }
    
    if (report.apiTests.participantApiTest.rateLimitInfo.remaining !== null && report.apiTests.participantApiTest.rateLimitInfo.remaining < 10) {
      report.recommendations.push('Zoom API rate limit is low. Wait before running large sync operations.');
    }

    console.log('=== DIAGNOSTICS COMPLETE ===');
    console.log(`Summary: ${report.summary.totalWebinars} webinars, ${report.summary.webinarsWithoutParticipants} without participants, ${report.summary.eligibleForParticipantSync} eligible for sync`);

    return new Response(JSON.stringify(report, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Diagnostics error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
