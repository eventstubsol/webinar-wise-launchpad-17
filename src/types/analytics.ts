
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
  progress?: number;
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
  // Add missing properties for PerformanceMetricsDashboard
  avgWebinarSyncTime?: number;
  totalApiCalls?: number;
  dataVolumeSynced?: number;
  successRate?: number; // Add this at the top level as well
  trends?: Array<{
    date: string;
    avgDuration: number;
    successRate: number;
    apiCalls: number;
  }>;
}
