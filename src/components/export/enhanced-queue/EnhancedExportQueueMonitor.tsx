
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Download, 
  Trash2, 
  AlertCircle, 
  Clock, 
  CheckCircle,
  XCircle,
  Search,
  Filter,
  BarChart3,
  Skull
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ExportJobRetryManager } from '@/services/export/job/ExportJobRetryManager';
import { useToast } from '@/hooks/use-toast';

interface ExportJob {
  id: string;
  export_type: string;
  status: string;
  progress_percentage: number;
  file_url?: string;
  file_size?: number;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  performance_metrics?: any;
  export_config: any;
}

interface DeadLetterJob {
  id: string;
  original_job_id: string;
  export_type: string;
  failure_reason: string;
  moved_to_dlq_at: string;
  retry_history: any[];
  export_config: any;
}

export function EnhancedExportQueueMonitor() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [deadLetterJobs, setDeadLetterJobs] = useState<DeadLetterJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [showStats, setShowStats] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadJobs();
    loadDeadLetterJobs();
    
    // Set up real-time subscription for job updates
    const subscription = supabase
      .channel('export-queue-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'export_queue'
      }, () => {
        loadJobs();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('export_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load export jobs",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeadLetterJobs = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await ExportJobRetryManager.getDeadLetterJobs(user.user.id);
      if (error) throw error;
      
      setDeadLetterJobs(data);
    } catch (error) {
      console.error('Failed to load dead letter jobs:', error);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const success = await ExportJobRetryManager.retryJob(jobId);
      if (success) {
        toast({
          title: "Success",
          description: "Job queued for retry"
        });
        loadJobs();
      } else {
        throw new Error('Retry failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to retry job",
        variant: "destructive"
      });
    }
  };

  const handleRequeueFromDLQ = async (dlqId: string) => {
    try {
      const success = await ExportJobRetryManager.requeueFromDeadLetter(dlqId);
      if (success) {
        toast({
          title: "Success",
          description: "Job requeued successfully"
        });
        loadJobs();
        loadDeadLetterJobs();
      } else {
        throw new Error('Requeue failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to requeue job",
        variant: "destructive"
      });
    }
  };

  const handleDownload = (job: ExportJob) => {
    if (job.file_url) {
      window.open(job.file_url, '_blank');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'dead_letter': return <Skull className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'dead_letter': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return 'Unknown';
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    return `${Math.round(duration / 1000)}s`;
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.export_config?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.export_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const jobStats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    deadLetter: deadLetterJobs.length,
    avgDuration: jobs
      .filter(j => j.started_at && j.completed_at)
      .reduce((sum, j) => {
        const duration = new Date(j.completed_at!).getTime() - new Date(j.started_at!).getTime();
        return sum + duration;
      }, 0) / Math.max(jobs.filter(j => j.started_at && j.completed_at).length, 1)
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Enhanced Export Queue Monitor
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowStats(!showStats)}>
              <BarChart3 className="h-4 w-4 mr-2" />
              {showStats ? 'Hide' : 'Show'} Stats
            </Button>
            <Button variant="outline" size="sm" onClick={loadJobs} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{jobStats.total}</div>
              <div className="text-sm text-gray-600">Total Jobs</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{jobStats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{jobStats.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(jobStats.avgDuration / 1000)}s
              </div>
              <div className="text-sm text-gray-600">Avg Duration</div>
            </div>
          </div>
        )}

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active Jobs</TabsTrigger>
            <TabsTrigger value="dead-letter">
              Dead Letter Queue
              {deadLetterJobs.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {deadLetterJobs.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(job.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">
                            {job.export_config?.title || `${job.export_type} Export`}
                          </h4>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                          {job.retry_count > 0 && (
                            <Badge variant="outline">
                              Retry {job.retry_count}/{job.max_retries}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                          <div>Type: {job.export_type}</div>
                          <div>Created: {new Date(job.created_at).toLocaleString()}</div>
                          {job.file_size && <div>Size: {formatFileSize(job.file_size)}</div>}
                          {job.started_at && job.completed_at && (
                            <div>Duration: {formatDuration(job.started_at, job.completed_at)}</div>
                          )}
                        </div>

                        {job.status === 'processing' && job.progress_percentage > 0 && (
                          <div className="mb-2">
                            <Progress value={job.progress_percentage} className="h-2" />
                            <div className="text-xs text-gray-500 mt-1">
                              {job.progress_percentage}% complete
                            </div>
                          </div>
                        )}

                        {job.error_message && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            <div className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Error: {job.error_message}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {job.status === 'completed' && job.file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(job)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {job.status === 'failed' && job.retry_count < job.max_retries && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryJob(job.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {filteredJobs.length === 0 && !isLoading && (
                <div className="text-center py-8 text-gray-500">
                  No jobs found matching your criteria
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="dead-letter" className="space-y-4">
            <div className="space-y-3">
              {deadLetterJobs.map((dlqJob) => (
                <Card key={dlqJob.id} className="p-4 border-red-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Skull className="h-4 w-4 text-gray-500 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">
                            {dlqJob.export_config?.title || `${dlqJob.export_type} Export`}
                          </h4>
                          <Badge variant="outline" className="text-red-600 border-red-300">
                            Dead Letter
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          Moved to DLQ: {new Date(dlqJob.moved_to_dlq_at).toLocaleString()}
                        </div>

                        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Final Error: {dlqJob.failure_reason}
                          </div>
                        </div>

                        {dlqJob.retry_history.length > 0 && (
                          <div className="mt-2">
                            <details className="text-sm">
                              <summary className="cursor-pointer text-gray-600">
                                Retry History ({dlqJob.retry_history.length} attempts)
                              </summary>
                              <div className="mt-2 space-y-1">
                                {dlqJob.retry_history.map((attempt: any, index: number) => (
                                  <div key={index} className="pl-4 border-l-2 border-gray-200">
                                    <div className="text-xs text-gray-500">
                                      Attempt {attempt.attempt}: {new Date(attempt.timestamp).toLocaleString()}
                                    </div>
                                    <div className="text-xs text-red-600">{attempt.error}</div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRequeueFromDLQ(dlqJob.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Requeue
                    </Button>
                  </div>
                </Card>
              ))}

              {deadLetterJobs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No jobs in dead letter queue
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
