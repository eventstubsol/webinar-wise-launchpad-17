
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Settings as SettingsIcon, Globe, Bell, FileText } from 'lucide-react';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { UserSettings } from '@/components/settings/UserSettings';
import { ZoomIntegrationSettings } from '@/components/settings/ZoomIntegrationSettings';
import { ExportDashboard } from '@/components/export/ExportDashboard';
import { SettingsHeader } from '@/components/settings/SettingsHeader';

const Settings = () => {
  return (
    <>
      <SettingsHeader />

      <div className="flex-1 p-6">
        <div className="w-full space-y-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account preferences and integrations
            </p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="exports" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Reports & Exports
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <ProfileSettings />
            </TabsContent>

            <TabsContent value="account">
              <UserSettings />
            </TabsContent>

            <TabsContent value="integrations">
              <div className="space-y-6">
                <ZoomIntegrationSettings />
                
                {/* Placeholder for future integrations */}
                <Card>
                  <CardHeader>
                    <CardTitle>More Integrations Coming Soon</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      We're working on adding more integrations to help you connect your favorite tools.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="exports">
              <ExportDashboard />
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Notification settings are managed in the Account tab for now.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Settings;
