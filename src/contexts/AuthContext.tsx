
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  company?: string;
  job_title?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

interface UserSettings {
  id: string;
  email_notifications: boolean;
  marketing_emails: boolean;
  theme_preference: 'light' | 'dark' | 'system';
  timezone: string;
}

interface AuthContextType {
  // User state
  user: User | null;
  profile: Profile | null;
  settings: UserSettings | null;
  session: Session | null;
  
  // Loading states
  loading: boolean;
  profileLoading: boolean;
  
  // Auth actions
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  
  // Profile actions
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch user profile from database
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as Profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Fetch user settings from database
  const fetchSettings = async (userId: string): Promise<UserSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
        return null;
      }

      return data as UserSettings;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return null;
    }
  };

  // Handle auth state changes
  const handleAuthStateChange = async (event: string, session: Session | null) => {
    console.log('Auth state changed:', event, session?.user?.id);
    
    setSession(session);
    setUser(session?.user ?? null);

    if (session?.user) {
      setProfileLoading(true);
      try {
        const [profileData, settingsData] = await Promise.all([
          fetchProfile(session.user.id),
          fetchSettings(session.user.id)
        ]);
        
        setProfile(profileData);
        setSettings(settingsData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setProfileLoading(false);
      }
    } else {
      setProfile(null);
      setSettings(null);
      setProfileLoading(false);
    }

    setLoading(false);
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange('INITIAL_SESSION', session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => subscription.unsubscribe();
  }, []);

  // Authentication methods
  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata,
        },
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check your email",
          description: "We sent you a confirmation link.",
        });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: "Sign up failed",
        description: authError.message,
        variant: "destructive",
      });
      return { error: authError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: "Sign in failed",
        description: authError.message,
        variant: "destructive",
      });
      return { error: authError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Sign out failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signed out",
          description: "You have been signed out successfully.",
        });
      }
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Sign out failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Reset failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check your email",
          description: "We sent you a password reset link.",
        });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      return { error: authError };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password updated",
          description: "Your password has been updated successfully.",
        });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      return { error: authError };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive",
        });
        return { error: new Error(error.message) };
      }

      // Refresh profile data
      await refreshProfile();
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
      return { error: err };
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive",
        });
        return { error: new Error(error.message) };
      }

      // Update local settings state
      setSettings(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Settings updated",
        description: "Your settings have been updated successfully.",
      });

      return { error: null };
    } catch (error) {
      const err = error as Error;
      return { error: err };
    }
  };

  const refreshProfile = async () => {
    if (!user) return;

    setProfileLoading(true);
    try {
      const [profileData, settingsData] = await Promise.all([
        fetchProfile(user.id),
        fetchSettings(user.id)
      ]);
      
      setProfile(profileData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const value = {
    user,
    profile,
    settings,
    session,
    loading,
    profileLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    updateSettings,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
