
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
  RefreshCw,
  Shield,
  UserCog,
  Building
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { TokenStatus } from '@/services/zoom/utils/tokenUtils';
import { useToast } from '@/hooks/use-toast';

export const AppSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { isZoomAdmin } = useUserRole();
  const { tokenStatus, isLoading } = useZoomConnection();
  const { toast } = useToast();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);
  const isZoomConnected = tokenStatus === TokenStatus.VALID;

  const handleDisabledClick = () => {
    toast({
      title: "Zoom Connection Required",
      description: "Please connect your Zoom account to access this feature.",
      variant: "destructive",
    });
  };

  const renderMenuItem = (path: string, icon: React.ElementType, label: string, requiresZoom = true) => {
    const Icon = icon;
    const shouldDisable = requiresZoom && !isZoomConnected;
    
    if (shouldDisable) {
      return (
        <SidebarMenuItem key={path}>
          <Button 
            variant="ghost" 
            className="w-full justify-start opacity-50 cursor-not-allowed hover:bg-transparent"
            onClick={handleDisabledClick}
            disabled
          >
            <Icon className="h-4 w-4 mr-2" />
            <span>{label}</span>
          </Button>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={path}>
        <Button asChild variant={isActive(path) ? 'secondary' : 'ghost'} className="w-full justify-start">
          <Link to={path}>
            <Icon className="h-4 w-4 mr-2" />
            <span>{label}</span>
          </Link>
        </Button>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <img src="/lovable-uploads/3c2a8db7-3750-4dc1-a7b7-f17ec71a02ff.png" alt="WebinarWise" className="h-8 w-auto sm:h-10" />
      </SidebarHeader>
      
      <SidebarContent>
        {/* Core Webinar Features */}
        <SidebarGroup>
          <SidebarGroupLabel>Webinar Analytics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard is always accessible */}
              {renderMenuItem('/dashboard', LayoutDashboard, 'Dashboard', false)}
              {/* Webinar-related features require Zoom connection */}
              {renderMenuItem('/webinars', Video, 'Webinars', true)}
              {renderMenuItem('/advanced-analytics', BarChart3, 'Advanced Analytics', true)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Email Marketing */}
        <SidebarGroup>
          <SidebarGroupLabel>Email Marketing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItem('/templates', FileText, 'Templates', true)}
              {renderMenuItem('/campaigns', Send, 'Campaigns', true)}
              {renderMenuItem('/email-analytics', Activity, 'Email Analytics', true)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Data Management */}
        <SidebarGroup>
          <SidebarGroupLabel>Data Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItem('/sync-center', RefreshCw, 'Sync Center', true)}
              {renderMenuItem('/csv-upload', Upload, 'Import Data', true)}
              {renderMenuItem('/reports', Download, 'Reports & Export', true)}
              {renderMenuItem('/integrations', Database, 'CRM Integrations', true)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Advanced Features */}
        <SidebarGroup>
          <SidebarGroupLabel>AI & Advanced</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItem('/ai-insights', Brain, 'AI Insights', true)}
              {renderMenuItem('/personalization', Target, 'Personalization', true)}
              {renderMenuItem('/segmentation', Users, 'Segmentation', true)}
              {renderMenuItem('/predictive-analytics', Zap, 'Predictive Analytics', true)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section - Only visible for Zoom admins */}
        {isZoomAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>
                <Shield className="h-4 w-4 inline mr-1" />
                Admin
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* Admin pages don't require Zoom connection */}
                  {renderMenuItem('/admin/users', UserCog, 'User Management', false)}
                  {renderMenuItem('/admin/account-analytics', Building, 'Account Analytics', false)}
                  {renderMenuItem('/admin/webinars', Video, 'All Webinars', false)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Settings is always accessible */}
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
