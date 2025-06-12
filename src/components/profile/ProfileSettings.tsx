
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/common/FormField';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const ProfileSettings = () => {
  const { profile, profileLoading, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    company: profile?.company || '',
    job_title: profile?.job_title || '',
    phone: profile?.phone || '',
  });

  React.useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        company: profile.company || '',
        job_title: profile.job_title || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      company: profile?.company || '',
      job_title: profile?.job_title || '',
      phone: profile?.phone || '',
    });
    setIsEditing(false);
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Profile Settings
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              Edit Profile
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Full Name"
            name="full_name"
            value={formData.full_name}
            onChange={handleInputChange}
            disabled={!isEditing}
            placeholder="Enter your full name"
          />
          
          <FormField
            label="Email"
            name="email"
            value={profile?.email || ''}
            disabled={true}
            placeholder="Email (read-only)"
          />
          
          <FormField
            label="Company"
            name="company"
            value={formData.company}
            onChange={handleInputChange}
            disabled={!isEditing}
            placeholder="Enter your company"
          />
          
          <FormField
            label="Job Title"
            name="job_title"
            value={formData.job_title}
            onChange={handleInputChange}
            disabled={!isEditing}
            placeholder="Enter your job title"
          />
          
          <FormField
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleInputChange}
            disabled={!isEditing}
            placeholder="Enter your phone number"
          />

          {isEditing && (
            <div className="flex space-x-2 pt-4">
              <Button type="submit">Save Changes</Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
