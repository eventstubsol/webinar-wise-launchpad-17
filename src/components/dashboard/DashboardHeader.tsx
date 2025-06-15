
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { Search, Bell, RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useZoomSync } from '@/hooks/useZoomSync';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export function DashboardHeader() {
  const { user, profile } = useAuth();
  const { connection, isConnected, isExpired, isLoading } = useZoomConnection();
  const { startSync, isSyncing } = useZoomSync(connection?.id);

  // Get the last sync timestamp
  const { data: lastSyncData } = useQuery({
    queryKey: ['last-sync-timestamp', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return null;
      
      const { data, error } = await supabase
        .from('zoom_sync_logs')
        .select('completed_at')
        .eq('connection_id', connection.id)
        .eq('sync_status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching last sync:', error);
        return null;
      }

      return data;
    },
    enabled: !!connection?.id,
    refetchInterval: 30000,
  });

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

  const getConnectionStatus = () => {
    if (isLoading) {
      return { 
        icon: RefreshCw, 
        label: 'Checking...', 
        variant: 'secondary' as const,
        className: 'text-gray-600'
      };
    }
    if (isExpired) {
      return { 
        icon: AlertCircle, 
        label: 'Expired', 
        variant: 'destructive' as const,
        className: 'text-red-600 bg-red-50 border-red-200'
      };
    }
    if (isConnected) {
      return { 
        icon: Wifi, 
        label: 'Connected', 
        variant: 'default' as const,
        className: 'text-green-700 bg-green-50 border-green-200'
      };
    }
    return { 
      icon: WifiOff, 
      label: 'Not Connected', 
      variant: 'outline' as const,
      className: 'text-red-600 bg-red-50 border-red-200'
    };
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Never synced';
    try {
      return `Last sync: ${format(new Date(dateString), 'MMM d, yyyy h:mm a')}`;
    } catch (error) {
      return 'Last sync: Unknown';
    }
  };

  const handleSyncClick = () => {
    if (isConnected && !isSyncing) {
      startSync('incremental');
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <h1 className="text-xl font-semibold text-gray-900">WebinarWise</h1>
      </div>

      <div className="ml-auto flex items-center space-x-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="search"
            placeholder="Search webinars, reports, attendees..."
            className="pl-10 w-80"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <Badge variant={status.variant} className={`flex items-center gap-1 ${status.className}`}>
              <StatusIcon className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              Zoom {status.label}
            </Badge>
            <span className="text-xs text-gray-500 mt-1">
              {formatLastSync(lastSyncData?.completed_at || connection?.last_sync_at || null)}
            </span>
          </div>
          
          <Button
            onClick={handleSyncClick}
            disabled={!isConnected || isSyncing}
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="w-4 h-4" />
        </Button>

        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url} alt={displayName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {displayName}
            </div>
            <div className="text-xs text-gray-500">
              {profile?.company || user?.email}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
