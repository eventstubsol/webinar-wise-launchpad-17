
import { supabase } from '@/integrations/supabase/client';
import { ExportFormat, ExportOptions } from '../types';

export class EnhancedExportDataProvider {
  static async getAnalyticsData(options: ExportOptions) {
    try {
      const { startDate, endDate, webinarIds, userId } = options;
      
      // Build base query for zoom_webinars instead of non-existent webinar_analytics_summary
      let query = supabase
        .from('zoom_webinars')
        .select(`
          *,
          zoom_participants(
            participant_id,
            name,
            participant_email,
            join_time,
            leave_time,
            duration,
            attentiveness_score
          ),
          zoom_polls(
            poll_id,
            title,
            type,
            status
          ),
          zoom_qna(
            question_id,
            question,
            answer,
            name,
            email
          )
        `)
        .order('start_time', { ascending: false });

      // Apply filters
      if (userId) {
        // Filter by user's zoom connections
        const { data: connections } = await supabase
          .from('zoom_connections')
          .select('id')
          .eq('user_id', userId);
        
        if (connections && connections.length > 0) {
          query = query.in('connection_id', connections.map(c => c.id));
        }
      }

      if (startDate) {
        query = query.gte('start_time', startDate);
      }

      if (endDate) {
        query = query.lte('start_time', endDate);
      }

      if (webinarIds && webinarIds.length > 0) {
        query = query.in('id', webinarIds);
      }

      const { data: webinars, error } = await query;

      if (error) {
        console.error('Error fetching analytics data:', error);
        throw error;
      }

      return this.processAnalyticsData(webinars || []);
    } catch (error) {
      console.error('Error in getAnalyticsData:', error);
      throw error;
    }
  }

  private static processAnalyticsData(webinars: any[]) {
    const processedData = {
      summary: {
        totalWebinars: webinars.length,
        totalRegistrants: 0,
        totalAttendees: 0,
        averageAttendanceRate: 0,
        averageDuration: 0
      },
      webinars: webinars.map(webinar => ({
        id: webinar.id,
        title: webinar.topic,
        date: webinar.start_time,
        duration: webinar.duration,
        registrants: webinar.total_registrants || 0,
        attendees: webinar.total_attendees || 0,
        attendanceRate: webinar.total_registrants > 0 
          ? ((webinar.total_attendees || 0) / webinar.total_registrants) * 100 
          : 0,
        participants: Array.isArray(webinar.zoom_participants) ? webinar.zoom_participants : [],
        polls: Array.isArray(webinar.zoom_polls) ? webinar.zoom_polls : [],
        qna: Array.isArray(webinar.zoom_qna) ? webinar.zoom_qna : []
      })),
      participants: this.extractAllParticipants(webinars),
      engagement: this.calculateEngagementMetrics(webinars)
    };

    // Calculate summary metrics
    processedData.summary.totalRegistrants = processedData.webinars.reduce((sum, w) => sum + w.registrants, 0);
    processedData.summary.totalAttendees = processedData.webinars.reduce((sum, w) => sum + w.attendees, 0);
    processedData.summary.averageAttendanceRate = processedData.summary.totalRegistrants > 0
      ? (processedData.summary.totalAttendees / processedData.summary.totalRegistrants) * 100
      : 0;
    processedData.summary.averageDuration = processedData.webinars.length > 0
      ? processedData.webinars.reduce((sum, w) => sum + w.duration, 0) / processedData.webinars.length
      : 0;

    return processedData;
  }

  private static extractAllParticipants(webinars: any[]) {
    const allParticipants: any[] = [];
    
    webinars.forEach(webinar => {
      if (Array.isArray(webinar.zoom_participants)) {
        webinar.zoom_participants.forEach((participant: any) => {
          allParticipants.push({
            ...participant,
            webinarId: webinar.id,
            webinarTitle: webinar.topic,
            webinarDate: webinar.start_time
          });
        });
      }
    });

    return allParticipants;
  }

  private static calculateEngagementMetrics(webinars: any[]) {
    return {
      pollParticipation: this.calculatePollParticipation(webinars),
      qaParticipation: this.calculateQAParticipation(webinars),
      averageAttentionScore: this.calculateAverageAttentionScore(webinars),
      dropoffAnalysis: this.analyzeDropoffPatterns(webinars)
    };
  }

  private static calculatePollParticipation(webinars: any[]) {
    let totalPolls = 0;
    let totalParticipants = 0;
    
    webinars.forEach(webinar => {
      if (Array.isArray(webinar.zoom_polls)) {
        totalPolls += webinar.zoom_polls.length;
      }
      totalParticipants += webinar.total_attendees || 0;
    });

    return {
      totalPolls,
      averagePollsPerWebinar: webinars.length > 0 ? totalPolls / webinars.length : 0,
      participationRate: 0 // Would need poll response data to calculate
    };
  }

  private static calculateQAParticipation(webinars: any[]) {
    let totalQuestions = 0;
    let totalParticipants = 0;
    
    webinars.forEach(webinar => {
      if (Array.isArray(webinar.zoom_qna)) {
        totalQuestions += webinar.zoom_qna.length;
      }
      totalParticipants += webinar.total_attendees || 0;
    });

    return {
      totalQuestions,
      averageQuestionsPerWebinar: webinars.length > 0 ? totalQuestions / webinars.length : 0,
      participationRate: totalParticipants > 0 ? (totalQuestions / totalParticipants) * 100 : 0
    };
  }

  private static calculateAverageAttentionScore(webinars: any[]) {
    let totalScore = 0;
    let participantCount = 0;
    
    webinars.forEach(webinar => {
      if (Array.isArray(webinar.zoom_participants)) {
        webinar.zoom_participants.forEach((participant: any) => {
          if (participant.attentiveness_score !== null && participant.attentiveness_score !== undefined) {
            totalScore += participant.attentiveness_score;
            participantCount++;
          }
        });
      }
    });

    return participantCount > 0 ? totalScore / participantCount : 0;
  }

  private static analyzeDropoffPatterns(webinars: any[]) {
    // Basic dropoff analysis
    return webinars.map(webinar => {
      const participants = Array.isArray(webinar.zoom_participants) ? webinar.zoom_participants : [];
      const avgDuration = participants.length > 0
        ? participants.reduce((sum: number, p: any) => sum + (p.duration || 0), 0) / participants.length
        : 0;
      
      return {
        webinarId: webinar.id,
        title: webinar.topic,
        expectedDuration: webinar.duration || 0,
        actualAverageDuration: avgDuration,
        dropoffRate: webinar.duration > 0 ? ((webinar.duration - avgDuration) / webinar.duration) * 100 : 0
      };
    });
  }
}
