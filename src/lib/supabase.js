import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ojuybeasovauzkntbydd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdXliZWFzb3ZhdXprbntieWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNjk5NTQsImV4cCI6MjA1MDk0NTk1NH0.6PqHRnXcuSrj_cvQ40g_cwesGPHRnXCu5tj_cvQ40g';

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