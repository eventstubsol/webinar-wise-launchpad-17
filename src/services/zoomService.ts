
import { supabase } from '@/integrations/supabase/client';
import { ZoomConnection, ZoomWebinar, WebinarAnalyticsSummary, ZoomSyncLog } from '@/types/zoom';

export class ZoomService {
  // Zoom Connections
  static async getConnections(userId: string): Promise<ZoomConnection[]> {
    const { data, error } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getPrimaryConnection(userId: string): Promise<ZoomConnection | null> {
    const { data, error } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async createConnection(connection: Partial<ZoomConnection>): Promise<ZoomConnection> {
    const { data, error } = await supabase
      .from('zoom_connections')
      .insert(connection)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateConnection(id: string, updates: Partial<ZoomConnection>): Promise<ZoomConnection> {
    const { data, error } = await supabase
      .from('zoom_connections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteConnection(id: string): Promise<void> {
    const { error } = await supabase
      .from('zoom_connections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Zoom Webinars
  static async getWebinars(connectionId: string): Promise<ZoomWebinar[]> {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('connection_id', connectionId)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getWebinarsByUser(userId: string): Promise<ZoomWebinar[]> {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .select(`
        *,
        zoom_connections!inner(user_id)
      `)
      .eq('zoom_connections.user_id', userId)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getWebinarAnalytics(userId: string): Promise<WebinarAnalyticsSummary[]> {
    const { data, error } = await supabase
      .from('webinar_analytics_summary')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Sync Operations
  static async getSyncLogs(connectionId: string, limit = 10): Promise<ZoomSyncLog[]> {
    const { data, error } = await supabase
      .from('zoom_sync_logs')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async createSyncLog(syncLog: Partial<ZoomSyncLog>): Promise<ZoomSyncLog> {
    const { data, error } = await supabase
      .from('zoom_sync_logs')
      .insert(syncLog)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateSyncLog(id: string, updates: Partial<ZoomSyncLog>): Promise<ZoomSyncLog> {
    const { data, error } = await supabase
      .from('zoom_sync_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // OAuth URL Generation
  static generateOAuthURL(state: string): string {
    const clientId = import.meta.env.VITE_ZOOM_CLIENT_ID;
    const redirectUri = `${window.location.origin}/zoom/callback`;
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'webinar:read webinar:write meeting:read meeting:write user:read',
      state: state,
    });

    return `https://zoom.us/oauth/authorize?${params.toString()}`;
  }

  // Connection Status Checks
  static async checkConnectionHealth(connectionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('zoom_connections')
        .select('connection_status, token_expires_at')
        .eq('id', connectionId)
        .single();

      if (error) return false;

      if (data.connection_status !== 'active') return false;
      
      const expiresAt = new Date(data.token_expires_at);
      const now = new Date();
      
      return expiresAt > now;
    } catch (error) {
      return false;
    }
  }

  // Dashboard Statistics
  static async getDashboardStats(userId: string) {
    try {
      const connections = await this.getConnections(userId);
      const primaryConnection = connections.find(c => c.is_primary);
      
      if (!primaryConnection) {
        return {
          totalWebinars: 0,
          totalRegistrants: 0,
          totalAttendees: 0,
          avgAttendanceRate: 0,
          hasActiveConnection: false,
          lastSyncAt: null
        };
      }

      const webinars = await this.getWebinars(primaryConnection.id);
      
      const totalRegistrants = webinars.reduce((sum, w) => sum + w.total_registrants, 0);
      const totalAttendees = webinars.reduce((sum, w) => sum + w.total_attendees, 0);
      const avgAttendanceRate = totalRegistrants > 0 ? (totalAttendees / totalRegistrants) * 100 : 0;

      return {
        totalWebinars: webinars.length,
        totalRegistrants,
        totalAttendees,
        avgAttendanceRate: Number(avgAttendanceRate.toFixed(1)),
        hasActiveConnection: primaryConnection.connection_status === 'active',
        lastSyncAt: primaryConnection.last_sync_at
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalWebinars: 0,
        totalRegistrants: 0,
        totalAttendees: 0,
        avgAttendanceRate: 0,
        hasActiveConnection: false,
        lastSyncAt: null
      };
    }
  }
}
