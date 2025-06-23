import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, RefreshCw } from "lucide-react";

interface SyncConfigurationProps {
  onStartSync: (config: SyncConfig) => void;
  isLoading?: boolean;
}

export interface SyncConfig {
  syncMode: 'full' | 'delta' | 'smart';
  dateRange: {
    pastDays: number;
    futureDays: number;
  };
}

export function SyncConfiguration({ onStartSync, isLoading }: SyncConfigurationProps) {
  const [syncMode, setSyncMode] = useState<'full' | 'delta' | 'smart'>('smart');
  const [pastDays, setPastDays] = useState(90);
  const [futureDays, setFutureDays] = useState(180);

  const handleSubmit = () => {
    onStartSync({
      syncMode,
      dateRange: {
        pastDays,
        futureDays
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Configuration</CardTitle>
        <CardDescription>
          Configure how you want to sync your webinar data from Zoom
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync Mode */}
        <div className="space-y-3">
          <Label>Sync Mode</Label>
          <RadioGroup value={syncMode} onValueChange={(value) => setSyncMode(value as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="smart" id="smart" />
              <Label htmlFor="smart" className="font-normal cursor-pointer">
                <div>
                  <p className="font-medium">Smart Sync (Recommended)</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically determines what needs to be synced based on your last sync
                  </p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full" id="full" />
              <Label htmlFor="full" className="font-normal cursor-pointer">
                <div>
                  <p className="font-medium">Full Sync</p>
                  <p className="text-sm text-muted-foreground">
                    Re-sync all webinars in the date range (slower but comprehensive)
                  </p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="delta" id="delta" />
              <Label htmlFor="delta" className="font-normal cursor-pointer">
                <div>
                  <p className="font-medium">Delta Sync</p>
                  <p className="text-sm text-muted-foreground">
                    Only sync new or modified webinars since last sync
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Date Range */}
        <div className="space-y-4">
          <Label>Date Range</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="past-days" className="text-sm font-normal">
                <Calendar className="inline h-4 w-4 mr-1" />
                Past Days
              </Label>
              <Input
                id="past-days"
                type="number"
                min="1"
                max="365"
                value={pastDays}
                onChange={(e) => setPastDays(parseInt(e.target.value) || 90)}
              />
              <p className="text-xs text-muted-foreground">
                Sync webinars from the last {pastDays} days
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="future-days" className="text-sm font-normal">
                <Clock className="inline h-4 w-4 mr-1" />
                Future Days
              </Label>
              <Input
                id="future-days"
                type="number"
                min="1"
                max="365"
                value={futureDays}
                onChange={(e) => setFutureDays(parseInt(e.target.value) || 180)}
              />
              <p className="text-xs text-muted-foreground">
                Sync webinars for the next {futureDays} days
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm">
            This will sync webinars from{" "}
            <span className="font-medium">
              {new Date(Date.now() - pastDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {new Date(Date.now() + futureDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </span>
          </p>
        </div>

        {/* Action Button */}
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Starting Sync...' : 'Start Sync'}
        </Button>
      </CardContent>
    </Card>
  );
}
