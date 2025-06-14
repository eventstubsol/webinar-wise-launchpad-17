
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const DeliverabilityDashboard = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Delivery Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">99.5%</div>
          <p className="text-sm text-muted-foreground">+0.1% from last month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Open Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">25.3%</div>
          <p className="text-sm text-muted-foreground">-1.2% from last month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Bounce Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">0.5%</div>
          <p className="text-sm text-muted-foreground">Within acceptable limits</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Spam Complaints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">0.01%</div>
          <p className="text-sm text-muted-foreground">Well below threshold</p>
        </CardContent>
      </Card>
    </div>
  );
};
