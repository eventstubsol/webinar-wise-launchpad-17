
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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

  // Enhanced logging function
  const debugLog = (message: string, data?: any) => {
    console.log(`[AuthProvider] ${message}`, data || '');
  };

  // Fetch user profile from database
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      debugLog('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        debugLog('Profile fetch error:', error);
        return null;
      }

      debugLog('Profile fetched successfully:', data);
      return data as Profile;
    } catch (error) {
      debugLog('Profile fetch exception:', error);
      return null;
    }
  };

  // Fetch user settings from database
  const fetchSettings = async (userId: string): Promise<UserSettings | null> => {
    try {
      debugLog('Fetching settings for user:', userId);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        debugLog('Settings fetch error:', error);
        return null;
      }

      debugLog('Settings fetched successfully:', data);
      return data as UserSettings;
    } catch (error) {
      debugLog('Settings fetch exception:', error);
      return null;
    }
  };

  // Handle auth state changes with enhanced error handling
  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    debugLog('Auth state changed', { event, hasSession: !!session, userId: session?.user?.id });
    
    try {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        debugLog('User found, fetching profile data');
        setProfileLoading(true);
        
        try {
          const [profileData, settingsData] = await Promise.all([
            fetchProfile(session.user.id),
            fetchSettings(session.user.id)
          ]);
          
          debugLog('Profile data fetched', { profile: !!profileData, settings: !!settingsData });
          setProfile(profileData);
          setSettings(settingsData);
          
        } catch (profileError) {
          debugLog('Error fetching profile data:', profileError);
          // Continue with null profile/settings rather than blocking
          setProfile(null);
          setSettings(null);
        } finally {
          setProfileLoading(false);
          debugLog('Profile loading complete');
        }
      } else {
        debugLog('No user, clearing profile data');
        setProfile(null);
        setSettings(null);
        setProfileLoading(false);
      }

      // ALWAYS set loading to false after handling auth state
      debugLog('Setting loading to false');
      setLoading(false);

      // Handle auth events with toast notifications
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
      
      debugLog('Auth state change complete', { 
        loading: false, 
        hasUser: !!session?.user, 
        hasProfile: !!profile 
      });
      
    } catch (error) {
      debugLog('Error in handleAuthStateChange:', error);
      // Ensure loading is always set to false even if there's an error
      setLoading(false);
      setProfileLoading(false);
    }
  }, []); // Empty dependency array

  // Initialize auth state
  useEffect(() => {
    debugLog('Setting up auth state listener');
    
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        handleAuthStateChange(event, session);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        debugLog('Initial session check', { hasSession: !!session });
        handleAuthStateChange('INITIAL_SESSION', session);
      }
    }).catch((error) => {
      debugLog('Error getting initial session:', error);
      if (mounted) {
        setLoading(false); // Ensure we don't get stuck on error
      }
    });

    return () => {
      debugLog('Cleaning up auth subscription');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Remove handleAuthStateChange dependency to prevent re-initialization

  // Emergency timeout to prevent infinite loading (development only)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        debugLog('EMERGENCY: Force setting loading to false after 10 seconds');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  // Profile management methods
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      debugLog('Updating profile:', updates);
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        debugLog('Profile update error:', error);
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
      debugLog('Profile update exception:', err);
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
      debugLog('Updating settings:', updates);
      const { error } = await supabase
        .from('user_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        debugLog('Settings update error:', error);
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
      debugLog('Settings update exception:', err);
      return { error: err };
    }
  };

  const refreshProfile = async () => {
    if (!user) return;

    debugLog('Refreshing profile data');
    setProfileLoading(true);
    try {
      const [profileData, settingsData] = await Promise.all([
        fetchProfile(user.id),
        fetchSettings(user.id)
      ]);
      
      debugLog('Profile refresh complete');
      setProfile(profileData);
      setSettings(settingsData);
    } catch (error) {
      debugLog('Error refreshing profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Auth methods (with enhanced logging)
  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      debugLog('Sign up attempt:', email);
      
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
        debugLog('Sign up error:', error);
        toast({
          variant: "destructive",
          title: "Sign up failed",
          description: error.message,
        });
      } else {
        debugLog('Sign up successful');
        toast({
          title: "Check your email",
          description: "Please check your email for a verification link to complete your registration.",
        });
      }

      return { error };
    } catch (error) {
      debugLog('Sign up exception:', error);
      const authError = error as AuthError;
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: authError.message || "An unexpected error occurred",
      });
      return { error: authError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      debugLog('Sign in attempt:', email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        debugLog('Sign in error:', error);
        toast({
          variant: "destructive",
          title: "Sign in failed",
          description: error.message,
        });
      } else {
        debugLog('Sign in successful');
      }

      return { error };
    } catch (error) {
      debugLog('Sign in exception:', error);
      const authError = error as AuthError;
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: authError.message || "An unexpected error occurred",
      });
      return { error: authError };
    }
  };

  const signOut = async () => {
    try {
      debugLog('Sign out attempt');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        debugLog('Sign out error:', error);
        toast({
          variant: "destructive",
          title: "Sign out failed",
          description: error.message,
        });
      } else {
        debugLog('Sign out successful');
      }

      return { error };
    } catch (error) {
      debugLog('Sign out exception:', error);
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
      debugLog('Password reset attempt:', email);
      
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        debugLog('Password reset error:', error);
        toast({
          variant: "destructive",
          title: "Password reset failed",
          description: error.message,
        });
      } else {
        debugLog('Password reset email sent');
        toast({
          title: "Password reset email sent",
          description: "Please check your email for instructions to reset your password.",
        });
      }

      return { error };
    } catch (error) {
      debugLog('Password reset exception:', error);
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
      debugLog('Password update attempt');
      
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        debugLog('Password update error:', error);
        toast({
          variant: "destructive",
          title: "Password update failed",
          description: error.message,
        });
      } else {
        debugLog('Password update successful');
        toast({
          title: "Password updated successfully",
          description: "Your password has been updated.",
        });
      }

      return { error };
    } catch (error) {
      debugLog('Password update exception:', error);
      const authError = error as AuthError;
      toast({
        variant: "destructive",
        title: "Password update failed",
        description: authError.message || "An unexpected error occurred",
      });
      return { error: authError };
    }
  };

  // Debug log current state
  useEffect(() => {
    debugLog('Current auth state:', { 
      loading, 
      hasUser: !!user, 
      hasProfile: !!profile, 
      hasSettings: !!settings,
      profileLoading 
    });
  }, [loading, user, profile, settings, profileLoading]);

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
