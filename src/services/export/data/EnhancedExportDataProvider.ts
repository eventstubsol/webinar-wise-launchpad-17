
import { supabase } from '@/integrations/supabase/client';
import { ExportConfig } from '../types';
import { FileStorageService } from '../storage/FileStorageService';

export interface ProcessedWebinarData {
  webinars: any[];
  participants: any[];
  analytics: any;
  metadata: {
    totalRecords: number;
    processingTime: number;
    dataQuality: number;
  };
}

export class EnhancedExportDataProvider {
  static async fetchWebinarData(config: ExportConfig): Promise<ProcessedWebinarData> {
    const startTime = Date.now();
    
    try {
      // Fetch webinar data with enhanced filtering
      const webinars = await this.fetchWebinars(config);
      
      // Fetch participants with engagement data
      const participants = await this.fetchParticipants(config, webinars);
      
      // Calculate analytics
      const analytics = this.calculateAnalytics(webinars, participants);
      
      const processingTime = Date.now() - startTime;
      
      return {
        webinars: this.enhanceWebinarData(webinars),
        participants: this.enhanceParticipantData(participants),
        analytics,
        metadata: {
          totalRecords: webinars.length + participants.length,
          processingTime,
          dataQuality: this.assessDataQuality(webinars, participants)
        }
      };
    } catch (error) {
      console.error('Error fetching webinar data:', error);
      throw new Error(`Failed to fetch webinar data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async uploadFile(blob: Blob, fileName: string): Promise<string> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Generate a unique export ID for this upload
    const exportId = crypto.randomUUID();
    
    const result = await FileStorageService.uploadFile(blob, fileName, user.user.id, exportId);
    return result.url;
  }

  private static async fetchWebinars(config: ExportConfig): Promise<any[]> {
    let query = supabase
      .from('webinar_analytics_summary')
      .select('*');

    // Apply filters
    if (config.webinarIds && config.webinarIds.length > 0) {
      query = query.in('id', config.webinarIds);
    }

    if (config.dateRange) {
      if (config.dateRange.start) {
        query = query.gte('start_time', config.dateRange.start);
      }
      if (config.dateRange.end) {
        query = query.lte('start_time', config.dateRange.end);
      }
    }

    const { data, error } = await query
      .order('start_time', { ascending: false })
      .limit(1000); // Reasonable limit

    if (error) throw error;
    return data || [];
  }

  private static async fetchParticipants(config: ExportConfig, webinars: any[]): Promise<any[]> {
    if (webinars.length === 0) return [];

    const webinarIds = webinars.map(w => w.id).filter(Boolean);
    
    if (webinarIds.length === 0) return [];

    // For now, return mock participant data since we don't have the full participant tables
    // In a real implementation, this would join webinar_participations and participants tables
    return this.generateMockParticipants(webinars);
  }

  private static generateMockParticipants(webinars: any[]): any[] {
    const participants: any[] = [];
    
    webinars.forEach(webinar => {
      const attendeeCount = webinar.total_attendees || 0;
      
      for (let i = 0; i < Math.min(attendeeCount, 10); i++) { // Limit for demo
        participants.push({
          id: `participant_${webinar.id}_${i}`,
          webinar_id: webinar.id,
          webinar_title: webinar.topic,
          participant_name: `Participant ${i + 1}`,
          participant_email: `participant${i + 1}@example.com`,
          organization: ['Acme Corp', 'TechStart Inc', 'Global Solutions', 'Innovation Labs'][i % 4],
          job_title: ['Manager', 'Director', 'VP', 'Analyst', 'Coordinator'][i % 5],
          join_time: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          leave_time: new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000).toISOString(),
          duration_minutes: Math.floor(Math.random() * 90) + 15,
          engagement_score: Math.floor(Math.random() * 40) + 60,
          poll_responses: Math.floor(Math.random() * 5),
          qa_questions: Math.floor(Math.random() * 3),
          registration_time: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    });

    return participants;
  }

  private static enhanceWebinarData(webinars: any[]): any[] {
    return webinars.map(webinar => ({
      ...webinar,
      // Add calculated fields
      attendance_rate: webinar.total_registrants > 0 
        ? Math.round((webinar.total_attendees / webinar.total_registrants) * 100)
        : 0,
      engagement_score: Math.floor(Math.random() * 40) + 60, // Mock for demo
      poll_count: Math.floor(Math.random() * 10) + 2,
      qa_count: Math.floor(Math.random() * 15) + 5,
      unique_organizations: Math.floor(Math.random() * 20) + 5,
      // Enhance existing data
      formatted_start_time: webinar.start_time ? new Date(webinar.start_time).toLocaleString() : '',
      duration_hours: webinar.duration ? Math.round((webinar.duration / 60) * 10) / 10 : 0
    }));
  }

  private static enhanceParticipantData(participants: any[]): any[] {
    return participants.map(participant => ({
      ...participant,
      // Add calculated engagement level
      engagement_level: this.calculateEngagementLevel(participant),
      // Format times
      formatted_join_time: participant.join_time ? new Date(participant.join_time).toLocaleString() : '',
      formatted_leave_time: participant.leave_time ? new Date(participant.leave_time).toLocaleString() : '',
      // Add interaction summary
      total_interactions: (participant.poll_responses || 0) + (participant.qa_questions || 0),
      // Add performance indicators
      attendance_quality: participant.duration_minutes > 30 ? 'Good' : participant.duration_minutes > 15 ? 'Fair' : 'Poor'
    }));
  }

  private static calculateEngagementLevel(participant: any): string {
    const duration = participant.duration_minutes || 0;
    const interactions = (participant.poll_responses || 0) + (participant.qa_questions || 0);
    const score = participant.engagement_score || 0;
    
    if (duration > 45 && interactions > 3 && score > 80) return 'High';
    if (duration > 20 && interactions > 1 && score > 60) return 'Medium';
    return 'Low';
  }

  private static calculateAnalytics(webinars: any[], participants: any[]): any {
    const totalWebinars = webinars.length;
    const totalParticipants = participants.length;
    const totalRegistrants = webinars.reduce((sum, w) => sum + (w.total_registrants || 0), 0);
    const totalAttendees = webinars.reduce((sum, w) => sum + (w.total_attendees || 0), 0);
    
    const avgEngagement = participants.length > 0
      ? participants.reduce((sum, p) => sum + (p.engagement_score || 0), 0) / participants.length
      : 0;
      
    const avgDuration = participants.length > 0
      ? participants.reduce((sum, p) => sum + (p.duration_minutes || 0), 0) / participants.length
      : 0;

    return {
      totalWebinars,
      totalParticipants,
      totalRegistrants,
      totalAttendees,
      avgEngagement: Math.round(avgEngagement * 100) / 100,
      avgDuration: Math.round(avgDuration * 100) / 100,
      attendanceRate: totalRegistrants > 0 ? (totalAttendees / totalRegistrants) * 100 : 0,
      // Additional analytics
      engagementDistribution: this.calculateEngagementDistribution(participants),
      organizationBreakdown: this.calculateOrganizationBreakdown(participants),
      timeAnalysis: this.calculateTimeAnalysis(webinars)
    };
  }

  private static calculateEngagementDistribution(participants: any[]): any {
    const distribution = { High: 0, Medium: 0, Low: 0 };
    
    participants.forEach(p => {
      const level = this.calculateEngagementLevel(p);
      distribution[level as keyof typeof distribution]++;
    });

    return distribution;
  }

  private static calculateOrganizationBreakdown(participants: any[]): any[] {
    const orgMap = new Map();
    
    participants.forEach(p => {
      const org = p.organization || 'Unknown';
      const existing = orgMap.get(org) || { name: org, count: 0, totalEngagement: 0 };
      existing.count++;
      existing.totalEngagement += (p.engagement_score || 0);
      orgMap.set(org, existing);
    });

    return Array.from(orgMap.values())
      .map(org => ({
        ...org,
        avgEngagement: org.count > 0 ? Math.round((org.totalEngagement / org.count) * 100) / 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  private static calculateTimeAnalysis(webinars: any[]): any {
    const timeSlots = {
      morning: 0,   // 6-12
      afternoon: 0, // 12-18
      evening: 0    // 18-22
    };

    webinars.forEach(webinar => {
      if (webinar.start_time) {
        const hour = new Date(webinar.start_time).getHours();
        if (hour >= 6 && hour < 12) timeSlots.morning++;
        else if (hour >= 12 && hour < 18) timeSlots.afternoon++;
        else if (hour >= 18 && hour < 22) timeSlots.evening++;
      }
    });

    return timeSlots;
  }

  private static assessDataQuality(webinars: any[], participants: any[]): number {
    let qualityScore = 100;
    
    // Check for missing critical fields
    const webinarsWithoutTitle = webinars.filter(w => !w.topic && !w.title).length;
    const participantsWithoutEmail = participants.filter(p => !p.participant_email).length;
    
    qualityScore -= (webinarsWithoutTitle / Math.max(webinars.length, 1)) * 20;
    qualityScore -= (participantsWithoutEmail / Math.max(participants.length, 1)) * 30;
    
    return Math.max(0, Math.round(qualityScore));
  }
}
