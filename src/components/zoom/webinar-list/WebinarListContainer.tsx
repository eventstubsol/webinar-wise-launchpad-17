
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { WebinarListHeader } from './WebinarListHeader';
import { WebinarListFilters } from './WebinarListFilters';
import { WebinarCard } from './WebinarCard';
import { WebinarListPagination } from './WebinarListPagination';
import { WebinarListEmpty } from './WebinarListEmpty';

interface WebinarListContainerProps {
  connectionId: string;
}

type ParticipantSyncStatus = 'not_applicable' | 'pending' | 'synced' | 'failed' | 'no_participants';

export const WebinarListContainer: React.FC<WebinarListContainerProps> = ({ connectionId }) => {
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
    refetchInterval: 30000,
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

  const totalItems = webinars?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentWebinars = webinars?.slice(startIndex, endIndex) || [];

  return (
    <div className="space-y-6">
      <Card>
        <WebinarListHeader totalItems={totalItems} />
        <CardContent>
          <WebinarListFilters
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            syncStatusFilter={syncStatusFilter}
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onSyncStatusFilterChange={setSyncStatusFilter}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {currentWebinars.length === 0 ? (
          <WebinarListEmpty 
            hasFilters={searchTerm !== '' || statusFilter !== 'all' || syncStatusFilter !== 'all'}
          />
        ) : (
          currentWebinars.map((webinar) => (
            <WebinarCard
              key={webinar.id}
              webinar={webinar}
              connectionId={connectionId}
              onSyncComplete={handleSyncComplete}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <WebinarListPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};
