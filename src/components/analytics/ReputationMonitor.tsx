
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ReputationMonitor = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Sender Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">98</div>
          <p className="text-sm text-muted-foreground">Excellent</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>IP Reputation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">99.2%</div>
          <p className="text-sm text-muted-foreground">No issues detected</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Domain Reputation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">99.8%</div>
          <p className="text-sm text-muted-foreground">Healthy</p>
        </CardContent>
      </Card>
    </div>
  );
};
