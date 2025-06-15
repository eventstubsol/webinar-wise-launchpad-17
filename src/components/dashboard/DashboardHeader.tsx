
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { Search, Bell, RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function DashboardHeader() {
  const { user, profile } = useAuth();
  const { isConnected, isExpired, isLoading } = useZoomConnection();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  const getConnectionStatus = () => {
    if (isLoading) {
      return { icon: RefreshCw, label: 'Checking...', variant: 'secondary' as const, color: 'text-gray-600' };
    }
    if (isExpired) {
      return { icon: AlertCircle, label: 'Expired', variant: 'destructive' as const, color: 'text-red-600' };
    }
    if (isConnected) {
      return { icon: Wifi, label: 'Connected', variant: 'default' as const, color: 'text-green-600' };
    }
    return { icon: WifiOff, label: 'Not Connected', variant: 'outline' as const, color: 'text-red-600' };
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-semibold text-gray-900">Webinar Analytics</h1>
          <Badge variant={status.variant} className="flex items-center gap-1">
            <StatusIcon className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Zoom {status.label}
          </Badge>
        </div>
      </div>

      <div className="ml-auto flex items-center space-x-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="search"
            placeholder="Search webinars..."
            className="pl-10 w-64"
          />
        </div>
        
        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
          <RefreshCw className="w-4 h-4 mr-1" />
          Sync Data
        </Button>

        <Button variant="ghost" size="sm">
          <Bell className="w-4 h-4" />
        </Button>

        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {displayName}
          </div>
          <div className="text-xs text-gray-500">
            {profile?.company || user?.email}
          </div>
        </div>
      </div>
    </header>
  );
}
