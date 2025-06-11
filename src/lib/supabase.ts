
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string, metadata?: Record<string, any>) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
  },

  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  signOut: async () => {
    return await supabase.auth.signOut();
  },

  getCurrentUser: async () => {
    return await supabase.auth.getUser();
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database helpers
export const db = {
  // Webinars
  getWebinars: async () => {
    return await supabase
      .from('webinars')
      .select('*')
      .order('created_at', { ascending: false });
  },

  createWebinar: async (webinar: any) => {
    return await supabase
      .from('webinars')
      .insert(webinar)
      .select()
      .single();
  },

  updateWebinar: async (id: string, updates: any) => {
    return await supabase
      .from('webinars')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  deleteWebinar: async (id: string) => {
    return await supabase
      .from('webinars')
      .delete()
      .eq('id', id);
  },

  // Registrations
  registerForWebinar: async (webinarId: string, userId: string) => {
    return await supabase
      .from('webinar_registrations')
      .insert({
        webinar_id: webinarId,
        user_id: userId,
      });
  },

  getUserRegistrations: async (userId: string) => {
    return await supabase
      .from('webinar_registrations')
      .select(`
        *,
        webinars (*)
      `)
      .eq('user_id', userId);
  },
};
