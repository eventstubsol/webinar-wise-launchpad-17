
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Shield, 
  Bell, 
  Moon, 
  Sun, 
  Monitor, 
  Save, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  CheckCircle,
  Globe,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and numbers'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export const AccountSettings = () => {
  const { user, settings, updateSettings, updatePassword } = useAuth();
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
    watch,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const newPassword = watch('newPassword');

  // Password strength calculator
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: 'None', color: 'gray' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'red' };
    if (score <= 4) return { score, label: 'Fair', color: 'yellow' };
    if (score <= 5) return { score, label: 'Good', color: 'blue' };
    return { score, label: 'Strong', color: 'green' };
  };

  const passwordStrength = getPasswordStrength(newPassword || '');

  const handleSettingsUpdate = async (key: string, value: any) => {
    setIsUpdatingSettings(true);
    try {
      await updateSettings({ [key]: value });
    } catch (error) {
      console.error('Settings update error:', error);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsUpdatingPassword(true);
    setPasswordUpdateSuccess(false);
    
    try {
      const { error } = await updatePassword(data.newPassword);
      if (!error) {
        reset();
        setPasswordUpdateSuccess(true);
        setTimeout(() => setPasswordUpdateSuccess(false), 5000);
      }
    } catch (error) {
      console.error('Password update error:', error);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Account Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage your account security and notification preferences.
        </p>
      </div>

      {/* Account Security Overview */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Your account is secure
              </p>
              <p className="text-xs text-green-600">
                Two-factor authentication: Available in future updates
              </p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Verified
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifications
          </CardTitle>
          <CardDescription>
            Choose what notifications you want to receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications" className="text-base">
                Email notifications
              </Label>
              <p className="text-sm text-gray-500">
                Receive email updates about your webinars and reports.
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings?.email_notifications ?? true}
              onCheckedChange={(checked) => handleSettingsUpdate('email_notifications', checked)}
              disabled={isUpdatingSettings}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing-emails" className="text-base">
                Marketing emails
              </Label>
              <p className="text-sm text-gray-500">
                Receive tips, feature updates, and promotional content.
              </p>
            </div>
            <Switch
              id="marketing-emails"
              checked={settings?.marketing_emails ?? false}
              onCheckedChange={(checked) => handleSettingsUpdate('marketing_emails', checked)}
              disabled={isUpdatingSettings}
            />
          </div>

          {isUpdatingSettings && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <LoadingSpinner size="sm" />
              <span>Updating preferences...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Monitor className="h-5 w-5 mr-2" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how Webinar Wise looks for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="theme-preference" className="text-base">
              Theme preference
            </Label>
            <Select
              value={settings?.theme_preference ?? 'system'}
              onValueChange={(value) => handleSettingsUpdate('theme_preference', value)}
              disabled={isUpdatingSettings}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center">
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center">
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center">
                    <Monitor className="h-4 w-4 mr-2" />
                    System
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Choose your preferred theme or use your system setting.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone" className="text-base">
              Timezone
            </Label>
            <Select
              value={settings?.timezone ?? 'UTC'}
              onValueChange={(value) => handleSettingsUpdate('timezone', value)}
              disabled={isUpdatingSettings}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      {tz}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Your timezone affects report timestamps and notification scheduling.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Security
          </CardTitle>
          <CardDescription>
            Update your password and security settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordUpdateSuccess && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Password updated successfully! You'll need to sign in again on other devices.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  {...register('currentPassword')}
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  className={`pl-9 pr-10 ${errors.currentPassword ? 'border-red-500' : ''}`}
                  placeholder="Enter current password"
                  disabled={isUpdatingPassword}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={isUpdatingPassword}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-sm text-red-600">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  {...register('newPassword')}
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  className={`pl-9 pr-10 ${errors.newPassword ? 'border-red-500' : ''}`}
                  placeholder="Enter new password"
                  disabled={isUpdatingPassword}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isUpdatingPassword}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Password strength:</span>
                    <Badge 
                      variant="outline" 
                      className={`text-${passwordStrength.color}-600 border-${passwordStrength.color}-200`}
                    >
                      {passwordStrength.label}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`bg-${passwordStrength.color}-500 h-1.5 rounded-full transition-all duration-300`}
                      style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              {errors.newPassword && (
                <p className="text-sm text-red-600">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  {...register('confirmPassword')}
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`pl-9 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  placeholder="Confirm new password"
                  disabled={isUpdatingPassword}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isUpdatingPassword}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Changing your password will sign you out of all other devices for security.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end pt-4 border-t">
              <Button
                type="submit"
                disabled={!isValid || isUpdatingPassword}
                className="min-w-[140px]"
              >
                {isUpdatingPassword ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update password
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Account created:</span>
            <span className="font-medium">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">User ID:</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              {user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-8)}` : 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Email verified:</span>
            <Badge variant={user?.email_confirmed_at ? "default" : "secondary"}>
              {user?.email_confirmed_at ? 'Verified' : 'Pending'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
