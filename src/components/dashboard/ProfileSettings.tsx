
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Save, Mail, User, Building, Briefcase, Phone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  company: z.string().optional(),
  job_title: z.string().optional(),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfileSettings = () => {
  const { user, profile, updateProfile, profileLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      company: '',
      job_title: '',
      phone: '',
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name || '',
        company: profile.company || '',
        job_title: profile.job_title || '',
        phone: profile.phone || '',
      });
    }
  }, [profile, reset]);

  // Watch form changes for auto-save indicator
  const watchedValues = watch();
  
  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      const { error } = await updateProfile(data);
      if (!error) {
        setLastSaved(new Date());
        reset(data); // Reset form dirty state
      }
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  if (profileLoading && !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Profile Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Update your personal information and profile details.
        </p>
      </div>

      {/* Profile Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16 ring-2 ring-blue-200">
              <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || user?.email} />
              <AvatarFallback className="text-lg font-semibold bg-blue-100 text-blue-700">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {profile?.full_name || 'Complete your profile'}
              </h3>
              <p className="text-sm text-gray-600">{user?.email}</p>
              {profile?.company && (
                <p className="text-sm text-blue-600">
                  {profile.job_title && `${profile.job_title} at `}{profile.company}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Member since</p>
              <p className="text-sm font-medium text-gray-700">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Recently'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            This information will be displayed on your profile and in reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Save Status Indicator */}
          {lastSaved && (
            <Alert className="bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Profile saved successfully at {lastSaved.toLocaleTimeString()}
              </AlertDescription>
            </Alert>
          )}

          {/* Profile Photo Section */}
          <div className="flex items-center space-x-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || user?.email} />
              <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm" disabled>
                <Camera className="h-4 w-4 mr-2" />
                Change photo
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                Photo upload coming soon
              </p>
            </div>
          </div>

          {/* Email Display (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="pl-9 bg-gray-50"
              />
            </div>
            <p className="text-xs text-gray-500">
              Email cannot be changed. Contact support if you need to update your email.
            </p>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name *</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  {...register('full_name')}
                  id="full_name"
                  className={`pl-9 ${errors.full_name ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="Enter your full name"
                  disabled={isLoading}
                />
              </div>
              {errors.full_name && (
                <p className="text-sm text-red-600">{errors.full_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    {...register('company')}
                    id="company"
                    className="pl-9"
                    placeholder="Your company"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_title">Job title</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    {...register('job_title')}
                    id="job_title"
                    className="pl-9"
                    placeholder="Your job title"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  {...register('phone')}
                  id="phone"
                  type="tel"
                  className="pl-9"
                  placeholder="Your phone number"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-500">
                {isDirty ? (
                  <span className="text-amber-600">You have unsaved changes</span>
                ) : lastSaved ? (
                  <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                ) : (
                  <span>No changes</span>
                )}
              </div>
              
              <div className="flex space-x-3">
                {isDirty && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reset()}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={!isDirty || !isValid || isLoading}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Profile Completion Status */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Profile Completion</p>
              <p className="text-xs text-gray-600">Complete your profile to unlock all features</p>
            </div>
            <div className="text-right">
              {(() => {
                const completionFields = [
                  profile?.full_name,
                  profile?.company,
                  profile?.job_title,
                  profile?.phone
                ];
                const completedFields = completionFields.filter(Boolean).length;
                const totalFields = completionFields.length;
                const percentage = Math.round((completedFields / totalFields) * 100);
                
                return (
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{percentage}%</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
