
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CRMConnectionManager } from '@/components/crm/CRMConnectionManager';

export function CRMIntegrationsSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CRM Integrations</CardTitle>
          <CardDescription>
            Connect your webinar data with popular CRM systems for seamless contact management and follow-up automation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CRMConnectionManager />
        </CardContent>
      </Card>
    </div>
  );
}
