
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PreferenceUpdateRequest {
  preferences: {
    marketing?: boolean;
    product_updates?: boolean;
    newsletters?: boolean;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const { data: pref, error: prefError } = await supabase
      .from('email_preferences')
      .select('*, profiles(email)')
      .eq('preference_management_token', token)
      .single();

    if (prefError || !pref) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    if (new Date(pref.preference_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Token expired.' }), { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
    
    if (req.method === 'GET') {
      const email = Array.isArray(pref.profiles) ? pref.profiles[0]?.email : pref.profiles?.email;
      return new Response(JSON.stringify({ preferences: pref.preferences || {}, email }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const { preferences }: PreferenceUpdateRequest = await req.json();

      const { data: updatedPref, error: updateError } = await supabase
        .from('email_preferences')
        .update({
          preferences: preferences,
          unsubscribed: !Object.values(preferences).some(v => v === true),
          updated_at: new Date().toISOString()
        })
        .eq('id', pref.id)
        .select()
        .single();
      
      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true, preferences: updatedPref.preferences }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  } catch (error: any) {
    console.error('Error managing email preferences:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
