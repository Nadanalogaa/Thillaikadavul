import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ojuybeasovauzkntbydd.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Auth helper functions
export const authHelpers = {
  async signUp(email, password, userData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });
    return { data, error };
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
};

// Database helper functions
export const dbHelpers = {
  async getCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at');
    return { data, error };
  },

  async addContact(name, email, message) {
    const { data, error } = await supabase
      .from('contacts')
      .insert([{ name, email, message }]);
    return { data, error };
  }
};