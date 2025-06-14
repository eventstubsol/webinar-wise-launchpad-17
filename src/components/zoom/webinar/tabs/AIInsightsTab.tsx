
import React from 'react';
import { AIInsightsDashboard } from '@/components/ai-analytics/AIInsightsDashboard';

interface AIInsightsTabProps {
  webinarId: string;
}

export const AIInsightsTab: React.FC<AIInsightsTabProps> = ({ webinarId }) => {
  return (
    <div className="space-y-6">
      <AIInsightsDashboard webinarId={webinarId} />
    </div>
  );
};
