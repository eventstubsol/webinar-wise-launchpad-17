
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Play, 
  Settings, 
  TestTube, 
  Shield, 
  Clock, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { EnhancedSyncOptions } from '@/types/zoom/enhancedSyncTypes';

interface EnhancedSyncControlsProps {
  onStartSync: (options: EnhancedSyncOptions) => void;
  isLoading: boolean;
  rateLimitStatus?: {
    remaining: number;
    dailyLimit: number;
    isLimited: boolean;
    resetTime: number;
  };
}

export function EnhancedSyncControls({ 
  onStartSync, 
  isLoading, 
  rateLimitStatus 
}: EnhancedSyncControlsProps) {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [syncOptions, setSyncOptions] = useState<EnhancedSyncOptions>({
    testMode: false,
    maxWebinarsInTest: 1,
    respectRateLimits: true,
    maxConcurrentRequests: 5,
    enableAutoRetry: true,
    maxRetryAttempts: 3,
    retryDelayStrategy: 'exponential',
    dryRun: false,
    maxWebinars: undefined,
    skipValidation: false,
    verboseLogging: false,
    forceSync: false,
    skipEligibilityCheck: false,
    includeRegistrants: true,
    includeParticipants: true
  });

  const handleOptionChange = (key: keyof EnhancedSyncOptions, value: any) => {
    setSyncOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleStartSync = () => {
    onStartSync(syncOptions);
  };

  const isRateLimited = rateLimitStatus?.isLimited || false;
  const rateLimitProgress = rateLimitStatus 
    ? ((rateLimitStatus.dailyLimit - rateLimitStatus.remaining) / rateLimitStatus.dailyLimit) * 100
    : 0;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Enhanced Sync Controls
            {syncOptions.testMode && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                <TestTube className="h-3 w-3 mr-1" />
                Test Mode
              </Badge>
            )}
            {syncOptions.dryRun && (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <Shield className="h-3 w-3 mr-1" />
                Dry Run
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rate Limit Status */}
          {rateLimitStatus && (
            <Alert className={isRateLimited ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    API Usage: {rateLimitStatus.dailyLimit - rateLimitStatus.remaining} / {rateLimitStatus.dailyLimit}
                  </span>
                  <span className="text-sm">
                    {isRateLimited 
                      ? `Reset in ${Math.round((rateLimitStatus.resetTime - Date.now()) / 1000 / 60)} min`
                      : `${rateLimitStatus.remaining} requests remaining`
                    }
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${isRateLimited ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${rateLimitProgress}%` }}
                  />
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Mode Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="testMode"
                checked={syncOptions.testMode}
                onCheckedChange={(checked) => handleOptionChange('testMode', checked)}
              />
              <div className="flex items-center gap-1">
                <Label htmlFor="testMode">Test Mode</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Limits sync to 1 webinar with enhanced logging</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="dryRun"
                checked={syncOptions.dryRun}
                onCheckedChange={(checked) => handleOptionChange('dryRun', checked)}
              />
              <div className="flex items-center gap-1">
                <Label htmlFor="dryRun">Dry Run</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Simulate sync without making database changes</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Test Mode Configuration */}
          {syncOptions.testMode && (
            <Alert className="border-orange-200 bg-orange-50">
              <TestTube className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>Test mode is enabled. Sync will be limited to prevent accidental bulk operations.</p>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="maxWebinarsInTest">Max webinars:</Label>
                    <Input
                      id="maxWebinarsInTest"
                      type="number"
                      min="1"
                      max="5"
                      value={syncOptions.maxWebinarsInTest}
                      onChange={(e) => handleOptionChange('maxWebinarsInTest', parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Advanced Options Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            >
              <Settings className="h-4 w-4 mr-1" />
              {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
            </Button>
          </div>

          {/* Advanced Options */}
          {showAdvancedOptions && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium">Advanced Configuration</h4>
              
              {/* Rate Limiting Options */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium">Rate Limiting</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="respectRateLimits"
                      checked={syncOptions.respectRateLimits}
                      onCheckedChange={(checked) => handleOptionChange('respectRateLimits', checked)}
                    />
                    <Label htmlFor="respectRateLimits">Respect Rate Limits</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label htmlFor="maxConcurrentRequests">Concurrent Requests:</Label>
                    <Input
                      id="maxConcurrentRequests"
                      type="number"
                      min="1"
                      max="10"
                      value={syncOptions.maxConcurrentRequests}
                      onChange={(e) => handleOptionChange('maxConcurrentRequests', parseInt(e.target.value) || 5)}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              {/* Error Recovery Options */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium">Error Recovery</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableAutoRetry"
                      checked={syncOptions.enableAutoRetry}
                      onCheckedChange={(checked) => handleOptionChange('enableAutoRetry', checked)}
                    />
                    <Label htmlFor="enableAutoRetry">Auto Retry</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label htmlFor="maxRetryAttempts">Max Retries:</Label>
                    <Input
                      id="maxRetryAttempts"
                      type="number"
                      min="0"
                      max="10"
                      value={syncOptions.maxRetryAttempts}
                      onChange={(e) => handleOptionChange('maxRetryAttempts', parseInt(e.target.value) || 3)}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              {/* Processing Control */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium">Processing Control</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="verboseLogging"
                      checked={syncOptions.verboseLogging}
                      onCheckedChange={(checked) => handleOptionChange('verboseLogging', checked)}
                    />
                    <Label htmlFor="verboseLogging">Verbose Logging</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="forceSync"
                      checked={syncOptions.forceSync}
                      onCheckedChange={(checked) => handleOptionChange('forceSync', checked)}
                    />
                    <Label htmlFor="forceSync">Force Sync</Label>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="maxWebinars">Max Webinars (optional):</Label>
                  <Input
                    id="maxWebinars"
                    type="number"
                    min="1"
                    value={syncOptions.maxWebinars || ''}
                    onChange={(e) => handleOptionChange('maxWebinars', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-20"
                    placeholder="All"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {(syncOptions.forceSync || syncOptions.skipValidation) && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="text-sm space-y-1">
                  {syncOptions.forceSync && <li>• Force sync enabled - will override safety checks</li>}
                  {syncOptions.skipValidation && <li>• Validation disabled - may process invalid data</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Start Sync Button */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              onClick={handleStartSync}
              disabled={isLoading || isRateLimited}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isLoading ? 'Syncing...' : syncOptions.dryRun ? 'Run Simulation' : 'Start Enhanced Sync'}
            </Button>
            
            {isRateLimited && (
              <span className="text-sm text-red-600">
                Rate limited - sync will resume automatically
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
