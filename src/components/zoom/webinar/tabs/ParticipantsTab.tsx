
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  Eye,
  Zap,
  FlaskConical
} from 'lucide-react';
import { useParticipantsComparison } from '@/hooks/useParticipantsComparison';
import { ParticipantsComparisonModal } from '../ParticipantsComparisonModal';

interface ParticipantsTabProps {
  participants: any[];
  webinar: any;
}

export const ParticipantsTab: React.FC<ParticipantsTabProps> = ({
  participants = [],
  webinar
}) => {
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const { isComparing, comparisonResult, compareEndpoints } = useParticipantsComparison();

  const handleCompareEndpoints = async () => {
    if (!webinar?.zoom_webinar_id) return;
    
    setShowComparisonModal(true);
    try {
      await compareEndpoints(webinar.zoom_webinar_id, { 
        pageSize: 300, 
        debugMode: true 
      });
    } catch (error) {
      console.error('Comparison failed:', error);
    }
  };

  // Calculate engagement metrics
  const engagementMetrics = React.useMemo(() => {
    if (!participants.length) return null;

    const totalDuration = participants.reduce((sum, p) => sum + (p.duration || 0), 0);
    const avgDuration = totalDuration / participants.length;
    
    const highEngagement = participants.filter(p => (p.duration || 0) >= 30).length;
    const mediumEngagement = participants.filter(p => (p.duration || 0) >= 10 && (p.duration || 0) < 30).length;
    const lowEngagement = participants.filter(p => (p.duration || 0) < 10).length;

    return {
      totalParticipants: participants.length,
      averageDuration: Math.round(avgDuration),
      highEngagement,
      mediumEngagement,
      lowEngagement,
      engagementRate: Math.round((highEngagement / participants.length) * 100)
    };
  }, [participants]);

  // Get top participants by duration
  const topParticipants = React.useMemo(() => {
    return [...participants]
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);
  }, [participants]);

  return (
    <div className="space-y-6">
      {/* Header with API Testing */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Participants Analysis</h2>
          <p className="text-muted-foreground">
            Detailed view of webinar attendees and their engagement
          </p>
        </div>
        
        <Button
          onClick={handleCompareEndpoints}
          disabled={isComparing || !webinar?.zoom_webinar_id}
          variant="outline"
          className="flex items-center gap-2"
        >
          <FlaskConical className="h-4 w-4" />
          {isComparing ? 'Comparing APIs...' : 'Compare API Endpoints'}
        </Button>
      </div>

      {/* Engagement Overview */}
      {engagementMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Participants</p>
                  <p className="text-2xl font-bold">{engagementMetrics.totalParticipants}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-bold">{engagementMetrics.averageDuration}m</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">High Engagement</p>
                  <p className="text-2xl font-bold">{engagementMetrics.highEngagement}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Engagement Rate</p>
                  <p className="text-2xl font-bold">{engagementMetrics.engagementRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Engagement Distribution */}
      {engagementMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>Engagement Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">High Engagement (30+ min)</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${(engagementMetrics.highEngagement / engagementMetrics.totalParticipants) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{engagementMetrics.highEngagement}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Medium Engagement (10-30 min)</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-yellow-500 rounded-full" 
                      style={{ width: `${(engagementMetrics.mediumEngagement / engagementMetrics.totalParticipants) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{engagementMetrics.mediumEngagement}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Low Engagement (&lt;10 min)</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-red-500 rounded-full" 
                      style={{ width: `${(engagementMetrics.lowEngagement / engagementMetrics.totalParticipants) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{engagementMetrics.lowEngagement}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Top Participants by Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topParticipants.length > 0 ? (
            <div className="space-y-3">
              {topParticipants.map((participant, index) => (
                <div key={participant.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{participant.participant_name || 'Anonymous'}</p>
                      <p className="text-sm text-muted-foreground">{participant.participant_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        (participant.duration || 0) >= 30 ? 'default' :
                        (participant.duration || 0) >= 10 ? 'secondary' : 'outline'
                      }
                    >
                      {participant.duration || 0}m
                    </Badge>
                    {participant.answered_polling && (
                      <Badge variant="outline" className="text-purple-600">
                        Polls
                      </Badge>
                    )}
                    {participant.asked_question && (
                      <Badge variant="outline" className="text-orange-600">
                        Q&A
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No participant data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* API Comparison Modal */}
      <ParticipantsComparisonModal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        comparisonResult={comparisonResult}
        isComparing={isComparing}
      />
    </div>
  );
};
