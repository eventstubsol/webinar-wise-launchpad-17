
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Video, 
  BarChart3, 
  Database,
  FileText,
  Settings, 
  Send, 
  Users, 
  LogOut, 
  Target,
  Brain,
  Upload,
  Download,
  Activity,
  Zap,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export const AppSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  return (
    <Sidebar>
      <SidebarHeader>
        <img src="/lovable-uploads/d3011340-f45f-4d8c-b42a-3c95a640618a.png" alt="Webinar Wise" className="h-8 w-auto" />
      </SidebarHeader>
      
      <SidebarContent>
        {/* Core Webinar Features */}
        <SidebarGroup>
          <SidebarGroupLabel>Webinar Analytics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Button asChild variant={isActive('/dashboard') ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link to="/dashboard">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    <span>Dashboard</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button asChild variant={isActive('/webinars') ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link to="/webinars">
                    <Video className="h-4 w-4 mr-2" />
                    <span>Webinars</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button asChild variant={isActive('/advanced-analytics') ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link to="/advanced-analytics">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    <span>Advanced Analytics</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Email Marketing */}
        <SidebarGroup>
          <SidebarGroupLabel>Email Marketing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Button asChild variant={isActive('/templates') ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link to="/templates">
                    <FileText className="h-4 w-4 mr-2" />
                    <span>Templates</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button asChild variant={isActive('/campaigns') ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link to="/campaigns">
                    <Send className="h-4 w-4 mr-2" />
                    <span>Campaigns</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button asChild variant={isActive('/email-analytics') ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link to="/email-analytics">
                    <Activity className="h-4 w-4 mr-2" />
                    <span>Email Analytics</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Data Management */}
        <SidebarGroup>
          <SidebarGroupLabel>Data Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Button asChild variant={isActive('/sync-center') ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link to="/sync-center">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    <span>Sync Center</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button asChild variant={isActive('/csv-upload') ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link to="/csv-upload">
                    <Upload className="h-4 w-4 mr-2" />
                    <span>Import Data</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button asChild variant={isActive('/reports') ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link to="/reports">
                    <Download className="h-4 w-4 mr-2" />
                    <span>Reports & Export</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button asChild variant={isActive('/integrations') ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link to="/integrations">
                    <Database className="h-4 w-4 mr-2" />
                    <span>CRM Integrations</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Advanced Features */}
        <SidebarGroup>
          <SidebarGroupLabel>AI & Advanced</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Button asChild variant={isActive('/ai-insights') ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link to="/ai-insights">
                    <Brain className="h-4 w-4 mr-2" />
                    <span>AI Insights</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button asChild variant={isActive('/personalization') ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link to="/personalization">
                    <Target className="h-4 w-4 mr-2" />
                    <span>Personalization</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button asChild variant={isActive('/segmentation') ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link to="/segmentation">
                    <Users className="h-4 w-4 mr-2" />
                    <span>Segmentation</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button asChild variant={isActive('/predictive-analytics') ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link to="/predictive-analytics">
                    <Zap className="h-4 w-4 mr-2" />
                    <span>Predictive Analytics</span>
                  </Link>
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Button asChild variant={isActive('/settings') ? 'secondary' : 'ghost'} className="w-full justify-start">
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
