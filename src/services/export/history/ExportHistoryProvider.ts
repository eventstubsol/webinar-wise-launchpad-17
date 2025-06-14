
import { supabase } from '@/integrations/supabase/client';
import { ExportQueueItem, ExportConfig } from '../types';

export class ExportHistoryProvider {
  static async getExportHistory(): Promise<ExportQueueItem[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('export_queue')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item,
      export_config: item.export_config as unknown as ExportConfig,
      export_type: item.export_type as ExportQueueItem['export_type'],
      status: item.status as ExportQueueItem['status'],
      progress_percentage: item.progress_percentage || 0,
      completed_at: item.completed_at || null, 
      created_at: item.created_at || new Date().toISOString(), 
      error_message: item.error_message || null,
      expires_at: item.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      export_format: item.export_format || undefined, // Changed from null to undefined to match type
      file_size: item.file_size || undefined, // Changed from null to undefined
      file_url: item.file_url || undefined, // Changed from null to undefined
      started_at: item.started_at || undefined, // Changed from null to undefined
      updated_at: item.updated_at || new Date().toISOString(),
    }));
  }
}
