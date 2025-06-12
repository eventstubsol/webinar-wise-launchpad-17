
import { createClient } from '@supabase/supabase-js';
import { SecurityMonitor } from './auth-validation';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a mock client when environment variables are not set
const createMockClient = () => ({
  auth: {
    signUp: async () => ({ error: new Error('Supabase not configured') }),
    signInWithPassword: async () => ({ error: new Error('Supabase not configured') }),
    signOut: async () => ({ error: new Error('Supabase not configured') }),
    getUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
    onAuthStateChange: () => ({ data: { subscription: null } })
  },
  from: () => {
    const mockResponse = { 
      data: [], 
      error: new Error('Supabase not configured') 
    };
    
    const mockChain = {
      select: () => mockChain,
      order: () => mockChain,
      eq: () => mockChain,
      insert: () => mockChain,
      update: () => mockChain,
      delete: () => mockChain,
      single: () => mockResponse,
      // Add the missing properties that Dashboard expects
      data: [],
      error: new Error('Supabase not configured')
    };
    return mockChain;
  }
});

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient();

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string, metadata?: Record<string, any>) => {
    SecurityMonitor.logSecurityEvent('signup_attempt', { email });
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return { error: new Error('Please connect to Supabase to enable authentication') };
    }
    
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (result.error) {
      SecurityMonitor.logSecurityEvent('signup_failed', { 
        email, 
        error: result.error.message 
      });
    } else {
      SecurityMonitor.logSecurityEvent('signup_success', { email });
    }

    return result;
  },

  signIn: async (email: string, password: string) => {
    SecurityMonitor.logSecurityEvent('signin_attempt', { email });
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return { error: new Error('Please connect to Supabase to enable authentication') };
    }
    
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (result.error) {
      SecurityMonitor.logSecurityEvent('signin_failed', { 
        email, 
        error: result.error.message 
      });
    } else {
      SecurityMonitor.logSecurityEvent('signin_success', { email });
    }

    return result;
  },

  signOut: async () => {
    SecurityMonitor.logSecurityEvent('signout_attempt', {});
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return { error: new Error('Please connect to Supabase to enable authentication') };
    }
    
    const result = await supabase.auth.signOut();

    if (result.error) {
      SecurityMonitor.logSecurityEvent('signout_failed', { 
        error: result.error.message 
      });
    } else {
      SecurityMonitor.logSecurityEvent('signout_success', {});
    }

    return result;
  },

  getCurrentUser: async () => {
    SecurityMonitor.logSecurityEvent('get_user_attempt', {});
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return { data: { user: null }, error: new Error('Please connect to Supabase to enable authentication') };
    }
    
    const result = await supabase.auth.getUser();

    if (result.error) {
      SecurityMonitor.logSecurityEvent('get_user_failed', { 
        error: result.error.message 
      });
    } else {
      SecurityMonitor.logSecurityEvent('get_user_success', { 
        hasUser: !!result.data.user 
      });
    }

    return result;
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { data: { subscription: null } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database helpers
export const db = {
  // Webinars
  getWebinars: async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return Promise.resolve({ data: [], error: new Error('Please connect to Supabase to enable database functionality') });
    }
    return await supabase
      .from('webinars')
      .select('*')
      .order('created_at', { ascending: false });
  },

  createWebinar: async (webinar: any) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return Promise.resolve({ data: null, error: new Error('Please connect to Supabase to enable database functionality') });
    }
    return await supabase
      .from('webinars')
      .insert(webinar)
      .select()
      .single();
  },

  updateWebinar: async (id: string, updates: any) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return Promise.resolve({ data: null, error: new Error('Please connect to Supabase to enable database functionality') });
    }
    return await supabase
      .from('webinars')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  deleteWebinar: async (id: string) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return Promise.resolve({ error: new Error('Please connect to Supabase to enable database functionality') });
    }
    return await supabase
      .from('webinars')
      .delete()
      .eq('id', id);
  },

  // Registrations
  registerForWebinar: async (webinarId: string, userId: string) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return Promise.resolve({ error: new Error('Please connect to Supabase to enable database functionality') });
    }
    return await supabase
      .from('webinar_registrations')
      .insert({
        webinar_id: webinarId,
        user_id: userId,
      });
  },

  getUserRegistrations: async (userId: string) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return Promise.resolve({ data: [], error: new Error('Please connect to Supabase to enable database functionality') });
    }
    return await supabase
      .from('webinar_registrations')
      .select(`
        *,
        webinars (*)
      `)
      .eq('user_id', userId);
  },
};
