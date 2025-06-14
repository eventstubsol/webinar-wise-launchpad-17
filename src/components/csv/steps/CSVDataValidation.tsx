
import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle, Users, FileText } from 'lucide-react';
import { CSVUploadData } from '../CSVUploadWizard';
import { useToast } from '@/hooks/use-toast';

interface CSVDataValidationProps {
  uploadData: CSVUploadData;
  updateUploadData: (updates: Partial<CSVUploadData>) => void;
}

export function CSVDataValidation({ uploadData, updateUploadData }: CSVDataValidationProps) {
  const { toast } = useToast();

  useEffect(() => {
    validateData();
  }, [uploadData.fieldMapping]);

  const validateData = () => {
    if (!uploadData.file || Object.keys(uploadData.fieldMapping).length === 0) {
      return;
    }

    // Parse all data from the file
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
      
      const allData = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(value => value.trim().replace(/"/g, ''));
        const row: any = { _rowNumber: index + 2 };
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });

      const validRows: any[] = [];
      const errors: any[] = [];
      const duplicates: any[] = [];
      const emailsSeen = new Set<string>();

      allData.forEach((row, index) => {
        const mappedRow: any = {};
        const rowErrors: string[] = [];

        // Map fields according to field mapping
        Object.entries(uploadData.fieldMapping).forEach(([csvColumn, targetField]) => {
          mappedRow[targetField] = row[csvColumn];
        });

        // Validate required fields
        if (uploadData.importType === 'participants') {
          if (!mappedRow.first_name?.trim()) {
            rowErrors.push('First name is required');
          }
          if (!mappedRow.last_name?.trim()) {
            rowErrors.push('Last name is required');
          }
          if (!mappedRow.email?.trim()) {
            rowErrors.push('Email is required');
          } else {
            const email = mappedRow.email.toLowerCase().trim();
            if (!isValidEmail(email)) {
              rowErrors.push('Invalid email format');
            } else if (emailsSeen.has(email)) {
              duplicates.push({
                row: index + 2,
                email,
                data: mappedRow
              });
            } else {
              emailsSeen.add(email);
            }
          }
          if (mappedRow.phone && !isValidPhone(mappedRow.phone)) {
            rowErrors.push('Invalid phone number format');
          }
        } else if (uploadData.importType === 'webinars') {
          if (!mappedRow.title?.trim()) {
            rowErrors.push('Title is required');
          }
          if (!mappedRow.start_time?.trim()) {
            rowErrors.push('Start time is required');
          } else if (!isValidDateTime(mappedRow.start_time)) {
            rowErrors.push('Invalid date/time format (use YYYY-MM-DD HH:MM:SS)');
          }
          if (mappedRow.duration_minutes && !isValidNumber(mappedRow.duration_minutes)) {
            rowErrors.push('Duration must be a number');
          }
        } else if (uploadData.importType === 'participations') {
          if (!mappedRow.webinar_title?.trim()) {
            rowErrors.push('Webinar title is required');
          }
          if (!mappedRow.participant_email?.trim()) {
            rowErrors.push('Participant email is required');
          } else if (!isValidEmail(mappedRow.participant_email)) {
            rowErrors.push('Invalid participant email format');
          }
          if (mappedRow.participation_status && 
              !['registered', 'attended', 'no_show'].includes(mappedRow.participation_status)) {
            rowErrors.push('Invalid participation status (use: registered, attended, no_show)');
          }
        }

        if (rowErrors.length > 0) {
          errors.push({
            row: index + 2,
            errors: rowErrors,
            data: mappedRow
          });
        } else {
          validRows.push(mappedRow);
        }
      });

      const validationResults = {
        valid: errors.length === 0,
        validRows,
        errors,
        duplicates
      };

      updateUploadData({ validationResults });

      if (errors.length > 0) {
        toast({
          title: "Validation errors found",
          description: `${errors.length} rows have validation errors`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Validation successful",
          description: `All ${validRows.length} rows are valid`,
        });
      }
    };

    reader.readAsText(uploadData.file);
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string) => {
    const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{10,}$/;
    return phoneRegex.test(phone);
  };

  const isValidDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return !isNaN(date.getTime());
  };

  const isValidNumber = (value: string) => {
    return !isNaN(Number(value)) && Number(value) > 0;
  };

  const { validationResults } = uploadData;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Step 3: Data Validation</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {validationResults.validRows.length}
            </div>
            <div className="text-sm text-gray-600">Valid Rows</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {validationResults.errors.length}
            </div>
            <div className="text-sm text-gray-600">Errors</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {validationResults.duplicates.length}
            </div>
            <div className="text-sm text-gray-600">Duplicates</div>
          </CardContent>
        </Card>
      </div>

      {validationResults.errors.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 text-red-600">Validation Errors</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {validationResults.errors.slice(0, 10).map((error, index) => (
                <div key={index} className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="destructive">Row {error.row}</Badge>
                  </div>
                  <ul className="text-sm text-red-700 space-y-1">
                    {error.errors.map((err: string, errIndex: number) => (
                      <li key={errIndex}>• {err}</li>
                    ))}
                  </ul>
                </div>
              ))}
              {validationResults.errors.length > 10 && (
                <div className="text-sm text-gray-500 text-center">
                  ... and {validationResults.errors.length - 10} more errors
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {validationResults.duplicates.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 text-yellow-600">Duplicate Records</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {validationResults.duplicates.slice(0, 5).map((duplicate, index) => (
                <div key={index} className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">Row {duplicate.row}</Badge>
                    <span className="text-sm text-yellow-700">Duplicate email: {duplicate.email}</span>
                  </div>
                </div>
              ))}
              {validationResults.duplicates.length > 5 && (
                <div className="text-sm text-gray-500 text-center">
                  ... and {validationResults.duplicates.length - 5} more duplicates
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {validationResults.valid && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center text-green-600 mb-2">
              <CheckCircle className="w-5 h-5 mr-2" />
              <h4 className="font-medium">All data is valid!</h4>
            </div>
            <p className="text-sm text-gray-600">
              {validationResults.validRows.length} rows are ready to be imported.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
