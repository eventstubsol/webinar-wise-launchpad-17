
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function authenticateUser(req: Request) {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('Missing or invalid authorization header');
    throw {
      status: 401,
      message: 'Missing authorization header'
    };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (authError || !user) {
    console.error('Authentication failed:', authError);
    throw {
      status: 401,
      message: 'Authentication failed'
    };
  }

  console.log(`User authenticated: ${user.id}`);
  return { user, supabaseClient };
}
