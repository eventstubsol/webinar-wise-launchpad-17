import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityEvent {
  event_type: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const { event_type, user_id, metadata, severity = 'medium' }: SecurityEvent = await req.json();
      
      // Extract request info
      const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
      const user_agent = req.headers.get('user-agent') || '';
      
      console.log(`Security Event: ${event_type}`, {
        user_id,
        ip_address,
        user_agent,
        metadata,
        severity
      });

      // Log security event to database
      const { error: logError } = await supabaseClient
        .from('security_logs')
        .insert({
          event_type,
          user_id,
          ip_address,
          user_agent,
          metadata: metadata || {},
          severity,
          created_at: new Date().toISOString()
        });

      if (logError) {
        console.error('Failed to log security event:', logError);
      }

      // Check for suspicious patterns
      await checkSuspiciousActivity(supabaseClient, event_type, ip_address, user_id);

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // GET request - retrieve security analytics
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const timeframe = url.searchParams.get('timeframe') || '24h';
      const severity = url.searchParams.get('severity');
      
      let query = supabaseClient
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by timeframe
      const now = new Date();
      const timeframeHours = timeframe === '1h' ? 1 : 
                            timeframe === '24h' ? 24 : 
                            timeframe === '7d' ? 168 : 24;
      const fromTime = new Date(now.getTime() - (timeframeHours * 60 * 60 * 1000));
      
      query = query.gte('created_at', fromTime.toISOString());

      // Filter by severity
      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data: events, error } = await query.limit(100);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ events }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Method not allowed');
  } catch (error) {
    console.error('Security monitor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function checkSuspiciousActivity(
  supabaseClient: any,
  eventType: string,
  ipAddress: string,
  userId?: string
) {
  try {
    // Check for failed login attempts
    if (eventType === 'signin_failed') {
      const { data: recentFailures } = await supabaseClient
        .from('security_logs')
        .select('*')
        .eq('event_type', 'signin_failed')
        .eq('ip_address', ipAddress)
        .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

      if (recentFailures && recentFailures.length >= 5) {
        // Log suspicious activity
        await supabaseClient
          .from('security_logs')
          .insert({
            event_type: 'suspicious_login_attempts',
            ip_address: ipAddress,
            user_id: userId,
            metadata: { 
              failed_attempts: recentFailures.length,
              timeframe: '15_minutes'
            },
            severity: 'high',
            created_at: new Date().toISOString()
          });
      }
    }

    // Check for unusual access patterns
    if (userId) {
      const { data: userEvents } = await supabaseClient
        .from('security_logs')
        .select('ip_address')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (userEvents) {
        const uniqueIPs = new Set(userEvents.map(e => e.ip_address));
        if (uniqueIPs.size > 3) {
          // Multiple IPs in short timeframe
          await supabaseClient
            .from('security_logs')
            .insert({
              event_type: 'multiple_ip_access',
              user_id: userId,
              ip_address: ipAddress,
              metadata: { 
                unique_ips: Array.from(uniqueIPs),
                timeframe: '1_hour'
              },
              severity: 'medium',
              created_at: new Date().toISOString()
            });
        }
      }
    }
  } catch (error) {
    console.error('Error checking suspicious activity:', error);
  }
}