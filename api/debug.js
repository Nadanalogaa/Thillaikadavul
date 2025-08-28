// Simple debug endpoint to check environment variables
export default function handler(req, res) {
  const debug = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
    hasJwtSecret: !!process.env.JWT_SECRET,
    supabaseUrlPrefix: process.env.SUPABASE_URL?.substring(0, 20) + '...',
    keyPrefix: process.env.SUPABASE_ANON_KEY?.substring(0, 20) + '...'
  };
  
  res.json(debug);
}