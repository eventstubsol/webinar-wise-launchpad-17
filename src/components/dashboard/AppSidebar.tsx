
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Video, 
  BarChart3, 
  FileText, 
  Filter, 
  Brain, 
  Share2, 
  Settings, 
  LogOut,
  TrendingUp
} from 'lucide-react';

const navigationItems = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard", active: true },
  { title: "Webinars", icon: Video, url: "/webinars" },
  { title: "Analytics", icon: BarChart3, url: "/analytics" },
  { title: "Reports", icon: FileText, url: "/reports" },
  { title: "Data Filters", icon: Filter, url: "/filters" },
  { title: "AI Insights", icon: Brain, url: "/ai" },
  { title: "Sharing", icon: Share2, url: "/sharing" },
  { title: "Settings", icon: Settings, url: "/settings" },
];

interface AppSidebarProps {
  onProfileSetup?: () => void;
  onSignOut: () => void;
}

export function AppSidebar({ onProfileSetup, onSignOut }: AppSidebarProps) {
  const { user, profile } = useAuth();

  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  const displayName = profile?.full_name || user?.email || 'User';
  const userRole = profile?.job_title || 'Webinar Analytics';

  return (
    <Sidebar className="border-r border-gray-200">
      {/* Header with Branding */}
      <SidebarHeader className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="text-lg font-semibold text-gray-900">Webinar Wise</h2>
            <p className="text-xs text-gray-500">Analytics Dashboard</p>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={item.active}
                    className="w-full justify-start px-3 py-2.5 text-sm font-medium rounded-lg transition-colors hover:bg-gray-100 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700 data-[active=true]:border-blue-200"
                  >
                    <a href={item.url} className="flex items-center space-x-3">
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Profile */}
      <SidebarFooter className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center space-x-3 px-3 py-2 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url} alt={displayName} />
            <AvatarFallback className="bg-gray-200 text-gray-700 text-sm">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium text-gray-900 truncate">
              {displayName}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {userRole}
            </p>
          </div>
        </div>
        
        <Button
          onClick={onSignOut}
          variant="ghost"
          size="sm"
          className="w-full justify-start mt-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 group-data-[collapsible=icon]:px-2"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 group-data-[collapsible=icon]:mx-auto" />
          <span className="ml-2 group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
