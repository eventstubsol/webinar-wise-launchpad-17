
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Video, 
  Users, 
  Settings, 
  Send, 
  BarChart, 
  LogOut, 
  Target,
  Brain,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export const AppSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader>
        <img src="/lovable-uploads/d3011340-f45f-4d8c-b42a-3c95a640618a.png" alt="Logo" className="h-8 w-auto" />
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <Button asChild variant={location.pathname === '/dashboard' ? 'secondary' : 'ghost'} className="w-full justify-start">
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                <span>Dashboard</span>
              </Link>
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button asChild variant={location.pathname.startsWith('/webinars') ? 'secondary' : 'ghost'} className="w-full justify-start">
              <Link to="/webinars">
                <Video className="h-4 w-4 mr-2" />
                <span>Webinars</span>
              </Link>
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button asChild variant={location.pathname.startsWith('/templates') ? 'secondary' : 'ghost'} className="w-full justify-start">
              <Link to="/templates">
                <Users className="h-4 w-4 mr-2" />
                <span>Templates</span>
              </Link>
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button asChild variant={location.pathname.startsWith('/campaigns') ? 'secondary' : 'ghost'} className="w-full justify-start">
              <Link to="/campaigns">
                <Send className="h-4 w-4 mr-2" />
                <span>Campaigns</span>
              </Link>
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button asChild variant={location.pathname.startsWith('/email-analytics') ? 'secondary' : 'ghost'} className="w-full justify-start">
              <Link to="/email-analytics">
                <BarChart className="h-4 w-4 mr-2" />
                <span>Email Analytics</span>
              </Link>
            </Button>
          </SidebarMenuItem>
          
          {/* Advanced Features Section */}
          <div className="px-3 py-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Advanced Features
            </div>
          </div>
          
          <SidebarMenuItem>
            <Button asChild variant={location.pathname.startsWith('/personalization') ? 'secondary' : 'ghost'} className="w-full justify-start">
              <Link to="/personalization">
                <Target className="h-4 w-4 mr-2" />
                <span>Personalization</span>
              </Link>
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button asChild variant={location.pathname.startsWith('/segmentation') ? 'secondary' : 'ghost'} className="w-full justify-start">
              <Link to="/segmentation">
                <Users className="h-4 w-4 mr-2" />
                <span>Segmentation</span>
              </Link>
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button asChild variant={location.pathname.startsWith('/predictive-analytics') ? 'secondary' : 'ghost'} className="w-full justify-start">
              <Link to="/predictive-analytics">
                <Brain className="h-4 w-4 mr-2" />
                <span>Predictive Analytics</span>
              </Link>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Button asChild variant={location.pathname.startsWith('/settings') ? 'secondary' : 'ghost'} className="w-full justify-start">
              <Link to="/settings">
                <Settings className="h-4 w-4 mr-2" />
                <span>Settings</span>
              </Link>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <Button variant="ghost" onClick={signOut} className="w-full justify-start text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4 mr-2" />
          <span>Log Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
