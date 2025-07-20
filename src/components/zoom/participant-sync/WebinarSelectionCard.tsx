
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Users } from 'lucide-react';

interface WebinarForSync {
  id: string;
  webinar_id: string;
  topic: string;
  start_time: string;
  participant_sync_status: string;
  participant_sync_attempted_at?: string;
}

interface WebinarSelectionCardProps {
  webinars: WebinarForSync[] | undefined;
  webinarsLoading: boolean;
  selectedWebinars: string[];
  onWebinarToggle: (webinarId: string) => void;
  onSelectAll: () => void;
}

export function WebinarSelectionCard({
  webinars,
  webinarsLoading,
  selectedWebinars,
  onWebinarToggle,
  onSelectAll
}: WebinarSelectionCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge variant="secondary" className="text-green-700 bg-green-100">Synced</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'no_participants':
        return <Badge variant="outline" className="text-gray-500">No Participants</Badge>;
      case 'not_applicable':
        return <Badge variant="outline" className="text-gray-400">Not Applicable</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Select Webinars to Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Choose webinars for participant sync</h3>
          {webinars && webinars.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
            >
              {selectedWebinars.length === webinars.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}
        </div>

        {webinarsLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading webinars...</div>
        ) : !webinars || webinars.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No webinars found</div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {webinars.map((webinar) => (
              <div key={webinar.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox
                  checked={selectedWebinars.includes(webinar.webinar_id)}
                  onCheckedChange={() => onWebinarToggle(webinar.webinar_id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{webinar.topic}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(webinar.start_time).toLocaleDateString()} • ID: {webinar.webinar_id}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(webinar.participant_sync_status)}
                  {webinar.participant_sync_attempted_at && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(webinar.participant_sync_attempted_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
