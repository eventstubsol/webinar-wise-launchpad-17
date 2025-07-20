
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Separator } from '@/components/ui/separator';

export const UserSettings = () => {
  const { settings, profileLoading, updateSettings } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No settings found. Please try refreshing the page.</p>
        </CardContent>
      </Card>
    );
  }

  const handleToggle = async (field: keyof typeof settings, value: boolean) => {
    setIsUpdating(true);
    try {
      await updateSettings({ [field]: value });
    } catch (error) {
      console.error('Error updating setting:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectChange = async (field: keyof typeof settings, value: string) => {
    setIsUpdating(true);
    try {
      await updateSettings({ [field]: value });
    } catch (error) {
      console.error('Error updating setting:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notifications</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.email_notifications}
              onCheckedChange={(checked) => handleToggle('email_notifications', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing-emails">Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about new features and promotions
              </p>
            </div>
            <Switch
              id="marketing-emails"
              checked={settings.marketing_emails}
              onCheckedChange={(checked) => handleToggle('marketing_emails', checked)}
              disabled={isUpdating}
            />
          </div>
        </div>

        <Separator />

        {/* Appearance Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Appearance</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="theme-preference">Theme Preference</Label>
              <p className="text-sm text-muted-foreground">
                Choose your preferred color scheme
              </p>
            </div>
            <Select
              value={settings.theme_preference || "system"}
              onValueChange={(value) => handleSelectChange('theme_preference', value)}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Timezone Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Regional</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="timezone">Timezone</Label>
              <p className="text-sm text-muted-foreground">
                Your current timezone setting
              </p>
            </div>
            <Select
              value={settings.timezone || "UTC"}
              onValueChange={(value) => handleSelectChange('timezone', value)}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Chicago">Central Time</SelectItem>
                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                <SelectItem value="Europe/London">London</SelectItem>
                <SelectItem value="Europe/Paris">Paris</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isUpdating && (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-sm text-muted-foreground">Updating settings...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
