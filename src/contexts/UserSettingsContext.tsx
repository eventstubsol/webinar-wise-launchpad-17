
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userSettingsService, UserSettings } from '@/services/userSettingsService';
import { toast } from '@/hooks/use-toast';

interface UserSettingsContextType {
  settings: UserSettings | null;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

export const useUserSettings = () => {
  const context = useContext(UserSettingsContext);
  if (context === undefined) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
};

export const UserSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      let settingsData = await userSettingsService.getUserSettings(user.id);
      
      // If no settings exist, create default ones
      if (!settingsData) {
        settingsData = await userSettingsService.createUserSettings(user.id);
      }
      
      setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching user settings:', error);
      toast({
        title: "Error",
        description: "Failed to load user settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user?.id) return;

    try {
      const updatedSettings = await userSettingsService.updateUserSettings(user.id, updates);
      setSettings(updatedSettings);
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
      throw error;
    }
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
    } else {
      setSettings(null);
    }
  }, [user]);

  const value = {
    settings,
    loading,
    updateSettings,
    refreshSettings,
  };

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
};
