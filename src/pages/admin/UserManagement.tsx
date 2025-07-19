import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Search, 
  Shield, 
  UserCheck, 
  UserX,
  Mail,
  Building,
  RefreshCw,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface ManagedUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'member';
  is_zoom_admin: boolean;
  last_sync: string | null;
  webinar_count: number;
}

export default function UserManagement() {
  const { isZoomAdmin, canViewAllUsers } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isZoomAdmin || !canViewAllUsers) {
      navigate('/dashboard');
      return;
    }
    fetchManagedUsers();
  }, [isZoomAdmin, canViewAllUsers, navigate]);

  const fetchManagedUsers = async () => {
    try {
      setLoading(true);

      // Get all users that this admin can manage - simplified query
      const { data: orgRelationships, error: orgError } = await supabase
        .from('user_organizations')
        .select('managed_user_id, permissions')
        .eq('admin_user_id', (await supabase.auth.getUser()).data.user?.id);

      if (orgError) throw orgError;

      const managedUserIds = orgRelationships?.map(rel => rel.managed_user_id) || [];
      
      // Get profiles separately to avoid foreign key issues
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, role, is_zoom_admin')
        .in('id', managedUserIds);

      if (profilesError) throw profilesError;

      // Get zoom connections separately  
      const { data: connections, error: connectionsError } = await supabase
        .from('zoom_connections')
        .select('user_id, last_sync_at')
        .in('user_id', managedUserIds);

      if (connectionsError) throw connectionsError;

      // Get webinar counts for each user
      const { data: webinarCounts, error: webinarError } = await supabase
        .from('zoom_webinars')
        .select('connection_id, zoom_connections!inner(user_id)')
        .in('zoom_connections.user_id', managedUserIds);

      if (webinarError) throw webinarError;

      // Count webinars per user
      const webinarCountMap = webinarCounts?.reduce((acc, webinar) => {
        const userId = webinar.zoom_connections?.user_id;
        if (userId) {
          acc[userId] = (acc[userId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      // Format the data with proper null checking
      const formattedUsers: ManagedUser[] = profiles?.map(profile => {
        const connection = connections?.find(c => c.user_id === profile.id);
        const relationship = orgRelationships?.find(r => r.managed_user_id === profile.id);
        
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: (profile.role as 'owner' | 'admin' | 'member') || 'member',
          is_zoom_admin: profile.is_zoom_admin || false,
          last_sync: connection?.last_sync_at || null,
          webinar_count: webinarCountMap[profile.id] || 0
        };
      }) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching managed users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch managed users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshUserList = async () => {
    try {
      setRefreshing(true);
      
      // Call the edge function to sync with Zoom
      const { data, error } = await supabase.functions.invoke('sync-zoom-user-role', {
        body: { userId: (await supabase.auth.getUser()).data.user?.id }
      });

      if (error) throw error;

      await fetchManagedUsers();
      
      toast({
        title: 'Success',
        description: 'User list refreshed successfully'
      });
    } catch (error) {
      console.error('Error refreshing user list:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh user list',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const viewUserWebinars = (userId: string) => {
    navigate(`/admin/webinars?user=${userId}`);
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'destructive';
      case 'admin': return 'default';
      default: return 'secondary';
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
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage users in your Zoom account and view their webinar analytics
          </p>
        </div>
        <Button 
          onClick={refreshUserList} 
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'admin' || u.role === 'owner').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Webinars</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.reduce((sum, u) => sum + u.webinar_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>Account Users</CardTitle>
          <CardDescription>
            All users in your Zoom account that you can manage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Webinars</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatar_url || ''} />
                            <AvatarFallback>
                              {user.full_name?.[0] || user.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.full_name || 'No name'}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role}
                          </Badge>
                          {user.is_zoom_admin && (
                            <Shield className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.webinar_count} webinars
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.last_sync ? (
                          <span className="text-sm text-muted-foreground">
                            {new Date(user.last_sync).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => viewUserWebinars(user.id)}
                          className="gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View Webinars
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
