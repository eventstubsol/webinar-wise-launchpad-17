import { supabase } from '@/integrations/supabase/client';

export interface ExportJobConfig {
  userId: string;
  exportType: string;
  format: string;
  filters?: any;
  reportConfig?: any;
  title?: string;
  description?: string;
  includeCharts?: boolean;
  includeRawData?: boolean;
  brandingConfig?: any;
  dateRange?: any;
  webinarIds?: string[];
  templateId?: string;
}

export interface ExportJob {
  id: string;
  user_id: string;
  export_type: string;
  export_config: any;
  status: string;
  progress_percentage: number;
  file_url?: string;
  file_size?: number;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

export class ExportJobManager {
  static async createExportJob(format: 'pdf' | 'excel' | 'powerpoint' | 'csv', config: ExportJobConfig): Promise<string>;
  static async createExportJob(config: ExportJobConfig): Promise<string>;
  static async createExportJob(
    formatOrConfig: 'pdf' | 'excel' | 'powerpoint' | 'csv' | ExportJobConfig, 
    config?: ExportJobConfig
  ): Promise<string> {
    // Handle both function signatures for backwards compatibility
    let actualConfig: ExportJobConfig;
    
    if (typeof formatOrConfig === 'string') {
      // Legacy signature: createExportJob(format, config)
      if (!config) {
        throw new Error('Config is required when format is provided as first argument');
      }
      actualConfig = {
        ...config,
        format: formatOrConfig,
        exportType: config.exportType || 'webinar_report'
      };
    } else {
      // New signature: createExportJob(config)
      actualConfig = formatOrConfig;
    }

    // Get current user for userId if not provided
    if (!actualConfig.userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      actualConfig.userId = user.id;
    }

    const jobData = {
      user_id: actualConfig.userId,
      export_type: actualConfig.exportType || 'webinar_report',
      export_config: {
        format: actualConfig.format,
        filters: actualConfig.filters || {},
        reportConfig: actualConfig.reportConfig || {},
        title: actualConfig.title,
        description: actualConfig.description,
        includeCharts: actualConfig.includeCharts,
        includeRawData: actualConfig.includeRawData,
        brandingConfig: actualConfig.brandingConfig,
        dateRange: actualConfig.dateRange,
        webinarIds: actualConfig.webinarIds,
        templateId: actualConfig.templateId,
      },
      status: 'pending',
      progress_percentage: 0,
      retry_count: 0,
      max_retries: 3,
    };

    const { data, error } = await supabase
      .from('export_queue')
      .insert(jobData)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating export job:', error);
      throw error;
    }

    return data.id;
  }

  static async getExportJob(jobId: string): Promise<ExportJob | null> {
    const { data, error } = await supabase
      .from('export_queue')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Error fetching export job:', error);
      return null;
    }

    return data as ExportJob;
  }

  static async updateJobStatus(
    jobId: string, 
    status: string, 
    progress?: number,
    fileUrl?: string,
    fileSize?: number,
    errorMessage?: string
  ): Promise<void> {
    const updates: any = { 
      status,
      updated_at: new Date().toISOString()
    };

    if (progress !== undefined) updates.progress_percentage = progress;
    if (fileUrl) updates.file_url = fileUrl;
    if (fileSize) updates.file_size = fileSize;
    if (errorMessage) updates.error_message = errorMessage;
    if (status === 'processing' && !updates.started_at) {
      updates.started_at = new Date().toISOString();
    }
    if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('export_queue')
      .update(updates)
      .eq('id', jobId);

    if (error) {
      console.error('Error updating export job:', error);
      throw error;
    }
  }

  static async getActiveJobs(userId?: string): Promise<ExportJob[]> {
    let query = supabase
      .from('export_queue')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching active jobs:', error);
      throw error;
    }

    return data as ExportJob[] || [];
  }

  static async retryFailedJob(jobId: string): Promise<void> {
    const job = await this.getExportJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.retry_count >= job.max_retries) {
      throw new Error('Maximum retry attempts exceeded');
    }

    const { error } = await supabase
      .from('export_queue')
      .update({
        status: 'pending',
        retry_count: job.retry_count + 1,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error retrying export job:', error);
      throw error;
    }
  }

  static async cancelJob(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('export_queue')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error cancelling export job:', error);
      throw error;
    }
  }

  static async cleanupCompletedJobs(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    console.warn('ExportJobManager: report_history table not implemented yet - using export_queue cleanup');
    
    // Clean up old completed jobs from export_queue
    const { error, count } = await supabase
      .from('export_queue')
      .delete()
      .in('status', ['completed', 'failed', 'cancelled'])
      .lt('completed_at', cutoffDate.toISOString());

    if (error) {
      console.error('Error cleaning up completed jobs:', error);
      throw error;
    }

    return count || 0;
  }

  static async getJobStats(userId?: string) {
    let query = supabase
      .from('export_queue')
      .select('status, export_type, created_at');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching job stats:', error);
      throw error;
    }

    if (!data) {
      return {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        byType: {},
      };
    }

    const stats = {
      total: data.length,
      pending: data.filter(job => job.status === 'pending').length,
      processing: data.filter(job => job.status === 'processing').length,
      completed: data.filter(job => job.status === 'completed').length,
      failed: data.filter(job => job.status === 'failed').length,
      cancelled: data.filter(job => job.status === 'cancelled').length,
      byType: this.groupByType(data),
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
