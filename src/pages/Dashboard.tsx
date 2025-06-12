
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { DataTables } from '@/components/dashboard/DataTables';
import { ProfileSettings } from '@/components/dashboard/ProfileSettings';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  useEffect(() => {
    // Redirect if not authenticated
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const handleProfileSetup = () => {
    setShowProfileSettings(true);
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Don't render dashboard if no user
  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar 
          onProfileSetup={handleProfileSetup}
          onSignOut={handleSignOut}
        />
        
        <SidebarInset className="flex-1">
          {/* Dashboard Header */}
          <DashboardHeader />

          {/* Main Content */}
          <div className="flex-1 sm:p-6">
            <div className="w-full space-y-6">
              {/* Welcome Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Here's what's happening with your webinar analytics today.
                    </p>
                  </div>
                </div>
              </div>

              {/* Metrics Cards */}
              <MetricsCards />

              {/* Charts Section */}
              <ChartsSection />

              {/* Data Tables */}
              <DataTables />
            </div>
          </div>
        </SidebarInset>

        {/* Profile Settings Modal */}
        {showProfileSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Profile Settings</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowProfileSettings(false)}
                >
                  ✕
                </Button>
              </div>
              <ProfileSettings />
            </div>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
