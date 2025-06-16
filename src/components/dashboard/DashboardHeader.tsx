import React, { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { TokenStatus } from '@/services/zoom/utils/tokenUtils';
import { ZoomConnectionModal } from '@/components/zoom/ZoomConnectionModal';
import { ZoomSyncModal } from '@/components/zoom/ZoomSyncModal';

export function DashboardHeader() {
  const { user, profile } = useAuth();
  const { connection, tokenStatus, isLoading } = useZoomConnection();
  const { startSync, isSyncing } = useZoomSync(connection);
  const { toast } = useToast();
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Get the last sync timestamp
  const { data: lastSyncData } = useQuery({
    queryKey: ['last-sync-timestamp', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return null;
      
      try {
        const { data, error } = await supabase
          .from('zoom_sync_logs')
          .select('completed_at')
          .eq('connection_id', connection.id)
          .eq('sync_status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        return data;
      } catch (error) {
        console.error('Failed to fetch last sync timestamp:', error);
        return null;
      }
    },
    enabled: !!connection?.id,
    refetchInterval: 30000,
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

  const getConnectionStatus = () => {
    if (isLoading) {
      return { 
        icon: RefreshCw, 
        label: 'Checking...', 
        variant: 'secondary' as const,
        className: 'text-gray-600 bg-gray-100'
      };
    }

    switch (tokenStatus) {
      case TokenStatus.VALID:
        return { 
          icon: Wifi, 
          label: 'Connected', 
          variant: 'default' as const,
          className: 'text-green-700 bg-green-100 border-green-300'
        };
      case TokenStatus.ACCESS_EXPIRED:
        return {
          icon: RefreshCw,
          label: 'Refreshing...',
          variant: 'destructive' as const,
          className: 'text-yellow-600 bg-yellow-100 border-yellow-300 animate-pulse'
        };
      case TokenStatus.REFRESH_EXPIRED:
      case TokenStatus.INVALID:
        return { 
          icon: AlertCircle, 
          label: 'Connection Expired', 
          variant: 'destructive' as const,
          className: 'text-red-600 bg-red-100 border-red-300'
        };
      case TokenStatus.NO_CONNECTION:
      default:
        return { 
          icon: WifiOff, 
          label: 'Not Connected', 
          variant: 'outline' as const,
          className: 'text-red-600 bg-red-100 border-red-300'
        };
    }
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  const formatLastSync = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never synced';
    try {
      return `Last sync: ${format(new Date(dateString), 'MMM d, yyyy h:mm a')}`;
    } catch (error) {
      return 'Last sync: Unknown';
    }
  };

  const handleButtonClick = () => {
    if (tokenStatus === TokenStatus.VALID) {
      setShowSyncModal(true);
    } else {
      setShowConnectionModal(true);
    }
  };

  const handleSyncClick = () => {
    if (!isSyncing) {
      startSync('incremental');
    }
  };
  
  const isSyncButtonDisabled = isSyncing || isLoading || tokenStatus === TokenStatus.NO_CONNECTION || tokenStatus === TokenStatus.INVALID || tokenStatus === TokenStatus.REFRESH_EXPIRED;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-xl font-semibold text-gray-900">WebinarWise</h1>
        </div>

        <div className="ml-auto flex items-center space-x-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="search"
              placeholder="Search webinars, reports, attendees..."
              className="pl-10 w-80"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Badge className={`flex items-center gap-1 ${status.className}`}>
                <StatusIcon className={`w-3 h-3 ${isLoading || tokenStatus === TokenStatus.ACCESS_EXPIRED ? 'animate-spin' : ''}`} />
                Zoom {status.label}
              </Badge>
              <span className="text-sm text-gray-500">
                {formatLastSync(lastSyncData?.completed_at || connection?.last_sync_at)}
              </span>
            </div>
            
            <Button
              onClick={handleSyncClick}
              disabled={isSyncButtonDisabled}
              size="sm"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
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

      <ZoomConnectionModal
        open={showConnectionModal}
        onOpenChange={setShowConnectionModal}
        onSuccess={() => {
          // Optionally refresh connection data or show success message
        }}
      />

      <ZoomSyncModal
        open={showSyncModal}
        onOpenChange={setShowSyncModal}
        onSuccess={() => {
          // Optionally refresh data or show success message
        }}
      />
    </>
  );
}
