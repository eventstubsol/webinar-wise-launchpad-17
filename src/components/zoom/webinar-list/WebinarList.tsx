import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, Clock, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { WebinarStatusBadge } from './WebinarStatusBadge';
import { WebinarParticipantSyncButton } from './WebinarParticipantSyncButton';

interface WebinarListProps {
  connectionId: string;
}

// Define the type for participant sync status
type ParticipantSyncStatus = 'not_applicable' | 'pending' | 'synced' | 'failed' | 'no_participants';

export const WebinarList: React.FC<WebinarListProps> = ({ connectionId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [syncStatusFilter, setSyncStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: webinars, isLoading, error, refetch } = useQuery({
    queryKey: ['webinars', connectionId, searchTerm, statusFilter, syncStatusFilter],
    queryFn: async () => {
      let query = supabase
        .from('zoom_webinars')
        .select('*')
        .eq('connection_id', connectionId)
        .order('start_time', { ascending: false });

      if (searchTerm) {
        query = query.ilike('topic', `%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (syncStatusFilter !== 'all') {
        // Type guard to ensure the filter value is valid
        const validSyncStatuses: ParticipantSyncStatus[] = ['pending', 'failed', 'not_applicable', 'synced', 'no_participants'];
        if (validSyncStatuses.includes(syncStatusFilter as ParticipantSyncStatus)) {
          query = query.eq('participant_sync_status', syncStatusFilter as ParticipantSyncStatus);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!connectionId,
    refetchInterval: 30000, // Refetch every 30 seconds to show sync progress
  });

  const handleSyncComplete = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading webinars...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-destructive">Error loading webinars: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  // Pagination
  const totalItems = webinars?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentWebinars = webinars?.slice(startIndex, endIndex) || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Webinars
            {totalItems > 0 && (
              <Badge variant="secondary">{totalItems} total</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search webinars..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="finished">Finished</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="available">Available</SelectItem>
              </SelectContent>
            </Select>
            <Select value={syncStatusFilter} onValueChange={setSyncStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sync Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sync</SelectItem>
                <SelectItem value="synced">Synced</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="no_participants">No Participants</SelectItem>
                <SelectItem value="not_applicable">Not Applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Webinar List */}
      <div className="space-y-4">
        {currentWebinars.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || syncStatusFilter !== 'all'
                  ? 'No webinars match your filters'
                  : 'No webinars found'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          currentWebinars.map((webinar) => (
            <Card key={webinar.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{webinar.topic}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {webinar.start_time ? (
                              new Date(webinar.start_time).toLocaleDateString()
                            ) : (
                              'No date'
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {webinar.duration || 'Unknown'} min
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            ID: {webinar.webinar_id}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <WebinarStatusBadge status={webinar.status} />
                        {webinar.start_time && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(webinar.start_time), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Participant Sync Status */}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Participant Sync:
                        </span>
                        <WebinarParticipantSyncButton
                          webinar={{
                            id: webinar.id,
                            webinar_id: webinar.webinar_id,
                            title: webinar.topic, // Map topic to title
                            status: webinar.status || '',
                            participant_sync_status: webinar.participant_sync_status || '',
                            participant_sync_error: webinar.participant_sync_error || '',
                            participant_sync_attempted_at: webinar.participant_sync_attempted_at || ''
                          }}
                          connectionId={connectionId}
                          onSyncComplete={handleSyncComplete}
                        />
                      </div>
                      {webinar.participant_sync_error && (
                        <p className="text-xs text-destructive mt-1">
                          {webinar.participant_sync_error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} webinars
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
