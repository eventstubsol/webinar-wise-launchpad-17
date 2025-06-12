
import React from 'react';
import { 
  BarChart, 
  Calendar, 
  Database, 
  FileText, 
  Home, 
  Settings, 
  Users, 
  Activity 
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    isActive: true,
  },
  {
    title: "Webinars",
    url: "/webinars",
    icon: Calendar,
  },
  {
    title: "Analytics",
    url: "/analytics", 
    icon: BarChart,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
  },
  {
    title: "Data Filters",
    url: "/filters",
    icon: Database,
  },
  {
    title: "Team",
    url: "/team",
    icon: Users,
  },
  {
    title: "Sharing",
    url: "/sharing",
    icon: Activity,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" className="border-r border-blue-100 bg-white">
      <SidebarHeader className="p-4 border-b border-blue-100">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="text-lg font-semibold text-blue-900">WebinarWise</h2>
            <p className="text-xs text-blue-600">Analytics Dashboard</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-blue-700 font-medium group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={item.isActive}
                    tooltip={item.title}
                    className="hover:bg-blue-50 hover:text-blue-700 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700 data-[active=true]:font-medium"
                  >
                    <a href={item.url} className="flex items-center space-x-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-blue-100">
        <div className="text-xs text-blue-600 group-data-[collapsible=icon]:hidden">
          © 2024 WebinarWise
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
