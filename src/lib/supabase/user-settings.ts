import supabase from '../supabase';

export interface UserSettings {
  id?: string;
  user_id: string;
  whatsapp_phone_id?: string;
  whatsapp_template_id?: string;
  openai_api_key?: string;
  ai_model?: string;
  system_prompt?: string;
}

// Client-side functions
export const getUserSettings = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', session.user.id)
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 is the error code for "no rows returned"
    throw error;
  }
  
  return data as UserSettings | null;
};

export const saveUserSettings = async (settings: Partial<UserSettings>) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  // Check if a record exists for this user
  const { data: existingSettings } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', session.user.id)
    .single();
  
  if (existingSettings) {
    // Update existing settings
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', session.user.id)
      .select()
      .single();
      
    if (error) throw error;
    return data as UserSettings;
  } else {
    // Create new settings
    const { data, error } = await supabase
      .from('user_settings')
      .insert({
        user_id: session.user.id,
        ...settings,
      })
      .select()
      .single();
      
    if (error) throw error;
    return data as UserSettings;
  }
}; 