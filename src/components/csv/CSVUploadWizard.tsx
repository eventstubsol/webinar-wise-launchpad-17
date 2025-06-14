
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, Upload, FileText, Settings, Play, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CSVFileUpload } from './steps/CSVFileUpload';
import { CSVFieldMapping } from './steps/CSVFieldMapping';
import { CSVDataValidation } from './steps/CSVDataValidation';
import { CSVImportConfirmation } from './steps/CSVImportConfirmation';
import { CSVImportResults } from './steps/CSVImportResults';

export type ImportType = 'participants' | 'webinars' | 'participations';

export interface CSVUploadData {
  file: File | null;
  importType: ImportType;
  headers: string[];
  previewData: any[];
  fieldMapping: Record<string, string>;
  validationResults: {
    valid: boolean;
    validRows: any[];
    errors: any[];
    duplicates: any[];
  };
  importResults?: {
    id: string;
    totalRows: number;
    successfulRows: number;
    failedRows: number;
    duplicateRows: number;
    errors: any[];
  };
}

const steps = [
  { id: 1, name: 'Upload File', icon: Upload, description: 'Select and upload your CSV file' },
  { id: 2, name: 'Map Fields', icon: Settings, description: 'Map CSV columns to data fields' },
  { id: 3, name: 'Validate Data', icon: FileText, description: 'Review and validate your data' },
  { id: 4, name: 'Confirm Import', icon: Play, description: 'Review settings and start import' },
  { id: 5, name: 'Results', icon: CheckCircle, description: 'View import results' },
];

export function CSVUploadWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadData, setUploadData] = useState<CSVUploadData>({
    file: null,
    importType: 'participants',
    headers: [],
    previewData: [],
    fieldMapping: {},
    validationResults: {
      valid: false,
      validRows: [],
      errors: [],
      duplicates: []
    }
  });

  const updateUploadData = (updates: Partial<CSVUploadData>) => {
    setUploadData(prev => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return uploadData.file !== null && uploadData.headers.length > 0;
      case 2:
        return Object.keys(uploadData.fieldMapping).length > 0;
      case 3:
        return uploadData.validationResults.valid;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepNumber: number) => {
    if (stepNumber <= currentStep) {
      setCurrentStep(stepNumber);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <CSVFileUpload
            uploadData={uploadData}
            updateUploadData={updateUploadData}
          />
        );
      case 2:
        return (
          <CSVFieldMapping
            uploadData={uploadData}
            updateUploadData={updateUploadData}
          />
        );
      case 3:
        return (
          <CSVDataValidation
            uploadData={uploadData}
            updateUploadData={updateUploadData}
          />
        );
      case 4:
        return (
          <CSVImportConfirmation
            uploadData={uploadData}
            updateUploadData={updateUploadData}
            onImportComplete={() => setCurrentStep(5)}
          />
        );
      case 5:
        return (
          <CSVImportResults
            uploadData={uploadData}
            onStartOver={() => {
              setCurrentStep(1);
              setUploadData({
                file: null,
                importType: 'participants',
                headers: [],
                previewData: [],
                fieldMapping: {},
                validationResults: {
                  valid: false,
                  validRows: [],
                  errors: [],
                  duplicates: []
                }
              });
            }}
          />
        );
      default:
        return null;
    }
  };

  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">CSV Import Wizard</CardTitle>
          <div className="mt-6">
            <Progress value={progressPercentage} className="h-2 mb-4" />
            <div className="flex justify-between">
              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                const isClickable = step.id <= currentStep;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex flex-col items-center cursor-pointer transition-opacity",
                      isClickable ? "hover:opacity-80" : "cursor-not-allowed opacity-50"
                    )}
                    onClick={() => isClickable && handleStepClick(step.id)}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center mb-2 border-2 transition-colors",
                        isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : isActive
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "bg-gray-100 border-gray-300 text-gray-400"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-center">
                      <div
                        className={cn(
                          "text-sm font-medium",
                          isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-500"
                        )}
                      >
                        {step.name}
                      </div>
                      <div className="text-xs text-gray-500 max-w-20 leading-tight">
                        {step.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>
          
          {currentStep < 5 && (
            <div className="flex justify-between mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                {currentStep === 4 ? 'Start Import' : 'Next'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
