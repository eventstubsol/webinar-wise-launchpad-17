
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ZoomTestFetch } from '@/components/zoom/ZoomTestFetch';

const ZoomTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Zoom Integration Test
          </h1>
          <p className="text-gray-600">
            Test the Zoom API connection and data fetching functionality
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Zoom Data Fetch Test</CardTitle>
          </CardHeader>
          <CardContent>
            <ZoomTestFetch />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ZoomTest;
