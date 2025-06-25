
export interface ProcessingTask {
  id: string;
  task_type: string;
  task_data: any;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  webinar_id?: string;
  user_id?: string;
  retry_count: number;
  max_retries: number;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  progress?: number; // Add missing progress property
}

export interface PerformanceData {
  metrics: any[];
  chartData: any[];
  tableData: any[];
  summary: {
    totalSyncs: number;
    averageDuration: number;
    successRate: number;
  };
}
