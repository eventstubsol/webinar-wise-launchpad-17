import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel
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
  Zap,
  Mail,
  Template
} from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

const navigationItems = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
  { title: "Webinars", icon: Video, url: "/webinars" },
  { title: "Analytics", icon: BarChart3, url: "/analytics" },
  { title: "Reports", icon: FileText, url: "/reports" },
  { title: "Data Filters", icon: Filter, url: "/filters" },
  { title: "AI", icon: Brain, url: "/ai" },
  { title: "Sharing", icon: Share2, url: "/sharing" },
  { title: "Email Templates", icon: Template, url: "/email-templates" },
  { title: "Email Campaigns", icon: Mail, url: "/dashboard/email-campaigns" },
  { title: "Settings", icon: Settings, url: "/settings" },
];

interface AppSidebarProps {
  onProfileSetup?: () => void;
  onSignOut: () => void;
}

export function AppSidebar({ onProfileSetup, onSignOut }: AppSidebarProps) {
  const { user, profile, profileLoading } = useAuth();
  const location = useLocation();

  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  // Calculate profile completion percentage
  const getProfileCompletion = () => {
    if (!profile) return 0;
    const fields = [profile.full_name, profile.company, profile.job_title, profile.phone];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  const profileCompletion = getProfileCompletion();

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || user?.email} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || user?.email}
            </p>
            <p className="text-xs text-sidebar-foreground/70 truncate">
              {profile?.job_title ? (
                `${profile.job_title}${profile.company ? ` at ${profile.company}` : ''}`
              ) : (
                'Complete your profile'
              )}
            </p>
          </div>
        </div>

        {/* Profile Completion Alert */}
        {profileCompletion < 100 && (
          <Alert className="bg-sidebar-accent border-sidebar-border">
            <Zap className="h-4 w-4 text-sidebar-accent-foreground" />
            <AlertDescription className="text-sidebar-accent-foreground text-xs">
              Profile {profileCompletion}% complete.{' '}
              <button 
                onClick={onProfileSetup}
                className="underline hover:no-underline"
              >
                Finish setup
              </button>
            </AlertDescription>
          </Alert>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                        {isActive && (
                          <Badge variant="secondary" className="ml-auto bg-sidebar-accent text-sidebar-accent-foreground">
                            Current
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6">
        <Button
          onClick={onSignOut}
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
