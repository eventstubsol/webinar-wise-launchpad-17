
import { supabase } from '@/integrations/supabase/client';

export interface ExportQueueItem {
  id: string;
  export_type: string;
  status: string;
  file_url?: string;
  file_size?: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  user_id: string;
  progress_percentage: number;
  export_config: any;
  updated_at: string;
}

export class ExportHistoryProvider {
  static async getExportHistory(userId?: string, limit = 50): Promise<ExportQueueItem[]> {
    // Get current user if userId not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('User not authenticated, returning empty history');
        return [];
      }
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('export_queue')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching export history:', error);
      throw error;
    }

    if (!data) {
      return [];
    }

    // Map export_queue data to ExportQueueItem format
    return data.map(item => ({
      id: item.id,
      export_type: item.export_type,
      status: item.status,
      file_url: item.file_url,
      file_size: item.file_size,
      created_at: item.created_at,
      completed_at: item.completed_at,
      error_message: item.error_message,
      user_id: item.user_id,
      progress_percentage: item.progress_percentage,
      export_config: item.export_config,
      updated_at: item.updated_at,
    }));
  }

  static async deleteExportFile(exportId: string): Promise<void> {
    const { error } = await supabase
      .from('export_queue')
      .delete()
      .eq('id', exportId);

    if (error) {
      console.error('Error deleting export file:', error);
      throw error;
    }
  }

  static async getExportStats(userId?: string) {
    // Get current user if userId not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('User not authenticated, returning empty stats');
        return {
          totalExports: 0,
          successfulExports: 0,
          failedExports: 0,
          pendingExports: 0,
          exportsByType: {},
        };
      }
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('export_queue')
      .select('status, export_type, created_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching export stats:', error);
      throw error;
    }

    if (!data) {
      return {
        totalExports: 0,
        successfulExports: 0,
        failedExports: 0,
        pendingExports: 0,
        exportsByType: {},
      };
    }

    const stats = {
      totalExports: data.length,
      successfulExports: data.filter(item => item.status === 'completed').length,
      failedExports: data.filter(item => item.status === 'failed').length,
      pendingExports: data.filter(item => ['pending', 'processing'].includes(item.status)).length,
      exportsByType: this.groupByType(data),
    };

    return stats;
  }

  private static groupByType(data: any[]) {
    return data.reduce((acc, item) => {
      const type = item.export_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
