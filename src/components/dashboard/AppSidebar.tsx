
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar, SidebarMenu } from '@/components/ui/sidebar';
import { LayoutDashboard, Video, Users, Settings, Send, BarChart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export const AppSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <Sidebar>
      <SidebarMenu>
        <SidebarMenu.Header>
          <img src="/lovable-uploads/d3011340-f45f-4d8c-b42a-3c95a640618a.png" alt="Logo" className="h-8 w-auto" />
        </SidebarMenu.Header>
        
        <SidebarMenu.Body>
          <SidebarMenu.Item
            to="/dashboard"
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Dashboard"
            isActive={location.pathname === '/dashboard'}
          />
          <SidebarMenu.Item
            to="/webinars"
            icon={<Video className="h-4 w-4" />}
            label="Webinars"
            isActive={location.pathname.startsWith('/webinars')}
          />
          <SidebarMenu.Item
            to="/templates"
            icon={<Users className="h-4 w-4" />}
            label="Templates"
            isActive={location.pathname.startsWith('/templates')}
          />
          <SidebarMenu.Item
            to="/campaigns"
            icon={<Send className="h-4 w-4" />}
            label="Campaigns"
            isActive={location.pathname.startsWith('/campaigns')}
          />
          <SidebarMenu.Item
            to="/email-analytics"
            icon={<BarChart className="h-4 w-4" />}
            label="Email Analytics"
            isActive={location.pathname.startsWith('/email-analytics')}
          />
        </SidebarMenu.Body>
        
        <SidebarMenu.Footer>
          <SidebarMenu.Item
            to="/settings"
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
            isActive={location.pathname === '/settings'}
          />
          <Button variant="ghost" onClick={signOut} className="w-full justify-start text-muted-foreground hover:text-foreground">
            Log Out
          </Button>
        </SidebarMenu.Footer>
      </SidebarMenu>
    </Sidebar>
  );
};
