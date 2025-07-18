import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Building, 
  Users, 
  Video, 
  TrendingUp,
  Calendar,
  Clock,
  UserCheck,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface AccountStats {
  totalUsers: number;
  totalWebinars: number;
  totalAttendees: number;
  avgAttendanceRate: number;
  totalMinutesWatched: number;
  activeUsers: number;
}

interface UserWebinarData {
  userName: string;
  webinarCount: number;
  totalAttendees: number;
  avgAttendance: number;
}

interface WebinarTrend {
  month: string;
  webinars: number;
  attendees: number;
}

export default function AccountAnalytics() {
  const { isZoomAdmin, canViewAllUsers } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AccountStats>({
    totalUsers: 0,
    totalWebinars: 0,
    totalAttendees: 0,
    avgAttendanceRate: 0,
    totalMinutesWatched: 0,
    activeUsers: 0
  });
  const [userWebinarData, setUserWebinarData] = useState<UserWebinarData[]>([]);
  const [webinarTrends, setWebinarTrends] = useState<WebinarTrend[]>([]);
  const [topWebinars, setTopWebinars] = useState<any[]>([]);

  useEffect(() => {
    if (!isZoomAdmin || !canViewAllUsers) {
      navigate('/dashboard');
      return;
    }
    fetchAccountAnalytics();
  }, [isZoomAdmin, canViewAllUsers, navigate]);

  const fetchAccountAnalytics = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all managed users
      // Get all managed users for the admin
      const { data: orgRelationships, error: orgError } = await supabase
        .from('user_organizations')
        .select(`
          managed_user_id,
          admin_user_id
        `)
        .eq('admin_user_id', user.id);

      if (orgError) throw orgError;

      const managedUserIds = orgRelationships?.map(rel => rel.managed_user_id) || [];
      
      // Include the admin user as well
      const allUserIds = [...managedUserIds, user.id];

      // Get all webinars for these users
      const { data: webinars, error: webinarsError } = await supabase
        .from('zoom_webinars')
        .select(`
          *,
          zoom_connections!inner (
            user_id
          ),
          webinar_metrics (
            total_attendees,
            unique_attendees,
            avg_attendance_duration
          )
        `)
        .in('zoom_connections.user_id', allUserIds);

      if (webinarsError) throw webinarsError;

      // Calculate stats
      const totalWebinars = webinars?.length || 0;
      const totalAttendees = webinars?.reduce((sum, w) => 
        sum + (w.webinar_metrics?.[0]?.total_attendees || 0), 0
      ) || 0;
      const totalMinutesWatched = webinars?.reduce((sum, w) => 
        sum + ((w.webinar_metrics?.[0]?.total_attendees || 0) * 
               (w.webinar_metrics?.[0]?.avg_attendance_duration || 0)), 0
      ) || 0;

      // Get active users (users with at least one webinar)
      const activeUserIds = new Set(webinars?.map(w => w.zoom_connections?.user_id));
      const activeUsers = activeUserIds.size;

      // Calculate average attendance rate
      const avgAttendanceRate = webinars?.reduce((sum, w) => {
        const registered = w.registrants_count || 0;
        const attended = w.webinar_metrics?.[0]?.unique_attendees || 0;
        return sum + (registered > 0 ? (attended / registered) : 0);
      }, 0) / (totalWebinars || 1) * 100;

      setStats({
        totalUsers: allUserIds.length,
        totalWebinars,
        totalAttendees,
        avgAttendanceRate: avgAttendanceRate || 0,
        totalMinutesWatched,
        activeUsers
      });

      // Calculate user webinar data
      const userDataMap = new Map<string, UserWebinarData>();
      
      for (const webinar of webinars || []) {
        const userId = webinar.zoom_connections?.user_id;
        
        // Get user profile for display name
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId)
          .single();
        
        const userName = userProfile?.full_name || userProfile?.email || 'Unknown';
        
        if (!userDataMap.has(userId)) {
          userDataMap.set(userId, {
            userName,
            webinarCount: 0,
            totalAttendees: 0,
            avgAttendance: 0
          });
        }
        
        const userData = userDataMap.get(userId)!;
        userData.webinarCount++;
        userData.totalAttendees += webinar.webinar_metrics?.[0]?.total_attendees || 0;
      }

      // Calculate average attendance per user
      userDataMap.forEach((data) => {
        data.avgAttendance = data.webinarCount > 0 ? 
          Math.round(data.totalAttendees / data.webinarCount) : 0;
      });

      setUserWebinarData(Array.from(userDataMap.values()));

      // Calculate webinar trends (last 6 months)
      const trends = new Map<string, WebinarTrend>();
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = format(date, 'MMM yyyy');
        trends.set(monthKey, {
          month: monthKey,
          webinars: 0,
          attendees: 0
        });
      }

      webinars?.forEach(webinar => {
        const date = new Date(webinar.start_time);
        const monthKey = format(date, 'MMM yyyy');
        if (trends.has(monthKey)) {
          const trend = trends.get(monthKey)!;
          trend.webinars++;
          trend.attendees += webinar.webinar_metrics?.[0]?.total_attendees || 0;
        }
      });

      setWebinarTrends(Array.from(trends.values()));

      // Get top webinars by attendance
      const sortedWebinars = [...(webinars || [])]
        .sort((a, b) => 
          (b.webinar_metrics?.[0]?.total_attendees || 0) - 
          (a.webinar_metrics?.[0]?.total_attendees || 0)
        )
        .slice(0, 5)
        .map(w => ({
          topic: w.topic,
          attendees: w.webinar_metrics?.[0]?.total_attendees || 0,
          date: format(new Date(w.start_time), 'MMM dd, yyyy')
        }));

      setTopWebinars(sortedWebinars);

    } catch (error) {
      console.error('Error fetching account analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch account analytics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Overview of all webinar activity across your organization
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Webinars</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWebinars}</div>
            <p className="text-xs text-muted-foreground">
              Across all users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttendees.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(stats.avgAttendanceRate)}% avg attendance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Watch Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(stats.totalMinutesWatched / 60).toLocaleString()}h
            </div>
            <p className="text-xs text-muted-foreground">
              Total hours watched
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="top">Top Webinars</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webinar Trends</CardTitle>
              <CardDescription>
                Monthly webinar and attendance trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={webinarTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="webinars" 
                    stroke="#8884d8" 
                    name="Webinars"
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="attendees" 
                    stroke="#82ca9d" 
                    name="Attendees"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>
                Webinar activity by user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userWebinarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="userName" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="webinarCount" fill="#8884d8" name="Webinars" />
                  <Bar dataKey="avgAttendance" fill="#82ca9d" name="Avg Attendance" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Webinars</CardTitle>
              <CardDescription>
                Most attended webinars across all users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topWebinars.map((webinar, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold">{webinar.topic}</h4>
                      <p className="text-sm text-muted-foreground">{webinar.date}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{webinar.attendees}</div>
                      <p className="text-xs text-muted-foreground">attendees</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
