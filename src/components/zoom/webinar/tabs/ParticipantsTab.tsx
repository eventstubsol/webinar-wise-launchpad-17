
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ParticipantTable } from '../components/ParticipantTable';
import { TimelineChart } from '../components/TimelineChart';
import { ExportButton } from '../components/ExportButton';
import { Search, Download } from 'lucide-react';

interface ParticipantsTabProps {
  participants: any[];
  webinar: any;
}

export const ParticipantsTab: React.FC<ParticipantsTabProps> = ({
  participants,
  webinar
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('join_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedParticipants = useMemo(() => {
    let filtered = participants.filter(participant =>
      participant.participant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.participant_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [participants, searchTerm, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search participants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <ExportButton 
          data={filteredAndSortedParticipants}
          filename={`${webinar.topic}-participants`}
          type="participants"
        />
      </div>

      {/* Join/Leave Timeline */}
      <TimelineChart participants={participants} webinar={webinar} />

      {/* Participants Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Participants ({filteredAndSortedParticipants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ParticipantTable 
            participants={filteredAndSortedParticipants}
            onSort={handleSort}
            sortField={sortField}
            sortDirection={sortDirection}
            webinar={webinar}
          />
        </CardContent>
      </Card>
    </div>
  );
};
