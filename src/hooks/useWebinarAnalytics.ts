
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { ParticipantAnalyticsService } from '@/services/zoom/analytics/ParticipantAnalyticsService';

interface WebinarAnalyticsFilters {
  dateRange: { from: Date; to: Date };
  status?: string;
  minAttendees?: number;
  engagementLevel?: 'high' | 'medium' | 'low';
}

interface WebinarMetrics {
  totalWebinars: number;
  totalAttendees: number;
  averageAttendanceRate: number;
  averageEngagementScore: number;
  totalRegistrants: number;
  periodChange: {
    webinars: number;
    attendees: number;
    attendanceRate: number;
    engagement: number;
  };
}

interface ChartData {
  attendanceTrends: Array<{
    date: string;
    attendees: number;
    registrants: number;
    rate: number;
  }>;
  engagementDistribution: Array<{
    level: string;
    count: number;
    percentage: number;
  }>;
  geographicData: Array<{
    country: string;
    participants: number;
    engagement: number;
  }>;
  deviceData: Array<{
    device: string;
    count: number;
    percentage: number;
  }>;
}

interface WebinarTableData {
  id: string;
  topic: string;
  startTime: string;
  duration: number;
  registrants: number;
  attendees: number;
  attendanceRate: number;
  engagementScore: number;
  status: string;
}

// Updated to match actual database schema
interface DatabaseWebinarData {
  id: string;
  topic: string;
  start_time: string | null;
  duration: number | null;
  total_attendees: number | null;
  total_registrants: number | null;
  status: string | null;
  zoom_participants: Array<{
    id: string;
    name: string | null;
    email: string | null;
    duration: number | null;
    join_time: string | null;
    leave_time: string | null;
    attentiveness_score: number | null;
    answered_polling: boolean | null;
    asked_question: boolean | null;
  }>;
}

export const useWebinarAnalytics = (filters: WebinarAnalyticsFilters) => {
  const { connection } = useZoomConnection();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['webinar-analytics', connection?.id, filters],
    queryFn: async () => {
      if (!connection?.id) return null;

      // Fetch webinars with filters - using correct table name
      let webinarsQuery = supabase
        .from('zoom_webinars')
        .select(`
          id,
          topic,
          start_time,
          duration,
          total_attendees,
          total_registrants,
          status,
          zoom_participants(
            id,
            name,
            email,
            duration,
            join_time,
            leave_time,
            attentiveness_score,
            answered_polling,
            asked_question
          )
        `)
        .eq('connection_id', connection.id)
        .gte('start_time', filters.dateRange.from.toISOString())
        .lte('start_time', filters.dateRange.to.toISOString());

      if (filters.status) {
        webinarsQuery = webinarsQuery.eq('status', filters.status);
      }

      const { data: webinars, error: webinarsError } = await webinarsQuery;

      if (webinarsError) throw webinarsError;
      if (!webinars) return null;

      // Type assertion with proper type checking
      const typedWebinars = webinars.filter(w => 
        w && typeof w === 'object' && 'id' in w
      ) as DatabaseWebinarData[];

      // Calculate metrics
      const metrics: WebinarMetrics = {
        totalWebinars: typedWebinars.length,
        totalAttendees: typedWebinars.reduce((sum, w) => sum + (w.total_attendees || 0), 0),
        totalRegistrants: typedWebinars.reduce((sum, w) => sum + (w.total_registrants || 0), 0),
        averageAttendanceRate: 0,
        averageEngagementScore: 0,
        periodChange: {
          webinars: 0,
          attendees: 0,
          attendanceRate: 0,
          engagement: 0,
        },
      };

      if (metrics.totalRegistrants > 0) {
        metrics.averageAttendanceRate = (metrics.totalAttendees / metrics.totalRegistrants) * 100;
      }

      // Calculate engagement scores for each webinar
      const webinarEngagements = await Promise.all(
        typedWebinars.map(async (webinar) => {
          const engagement = await ParticipantAnalyticsService.calculateWebinarEngagement(webinar.id);
          return { webinar, engagement };
        })
      );

      const validEngagements = webinarEngagements.filter(we => we.engagement);
      if (validEngagements.length > 0) {
        metrics.averageEngagementScore = validEngagements.reduce(
          (sum, we) => sum + we.engagement!.averageEngagementScore, 0
        ) / validEngagements.length;
      }

      // Prepare chart data
      const chartData: ChartData = {
        attendanceTrends: prepareAttendanceTrends(typedWebinars),
        engagementDistribution: prepareEngagementDistribution(validEngagements),
        geographicData: await prepareGeographicData(typedWebinars),
        deviceData: await prepareDeviceData(typedWebinars),
      };

      // Prepare table data
      const tableData: WebinarTableData[] = webinarEngagements.map(({ webinar, engagement }) => ({
        id: webinar.id,
        topic: webinar.topic,
        startTime: webinar.start_time || '',
        duration: webinar.duration || 0,
        registrants: webinar.total_registrants || 0,
        attendees: webinar.total_attendees || 0,
        attendanceRate: webinar.total_registrants ? 
          ((webinar.total_attendees || 0) / webinar.total_registrants) * 100 : 0,
        engagementScore: engagement?.averageEngagementScore || 0,
        status: webinar.status || 'unknown',
      }));

      // Apply filters to table data
      let filteredTableData = tableData;
      if (filters.minAttendees) {
        filteredTableData = filteredTableData.filter(w => w.attendees >= filters.minAttendees!);
      }
      if (filters.engagementLevel) {
        const thresholds = { high: 70, medium: 40, low: 0 };
        const minScore = thresholds[filters.engagementLevel];
        const maxScore = filters.engagementLevel === 'high' ? 100 : 
                        filters.engagementLevel === 'medium' ? 70 : 40;
        filteredTableData = filteredTableData.filter(
          w => w.engagementScore >= minScore && w.engagementScore < maxScore
        );
      }

      return {
        metrics,
        chartData,
        tableData: filteredTableData,
        rawWebinars: typedWebinars,
      };
    },
    enabled: !!connection?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    data,
    isLoading,
    error,
    refetch,
  };
};

