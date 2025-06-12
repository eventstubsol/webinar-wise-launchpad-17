import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Profile and Settings interfaces
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
  created_at: string;
  updated_at: string;
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
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const { toast } = useToast();

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

  // Handle auth state changes with profile loading
  const handleAuthStateChange = async (event: string, session: Session | null) => {
    console.log('AuthProvider: Auth state changed', { event, hasSession: !!session });
    
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

    // Handle auth events
    if (event === 'SIGNED_IN') {
      toast({
        title: "Welcome!",
        description: "You have been signed in successfully.",
      });
    } else if (event === 'SIGNED_OUT') {
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange('INITIAL_SESSION', session);
    });

    return () => {
      console.log('AuthProvider: Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  // Profile management methods
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

  // Auth methods (keeping existing implementation)
  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      setLoading(true);
      console.log('AuthProvider: Attempting sign up for', email);
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata || {}
        }
      });

      if (error) {
        console.error('AuthProvider: Sign up error', error);
        toast({
          variant: "destructive",
          title: "Sign up failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Check your email",
          description: "Please check your email for a verification link to complete your registration.",
        });
      }

      return { error };
    } catch (error) {
      console.error('AuthProvider: Unexpected sign up error', error);
      const authError = error as AuthError;
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: authError.message || "An unexpected error occurred",
      });
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('AuthProvider: Attempting sign in for', email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('AuthProvider: Sign in error', error);
        toast({
          variant: "destructive",
          title: "Sign in failed",
          description: error.message,
        });
      }

      return { error };
    } catch (error) {
      console.error('AuthProvider: Unexpected sign in error', error);
      const authError = error as AuthError;
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: authError.message || "An unexpected error occurred",
      });
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('AuthProvider: Attempting sign out');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthProvider: Sign out error', error);
        toast({
          variant: "destructive",
          title: "Sign out failed",
          description: error.message,
        });
      }

      return { error };
    } catch (error) {
      console.error('AuthProvider: Unexpected sign out error', error);
      const authError = error as AuthError;
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: authError.message || "An unexpected error occurred",
      });
      return { error: authError };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('AuthProvider: Attempting password reset for', email);
      
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('AuthProvider: Reset password error', error);
        toast({
          variant: "destructive",
          title: "Password reset failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Password reset email sent",
          description: "Please check your email for instructions to reset your password.",
        });
      }

      return { error };
    } catch (error) {
      console.error('AuthProvider: Unexpected reset password error', error);
      const authError = error as AuthError;
      toast({
        variant: "destructive",
        title: "Password reset failed",
        description: authError.message || "An unexpected error occurred",
      });
      return { error: authError };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      console.log('AuthProvider: Attempting password update');
      
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('AuthProvider: Update password error', error);
        toast({
          variant: "destructive",
          title: "Password update failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Password updated successfully",
          description: "Your password has been updated.",
        });
      }

      return { error };
    } catch (error) {
      console.error('AuthProvider: Unexpected update password error', error);
      const authError = error as AuthError;
      toast({
        variant: "destructive",
        title: "Password update failed",
        description: authError.message || "An unexpected error occurred",
      });
      return { error: authError };
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
