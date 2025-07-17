import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Video, 
  Search, 
  Calendar,
  Users,
  Clock,
  Filter,
  Download,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface WebinarWithUser {
  id: string;
  topic: string;
  start_time: string;
  duration: number;
  status: string;
  attendees_count: number;
  registrants_count: number;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function AllWebinars() {
  const { isZoomAdmin, canViewAllUsers } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [webinars, setWebinars] = useState<WebinarWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState(searchParams.get('user') || 'all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!isZoomAdmin || !canViewAllUsers) {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [isZoomAdmin, canViewAllUsers, navigate, filterUser, filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all managed users
      const { data: orgRelationships, error: orgError } = await supabase
        .from('user_organizations')
        .select(`
          managed_user_id,
          profiles!user_organizations_managed_user_id_fkey (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('admin_user_id', user.id);

      if (orgError) throw orgError;

      const managedUsers = orgRelationships?.map(rel => rel.profiles) || [];
      setUsers(managedUsers);

      // Determine which users to fetch webinars for
      let userIds: string[];
      if (filterUser === 'all') {
        userIds = [...managedUsers.map(u => u.id), user.id];
      } else {
        userIds = [filterUser];
      }

      // Build query
      let query = supabase
        .from('zoom_webinars')
        .select(`
          *,
          zoom_connections!inner (
            user_id,
            profiles!zoom_connections_user_id_fkey (
              id,
              email,
              full_name,
              avatar_url
            )
          ),
          webinar_metrics (
            total_attendees,
            unique_attendees
          )
        `)
        .in('zoom_connections.user_id', userIds)
        .order('start_time', { ascending: false });

      // Apply status filter
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data: webinarsData, error: webinarsError } = await query;

      if (webinarsError) throw webinarsError;

      // Format the data
      const formattedWebinars: WebinarWithUser[] = webinarsData?.map(webinar => ({
        id: webinar.id,
        topic: webinar.topic,
        start_time: webinar.start_time,
        duration: webinar.duration,
        status: webinar.status,
        attendees_count: webinar.webinar_metrics?.[0]?.total_attendees || 0,
        registrants_count: webinar.registrants_count || 0,
        user: webinar.zoom_connections.profiles
      })) || [];

      setWebinars(formattedWebinars);
    } catch (error) {
      console.error('Error fetching webinars:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch webinars',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredWebinars = webinars.filter(webinar => 
    webinar.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    webinar.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    webinar.user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const viewWebinarDetails = (webinarId: string) => {
    navigate(`/webinars/${webinarId}`);
  };

  const exportWebinars = () => {
    // TODO: Implement CSV export
    toast({
      title: 'Export Started',
      description: 'Your webinar data is being exported...'
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'scheduled': return 'secondary';
      case 'started': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Webinars</h1>
          <p className="text-muted-foreground mt-2">
            View and manage webinars across all users in your account
          </p>
        </div>
        <Button onClick={exportWebinars} className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
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

            <div>
              <label className="text-sm font-medium mb-2 block">User</label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="started">Started</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webinar List */}
      <Card>
        <CardHeader>
          <CardTitle>Webinars ({filteredWebinars.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Webinar</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWebinars.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No webinars found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWebinars.map((webinar) => (
                    <TableRow key={webinar.id}>
                      <TableCell>
                        <div className="font-medium">{webinar.topic}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {webinar.duration} minutes
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={webinar.user.avatar_url || ''} />
                            <AvatarFallback>
                              {webinar.user.full_name?.[0] || webinar.user.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">
                              {webinar.user.full_name || 'No name'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {webinar.user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(webinar.start_time), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(webinar.start_time), 'h:mm a')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {webinar.attendees_count} / {webinar.registrants_count}
                          </span>
                        </div>
                        {webinar.registrants_count > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {Math.round((webinar.attendees_count / webinar.registrants_count) * 100)}% attendance
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(webinar.status)}>
                          {webinar.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => viewWebinarDetails(webinar.id)}
                          className="gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
