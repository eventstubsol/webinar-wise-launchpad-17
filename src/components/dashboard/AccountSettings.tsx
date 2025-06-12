
import React from 'react';
import { UserSettings } from '@/components/settings/UserSettings';

export const AccountSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Account Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage your account preferences and settings.
        </p>
      </div>
      <UserSettings />
    </div>
  );
};
