'use client';

import { createBrowserClient } from '@supabase/ssr';

// These environment variables are already set in the .env file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anonymous Key is missing. Check your environment variables.');
}

// Create a single supabase client for interacting with the database
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export default supabase; 