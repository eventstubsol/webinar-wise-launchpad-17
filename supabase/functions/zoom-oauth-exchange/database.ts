
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ConnectionData } from './types.ts';

export class DatabaseService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  async validateUser(authHeader: string) {
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const { data: { user }, error: authError } = await this.supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Invalid authentication');
    }

    return user;
  }

  async unsetPrimaryConnections(userId: string) {
    const { error } = await this.supabase
      .from('zoom_connections')
      .update({ is_primary: false })
      .eq('user_id', userId);

    if (error) {
      console.warn('Failed to unset existing primary connections:', error);
    }
  }

  async saveConnection(connectionData: ConnectionData) {
    const { data: connection, error } = await this.supabase
      .from('zoom_connections')
      .insert(connectionData)
      .select()
      .single();

    if (error) {
      console.error('Failed to insert connection:', error);
      throw new Error('Failed to save connection');
    }

    return connection;
  }
}
