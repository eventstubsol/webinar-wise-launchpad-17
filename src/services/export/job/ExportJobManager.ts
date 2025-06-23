
import { supabase } from '@/integrations/supabase/client';
import { PDFGenerator } from '../PDFGenerator';
import { ExcelGenerator } from '../ExcelGenerator';
import { PowerPointGenerator } from '../PowerPointGenerator';
import { ExportConfig } from '../types';
import { ExportDataProvider } from '../data/ExportDataProvider';
import { ExportJobRetryManager } from './ExportJobRetryManager';
import { EnhancedPDFGenerator } from '../engines/EnhancedPDFGenerator';
import { EnhancedExcelGenerator } from '../engines/EnhancedExcelGenerator';
import { EnhancedPowerPointGenerator } from '../engines/EnhancedPowerPointGenerator';
import { CSVExportEngine } from '../engines/CSVExportEngine';
import { EnhancedExportDataProvider } from '../data/EnhancedExportDataProvider';

export class ExportJobManager {
  static async createExportJob(
    exportType: 'pdf' | 'excel' | 'powerpoint' | 'csv',
    config: ExportConfig
  ): Promise<string> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Start performance tracking
    const startTime = Date.now();

    const { data, error } = await supabase
      .from('export_queue')
      .insert({
        user_id: user.user.id,
        export_type: exportType,
        export_config: config as any,
        status: 'pending',
        retry_count: 0,
        max_retries: 3,
        performance_metrics: {
          created_at: new Date().toISOString(),
          estimated_size: config.webinarIds?.length || 1
        }
      })
      .select()
      .single();

    if (error) throw error;
    
    // Process the job immediately
    this.processExportJobWithRetry(data.id);
    
    return data.id;
  }

  static async processExportJobWithRetry(jobId: string): Promise<void> {
    try {
      await this.processExportJob(jobId);
    } catch (error) {
      console.error(`Export job ${jobId} failed:`, error);
      
      // Attempt retry with enhanced retry manager
      const errorMessage = error instanceof Error ? error.message : String(error);
      const retryScheduled = await ExportJobRetryManager.scheduleRetry(jobId, errorMessage);
      
      if (!retryScheduled) {
        console.log(`Job ${jobId} exceeded max retries or moved to dead letter queue`);
      }
    }
  }

  static async processExportJob(jobId: string): Promise<void> {
    const processingStartTime = Date.now();
    
    try {
      // Update status to processing
      await supabase
        .from('export_queue')
        .update({ 
          status: 'processing', 
          started_at: new Date().toISOString(),
          progress_percentage: 10 
        })
        .eq('id', jobId);

      // Get job details
      const { data: job, error: jobError } = await supabase
        .from('export_queue')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      const config = job.export_config as unknown as ExportConfig;

      // Update progress
      await supabase
        .from('export_queue')
        .update({ progress_percentage: 25 })
        .eq('id', jobId);

      // Fetch enhanced webinar data
      const dataFetchStart = Date.now();
      const processedData = await EnhancedExportDataProvider.getAnalyticsData(config);
      const dataFetchTime = Date.now() - dataFetchStart;
      
      // Update progress
      await supabase
        .from('export_queue')
        .update({ progress_percentage: 50 })
        .eq('id', jobId);

      let fileBlob: Blob;
      let fileName: string;
      const generationStart = Date.now();

      // Generate export based on type using enhanced generators
      switch (job.export_type) {
        case 'pdf':
          fileBlob = await EnhancedPDFGenerator.generateAnalyticsReport(processedData.webinars, config);
          fileName = `${config.title.replace(/\s+/g, '_')}_report.pdf`;
          break;
        case 'excel':
          fileBlob = EnhancedExcelGenerator.generateWebinarReport(processedData.webinars, config);
          fileName = `${config.title.replace(/\s+/g, '_')}_data.xlsx`;
          break;
        case 'powerpoint':
          fileBlob = await EnhancedPowerPointGenerator.generateAnalyticsPresentation({
            totalWebinars: processedData.summary.totalWebinars,
            totalParticipants: processedData.participants.length,
            avgEngagement: processedData.engagement.averagePollParticipationRate || 0,
            webinars: processedData.webinars
          }, config);
          fileName = `${config.title.replace(/\s+/g, '_')}_presentation.pptx`;
          break;
        case 'csv':
          fileBlob = await CSVExportEngine.generateParticipantsCSV(processedData.webinars, config);
          fileName = `${config.title.replace(/\s+/g, '_')}_data.csv`;
          break;
        default:
          throw new Error(`Unsupported export type: ${job.export_type}`);
      }

      const generationTime = Date.now() - generationStart;

      // Update progress
      await supabase
        .from('export_queue')
        .update({ progress_percentage: 75 })
        .eq('id', jobId);

      // Upload the file using enhanced data provider
      const uploadStart = Date.now();
      const uploadResponse = await EnhancedExportDataProvider.uploadFile(fileBlob, fileName);
      const fileUrl = uploadResponse.url; // Extract URL from response object
      const uploadTime = Date.now() - uploadStart;

      const totalProcessingTime = Date.now() - processingStartTime;

      // Safely handle performance metrics
      const existingMetrics = job.performance_metrics as Record<string, any> | null;
      const baseMetrics = existingMetrics || {};

      // Update job with completion and enhanced performance metrics
      await supabase
        .from('export_queue')
        .update({
          status: 'completed',
          progress_percentage: 100,
          file_url: fileUrl,
          file_size: fileBlob.size,
          completed_at: new Date().toISOString(),
          performance_metrics: {
            ...baseMetrics,
            processing_time_ms: totalProcessingTime,
            data_fetch_time_ms: dataFetchTime,
            generation_time_ms: generationTime,
            upload_time_ms: uploadTime,
            file_size_bytes: fileBlob.size,
            records_processed: processedData.webinars.length,
            data_quality_score: 85, // Default score
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', jobId);

      // Add to report history with enhanced metadata
      await supabase
        .from('report_history')
        .insert({
          user_id: job.user_id,
          export_queue_id: jobId,
          report_type: job.export_type as string,
          report_title: config.title,
          file_url: fileUrl,
          file_size: fileBlob.size,
          delivery_status: 'sent',
          generation_time_ms: totalProcessingTime
        });

    } catch (error) {
      await supabase
        .from('export_queue')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
          completed_at: new Date().toISOString(),
          performance_metrics: {
            processing_time_ms: Date.now() - processingStartTime,
            failed_at: new Date().toISOString(),
            error_type: error instanceof Error ? error.constructor.name : 'Unknown'
          }
        })
        .eq('id', jobId);
      
      throw error;
    }
  }
}
