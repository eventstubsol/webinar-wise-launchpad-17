
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

export function DashboardHeader() {
  const { user, profile } = useAuth();
  const { connection, isConnected, isExpired, isLoading } = useZoomConnection();
  const { startSync, isSyncing } = useZoomSync(connection?.id);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

  const getConnectionStatus = () => {
    if (isLoading) {
      return { icon: RefreshCw, label: 'Checking...', variant: 'secondary' as const };
    }
    if (isExpired) {
      return { icon: AlertCircle, label: 'Expired', variant: 'destructive' as const };
    }
    if (isConnected) {
      return { icon: Wifi, label: 'Connected', variant: 'default' as const };
    }
    return { icon: WifiOff, label: 'Not Connected', variant: 'outline' as const };
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <h1 className="text-xl font-semibold text-gray-900">WebinarWise</h1>
      </div>

      <div className="ml-auto flex items-center space-x-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="search"
            placeholder="Search webinars, reports, attendees..."
            className="pl-10 w-80"
          />
        </div>

        <Badge variant={status.variant} className="flex items-center gap-1">
          <StatusIcon className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          Zoom {status.label}
        </Badge>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startSync('incremental')}
          disabled={!isConnected || isSyncing}
          aria-label="Sync recent data"
          className="h-8 w-8"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </Button>

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
