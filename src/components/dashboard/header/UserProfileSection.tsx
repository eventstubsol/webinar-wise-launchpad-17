
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

export function UserProfileSection() {
  const { user, profile } = useAuth();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="flex items-center space-x-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={profile?.avatar_url} alt={displayName} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="text-right">
        <div className="text-sm font-medium text-gray-900">
          {displayName}
        </div>
        <div className="text-xs text-gray-500">
          {profile?.company || user?.email}
        </div>
      </div>
    </div>
  );
}
