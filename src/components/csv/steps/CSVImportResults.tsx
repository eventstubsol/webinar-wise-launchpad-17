
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RotateCcw, Download } from 'lucide-react';
import { CSVUploadData } from '../CSVUploadWizard';

interface CSVImportResultsProps {
  uploadData: CSVUploadData;
  onStartOver: () => void;
}

export function CSVImportResults({ uploadData, onStartOver }: CSVImportResultsProps) {
  const results = uploadData.importResults;
  
  if (!results) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No import results available</p>
      </div>
    );
  }

  const successRate = (results.successfulRows / results.totalRows) * 100;

  const downloadErrorReport = () => {
    if (results.errors.length === 0) return;

    const errorReport = results.errors.map(error => ({
      batch: error.batch,
      error: error.error
    }));

    const csvContent = [
      ['Batch', 'Error'],
      ...errorReport.map(row => [row.batch, row.error])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_${results.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Import Complete!</h3>
        <p className="text-gray-600">
          Your CSV data has been processed. Here are the results:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {results.successfulRows}
            </div>
            <div className="text-sm text-gray-600">Successful</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {results.failedRows}
            </div>
            <div className="text-sm text-gray-600">Failed</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {results.duplicateRows}
            </div>
            <div className="text-sm text-gray-600">Duplicates</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">%</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {successRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-3">Import Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Import ID:</span>
              <span className="font-mono text-xs">{results.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Rows Processed:</span>
              <span className="font-medium">{results.totalRows}</span>
            </div>
            <div className="flex justify-between">
              <span>Successfully Imported:</span>
              <span className="font-medium text-green-600">{results.successfulRows}</span>
            </div>
            {results.failedRows > 0 && (
              <div className="flex justify-between">
                <span>Failed to Import:</span>
                <span className="font-medium text-red-600">{results.failedRows}</span>
              </div>
            )}
            {results.duplicateRows > 0 && (
              <div className="flex justify-between">
                <span>Duplicates Skipped:</span>
                <span className="font-medium text-yellow-600">{results.duplicateRows}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {results.errors.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-red-600">Import Errors</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadErrorReport}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Error Report
              </Button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {results.errors.slice(0, 5).map((error, index) => (
                <div key={index} className="p-2 bg-red-50 border border-red-200 rounded">
                  <div className="text-sm text-red-700">
                    Batch {error.batch}: {error.error}
                  </div>
                </div>
              ))}
              {results.errors.length > 5 && (
                <div className="text-sm text-gray-500 text-center">
                  ... and {results.errors.length - 5} more errors
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center space-x-4">
        <Button variant="outline" onClick={onStartOver}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Import Another File
        </Button>
        <Button onClick={() => window.location.href = '/dashboard'}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
