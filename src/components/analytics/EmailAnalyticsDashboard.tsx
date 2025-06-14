
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bell, Compass, HardDrive, Shield } from 'lucide-react';
import { DeliverabilityDashboard } from './DeliverabilityDashboard';
import { ReputationMonitor } from './ReputationMonitor';

export const EmailAnalyticsDashboard = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Email Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your email performance, deliverability, and reputation.
        </p>
      </div>

      <Tabs defaultValue="deliverability" className="space-y-6">
        <TabsList>
          <TabsTrigger value="deliverability" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Deliverability
          </TabsTrigger>
          <TabsTrigger value="reputation" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Reputation
          </TabsTrigger>
          <TabsTrigger value="ab-testing" className="flex items-center gap-2">
            <Compass className="h-4 w-4" />
            A/B Testing
          </TabsTrigger>
          <TabsTrigger value="geo-device" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Geo & Device
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deliverability">
          <DeliverabilityDashboard />
        </TabsContent>
        <TabsContent value="reputation">
          <ReputationMonitor />
        </TabsContent>
        <TabsContent value="ab-testing">
          <div className="text-center py-12 text-muted-foreground">
            A/B Test performance comparison coming soon.
          </div>
        </TabsContent>
        <TabsContent value="geo-device">
          <div className="text-center py-12 text-muted-foreground">
            Geographic and device analytics coming soon.
          </div>
        </TabsContent>
         <TabsContent value="alerts">
          <div className="text-center py-12 text-muted-foreground">
            Deliverability alerts will be shown here.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
