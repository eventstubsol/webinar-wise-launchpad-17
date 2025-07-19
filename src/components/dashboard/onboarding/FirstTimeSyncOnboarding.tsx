
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Rocket } from 'lucide-react';
import { useZoomSync } from '@/hooks/useZoomSync';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { SyncType } from '@/types/zoom';

export const FirstTimeSyncOnboarding: React.FC = () => {
  const { connection } = useZoomConnection();
  const { startSync, isSyncing, syncProgress, currentOperation } = useZoomSync(connection);

  const handleStartSync = () => {
    startSync(SyncType.INITIAL);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] p-8">
      <Card className="max-w-2xl w-full text-center">
        <CardContent className="p-12">
          {/* Hero Illustration */}
          <div className="mb-8">
            <img 
              src="/lovable-uploads/1a3d7c9d-d1e5-4030-a6e2-1e5b59d886b6.png"
              alt="Astronaut with rocket flag ready to start sync journey"
              className="w-64 h-48 mx-auto rounded-lg object-cover"
            />
          </div>

          {/* Hero Content */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-blue-600 mb-4">
                <Rocket className="h-6 w-6" />
                <span className="text-sm font-semibold uppercase tracking-wide">Welcome Aboard!</span>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900">
                Ready to Launch Your Webinar Analytics?
              </h1>
              
              <p className="text-lg text-gray-600 max-w-md mx-auto">
                Your Zoom account is connected! Let's sync your webinar data to unlock powerful insights and analytics.
              </p>
            </div>

            {/* Sync Progress or Call to Action */}
            {isSyncing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Syncing your webinar data...</span>
                    <span>{syncProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>
                </div>
                
                {currentOperation && (
                  <p className="text-sm text-gray-500">
                    {currentOperation}
                  </p>
                )}
                
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">This may take a few minutes...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button 
                  onClick={handleStartSync}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Start Sync Now
                </Button>
                
                <p className="text-sm text-gray-500">
                  We'll import your webinars, participants, and engagement data
                </p>
              </div>
            )}

            {/* Benefits Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  📊
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Analytics Dashboard</h3>
                <p className="text-sm text-gray-600">View comprehensive webinar metrics</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  👥
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Audience Insights</h3>
                <p className="text-sm text-gray-600">Understand participant engagement</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  📈
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Performance Trends</h3>
                <p className="text-sm text-gray-600">Track growth over time</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
