import { cookies } from 'next/headers';
import { createServerClient } from './server';
import { UserSettings } from './user-settings';

// Server-side functions
export const getUserSettingsServer = async () => {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return null;
  }
  
  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', session.user.id)
    .single();
    
  return data as UserSettings | null;
}; 