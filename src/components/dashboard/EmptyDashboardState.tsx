
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Settings, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { Link } from 'react-router-dom';
import { ZoomConnectButton } from '@/components/zoom/ZoomConnectButton';

interface EmptyDashboardStateProps {
  lastSyncAt?: string;
  syncHistoryCount: number;
}

export const EmptyDashboardState: React.FC<EmptyDashboardStateProps> = ({
  lastSyncAt,
  syncHistoryCount,
}) => {
  const { isConnected, connection } = useZoomConnection();

  if (!isConnected) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <WifiOff className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Welcome to your Webinar Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Connect your Zoom account to start analyzing your webinar data and unlock powerful insights about your audience engagement.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-lg mx-auto">
              <h3 className="font-semibold text-blue-900 mb-2">What you'll get:</h3>
              <ul className="text-blue-800 text-sm space-y-1 text-left">
                <li>• Detailed attendance and engagement metrics</li>
                <li>• Registration vs attendance analysis</li>
                <li>• Participant behavior insights</li>
                <li>• Performance trends over time</li>
              </ul>
            </div>

            <ZoomConnectButton 
              variant="default"
              size="lg"
              className="px-8 py-3"
            />
            
            <p className="text-sm text-gray-500">
              Need help? <Link to="/settings" className="text-blue-600 hover:underline">Visit Settings</Link> for detailed setup instructions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected but no data
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Wifi className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Zoom Connected</CardTitle>
              <p className="text-sm text-gray-600">
                {connection?.zoom_email || 'Account connected successfully'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
              <Wifi className="w-4 h-4" />
              Connection Status: Active
            </div>
            <div className="text-green-700 text-sm space-y-1">
              <div>Account Type: {connection?.zoom_account_type || 'Licensed'}</div>
              {lastSyncAt && (
                <div>Last Sync: {new Date(lastSyncAt).toLocaleDateString()}</div>
              )}
              {syncHistoryCount > 0 && (
                <div>Sync History: {syncHistoryCount} previous syncs</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Ready for Data Sync</CardTitle>
              <p className="text-sm text-gray-600">
                Import your webinar data to see analytics
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Your Zoom account is connected and ready. Start your first data sync to import webinar information and begin analyzing your audience engagement.
          </p>
          
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/sync-center">
                <RefreshCw className="w-4 h-4 mr-2" />
                Start Data Sync
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link to="/settings">
                <Settings className="w-4 h-4 mr-2" />
                Sync Settings
              </Link>
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800 text-sm">
              <strong>First sync:</strong> This will import your recent webinars, registrants, and participant data. Depending on your webinar history, this may take a few minutes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
