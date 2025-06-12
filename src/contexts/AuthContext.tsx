
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed', { event, hasSession: !!session });
        
        setSession(session);
        setUser(session?.user ?? null);
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
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthProvider: Initial session check', { hasSession: !!session });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log('AuthProvider: Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, [toast]);

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

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
