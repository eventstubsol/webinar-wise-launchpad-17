
import { supabase } from '@/integrations/supabase/client';
import { ProcessingTask } from './types';
import { TaskProcessor } from './TaskProcessor';

export class BackgroundProcessingService {
  private static instance: BackgroundProcessingService;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private taskProcessor = new TaskProcessor();

  static getInstance(): BackgroundProcessingService {
    if (!BackgroundProcessingService.instance) {
      BackgroundProcessingService.instance = new BackgroundProcessingService();
    }
    return BackgroundProcessingService.instance;
  }

  private constructor() {
    this.startProcessing();
  }

  private startProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      this.processNextTask();
    }, 5000);
  }

  private async processNextTask() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;

      const { data: tasks, error } = await supabase
        .from('processing_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;
      if (!tasks || tasks.length === 0) return;

      const task = tasks[0] as ProcessingTask;
      await this.taskProcessor.executeTask(task);

    } catch (error) {
      console.error('Error processing task:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  public stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

export const backgroundProcessor = BackgroundProcessingService.getInstance();
