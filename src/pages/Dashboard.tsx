
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Bell, Shield, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { DataTables } from '@/components/dashboard/DataTables';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { AccountSettings } from '@/components/dashboard/AccountSettings';
import { AuthTestSuite } from '@/components/auth/AuthTestSuite';

const Dashboard = () => {
  const { user, profile, loading, profileLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

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

  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <DashboardHeader />

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
          <div className="p-6">
            {/* User Profile Section */}
            <div className="flex items-center space-x-3 mb-6">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || user.email} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.full_name || user.email}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {profile?.job_title || 'User'}
                </p>
              </div>
              {profileLoading && <LoadingSpinner size="sm" />}
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Database className="mr-3 h-4 w-4" />
                Overview
              </button>
              
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <User className="mr-3 h-4 w-4" />
                Profile
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Settings className="mr-3 h-4 w-4" />
                Settings
              </button>

              {/* Testing tab (development only) */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={() => setActiveTab('testing')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'testing'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Shield className="mr-3 h-4 w-4" />
                  Testing
                </button>
              )}
            </nav>

            {/* Sign Out Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full justify-start text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
              </h1>
              <p className="text-gray-600 mt-1">
                Here's what's happening with your webinar analytics today.
              </p>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <MetricsCards />
                <ChartsSection />
                <DataTables />
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <ProfileSettings />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <AccountSettings />
              </div>
            )}

            {/* Testing tab (development only) */}
            {activeTab === 'testing' && process.env.NODE_ENV === 'development' && (
              <div className="space-y-6">
                <AuthTestSuite />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
