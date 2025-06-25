
import { supabase } from '@/integrations/supabase/client';

export interface ExportHistoryItem {
  id: string;
  export_type: string;
  export_format: string;
  status: string;
  file_url?: string;
  file_size?: number;
  created_at: string;
  completed_at?: string;
  expires_at?: string;
  error_message?: string;
  user_id: string;
}

export class ExportHistoryProvider {
  static async getExportHistory(userId: string, limit = 50): Promise<ExportHistoryItem[]> {
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

    // Map export_queue data to ExportHistoryItem format
    return data.map(item => ({
      id: item.id,
      export_type: item.export_type,
      export_format: this.getExportFormat(item.export_config), // Extract format from config
      status: item.status,
      file_url: item.file_url,
      file_size: item.file_size,
      created_at: item.created_at,
      completed_at: item.completed_at,
      expires_at: this.calculateExpiresAt(item.completed_at), // Calculate expiry
      error_message: item.error_message,
      user_id: item.user_id,
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

  static async getExportStats(userId: string) {
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

  private static getExportFormat(exportConfig: any): string {
    if (typeof exportConfig === 'object' && exportConfig?.format) {
      return exportConfig.format;
    }
    return 'unknown';
  }

  private static calculateExpiresAt(completedAt?: string): string | undefined {
    if (!completedAt) return undefined;
    
    // Set expiry to 30 days after completion
    const expiryDate = new Date(completedAt);
    expiryDate.setDate(expiryDate.getDate() + 30);
    return expiryDate.toISOString();
  }

  private static groupByType(data: any[]) {
    return data.reduce((acc, item) => {
      const type = item.export_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