// Helper functions
function prepareAttendanceTrends(webinars: DatabaseWebinarData[]): ChartData['attendanceTrends'] {
  const grouped = webinars.reduce((acc, webinar) => {
    if (!webinar.start_time) return acc;
    
    const date = new Date(webinar.start_time).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { attendees: 0, registrants: 0, count: 0 };
    }
    acc[date].attendees += webinar.total_attendees || 0;
    acc[date].registrants += webinar.total_registrants || 0;
    acc[date].count += 1;
    return acc;
  }, {} as Record<string, { attendees: number; registrants: number; count: number }>);

  return Object.entries(grouped)
    .map(([date, data]) => ({
      date,
      attendees: data.attendees,
      registrants: data.registrants,
      rate: data.registrants > 0 ? (data.attendees / data.registrants) * 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function prepareEngagementDistribution(engagements: any[]): ChartData['engagementDistribution'] {
  const distribution = { high: 0, medium: 0, low: 0 };
  
  engagements.forEach(({ engagement }) => {
    if (!engagement) return;
    const score = engagement.averageEngagementScore;
    if (score >= 70) distribution.high++;
    else if (score >= 40) distribution.medium++;
    else distribution.low++;
  });

  const total = distribution.high + distribution.medium + distribution.low;
  
  return [
    { level: 'High (70+)', count: distribution.high, percentage: total > 0 ? (distribution.high / total) * 100 : 0 },
    { level: 'Medium (40-69)', count: distribution.medium, percentage: total > 0 ? (distribution.medium / total) * 100 : 0 },
    { level: 'Low (<40)', count: distribution.low, percentage: total > 0 ? (distribution.low / total) * 100 : 0 },
  ];
}

async function prepareGeographicData(webinars: DatabaseWebinarData[]): Promise<ChartData['geographicData']> {
  const webinarIds = webinars.map(w => w.id);
  if (webinarIds.length === 0) return [];

  const { data: participants } = await supabase
    .from('zoom_participants')
    .select('location')
    .in('webinar_id', webinarIds);

  if (!participants) return [];

  const locationCounts = participants.reduce((acc, p) => {
    const country = p.location || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(locationCounts)
    .map(([country, participants]) => ({
      country,
      participants,
      engagement: 0, // Would need to calculate per country
    }))
    .sort((a, b) => b.participants - a.participants)
    .slice(0, 10); // Top 10 countries
}

async function prepareDeviceData(webinars: DatabaseWebinarData[]): Promise<ChartData['deviceData']> {
  const webinarIds = webinars.map(w => w.id);
  if (webinarIds.length === 0) return [];

  const { data: participants } = await supabase
    .from('zoom_participants')
    .select('device')
    .in('webinar_id', webinarIds);

  if (!participants) return [];

  const deviceCounts = participants.reduce((acc, p) => {
    const device = p.device || 'Unknown';
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = Object.values(deviceCounts).reduce((sum, count) => sum + count, 0);

  return Object.entries(deviceCounts)
    .map(([device, count]) => ({
      device,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}
