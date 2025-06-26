
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, RefreshCw, Database, TrendingUp } from 'lucide-react';
import { useWebinarMetricsUpdate } from '@/hooks/useWebinarMetricsUpdate';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  webinar_id: string;
  zoom_webinar_id: string;
  participants_in_table: number;
  total_attendees_field: number;
  sync_status: string;
  needs_repair: boolean;
}

/**
 * Dashboard for diagnosing and repairing webinar data issues
 * Provides tools to validate and fix participant-webinar relationships
 */
export const WebinarRepairDashboard: React.FC = () => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  
  const { 
    recoverMetrics, 
    isRecovering, 
    recoveryReport,
    generateReport,
    isGeneratingReport 
  } = useWebinarMetricsUpdate();
  
  const { toast } = useToast();

  const runValidation = async () => {
    setIsValidating(true);
    try {
      // Use a direct query instead of RPC call since the function might not be in types
      const { data: webinars, error: webinarsError } = await supabase
        .from('zoom_webinars')
        .select('id, zoom_webinar_id, total_attendees, participant_sync_status');
      
      if (webinarsError) {
        throw webinarsError;
      }

      // Get participant counts for each webinar
      const validationResults: ValidationResult[] = [];
      
      if (webinars) {
        for (const webinar of webinars) {
          const { count: participantCount } = await supabase
            .from('zoom_participants')
            .select('*', { count: 'exact', head: true })
            .eq('webinar_id', webinar.id);

          const participantsInTable = participantCount || 0;
          const totalAttendeesField = webinar.total_attendees || 0;
          const needsRepair = participantsInTable !== totalAttendeesField || 
                             webinar.participant_sync_status === 'pending';

          validationResults.push({
            webinar_id: webinar.id,
            zoom_webinar_id: webinar.zoom_webinar_id,
            participants_in_table: participantsInTable,
            total_attendees_field: totalAttendeesField,
            sync_status: webinar.participant_sync_status || 'unknown',
            needs_repair: needsRepair
          });
        }
      }
      
      setValidationResults(validationResults);
      
      const needsRepair = validationResults.filter(w => w.needs_repair).length;
      toast({
        title: "Validation Complete",
        description: `Found ${needsRepair} webinars needing repair out of ${validationResults.length} total webinars.`,
        variant: needsRepair > 0 ? "destructive" : "default"
      });
    } catch (error: any) {
      console.error('Validation error:', error);
      toast({
        title: "Validation Failed",
        description: error?.message || 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const runRepair = async () => {
    setIsRepairing(true);
    try {
      // Run the metrics recovery process using the mutate function
      recoverMetrics.mutate();
      
      toast({
        title: "Repair Started",
        description: "Running comprehensive repair process...",
      });
    } catch (error: any) {
      console.error('Repair error:', error);
      toast({
        title: "Repair Failed",
        description: error?.message || 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsRepairing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-500', label: 'Pending' },
      processing: { color: 'bg-blue-500', label: 'Processing' },
      completed: { color: 'bg-green-500', label: 'Completed' },
      failed: { color: 'bg-red-500', label: 'Failed' },
      no_participants: { color: 'bg-gray-500', label: 'No Participants' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-400', label: status };
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Webinar Data Repair Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={runValidation}
              disabled={isValidating}
              className="flex items-center gap-2"
            >
              {isValidating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              Validate Data
            </Button>
            
            <Button
              onClick={runRepair}
              disabled={isRepairing || isRecovering}
              variant="outline"
              className="flex items-center gap-2"
            >
              {(isRepairing || isRecovering) ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Run Repair
            </Button>
            
            <Button
              onClick={() => generateReport.mutate()}
              disabled={isGeneratingReport}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isGeneratingReport ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {validationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {validationResults.length}
                  </div>
                  <div className="text-gray-600">Total Webinars</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {validationResults.filter(w => w.needs_repair).length}
                  </div>
                  <div className="text-gray-600">Need Repair</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {validationResults.filter(w => !w.needs_repair).length}
                  </div>
                  <div className="text-gray-600">Healthy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {validationResults.filter(w => w.sync_status === 'pending').length}
                  </div>
                  <div className="text-gray-600">Pending Sync</div>
                </div>
              </div>
              
              {validationResults.filter(w => w.needs_repair).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Webinars Needing Repair</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {validationResults
                      .filter(w => w.needs_repair)
                      .slice(0, 20)
                      .map((webinar, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{webinar.zoom_webinar_id}</div>
                          <div className="text-sm text-gray-600">
                            DB: {webinar.participants_in_table} participants, 
                            Field: {webinar.total_attendees_field} attendees
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(webinar.sync_status)}
                          {webinar.needs_repair && (
                            <Badge variant="destructive">Needs Repair</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {recoveryReport && (
        <Card>
          <CardHeader>
            <CardTitle>Recovery Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {recoveryReport.totalFixed || 0}
                  </div>
                  <div className="text-gray-600">Webinars Fixed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {recoveryReport.errors?.length || 0}
                  </div>
                  <div className="text-gray-600">Errors</div>
                </div>
              </div>
              
              {recoveryReport.errors && recoveryReport.errors.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Errors</h3>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {recoveryReport.errors.map((error: string, index: number) => (
                      <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
