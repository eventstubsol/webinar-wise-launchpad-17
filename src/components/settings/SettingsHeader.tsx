
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function SettingsHeader() {
  const { user, profile } = useAuth();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="border-b border-border bg-background sticky top-0 z-10">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <SidebarTrigger />
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <div className="text-right">
            <div className="text-sm font-medium text-foreground">
              {displayName}
            </div>
            <div className="text-xs text-muted-foreground">
              {profile?.company || user?.email}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
