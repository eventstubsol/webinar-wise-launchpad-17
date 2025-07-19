
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ParticipantSessionAnalysis {
  totalSessions: number;
  uniqueParticipants: number;
  rejoinRate: number;
  avgSessionsPerParticipant: number;
  maxSessionsPerParticipant: number;
  sessionPatterns: Array<{
    participant_email: string;
    sessions: number;
    totalDuration: number;
    isFrequentRejoiner: boolean;
  }>;
}

export const useParticipantSessions = (webinarId?: string) => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<ParticipantSessionAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !webinarId) {
      setLoading(false);
      return;
    }

    const fetchSessionAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch participant sessions data
        const { data: participants, error: fetchError } = await supabase
          .from('zoom_participants')
          .select(`
            id,
            participant_email,
            is_rejoin_session,
            duration,
            join_time,
            leave_time
          `)
          .eq('webinar_id', webinarId)
          .order('participant_email', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        if (!participants || participants.length === 0) {
          setAnalysis({
            totalSessions: 0,
            uniqueParticipants: 0,
            rejoinRate: 0,
            avgSessionsPerParticipant: 0,
            maxSessionsPerParticipant: 0,
            sessionPatterns: []
          });
          return;
        }

        // Analyze session patterns
        const participantGroups = participants.reduce((acc, p) => {
          if (p.participant_email) {
            if (!acc[p.participant_email]) {
              acc[p.participant_email] = [];
            }
            acc[p.participant_email].push(p);
          }
          return acc;
        }, {} as Record<string, any[]>);

        const sessionPatterns = Object.entries(participantGroups).map(([email, sessions]) => ({
          participant_email: email,
          sessions: sessions.length,
          totalDuration: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
          isFrequentRejoiner: sessions.length > 2 // More than 2 sessions indicates frequent rejoining
        }));

        const uniqueParticipants = Object.keys(participantGroups).length;
        const totalSessions = participants.length;
        const rejoinSessions = participants.filter(p => p.is_rejoin_session).length;
        const sessionCounts = sessionPatterns.map(p => p.sessions);

        const analysisResult: ParticipantSessionAnalysis = {
          totalSessions,
          uniqueParticipants,
          rejoinRate: uniqueParticipants > 0 ? (rejoinSessions / totalSessions) * 100 : 0,
          avgSessionsPerParticipant: uniqueParticipants > 0 ? totalSessions / uniqueParticipants : 0,
          maxSessionsPerParticipant: Math.max(...sessionCounts, 0),
          sessionPatterns: sessionPatterns.sort((a, b) => b.sessions - a.sessions)
        };

        setAnalysis(analysisResult);

      } catch (err) {
        console.error('Error fetching participant session analysis:', err);
        setError(err instanceof Error ? err.message : 'Failed to analyze participant sessions');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAnalysis();
  }, [user?.id, webinarId]);

  return { analysis, loading, error };
};
