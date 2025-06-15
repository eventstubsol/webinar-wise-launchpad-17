
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ConnectionUpdate } from './types.ts';

export class DatabaseService {
  private supabase: SupabaseClient;

  constructor(authHeader: string) {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
  }

  async getConnection(connectionId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('zoom_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error(`DB Error: Could not get connection ${connectionId}`, error);
      throw new Error(`Connection not found or not owned by user.`);
    }
    return data;
  }

  async updateConnection(connectionId: string, updates: ConnectionUpdate) {
    const { data, error } = await this.supabase
      .from('zoom_connections')
      .update(updates)
      .eq('id', connectionId)
      .select()
      .single();

    if (error) {
      console.error(`DB Error: Could not update connection ${connectionId}`, error);
      throw new Error('Failed to update connection with new tokens.');
    }
    return data;
  }
}
