
import React from "react";
import { Calendar, Home, Inbox, Search, Settings, Mail, Users, BarChart3, Palette, Zap, FileText, Target, Send } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Email Templates",
    url: "/email-templates",
    icon: Palette,
  },
  {
    title: "Email Campaigns",
    url: "/campaigns",
    icon: Send,
  },
  {
    title: "Advanced Analytics",
    url: "/advanced-analytics",
    icon: BarChart3,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

// Campaign management items
const campaignItems = [
  {
    title: "All Campaigns",
    url: "/campaigns",
    icon: Mail,
  },
  {
    title: "Audience Segments",
    url: "/campaigns/audience",
    icon: Users,
  },
  {
    title: "Campaign Analytics",
    url: "/campaigns/analytics",
    icon: BarChart3,
  },
  {
    title: "A/B Testing",
    url: "/campaigns/ab-testing",
    icon: Target,
  },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Campaign Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {campaignItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start">
              <span>Sign Out</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
