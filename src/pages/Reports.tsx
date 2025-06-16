
import React from 'react';
import { ZoomDiagnosticPanel } from '@/components/reports/ZoomDiagnosticPanel';

const Reports = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Reports & Diagnostics</h1>
        <p className="text-muted-foreground">
          Run diagnostics and generate reports for your webinar data
        </p>
      </div>

      <ZoomDiagnosticPanel />
    </div>
  );
};

export default Reports;
