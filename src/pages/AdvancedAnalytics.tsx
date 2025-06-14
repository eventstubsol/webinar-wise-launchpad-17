
import React from 'react';
import { AdvancedAnalyticsDashboard } from '@/components/ai-analytics/AdvancedAnalyticsDashboard';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdvancedAnalytics: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const handleProfileSetup = () => {
    navigate('/settings');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar 
          onProfileSetup={handleProfileSetup}
          onSignOut={handleSignOut}
        />
        <SidebarInset>
          <main className="flex-1 p-8">
            <AdvancedAnalyticsDashboard />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdvancedAnalytics;
