declare module '@supabase/ssr' {
  import { SupabaseClient } from '@supabase/supabase-js';
  
  export type CookieOptions = {
    path?: string;
    domain?: string;
    maxAge?: number;
    sameSite?: 'lax' | 'strict' | 'none';
    secure?: boolean;
    httpOnly?: boolean;
  };

  export type SupabaseClientOptions = {
    cookies: {
      get: (name: string) => string | undefined;
      set: (name: string, value: string, options: CookieOptions) => void;
      remove: (name: string, options: CookieOptions) => void;
    };
  };

  export function createServerClient(
    supabaseUrl: string,
    supabaseKey: string,
    options: SupabaseClientOptions
  ): SupabaseClient;
} 