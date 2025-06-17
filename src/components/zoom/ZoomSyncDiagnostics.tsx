
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Database, Users, TestTube } from 'lucide-react';
import { SyncStatusOverview } from './SyncStatusOverview';
import { SyncHistoryTable } from './SyncHistoryTable';
import { ConnectionHealthCheck } from './ConnectionHealthCheck';
import { ParticipantSyncTester } from './ParticipantSyncTester';

export function ZoomSyncDiagnostics() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Sync History
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Connection Health
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Participant Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SyncStatusOverview />
        </TabsContent>

        <TabsContent value="history">
          <SyncHistoryTable />
        </TabsContent>

        <TabsContent value="health">
          <ConnectionHealthCheck />
        </TabsContent>

        <TabsContent value="testing">
          <ParticipantSyncTester />
        </TabsContent>
      </Tabs>
    </div>
  );
}
