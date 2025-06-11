
import { createClient } from '@supabase/supabase-js';

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
    const mockChain = {
      select: () => mockChain,
      order: () => mockChain,
      eq: () => mockChain,
      insert: () => mockChain,
      update: () => mockChain,
      delete: () => mockChain,
      single: () => ({ error: new Error('Supabase not configured') })
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
    if (!supabaseUrl || !supabaseAnonKey) {
      return { error: new Error('Please connect to Supabase to enable authentication') };
    }
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
  },

  signIn: async (email: string, password: string) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { error: new Error('Please connect to Supabase to enable authentication') };
    }
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  signOut: async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { error: new Error('Please connect to Supabase to enable authentication') };
    }
    return await supabase.auth.signOut();
  },

  getCurrentUser: async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { data: { user: null }, error: new Error('Please connect to Supabase to enable authentication') };
    }
    return await supabase.auth.getUser();
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
