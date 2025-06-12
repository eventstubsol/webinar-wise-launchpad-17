
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Bell, Shield, Database, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { DataTables } from '@/components/dashboard/DataTables';
import { ProfileSettings } from '@/components/dashboard/ProfileSettings';
import { AccountSettings } from '@/components/dashboard/AccountSettings';

const Dashboard = () => {
  const { user, profile, settings, loading, profileLoading, signOut } = useAuth();
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

  // Calculate profile completion percentage
  const getProfileCompletion = () => {
    if (!profile) return 0;
    const fields = [profile.full_name, profile.company, profile.job_title, profile.phone];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  const profileCompletion = getProfileCompletion();

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
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || user.email} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                {profileLoading && (
                  <div className="absolute -top-1 -right-1">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.full_name || user.email}
                </p>
                <p className="text-xs text-gray-500 truncate">
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
              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <Zap className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 text-xs">
                  Profile {profileCompletion}% complete.{' '}
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className="underline hover:no-underline"
                  >
                    Finish setup
                  </button>
                </AlertDescription>
              </Alert>
            )}

            {/* Navigation */}
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Database className="mr-3 h-4 w-4" />
                Overview
                {activeTab === 'overview' && (
                  <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700">
                    Current
                  </Badge>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <User className="mr-3 h-4 w-4" />
                Profile
                {profileCompletion < 100 && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    {profileCompletion}%
                  </Badge>
                )}
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Settings className="mr-3 h-4 w-4" />
                Settings
                {settings && !settings.email_notifications && (
                  <div className="ml-auto w-2 h-2 bg-yellow-400 rounded-full" title="Notifications disabled" />
                )}
              </button>
            </nav>

            {/* Quick Stats */}
            <div className="mt-6 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Quick Stats</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Member since:</span>
                  <span className="font-medium">
                    {profile?.created_at ? new Date(profile.created_at).getFullYear() : 'Recently'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Webinars:</span>
                  <span className="font-medium">Coming soon</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reports:</span>
                  <span className="font-medium">Coming soon</span>
                </div>
              </div>
            </div>

            {/* Sign Out Button */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full justify-start text-gray-700 hover:bg-gray-50 hover:text-red-600"
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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {activeTab === 'overview' && "Here's what's happening with your webinar analytics today."}
                    {activeTab === 'profile' && "Manage your personal information and profile details."}
                    {activeTab === 'settings' && "Configure your account preferences and security settings."}
                  </p>
                </div>
                
                {/* Quick Actions */}
                <div className="flex items-center space-x-3">
                  {activeTab === 'overview' && (
                    <>
                      <Button variant="outline" size="sm" disabled>
                        <Bell className="h-4 w-4 mr-2" />
                        Notifications
                      </Button>
                      <Button size="sm" disabled>
                        Connect Zoom
                      </Button>
                    </>
                  )}
                  
                  {activeTab === 'profile' && profileCompletion === 100 && (
                    <Badge variant="default" className="bg-green-100 text-green-700">
                      <Zap className="h-3 w-3 mr-1" />
                      Profile Complete
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Profile Completion Banner */}
                {profileCompletion < 100 && (
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {userInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-blue-900">
                              Complete your profile to unlock all features
                            </p>
                            <p className="text-xs text-blue-700">
                              {profileCompletion}% complete • Add your company and role information
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => setActiveTab('profile')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Complete Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
