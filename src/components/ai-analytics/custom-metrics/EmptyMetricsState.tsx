
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus } from 'lucide-react';

interface EmptyMetricsStateProps {
  onCreateFirst: () => void;
}

export const EmptyMetricsState: React.FC<EmptyMetricsStateProps> = ({ onCreateFirst }) => (
  <Card>
    <CardContent className="p-8 text-center">
      <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">No Custom Metrics Yet</h3>
      <p className="text-gray-600 mb-4">
        Create your first custom metric to track KPIs specific to your business needs.
      </p>
      <Button onClick={onCreateFirst}>
        <Plus className="w-4 h-4 mr-2" />
        Create Your First Metric
      </Button>
    </CardContent>
  </Card>
);
