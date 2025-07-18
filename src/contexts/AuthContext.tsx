
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  Session,
  User,
} from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';

interface UserSettings {
  id: string;
  email_notifications: boolean;
  marketing_emails: boolean;
  theme_preference: 'light' | 'dark' | 'system';
  timezone: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  settings: UserSettings | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, metadata?: any) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<any>;
  updatePassword: (password: string) => Promise<any>;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | null>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<UserSettings | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('[AuthProvider] Fetching profile for user:', userId);
      
      // Try to get existing profile first
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (existingProfile) {
        setProfile({
          ...existingProfile,
          role: (existingProfile.role as 'owner' | 'admin' | 'member') || 'member'
        });
        return {
          ...existingProfile,
          role: (existingProfile.role as 'owner' | 'admin' | 'member') || 'member'
        };
      }

      // If no profile exists, create one
      console.log('[AuthProvider] No profile found, creating new profile');
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email || '';
      const userName = userData.user?.user_metadata?.full_name || userEmail.split('@')[0];

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email: userEmail,
          full_name: userName
        }])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      console.log('[AuthProvider] Profile created successfully:', newProfile);
      const typedProfile = {
        ...newProfile,
        role: (newProfile.role as 'owner' | 'admin' | 'member') || 'member'
      };
      setProfile(typedProfile);
      return typedProfile;

    } catch (error) {
      console.error('[AuthProvider] Profile fetch error:', error);
      setProfile(null);
      return null;
    }
  };

  const fetchSettings = async (userId: string) => {
    try {
      console.log('[AuthProvider] Fetching settings for user:', userId);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      console.log('[AuthProvider] Settings fetched successfully:', data);
      
      // Ensure theme_preference is valid
      const validThemes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
      const theme = validThemes.includes(data.theme_preference as any) ? 
        data.theme_preference as 'light' | 'dark' | 'system' : 'system';
      
      const normalizedSettings: UserSettings = {
        ...data,
        theme_preference: theme
      };
      
      setSettings(normalizedSettings);
      return normalizedSettings;
    } catch (error) {
      console.error('[AuthProvider] Settings fetch error:', error);
      setSettings(null);
      return null;
    }
  };

  useEffect(() => {
    // Get initial session first
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user || null;
        setUser(user);

        if (user) {
          setProfileLoading(true);
          try {
            await Promise.all([
              fetchProfile(user.id),
              fetchSettings(user.id)
            ]);
          } catch (error) {
            console.error('[AuthProvider] Error fetching user data:', error);
          } finally {
            setProfileLoading(false);
          }
        }
      } catch (error) {
        console.error('[AuthProvider] Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session: Session | null) => {
        console.log('[AuthProvider] Auth state change event:', event);
        
        if (event === 'INITIAL_SESSION') {
          // Skip initial session event as we handle it above
          return;
        }

        const user = session?.user || null;
        setUser(user);

        if (user && event === 'SIGNED_IN') {
          setProfileLoading(true);
          // Use setTimeout to prevent potential deadlock in auth state change
          setTimeout(async () => {
            try {
              await Promise.all([
                fetchProfile(user.id),
                fetchSettings(user.id)
              ]);
            } catch (error) {
              console.error('[AuthProvider] Error fetching user data after sign in:', error);
            } finally {
              setProfileLoading(false);
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setSettings(null);
          setProfileLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Sign-in error:', error.message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Sign-up error:', error.message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      setSettings(null);
    } catch (error: any) {
      console.error('Sign-out error:', error.message);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (error: any) {
      console.error('Reset password error:', error.message);
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error };
    } catch (error: any) {
      console.error('Update password error:', error.message);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    settings,
    loading,
    profileLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile: async (updates: Partial<Profile>) => {
      if (!user || !profile) return null;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;
        
        const typedProfile = {
          ...data,
          role: (data.role as 'owner' | 'admin' | 'member') || 'member'
        };
        setProfile(typedProfile);
        return typedProfile;
      } catch (error) {
        console.error('Error updating profile:', error);
        return null;
      }
    },
    updateSettings: async (updates: Partial<UserSettings>) => {
      if (!user) return null;
      
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;
        
        // Normalize the returned data
        const validThemes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
        const theme = validThemes.includes(data.theme_preference as any) ? 
          data.theme_preference as 'light' | 'dark' | 'system' : 'system';
        
        const normalizedSettings: UserSettings = {
          ...data,
          theme_preference: theme
        };
        
        setSettings(normalizedSettings);
        return normalizedSettings;
      } catch (error) {
        console.error('Error updating settings:', error);
        return null;
      }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
