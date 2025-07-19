
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DiagnosticsSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Sync Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Run detailed diagnostics to check your Zoom integration health, identify sync issues, and test API connectivity.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/zoom-diagnostics">
              <Activity className="w-4 h-4 mr-2" />
              Run Full Diagnostics
              <ExternalLink className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/zoom-test">
              <Activity className="w-4 h-4 mr-2" />
              Connection Test
              <ExternalLink className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <strong>Diagnostics include:</strong> API scope validation, participant data testing, sync status analysis, and connection health checks.
        </div>
      </CardContent>
    </Card>
  );
};
