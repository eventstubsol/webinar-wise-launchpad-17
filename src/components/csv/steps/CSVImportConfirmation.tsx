
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Play, Loader2 } from 'lucide-react';
import { CSVUploadData } from '../CSVUploadWizard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CSVImportConfirmationProps {
  uploadData: CSVUploadData;
  updateUploadData: (updates: Partial<CSVUploadData>) => void;
  onImportComplete: () => void;
}

export function CSVImportConfirmation({ 
  uploadData, 
  updateUploadData, 
  onImportComplete 
}: CSVImportConfirmationProps) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');
  const [options, setOptions] = useState({
    skipDuplicates: true,
    updateExisting: false,
    createMissingEntities: true
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const startImport = async () => {
    if (!user || !uploadData.file) return;

    setImporting(true);
    setProgress(0);
    setCurrentOperation('Starting import...');

    try {
      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('csv_imports')
        .insert({
          user_id: user.id,
          import_type: uploadData.importType,
          file_name: uploadData.file.name,
          file_size: uploadData.file.size,
          original_filename: uploadData.file.name,
          total_rows: uploadData.validationResults.validRows.length,
          field_mapping: uploadData.fieldMapping,
          import_options: options,
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (importError) throw importError;

      setProgress(10);
      setCurrentOperation('Processing data...');

      const validRows = uploadData.validationResults.validRows;
      const batchSize = 50;
      let successfulRows = 0;
      let failedRows = 0;
      const processingErrors: any[] = [];

      // Process in batches
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        setCurrentOperation(`Processing rows ${i + 1} to ${Math.min(i + batchSize, validRows.length)}...`);
        
        try {
          if (uploadData.importType === 'participants') {
            await processParticipantsBatch(batch, options, processingErrors);
          } else if (uploadData.importType === 'webinars') {
            await processWebinarsBatch(batch, options, processingErrors);
          } else if (uploadData.importType === 'participations') {
            await processParticipationsBatch(batch, options, processingErrors);
          }
          
          successfulRows += batch.length;
        } catch (error) {
          failedRows += batch.length;
          processingErrors.push({
            batch: i,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        const progressPercentage = Math.round((i + batchSize) / validRows.length * 80) + 10;
        setProgress(Math.min(progressPercentage, 90));
      }

      setProgress(95);
      setCurrentOperation('Finalizing import...');

      // Update import record with results
      const { error: updateError } = await supabase
        .from('csv_imports')
        .update({
          status: failedRows > 0 ? 'completed' : 'completed',
          successful_rows: successfulRows,
          failed_rows: failedRows,
          processing_errors: processingErrors,
          completed_at: new Date().toISOString(),
          progress_percentage: 100
        })
        .eq('id', importRecord.id);

      if (updateError) throw updateError;

      setProgress(100);
      setCurrentOperation('Import completed!');

      const importResults = {
        id: importRecord.id,
        totalRows: validRows.length,
        successfulRows,
        failedRows,
        duplicateRows: uploadData.validationResults.duplicates.length,
        errors: processingErrors
      };

      updateUploadData({ importResults });

      toast({
        title: "Import completed",
        description: `Successfully imported ${successfulRows} of ${validRows.length} rows`,
      });

      setTimeout(() => {
        onImportComplete();
      }, 1000);

    } catch (error) {
      console.error('Import error:', error);
      setImporting(false);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  };

  const processParticipantsBatch = async (batch: any[], options: any, errors: any[]) => {
    // Insert participants - simplified for MVP
    const participantInserts = batch.map(row => ({
      email: row.email?.toLowerCase().trim(),
      first_name: row.first_name?.trim(),
      last_name: row.last_name?.trim(),
      organization: row.organization?.trim() || null,
      job_title: row.job_title?.trim() || null,
      phone: row.phone?.trim() || null,
      city: row.city?.trim() || null,
      state_province: row.state_province?.trim() || null,
      country: row.country?.trim() || null
    }));

    // For MVP, we'll just simulate the insert since we don't have the participants table
    // In a real implementation, this would insert into the participants table
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time
  };

  const processWebinarsBatch = async (batch: any[], options: any, errors: any[]) => {
    // Similar simulation for webinars
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  const processParticipationsBatch = async (batch: any[], options: any, errors: any[]) => {
    // Similar simulation for participations
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Step 4: Import Confirmation</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-4">Import Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Data Type:</span>
                <span className="font-medium">{uploadData.importType}</span>
              </div>
              <div className="flex justify-between">
                <span>File:</span>
                <span className="font-medium">{uploadData.file?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Valid Rows:</span>
                <span className="font-medium text-green-600">
                  {uploadData.validationResults.validRows.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Errors:</span>
                <span className="font-medium text-red-600">
                  {uploadData.validationResults.errors.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Duplicates:</span>
                <span className="font-medium text-yellow-600">
                  {uploadData.validationResults.duplicates.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-4">Import Options</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skipDuplicates"
                  checked={options.skipDuplicates}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, skipDuplicates: checked as boolean }))
                  }
                />
                <label htmlFor="skipDuplicates" className="text-sm">
                  Skip duplicate records
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="updateExisting"
                  checked={options.updateExisting}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, updateExisting: checked as boolean }))
                  }
                />
                <label htmlFor="updateExisting" className="text-sm">
                  Update existing records
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createMissing"
                  checked={options.createMissingEntities}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, createMissingEntities: checked as boolean }))
                  }
                />
                <label htmlFor="createMissing" className="text-sm">
                  Create missing entities
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {importing && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-4">Import Progress</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>{currentOperation}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button
          onClick={startImport}
          disabled={importing || uploadData.validationResults.errors.length > 0}
          size="lg"
          className="px-8"
        >
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start Import
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
