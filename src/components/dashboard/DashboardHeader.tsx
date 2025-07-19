
import React from 'react';
import { HeaderBranding } from './header/HeaderBranding';
import { HeaderSearch } from './header/HeaderSearch';
import { ZoomStatusSection } from './header/ZoomStatusSection';
import { UserProfileSection } from './header/UserProfileSection';
import { NotificationButton } from './header/NotificationButton';

export function DashboardHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
      <HeaderBranding />

      <div className="ml-auto flex items-center space-x-6">
        <HeaderSearch />

        <ZoomStatusSection />

        <NotificationButton />

        <UserProfileSection />
      </div>
    </header>
  );
}
