
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { Zap } from 'lucide-react';

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

  // Calculate profile completion percentage
  const getProfileCompletion = () => {
    if (!profile) return 0;
    const fields = [profile.full_name, profile.company, profile.job_title, profile.phone];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  const profileCompletion = getProfileCompletion();

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
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
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
                  
                  {profileCompletion === 100 && (
                    <Badge variant="default" className="bg-green-100 text-green-700">
                      <Zap className="h-3 w-3 mr-1" />
                      Profile Complete
                    </Badge>
                  )}
                </div>
              </div>

              {/* Profile Completion Banner */}
              {profileCompletion < 100 && (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Complete your profile to unlock all features
                        </p>
                        <p className="text-xs text-blue-700">
                          {profileCompletion}% complete • Add your company and role information
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={handleProfileSetup}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Complete Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

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
