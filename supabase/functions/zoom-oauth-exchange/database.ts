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

  async upsertConnection(connectionData: ConnectionData) {
    await this.unsetPrimaryConnections(connectionData.user_id);

    const { data: existing } = await this.supabase
      .from('zoom_connections')
      .select('id')
      .eq('user_id', connectionData.user_id)
      .eq('zoom_user_id', connectionData.zoom_user_id)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await this.supabase
        .from('zoom_connections')
        .update({ ...connectionData, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) {
        console.error('Failed to update connection:', error);
        throw new Error('Failed to update connection');
      }
      return updated;
    } else {
      const { data: inserted, error } = await this.supabase
        .from('zoom_connections')
        .insert(connectionData)
        .select()
        .single();

      if (error) {
        console.error('Failed to insert connection:', error);
        throw new Error('Failed to save connection');
      }
      return inserted;
    }
  }
}
